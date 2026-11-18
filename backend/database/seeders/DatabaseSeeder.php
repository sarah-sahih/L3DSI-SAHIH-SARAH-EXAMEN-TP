<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            ['name' => 'Sarah', 'email' => 'sarah@mytasks.local'],
            ['name' => 'Lina', 'email' => 'lina@mytasks.local'],
            ['name' => 'Ahmed', 'email' => 'ahmed@mytasks.local'],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => 'password',
                ]
            );
        }

        $this->call(TaskSeeder::class);
    }
}
