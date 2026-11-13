# MyTasks Backend — API REST Laravel

Backend pour l'application mobile MyTasks (Gestion des tâches avec persistance en ligne).

## 🚀 Démarrage rapide

### 1. Prérequis
- PHP 8.2 ou supérieur avec extension SQLite et Zip activées
- Composer

### 2. Installation
```bash
# Se placer dans le dossier backend
cd backend

# Copier le fichier d'environnement
cp .env.example .env

# Installer les dépendances PHP
composer install

# Créer la base de données SQLite si nécessaire
# Sur Windows PowerShell :
New-Item -ItemType File -Path database/database.sqlite -Force
# Sur Linux / Mac :
touch database/database.sqlite

# Exécuter les migrations et charger les données de démo (5 tâches)
php artisan migrate --seed
```

### 3. Lancer le serveur API
```bash
php artisan serve --host=0.0.0.0 --port=8000
```
Le serveur sera accessible sur `http://127.0.0.1:8000/api` et via votre IP locale sur smartphone.
