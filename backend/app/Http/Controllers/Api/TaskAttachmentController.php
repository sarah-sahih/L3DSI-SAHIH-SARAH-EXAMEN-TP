<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TaskAttachmentController extends Controller
{
    private function attachmentPayload(Task $task, array $attachment): array
    {
        return [
            'id' => $attachment['id'],
            'clientId' => $attachment['clientId'] ?? null,
            'name' => $attachment['name'],
            'mimeType' => $attachment['mimeType'] ?? 'application/octet-stream',
            'size' => $attachment['size'] ?? null,
            'isPhoto' => (bool) ($attachment['isPhoto'] ?? false),
            'downloadUrl' => "/tasks/{$task->id}/attachments/{$attachment['id']}/download",
        ];
    }

    public function store(Request $request, string $taskId)
    {
        $task = Task::findOrFail($taskId);
        abort_unless(
            (int) $task->creator_id === (int) $request->user()->id,
            403,
            'Seul le créateur peut ajouter des fichiers.'
        );

        $validated = $request->validate([
            'file' => 'required|file|max:51200',
            'name' => 'nullable|string|max:255',
            'clientId' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._-]+$/'],
            'isPhoto' => 'nullable|boolean',
        ]);

        $attachments = $task->attachments ?? [];
        $existing = collect($attachments)->first(
            fn ($attachment) => ($attachment['clientId'] ?? null) === $validated['clientId']
        );
        if ($existing) {
            return response()->json([
                'attachment' => $this->attachmentPayload($task, $existing),
            ]);
        }

        $file = $request->file('file');
        $requestedName = trim($validated['name'] ?? '');
        $name = basename(str_replace(
            '\\',
            '/',
            $requestedName !== '' ? $requestedName : $file->getClientOriginalName()
        ));
        $id = (string) Str::uuid();
        $path = $file->storeAs(
            'task-attachments/'.hash('sha256', $task->id),
            $id,
            'local'
        );
        abort_unless($path, 500, 'Impossible d’enregistrer le fichier.');

        $attachment = [
            'id' => $id,
            'clientId' => $validated['clientId'],
            'name' => $name,
            'mimeType' => $file->getMimeType() ?: 'application/octet-stream',
            'size' => $file->getSize(),
            'isPhoto' => (bool) ($validated['isPhoto'] ?? false),
            'path' => $path,
        ];
        $attachments[] = $attachment;
        $task->attachments = $attachments;
        $task->save();

        return response()->json([
            'attachment' => $this->attachmentPayload($task, $attachment),
        ], 201);
    }

    public function download(Request $request, string $taskId, string $attachmentId)
    {
        abort_unless(Str::isUuid($attachmentId), 404, 'Fichier introuvable.');
        $task = Task::with('observers')->findOrFail($taskId);
        $canView = (int) $task->creator_id === (int) $request->user()->id
            || $task->observers->contains('id', $request->user()->id);
        abort_unless($canView, 403, 'Vous ne pouvez pas télécharger ce fichier.');

        $attachment = collect($task->attachments ?? [])
            ->first(fn ($item) => ($item['id'] ?? null) === $attachmentId);
        $expectedPath = 'task-attachments/'.hash('sha256', $task->id).'/'.$attachmentId;
        abort_unless(
            $attachment && ($attachment['path'] ?? null) === $expectedPath
                && Storage::disk('local')->exists($attachment['path']),
            404,
            'Fichier introuvable.'
        );

        return Storage::disk('local')->download(
            $attachment['path'],
            $attachment['name'],
            ['Content-Type' => $attachment['mimeType'] ?? 'application/octet-stream']
        );
    }

    public function destroy(Request $request, string $taskId, string $attachmentId)
    {
        abort_unless(Str::isUuid($attachmentId), 404, 'Fichier introuvable.');
        $task = Task::findOrFail($taskId);
        abort_unless(
            (int) $task->creator_id === (int) $request->user()->id,
            403,
            'Seul le créateur peut supprimer un fichier.'
        );

        $attachments = $task->attachments ?? [];
        $attachment = collect($attachments)
            ->first(fn ($item) => ($item['id'] ?? null) === $attachmentId);
        abort_unless($attachment, 404, 'Fichier introuvable.');

        $expectedPath = 'task-attachments/'.hash('sha256', $task->id).'/'.$attachmentId;
        if (($attachment['path'] ?? null) === $expectedPath) {
            $disk = Storage::disk('local');
            if ($disk->exists($expectedPath)) {
                abort_unless(
                    $disk->delete($expectedPath),
                    500,
                    'Impossible de supprimer le fichier.'
                );
            }
        }
        $task->attachments = array_values(array_filter(
            $attachments,
            fn ($item) => ($item['id'] ?? null) !== $attachmentId
        ));
        $task->save();

        return response()->json(['message' => 'Fichier supprimé.']);
    }
}
