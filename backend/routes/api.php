<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskAttachmentController;
use App\Http\Controllers\Api\CollaborationController;

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => $request->user());
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::prefix('tasks')->group(function () {
        Route::get('/', [TaskController::class, 'index']);
        Route::post('/', [TaskController::class, 'store']);
        Route::post('/sync', [TaskController::class, 'sync']);
        Route::get('/{id}', [TaskController::class, 'show']);
        Route::put('/{id}', [TaskController::class, 'update']);
        Route::delete('/{id}', [TaskController::class, 'destroy']);
        Route::post('/{taskId}/attachments', [TaskAttachmentController::class, 'store']);
        Route::get('/{taskId}/attachments/{attachmentId}/download', [TaskAttachmentController::class, 'download']);
        Route::delete('/{taskId}/attachments/{attachmentId}', [TaskAttachmentController::class, 'destroy']);
    });

    Route::get('/users', [CollaborationController::class, 'users']);
    Route::get('/tasks/{taskId}/collaboration', [CollaborationController::class, 'details']);
    Route::put('/tasks/{taskId}/observers', [CollaborationController::class, 'updateObservers']);
    Route::post('/tasks/{taskId}/comments', [CollaborationController::class, 'storeComment']);
    Route::get('/notifications', [CollaborationController::class, 'notifications']);
    Route::put('/notifications/{notificationId}/read', [CollaborationController::class, 'markNotificationRead']);
});
