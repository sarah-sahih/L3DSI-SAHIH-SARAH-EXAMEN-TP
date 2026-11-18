<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dateTime('reminderAt')->nullable();
            $table->text('locationReminder')->nullable();
            $table->string('dateNotificationId')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn([
                'reminderAt',
                'locationReminder',
                'dateNotificationId',
            ]);
        });
    }
};
