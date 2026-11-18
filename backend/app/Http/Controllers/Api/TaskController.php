<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    private function deleteTaskAttachments(Task $task): void
    {
        foreach ($task->attachments ?? [] as $attachment) {
            if (!is_array($attachment) || !preg_match(
                '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
                $attachment['id'] ?? ''
            )) {
                continue;
            }
            $expectedPath = !empty($attachment['id'])
                ? 'task-attachments/'.hash('sha256', $task->id).'/'.$attachment['id']
                : null;
            if ($expectedPath && ($attachment['path'] ?? null) === $expectedPath) {
                $disk = Storage::disk('local');
                if ($disk->exists($expectedPath) && !$disk->delete($expectedPath)) {
                    throw new \RuntimeException('Impossible de supprimer un fichier de la tâche.');
                }
            }
        }
    }

    private function currentUserId(Request $request): int
    {
        return (int) $request->user()->id;
    }

    private function visibleTasksQuery(Request $request)
    {
        $userId = $request->user()?->id;
        $query = Task::query()->with('observers:id,name,email');

        if (!$userId) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function ($tasks) use ($userId) {
            $tasks->where('creator_id', $userId)
                ->orWhereHas('observers', fn ($observers) => $observers->where('users.id', $userId));
        });
    }

    private function taskPayload(Task $task): array
    {
        $task->load('observers:id,name,email');
        $payload = $task->toArray();
        $payload['attachments'] = array_values(array_map(
            fn ($attachment) => [
                'id' => $attachment['id'] ?? null,
                'clientId' => $attachment['clientId'] ?? null,
                'name' => $attachment['name'] ?? 'Fichier',
                'mimeType' => $attachment['mimeType'] ?? 'application/octet-stream',
                'size' => $attachment['size'] ?? null,
                'isPhoto' => (bool) ($attachment['isPhoto'] ?? false),
                'downloadUrl' => !empty($attachment['path'])
                    ? "/tasks/{$task->id}/attachments/{$attachment['id']}/download"
                    : null,
            ],
            array_filter(
                $task->attachments ?? [],
                fn ($attachment) => is_array($attachment)
                    && preg_match(
                        '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
                        $attachment['id'] ?? ''
                    )
                    && ($attachment['path'] ?? null)
                        === 'task-attachments/'.hash('sha256', $task->id).'/'.$attachment['id']
            )
        ));
        if (collect($payload['attachments'])->contains(
            fn ($attachment) => $attachment['isPhoto']
        )) {
            $payload['photoUri'] = null;
        }
        $payload['creatorId'] = $task->creator_id;
        $payload['observerIds'] = $task->observers->pluck('id')->map(fn ($id) => (int) $id)->all();
        return $payload;
    }

    /**
     * Display a listing of the tasks.
     */
    public function index(Request $request)
    {
        $tasks = $this->visibleTasksQuery($request)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($tasks->map(fn ($task) => $this->taskPayload($task)));
    }

    /**
     * Store a newly created task.
     */
    public function store(Request $request)
    {
        $userId = $this->currentUserId($request);
        $validated = $request->validate([
            'id' => 'required|string',
            'title' => 'required|string|min:3',
            'description' => 'nullable|string',
            'priority' => ['nullable', Rule::in(['Faible', 'Moyenne', 'Élevée'])],
            'status' => ['nullable', Rule::in(['À faire', 'Terminée'])],
            'createdAt' => 'nullable|string',
            'reminderAt' => 'nullable|date',
            'locationReminder' => 'nullable|array',
            'dateNotificationId' => 'nullable|string',
            'observerIds' => 'nullable|array',
            'observerIds.*' => 'integer|exists:users,id',
        ]);

        $validated['creator_id'] = $userId;

        $existingTask = Task::find($validated['id']);
        abort_unless(
            !$existingTask || (int) $existingTask->creator_id === $userId,
            403,
            'Seul le créateur peut modifier cette tâche.'
        );

        $task = Task::updateOrCreate(
            ['id' => $validated['id']],
            $validated
        );

        if (array_key_exists('observerIds', $validated)) {
            $task->observers()->sync(array_values(array_diff(
                array_map('intval', $validated['observerIds']),
                [$validated['creator_id'] ?? null]
            )));
        }

        return response()->json($this->taskPayload($task), 201);
    }

    /**
     * Display the specified task.
     */
    public function show(Request $request, $id)
    {
        $task = $this->visibleTasksQuery($request)->find($id);
        abort_unless($task, 403, 'Vous ne pouvez pas consulter cette tâche.');
        return response()->json($this->taskPayload($task));
    }

    /**
     * Update the specified task.
     */
    public function update(Request $request, $id)
    {
        $userId = $this->currentUserId($request);
        $task = Task::find($id);
        if ($task) {
            abort_unless(
                (int) $task->creator_id === $userId,
                403,
                'Seul le créateur peut modifier cette tâche.'
            );
        }
        $validated = $request->validate([
            'title' => 'sometimes|required|string|min:3',
            'description' => 'nullable|string',
            'priority' => ['sometimes', 'nullable', Rule::in(['Faible', 'Moyenne', 'Élevée'])],
            'status' => ['sometimes', 'nullable', Rule::in(['À faire', 'Terminée'])],
            'createdAt' => 'nullable|string',
            'reminderAt' => 'nullable|date',
            'locationReminder' => 'nullable|array',
            'dateNotificationId' => 'nullable|string',
            'observerIds' => 'nullable|array',
            'observerIds.*' => 'integer|exists:users,id',
        ]);

        if (!$task) {
            if (!array_key_exists('title', $validated)) {
                return response()->json([
                    'message' => 'Le titre est obligatoire pour créer une tâche inexistante.',
                ], 422);
            }
            $task = Task::create(array_merge([
                'id' => $id,
                'creator_id' => $userId,
            ], $validated));
            return response()->json($this->taskPayload($task));
        }

        $task->update($validated);
        if (array_key_exists('observerIds', $validated)) {
            $task->observers()->sync(array_values(array_diff(
                array_map('intval', $validated['observerIds']),
                [$task->creator_id]
            )));
        }

        return response()->json($this->taskPayload($task));
    }

    /**
     * Remove the specified task.
     */
    public function destroy(Request $request, $id)
    {
        $userId = $this->currentUserId($request);
        $task = Task::find($id);
        if ($task) {
            abort_unless(
                (int) $task->creator_id === $userId,
                403,
                'Seul le créateur peut supprimer cette tâche.'
            );
            $this->deleteTaskAttachments($task);
            $task->delete();
        }
        return response()->json(['message' => 'Tâche supprimée avec succès']);
    }

    /**
     * Batch Sync endpoint for Offline-First mobile sync queue.
     * Takes an array of queued actions and executes them atomically.
     */
    public function sync(Request $request)
    {
        $userId = $this->currentUserId($request);
        $raw = $request->getContent();
        $all = $request->all();
        $json = json_decode($raw, true);
        $actions = $json['actions'] ?? $all['actions'] ?? [];
        if (is_string($actions)) {
            $actions = json_decode($actions, true);
        }
        $actions = is_array($actions) ? $actions : [];
        $request->validate([
            'actions' => 'required|array',
        ]);

        $applied = 0;
        DB::transaction(function () use ($actions, $userId, &$applied) {
            foreach ($actions as $action) {
                $type = $action['type'] ?? null;

                if ($type === 'CREATE') {
                    $taskData = $action['task'] ?? [];
                    if (
                        is_array($taskData)
                        && is_string($taskData['id'] ?? null)
                        && is_string($taskData['title'] ?? null)
                        && strlen(trim($taskData['title'])) >= 3
                        && in_array($taskData['priority'] ?? 'Moyenne', ['Faible', 'Moyenne', 'Élevée'], true)
                        && in_array($taskData['status'] ?? 'À faire', ['À faire', 'Terminée'], true)
                    ) {
                        $existingTask = Task::find($taskData['id']);
                        if ($existingTask && (int) $existingTask->creator_id !== $userId) {
                            continue;
                        }

                        Task::updateOrCreate(
                            ['id' => $taskData['id']],
                            [
                                'title' => $taskData['title'],
                                'description' => $taskData['description'] ?? '',
                                'priority' => $taskData['priority'] ?? 'Moyenne',
                                'status' => $taskData['status'] ?? 'À faire',
                                'createdAt' => $taskData['createdAt'] ?? null,
                                'reminderAt' => $taskData['reminderAt'] ?? null,
                                'locationReminder' => $taskData['locationReminder'] ?? null,
                                'dateNotificationId' => $taskData['dateNotificationId'] ?? null,
                                'creator_id' => $userId,
                            ]
                        );
                        $syncedTask = Task::where('id', $taskData['id'])->first();
                        if ($syncedTask && array_key_exists('observerIds', $taskData)) {
                            $syncedTask->observers()->sync(array_values(array_diff(
                                array_map('intval', $taskData['observerIds']),
                                [$syncedTask->creator_id]
                            )));
                        }
                        $applied++;
                    }
                } elseif ($type === 'UPDATE') {
                    $id = $action['id'] ?? null;
                    $changes = $action['changes'] ?? [];
                    $allowedChanges = array_intersect_key(
                        is_array($changes) ? $changes : [],
                        array_flip(['title', 'description', 'priority', 'status', 'createdAt', 'reminderAt', 'locationReminder', 'dateNotificationId', 'observerIds'])
                    );
                    $validTitle = !array_key_exists('title', $allowedChanges)
                        || (is_string($allowedChanges['title']) && strlen(trim($allowedChanges['title'])) >= 3);
                    $validPriority = !array_key_exists('priority', $allowedChanges)
                        || in_array($allowedChanges['priority'], ['Faible', 'Moyenne', 'Élevée'], true);
                    $validStatus = !array_key_exists('status', $allowedChanges)
                        || in_array($allowedChanges['status'], ['À faire', 'Terminée'], true);

                    if ($id && $validTitle && $validPriority && $validStatus) {
                        $task = Task::find($id);
                        $canUpdate = $task && (int) $task->creator_id === $userId;
                        if ($canUpdate) {
                            $task->update($allowedChanges);
                        } elseif (!$task && !empty($allowedChanges['title'])) {
                            $task = Task::create(array_merge([
                                'id' => $id,
                                'creator_id' => $userId,
                            ], $allowedChanges));
                        }
                        if ($canUpdate && array_key_exists('observerIds', $allowedChanges)) {
                            $task->observers()->sync(array_values(array_diff(
                                array_map('intval', $allowedChanges['observerIds']),
                                [$task->creator_id]
                            )));
                        }
                        $applied++;
                    }
                } elseif ($type === 'DELETE') {
                    $id = $action['id'] ?? null;
                    if ($id) {
                        $task = Task::find($id);
                        if ($task && (int) $task->creator_id === $userId) {
                            $this->deleteTaskAttachments($task);
                            $task->delete();
                        }
                        $applied++;
                    }
                } elseif ($type === 'CLEAR') {
                    $tasksToClear = Task::where('creator_id', $userId)->get();
                    foreach ($tasksToClear as $taskToClear) {
                        $this->deleteTaskAttachments($taskToClear);
                        $taskToClear->delete();
                        $applied++;
                    }
                } elseif ($type === 'REPLACE') {
                    $tasks = $action['tasks'] ?? [];
                    if (is_array($tasks)) {
                        $tasksToReplace = Task::where('creator_id', $userId)->get();
                        foreach ($tasksToReplace as $taskToReplace) {
                            $this->deleteTaskAttachments($taskToReplace);
                            $taskToReplace->delete();
                        }

                        foreach ($tasks as $taskData) {
                            if (
                                is_array($taskData)
                                && is_string($taskData['id'] ?? null)
                                && is_string($taskData['title'] ?? null)
                                && strlen(trim($taskData['title'])) >= 3
                                && in_array($taskData['priority'] ?? 'Moyenne', ['Faible', 'Moyenne', 'Élevée'], true)
                                && in_array($taskData['status'] ?? 'À faire', ['À faire', 'Terminée'], true)
                            ) {
                                Task::updateOrCreate(
                                    ['id' => $taskData['id']],
                                    [
                                        'title' => $taskData['title'],
                                        'description' => $taskData['description'] ?? '',
                                        'priority' => $taskData['priority'] ?? 'Moyenne',
                                        'status' => $taskData['status'] ?? 'À faire',
                                        'createdAt' => $taskData['createdAt'] ?? null,
                                        'reminderAt' => $taskData['reminderAt'] ?? null,
                                        'locationReminder' => $taskData['locationReminder'] ?? null,
                                        'dateNotificationId' => $taskData['dateNotificationId'] ?? null,
                                        'creator_id' => $userId,
                                    ]
                                );
                                $replacedTask = Task::find($taskData['id']);
                                if ($replacedTask && array_key_exists('observerIds', $taskData)) {
                                    $replacedTask->observers()->sync(array_map(
                                        'intval',
                                        $taskData['observerIds']
                                    ));
                                }
                                $applied++;
                            }
                        }
                    }
                }
            }
        });

        // Return the freshly updated tasks list
        $allTasks = $this->visibleTasksQuery($request)
            ->orderBy('created_at', 'desc')
            ->get();
        $allTasks = $allTasks->map(fn ($task) => $this->taskPayload($task));

        return response()->json([
            'status' => 'success',
            'syncedCount' => $applied,
            'tasks' => $allTasks,
        ]);
    }
}
