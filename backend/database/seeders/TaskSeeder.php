<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Task;
use App\Models\User;

class TaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sarah = User::where('email', 'sarah@mytasks.local')->first();
        $lina = User::where('email', 'lina@mytasks.local')->first();
        $ahmed = User::where('email', 'ahmed@mytasks.local')->first();

        $tasks = [
            [
                'id' => '1',
                'title' => 'Préparer la présentation',
                'description' => 'Réaliser les diapositives pour la présentation du projet.',
                'priority' => 'Élevée',
                'status' => 'À faire',
                'createdAt' => '12/04/2025',
            ],
            [
                'id' => '2',
                'title' => 'Répondre aux emails',
                'description' => 'Traiter les messages urgents des clients et partenaires.',
                'priority' => 'Moyenne',
                'status' => 'À faire',
                'createdAt' => '12/04/2025',
            ],
            [
                'id' => '3',
                'title' => 'Lire la documentation',
                'description' => 'Étudier les nouvelles fonctionnalités et composants de React Native.',
                'priority' => 'Faible',
                'status' => 'Terminée',
                'createdAt' => '11/04/2025',
            ],
            [
                'id' => '4',
                'title' => 'Développer la fonctionnalité',
                'description' => 'Implémenter la gestion du stockage local avec AsyncStorage.',
                'priority' => 'Élevée',
                'status' => 'À faire',
                'createdAt' => '10/04/2025',
            ],
            [
                'id' => '5',
                'title' => 'Tester les composants',
                'description' => 'Valider le bon fonctionnement de TaskCard et du formulaire sur mobile.',
                'priority' => 'Faible',
                'status' => 'Terminée',
                'createdAt' => '09/04/2025',
            ],
        ];

        foreach ($tasks as $task) {
            $taskModel = Task::updateOrCreate(
                ['id' => $task['id']],
                array_merge($task, ['creator_id' => $sarah?->id])
            );
            if ($lina) {
                $taskModel->observers()->syncWithoutDetaching([$lina->id]);
            }
        }
    }
}
