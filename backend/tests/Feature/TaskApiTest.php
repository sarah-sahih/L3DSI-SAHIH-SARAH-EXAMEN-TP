<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Laravel\Sanctum\Sanctum;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_attachments_are_private_and_available_to_observers(): void
    {
        Storage::fake('local');
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-files@example.test',
            'password' => 'password',
        ]);
        $observer = User::create([
            'name' => 'Lina',
            'email' => 'lina-files@example.test',
            'password' => 'password',
        ]);
        $outsider = User::create([
            'name' => 'Ahmed',
            'email' => 'ahmed-files@example.test',
            'password' => 'password',
        ]);
        $task = Task::create([
            'id' => 'file-task',
            'title' => 'Tâche avec fichier',
            'creator_id' => $creator->id,
        ]);
        $task->observers()->sync([$observer->id]);

        $upload = $this->withUser($creator)
            ->post('/api/tasks/file-task/attachments', [
                'file' => UploadedFile::fake()->createWithContent('notes.txt', 'private contents'),
                'name' => 'notes.txt',
                'clientId' => 'local-file-1',
            ])
            ->assertCreated()
            ->assertJsonPath('attachment.name', 'notes.txt')
            ->assertJsonPath('attachment.clientId', 'local-file-1')
            ->assertJsonMissingPath('attachment.path')
            ->assertJsonMissingPath('attachment.uri');

        $attachmentId = $upload->json('attachment.id');
        $storagePath = $task->fresh()->attachments[0]['path'];
        Storage::disk('local')->assertExists($storagePath);

        $this->withUser($creator)
            ->post('/api/tasks/file-task/attachments', [
                'file' => UploadedFile::fake()->createWithContent('retry.txt', 'retry contents'),
                'name' => 'notes.txt',
                'clientId' => 'local-file-1',
            ])
            ->assertOk()
            ->assertJsonPath('attachment.id', $attachmentId);
        $this->assertCount(1, $task->fresh()->attachments);

        $this->withUser($observer)
            ->get("/api/tasks/file-task/attachments/{$attachmentId}/download")
            ->assertOk()
            ->assertDownload('notes.txt');

        $this->withUser($outsider)
            ->get("/api/tasks/file-task/attachments/{$attachmentId}/download")
            ->assertForbidden();

        $this->withUser($observer)
            ->post('/api/tasks/file-task/attachments', [
                'file' => UploadedFile::fake()->create('other.txt'),
                'name' => 'other.txt',
                'clientId' => 'observer-file',
            ])
            ->assertForbidden();

        $this->withUser($observer)
            ->delete("/api/tasks/file-task/attachments/{$attachmentId}")
            ->assertForbidden();

        $this->withUser($creator)
            ->getJson('/api/tasks/file-task')
            ->assertOk()
            ->assertJsonMissingPath('attachments.0.path')
            ->assertJsonMissingPath('attachments.0.uri')
            ->assertJsonPath('attachments.0.downloadUrl', "/tasks/file-task/attachments/{$attachmentId}/download");

        $this->withUser($creator)
            ->delete("/api/tasks/file-task/attachments/{$attachmentId}")
            ->assertOk();
        Storage::disk('local')->assertMissing($storagePath);
        $this->assertSame([], $task->fresh()->attachments);

        $this->withUser($creator)
            ->post('/api/tasks/file-task/attachments', [
                'file' => UploadedFile::fake()->create('delete-with-task.txt'),
                'name' => 'delete-with-task.txt',
                'clientId' => 'local-file-2',
            ])
            ->assertCreated();
        $taskPath = $task->fresh()->attachments[0]['path'];
        $this->withUser($creator)
            ->deleteJson('/api/tasks/file-task')
            ->assertOk();
        Storage::disk('local')->assertMissing($taskPath);
    }

    public function test_photo_attachments_are_shared_with_observers_as_private_downloads(): void
    {
        Storage::fake('local');
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-photo@example.test',
            'password' => 'password',
        ]);
        $observer = User::create([
            'name' => 'Lina',
            'email' => 'lina-photo@example.test',
            'password' => 'password',
        ]);
        $task = Task::create([
            'id' => 'photo-task',
            'title' => 'Tâche avec photo',
            'creator_id' => $creator->id,
            'photoUri' => 'file:///private/device/photo.jpg',
        ]);
        $task->observers()->sync([$observer->id]);

        $upload = $this->withUser($creator)
            ->post('/api/tasks/photo-task/attachments', [
                'file' => UploadedFile::fake()->image('photo.jpg'),
                'name' => 'photo.jpg',
                'clientId' => 'photo-client-1',
                'isPhoto' => '1',
            ])
            ->assertCreated()
            ->assertJsonPath('attachment.isPhoto', true);

        $attachmentId = $upload->json('attachment.id');
        $this->withUser($observer)
            ->getJson('/api/tasks/photo-task')
            ->assertOk()
            ->assertJsonPath('photoUri', null)
            ->assertJsonPath('attachments.0.isPhoto', true)
            ->assertJsonPath(
                'attachments.0.downloadUrl',
                "/tasks/photo-task/attachments/{$attachmentId}/download"
            );

        $this->withUser($observer)
            ->get("/api/tasks/photo-task/attachments/{$attachmentId}/download")
            ->assertOk()
            ->assertHeader('content-type', 'image/jpeg');
    }

    private function withUser(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }

    public function test_only_creator_and_observers_can_list_and_view_task(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-visible@example.test',
            'password' => 'password',
        ]);
        $observer = User::create([
            'name' => 'Lina',
            'email' => 'lina-visible@example.test',
            'password' => 'password',
        ]);
        $outsider = User::create([
            'name' => 'Ahmed',
            'email' => 'ahmed-visible@example.test',
            'password' => 'password',
        ]);

        $task = Task::create([
            'id' => 'private-task',
            'title' => 'Tâche privée',
            'creator_id' => $creator->id,
        ]);
        $task->observers()->sync([$observer->id]);

        $this->withUser($creator)
            ->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonFragment(['id' => 'private-task']);

        $this->withUser($observer)
            ->getJson('/api/tasks/private-task')
            ->assertOk()
            ->assertJsonPath('id', 'private-task');

        $this->withUser($outsider)
            ->getJson('/api/tasks/private-task')
            ->assertForbidden();

        $this->withUser($outsider)
            ->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonMissing(['id' => 'private-task']);
    }

    public function test_creator_and_observer_can_comment_but_author_is_not_notified(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah@example.test',
            'password' => 'password',
        ]);
        $observer = User::create([
            'name' => 'Lina',
            'email' => 'lina@example.test',
            'password' => 'password',
        ]);
        $outsider = User::create([
            'name' => 'Ahmed',
            'email' => 'ahmed@example.test',
            'password' => 'password',
        ]);

        $task = Task::create([
            'id' => 'collaboration-task',
            'title' => 'Tâche collaborative',
            'creator_id' => $creator->id,
        ]);
        $task->observers()->sync([$observer->id]);

        $this->withUser($observer)
            ->postJson('/api/tasks/collaboration-task/comments', [
                'body' => 'Je suis disponible.',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('task_comments', [
            'task_id' => $task->id,
            'user_id' => $observer->id,
            'body' => 'Je suis disponible.',
        ]);
        $this->assertDatabaseHas('task_notifications', [
            'task_id' => $task->id,
            'user_id' => $creator->id,
        ]);
        $this->assertDatabaseMissing('task_notifications', [
            'task_id' => $task->id,
            'user_id' => $observer->id,
        ]);

        $this->withUser($outsider)
            ->postJson('/api/tasks/collaboration-task/comments', [
                'body' => 'Je ne suis pas autorisé.',
            ])
            ->assertForbidden();
    }

    public function test_only_creator_can_update_observers(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah@example.test',
            'password' => 'password',
        ]);
        $observer = User::create([
            'name' => 'Lina',
            'email' => 'lina@example.test',
            'password' => 'password',
        ]);

        $task = Task::create([
            'id' => 'observer-task',
            'title' => 'Tâche avec observateurs',
            'creator_id' => $creator->id,
        ]);

        $this->withUser($creator)
            ->putJson('/api/tasks/observer-task/observers', [
                'observerIds' => [$observer->id],
            ])
            ->assertOk();

        $this->assertDatabaseHas('task_observers', [
            'task_id' => $task->id,
            'user_id' => $observer->id,
        ]);
    }

    public function test_tasks_can_be_listed_and_read(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-list@example.test',
            'password' => 'password',
        ]);
        Task::create([
            'id' => 'read-task',
            'title' => 'Tâche lisible',
            'creator_id' => $creator->id,
        ]);

        $this->withUser($creator)
            ->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['id' => 'read-task']);

        $this->withUser($creator)
            ->getJson('/api/tasks/read-task')
            ->assertOk()
            ->assertJsonPath('title', 'Tâche lisible');
    }

    public function test_task_can_be_created_updated_and_deleted(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-crud@example.test',
            'password' => 'password',
        ]);

        $create = $this->withUser($creator)
            ->postJson('/api/tasks', [
            'id' => 'crud-task',
            'title' => 'Tâche CRUD',
            'description' => 'Description valide',
            'priority' => 'Élevée',
            'status' => 'À faire',
            'createdAt' => '17/11/2026',
            'photoUri' => '/app-documents/mytasks/photos/crud-task.jpg',
            'attachments' => [
                [
                    'id' => 'attachment-1',
                    'name' => 'rapport.pdf',
                    'uri' => '/app-documents/mytasks/attachments/rapport.pdf',
                    'mimeType' => 'application/pdf',
                    'size' => 1024,
                ],
            ],
        ]);

        $create
            ->assertCreated()
            ->assertJsonPath('id', 'crud-task')
            ->assertJsonMissingPath('attachments.0.uri');
        $this->assertEmpty(Task::find('crud-task')->attachments);

        $this->withUser($creator)
            ->putJson('/api/tasks/crud-task', [
            'title' => 'Tâche modifiée',
            'status' => 'Terminée',
            'photoUri' => '/app-documents/mytasks/photos/crud-task.jpg',
        ])
            ->assertOk()
            ->assertJsonPath('title', 'Tâche modifiée')
            ->assertJsonPath('status', 'Terminée');

        $this->withUser($creator)
            ->deleteJson('/api/tasks/crud-task')
            ->assertOk();

        $this->assertDatabaseMissing('tasks', ['id' => 'crud-task']);
    }

    public function test_task_creation_rejects_invalid_fields(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-invalid@example.test',
            'password' => 'password',
        ]);

        $this->withUser($creator)
            ->postJson('/api/tasks', [
            'id' => 'invalid-task',
            'title' => 'ab',
            'priority' => 'Urgente',
            'status' => 'Inconnu',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'priority', 'status']);
    }

    public function test_sync_can_clear_all_tasks(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-clear@example.test',
            'password' => 'password',
        ]);
        Task::create([
            'id' => 'existing-task',
            'title' => 'Tâche existante',
            'creator_id' => $creator->id,
        ]);

        $response = $this->withUser($creator)
            ->postJson('/api/tasks/sync', [
            'actions' => [
                ['type' => 'CLEAR'],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('tasks', []);

        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_sync_can_replace_all_tasks(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-replace@example.test',
            'password' => 'password',
        ]);
        Task::create([
            'id' => 'old-task',
            'title' => 'Ancienne tâche',
            'creator_id' => $creator->id,
        ]);

        $replacement = [
            [
                'id' => 'new-task',
                'title' => 'Nouvelle tâche',
                'description' => 'Description',
                'priority' => 'Élevée',
                'status' => 'À faire',
                'createdAt' => '17/11/2026',
                'creatorId' => $creator->id,
                'observerIds' => [],
            ],
        ];

        $response = $this->withUser($creator)
            ->postJson('/api/tasks/sync', [
            'actions' => [
                [
                    'type' => 'REPLACE',
                    'tasks' => $replacement,
                ],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'tasks');

        $this->assertDatabaseMissing('tasks', ['id' => 'old-task']);
        $this->assertDatabaseHas('tasks', [
            'id' => 'new-task',
            'title' => 'Nouvelle tâche',
            'status' => 'À faire',
        ]);
    }

    public function test_sync_rejects_missing_actions(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-sync-invalid@example.test',
            'password' => 'password',
        ]);

        $this->withUser($creator)
            ->postJson('/api/tasks/sync', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['actions']);
    }

    public function test_sync_updates_only_valid_whitelisted_fields(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-sync-update@example.test',
            'password' => 'password',
        ]);
        Task::create([
            'id' => 'sync-task',
            'title' => 'Tâche synchronisée',
            'status' => 'À faire',
            'creator_id' => $creator->id,
        ]);

        $this->withUser($creator)
            ->postJson('/api/tasks/sync', [
            'actions' => [
                [
                    'type' => 'UPDATE',
                    'id' => 'sync-task',
                    'changes' => [
                        'title' => 'Titre synchronisé',
                        'status' => 'Terminée',
                        'admin' => true,
                    ],
                ],
            ],
        ])
            ->assertOk();

        $this->assertDatabaseHas('tasks', [
            'id' => 'sync-task',
            'title' => 'Titre synchronisé',
            'status' => 'Terminée',
        ]);

        $this->assertDatabaseMissing('tasks', [
            'id' => 'sync-task',
            'admin' => true,
        ]);
    }

    public function test_observer_cannot_update_or_delete_task(): void
    {
        $creator = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-owner@example.test',
            'password' => 'password',
        ]);
        $observer = User::create([
            'name' => 'Lina',
            'email' => 'lina-observer@example.test',
            'password' => 'password',
        ]);
        $task = Task::create([
            'id' => 'owner-only-task',
            'title' => 'Tâche du créateur',
            'creator_id' => $creator->id,
        ]);
        $task->observers()->sync([$observer->id]);

        $this->withUser($observer)
            ->putJson('/api/tasks/owner-only-task', ['title' => 'Modification interdite'])
            ->assertForbidden();

        $this->withUser($observer)
            ->deleteJson('/api/tasks/owner-only-task')
            ->assertForbidden();

        $this->assertDatabaseHas('tasks', [
            'id' => 'owner-only-task',
            'title' => 'Tâche du créateur',
        ]);
    }

    public function test_registration_and_login_issue_authenticated_tokens(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Nadia',
            'email' => 'nadia-auth@example.test',
            'password' => 'strong-password',
            'password_confirmation' => 'strong-password',
        ])
            ->assertCreated()
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token']);

        $user = User::where('email', 'nadia-auth@example.test')->firstOrFail();
        $this->assertNotSame('strong-password', $user->password);
        $this->assertSame('nadia-auth@example.test', $user->email);

        $this->postJson('/api/register', [
            'name' => 'Nadia duplicate',
            'email' => 'NADIA-AUTH@EXAMPLE.TEST',
            'password' => 'strong-password',
            'password_confirmation' => 'strong-password',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email']);

        $login = $this->postJson('/api/login', [
            'email' => 'nadia-auth@example.test',
            'password' => 'strong-password',
        ])->assertOk()->assertJsonStructure(['user', 'token']);

        $this->withHeader('Authorization', 'Bearer '.$login->json('token'))
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', 'nadia-auth@example.test');

        $plainTextToken = $login->json('token');
        $tokenId = explode('|', $plainTextToken)[0];
        $this->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->postJson('/api/logout')
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);

        Auth::forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$plainTextToken)
            ->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_private_api_rejects_missing_or_spoofed_user_identity(): void
    {
        $user = User::create([
            'name' => 'Sarah',
            'email' => 'sarah-no-token@example.test',
            'password' => 'password',
        ]);

        $this->get('/api/tasks')
            ->assertUnauthorized();

        $this->withHeader('X-User-ID', (string) $user->id)
            ->getJson('/api/tasks')
            ->assertUnauthorized();
    }
}
