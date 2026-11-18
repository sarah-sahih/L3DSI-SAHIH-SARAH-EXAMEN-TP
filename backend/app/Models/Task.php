<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'title',
        'description',
        'priority',
        'status',
        'createdAt',
        'photoUri',
        'attachments',
        'reminderAt',
        'locationReminder',
        'dateNotificationId',
        'creator_id',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'locationReminder' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function observers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_observers', 'task_id', 'user_id')
            ->withTimestamps();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class)->latest();
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(TaskNotification::class);
    }
}
