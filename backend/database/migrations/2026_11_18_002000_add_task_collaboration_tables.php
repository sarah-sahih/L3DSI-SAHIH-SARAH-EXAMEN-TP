<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
        });

        Schema::create('task_observers', function (Blueprint $table) {
            $table->id();
            $table->string('task_id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->unique(['task_id', 'user_id']);
        });

        Schema::create('task_comments', function (Blueprint $table) {
            $table->id();
            $table->string('task_id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
        });

        Schema::create('task_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('task_id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('comment_id')->nullable()->constrained('task_comments')->cascadeOnDelete();
            $table->string('title');
            $table->text('body');
            $table->boolean('read')->default(false);
            $table->timestamps();
            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_notifications');
        Schema::dropIfExists('task_comments');
        Schema::dropIfExists('task_observers');
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('creator_id');
        });
    }
};
