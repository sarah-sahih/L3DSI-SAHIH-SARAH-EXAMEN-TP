# MyTasks — TP React Native

Application mobile de gestion de tâches développée avec **React Native**, **Expo SDK 58**, **React Navigation** et **AsyncStorage**, réalisée selon le cahier des charges en 5 parties.

---

## 📱 Aperçu des 5 Parties du Projet

### 1. Partie 1 — Création du projet et composants
- Composant réutilisable [`TaskCard`](src/components/TaskCard.js) avec Props et styles.
- Bordure colorée à gauche selon la priorité (**Faible** : vert, **Moyenne** : orange, **Élevée** : rouge).
- Badges visuels pour la priorité et le statut (**À faire**, **Terminée**).
- Titre, description, date de création avec icône calendrier et chevron de navigation.

### 2. Partie 2 — Affichage dynamique et gestion de l'état
- Écran [`TaskListScreen`](src/screens/TaskListScreen.js) avec `FlatList`.
- Cartes de statistiques en haut :
  - **Total** (bleu)
  - **Terminées** (vert)
  - **À faire** (orange)
- Barre de recherche en temps réel [`SearchBar`](src/components/SearchBar.js) (filtre sur le titre et la description).
- Filtres d'affichage rapides [`FilterTabs`](src/components/FilterTabs.js) (**Toutes**, **À faire**, **Terminées**).
- Bouton d'action flottant (+ FAB) et bouton d'ajout en en-tête.

### 3. Partie 3 — Formulaire et opérations CRUD
- Écran unique et réutilisable [`TaskFormScreen`](src/screens/TaskFormScreen.js) pour l'ajout et la modification.
- Validation des champs : champ Titre obligatoire (avec message d'erreur si vide ou inférieur à 3 caractères).
- Sélecteur interactif de priorité (Faible, Moyenne, Élevée) et de statut (À faire, Terminée).
- Opérations CRUD complètes :
  - **Create** : Ajout d'une nouvelle tâche avec date automatique.
  - **Read** : Liste filtrable et écran de détails complet.
  - **Update** : Modification d'une tâche existante.
  - **Delete** : Suppression avec boîte de confirmation `Alert`.

### 4. Partie 4 — Navigation entre les écrans
Architecture de navigation complète combinant **Bottom Tab Navigator** et **Stack Navigator** :
1. **Écran Accueil** ([`HomeScreen`](src/screens/HomeScreen.js)) : Présentation "MyTasks", sous-titre, statistiques et boutons d'action rapide.
2. **Écran Liste des tâches** ([`TaskListScreen`](src/screens/TaskListScreen.js)) : Liste avec recherche et filtres.
3. **Écran Détails** ([`TaskDetailScreen`](src/screens/TaskDetailScreen.js)) : Vue détaillée, changement rapide de statut, boutons "Modifier" et "Supprimer".
4. **Écran Formulaire** ([`TaskFormScreen`](src/screens/TaskFormScreen.js)) : Ajout / Édition.
5. **Écran Profil** ([`ProfileScreen`](src/screens/ProfileScreen.js)) : Profil utilisateur, taux de complétion, réinitialisation des 5 tâches de démo et accès au centre des notifications.

### 5. Partie 5 — Persistance des données (Offline-First : AsyncStorage + API Laravel)
- Gestionnaire d'état [`TaskContext`](src/context/TaskContext.js) implémentant une architecture **Offline-First** complète.
- Écran de chargement avec indicateur [`LoadingScreen`](src/components/LoadingScreen.js) ("Chargement de vos tâches...").
- **Stockage local persistant** (`AsyncStorage`) : l'application charge instantanément les données en local et permet d'ajouter/modifier/supprimer même en mode avion.
- **File d'attente de synchronisation (`syncQueue`)** : chaque action effectuée hors-ligne est mise en mémoire tampon.
- **Backend API Laravel (`backend/`)** :
  - Routes REST (`/api/tasks`) et endpoint de synchronisation groupée (`/api/tasks/sync`).
  - Détection automatique du réseau via `@react-native-community/netinfo`.
  - Dès le retour du réseau, la file d'attente est automatiquement envoyée à Laravel et synchronisée.
- Bannière visuelle [`SyncBanner`](src/components/SyncBanner.js) affichant l'état en direct (*En ligne / Hors-ligne / Nombre d'actions en attente / Heure de dernière sync*).
- Photo locale attachée à chaque tâche : prise via la caméra, stockage permanent dans les documents de l'application et suppression avec la tâche.
- Fichiers joints de tout type : stockage privé sur le serveur et téléchargement réservé au créateur et aux observateurs. Seul le créateur peut ajouter ou supprimer des fichiers ; les envois hors ligne sont repris lors de la synchronisation.
- Rappel date/heure : sélection native Android/iOS ou saisie ISO sur Web, notification locale planifiée.
- Rappel à une position : recherche OpenStreetMap/Nominatim ou position actuelle, géorepérage à l'entrée pour notifier en arrière-plan sur Android/iOS. iOS autorise au plus 20 zones surveillées ; cette fonctionnalité nécessite une build de développement et les autorisations adaptées.
- Observateurs : sélectionnés par le créateur, commentaires réservés au créateur et aux observateurs, notifications pour tous les destinataires sauf l'auteur. Le centre de notifications affiche un badge et ouvre la tâche concernée.
- Authentification par inscription/connexion Laravel Sanctum. Les routes de tâches et de collaboration exigent un jeton Bearer ; les jetons mobiles sont conservés dans le stockage sécurisé iOS/Android.

### Comptes de démonstration

Après avoir exécuté les seeders Laravel, les comptes Sarah, Lina et Ahmed utilisent le mot de passe de démonstration `password`. Ces identifiants sont destinés uniquement au développement local ; créez un compte personnel via l'écran d'inscription pour les tests normaux.

---

## 🚀 Lancement de l'application

### Démarrer le serveur Expo :
```bash
npm install
npm start
# ou
npx expo start
```

### Installer et démarrer l'API Laravel :
```powershell
Set-Location backend
composer install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path database\database.sqlite)) { New-Item -ItemType File database\database.sqlite | Out-Null }
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Pour utiliser une adresse Laravel spécifique, créez un fichier `.env.local` à la
racine du projet à partir de `.env.example` et renseignez `EXPO_PUBLIC_API_URL`.
Ce fichier reste local et n'est pas versionné.

Sur un appareil physique, indiquez l'adresse IP locale de l'ordinateur qui exécute Laravel, pas `127.0.0.1`. Les rappels de lieu en arrière-plan nécessitent une build native de développement avec les permissions de localisation accordées ; Expo Go ne permet pas de les valider complètement. Le téléversement de pièces jointes est limité à 50 Mo et le serveur PHP doit autoriser cette taille.

### Tests et vérifications :
```bash
npm test
npm run lint
npx expo-doctor
npx expo export --platform web
npx expo export --platform android

cd backend
php artisan test
```

### Options de visualisation :
- **Sur mobile (iOS / Android)** : Scannez le QR Code affiché dans le terminal avec l'application **Expo Go**.
- **Sur navigateur Web** :
  ```bash
  npm run web
  # ou appuyez sur 'w' dans le terminal Expo
  ```
- **Sur émulateur Android** : appuyez sur `a` dans le terminal Expo.
- **Sur simulateur iOS (Mac)** : appuyez sur `i` dans le terminal Expo.

---

## 📁 Structure du projet

```
tp3/
├── App.js                     # Point d'entrée principal (Providers, Navigation, Loading)
├── app.json                   # Configuration Expo
├── package.json               # Dépendances du projet
└── src/
    ├── components/
    │   ├── TaskCard.js        # Partie 1 : Composant carte de tâche
    │   ├── StatCards.js       # Statistiques Total / Terminées / À faire
    │   ├── SearchBar.js       # Barre de recherche avec icône
    │   ├── FilterTabs.js      # Onglets de filtre (Toutes / À faire / Terminées)
    │   ├── SyncBanner.js      # Statut de synchronisation et réseau en direct
    │   └── LoadingScreen.js   # Partie 5 : Écran de chargement AsyncStorage
    ├── constants/
    │   └── theme.js           # Palette de couleurs et styles du sujet
    ├── context/
    │   └── TaskContext.js     # Moteur Offline-First (AsyncStorage + syncQueue + API)
    ├── data/
    │   └── initialTasks.js    # Données mock conformes au sujet
    ├── navigation/
    │   ├── AppNavigator.js    # Stack Navigator principal
    │   └── TabNavigator.js    # Bottom Tab Navigator (4 onglets)
    ├── screens/
    │   ├── HomeScreen.js       # Écran 1 : Accueil
    │   ├── TaskListScreen.js   # Écran 2 : Liste des tâches
    │   ├── TaskDetailScreen.js # Écran 3 : Détails d'une tâche
    │   ├── TaskFormScreen.js   # Écran 4 : Formulaire (Ajout / Modification)
    │   ├── NotificationsScreen.js # Centre des notifications
    │   └── ProfileScreen.js    # Écran 5 : Profil & Gestion Sync/AsyncStorage
    └── services/
        ├── api.js             # Client HTTP API Laravel avec détection d'IP dynamique
        └── locationGeofencing.js # Tâche native de rappels de lieu
```
