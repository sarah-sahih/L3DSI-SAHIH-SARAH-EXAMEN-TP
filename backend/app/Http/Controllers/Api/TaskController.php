<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    /**
     * Display a listing of the tasks.
     */
    public function index()
    {
        $tasks = Task::orderBy('created_at', 'desc')->get();
        return response()->json($tasks);
    }

    /**
     * Store a newly created task.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|string',
            'title' => 'required|string|min:3',
            'description' => 'nullable|string',
            'priority' => 'nullable|string',
            'status' => 'nullable|string',
            'createdAt' => 'nullable|string',
        ]);

        $task = Task::updateOrCreate(
            ['id' => $validated['id']],
            $validated
        );

        return response()->json($task, 201);
    }

    /**
     * Display the specified task.
     */
    public function show($id)
    {
        $task = Task::findOrFail($id);
        return response()->json($task);
    }

    /**
     * Update the specified task.
     */
    public function update(Request $request, $id)
    {
        $task = Task::find($id);

        if (!$task) {
            // If the task does not exist on server yet (e.g. was created offline), create it!
            $validated = $request->validate([
                'title' => 'required|string|min:3',
                'description' => 'nullable|string',
                'priority' => 'nullable|string',
                'status' => 'nullable|string',
                'createdAt' => 'nullable|string',
            ]);
            $task = Task::create(array_merge(['id' => $id], $validated));
            return response()->json($task);
        }

        $task->update($request->only([
            'title',
            'description',
            'priority',
            'status',
            'createdAt',
        ]));

        return response()->json($task);
    }

    /**
     * Remove the specified task.
     */
    public function destroy($id)
    {
        $task = Task::find($id);
        if ($task) {
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
        $raw = $request->getContent();
        $all = $request->all();
        $json = json_decode($raw, true);
        $actions = $json['actions'] ?? $all['actions'] ?? [];
        if (is_string($actions)) {
            $actions = json_decode($actions, true);
        }
        $actions = is_array($actions) ? $actions : [];

        $applied = 0;
        DB::transaction(function () use ($actions, &$applied) {
            foreach ($actions as $action) {
                $type = $action['type'] ?? null;

                if ($type === 'CREATE') {
                    $taskData = $action['task'] ?? [];
                    if (!empty($taskData['id']) && !empty($taskData['title'])) {
                        Task::updateOrCreate(
                            ['id' => $taskData['id']],
                            [
                                'title' => $taskData['title'],
                                'description' => $taskData['description'] ?? '',
                                'priority' => $taskData['priority'] ?? 'Moyenne',
                                'status' => $taskData['status'] ?? 'À faire',
                                'createdAt' => $taskData['createdAt'] ?? null,
                            ]
                        );
                        $applied++;
                    }
                } elseif ($type === 'UPDATE') {
                    $id = $action['id'] ?? null;
                    $changes = $action['changes'] ?? [];
                    if ($id) {
                        $task = Task::find($id);
                        if ($task) {
                            $task->update($changes);
                        } else {
                            if (!empty($changes['title'])) {
                                Task::create(array_merge(['id' => $id], $changes));
                            }
                        }
                        $applied++;
                    }
                } elseif ($type === 'DELETE') {
                    $id = $action['id'] ?? null;
                    if ($id) {
                        $task = Task::find($id);
                        if ($task) {
                            $task->delete();
                        }
                        $applied++;
                    }
                }
            }
        });

        // Return the freshly updated tasks list
        $allTasks = Task::orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'syncedCount' => $applied,
            'tasks' => $allTasks,
        ]);
    }
}
