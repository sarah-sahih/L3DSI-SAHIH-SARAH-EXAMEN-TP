<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Http\Request;

class CollaborationController extends Controller
{
    private function currentUser(Request $request): User
    {
        return $request->user();
    }

    public function users()
    {
        return response()->json(
            User::query()->orderBy('name')->get(['id', 'name', 'email'])
        );
    }

    public function details(Request $request, string $taskId)
    {
        $task = Task::with([
            'creator:id,name,email',
            'observers:id,name,email',
            'comments.user:id,name,email',
        ])->findOrFail($taskId);
        $userId = $this->currentUser($request)->id;
        $canView =
            (int) $task->creator_id === (int) $userId
            || $task->observers()->where('users.id', $userId)->exists();
        abort_unless($canView, 403, 'Vous ne pouvez pas consulter cette tâche.');

        return response()->json([
            'creator' => $task->creator,
            'observers' => $task->observers,
            'comments' => $task->comments,
        ]);
    }

    public function updateObservers(Request $request, string $taskId)
    {
        $user = $this->currentUser($request);
        $task = Task::findOrFail($taskId);
        abort_unless($task->creator_id === $user->id, 403, 'Seul le créateur peut modifier les observateurs.');

        $validated = $request->validate([
            'observerIds' => 'array',
            'observerIds.*' => 'integer|exists:users,id',
        ]);

        $observerIds = array_values(array_unique(array_map(
            'intval',
            $validated['observerIds'] ?? []
        )));
        $observerIds = array_values(array_diff($observerIds, [$user->id]));
        $task->observers()->sync($observerIds);

        return response()->json([
            'observers' => $task->observers()->orderBy('name')->get(['users.id', 'users.name', 'users.email']),
        ]);
    }

    public function storeComment(Request $request, string $taskId)
    {
        $user = $this->currentUser($request);
        $task = Task::with('observers')->findOrFail($taskId);

        $canComment =
            $task->creator_id === $user->id
            || $task->observers()->where('users.id', $user->id)->exists();
        abort_unless($canComment, 403, 'Vous ne pouvez pas commenter cette tâche.');

        $validated = $request->validate([
            'body' => 'required|string|min:1|max:2000',
        ]);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'body' => trim($validated['body']),
        ]);
        $comment->load('user:id,name,email');

        $recipientIds = $task->observers()->pluck('users.id')->all();
        if ($task->creator_id) {
            $recipientIds[] = $task->creator_id;
        }
        $recipientIds = array_values(array_unique(array_filter(
            $recipientIds,
            fn ($recipientId) => (int) $recipientId !== $user->id
        )));

        foreach ($recipientIds as $recipientId) {
            TaskNotification::create([
                'task_id' => $task->id,
                'user_id' => $recipientId,
                'comment_id' => $comment->id,
                'title' => "Nouveau commentaire sur {$task->title}",
                'body' => $comment->body,
                'read' => false,
            ]);
        }

        return response()->json([
            'comment' => $comment,
            'notificationCount' => count($recipientIds),
        ], 201);
    }

    public function notifications(Request $request)
    {
        $user = $this->currentUser($request);

        return response()->json(
            TaskNotification::with('task:id,title')
                ->where('user_id', $user->id)
                ->latest()
                ->get()
        );
    }

    public function markNotificationRead(Request $request, int $notificationId)
    {
        $user = $this->currentUser($request);
        $notification = TaskNotification::where('user_id', $user->id)
            ->findOrFail($notificationId);
        $notification->update(['read' => true]);

        return response()->json($notification);
    }
}
