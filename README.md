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
5. **Écran Profil** ([`ProfileScreen`](src/screens/ProfileScreen.js)) : Profil utilisateur, taux de complétion, réinitialisation des 5 tâches de démo.

### 5. Partie 5 — Persistance des données (Offline-First : AsyncStorage + API Laravel)
- Gestionnaire d'état [`TaskContext`](src/context/TaskContext.js) implémentant une architecture **Offline-First** complète.
- Écran de chargement avec indicateur [`LoadingScreen`](src/components/LoadingScreen.js) ("Chargement de vos tâches...").
- **Stockage local persistant** (`AsyncStorage`) : l'application charge instantanément les données en local et permet d'ajouter/modifier/supprimer même en mode avion.
- **File d'attente de synchronisation (`syncQueue`)** : chaque action effectuée hors-ligne est mise en mémoire tampon.
- **Backend API Laravel (`C:\laragon\www\mytasks-api`)** :
  - Routes REST (`/api/tasks`) et endpoint de synchronisation groupée (`/api/tasks/sync`).
  - Détection automatique du réseau via `@react-native-community/netinfo`.
  - Dès le retour du réseau, la file d'attente est automatiquement envoyée à Laravel et synchronisée.
- Bannière visuelle [`SyncBanner`](src/components/SyncBanner.js) affichant l'état en direct (*En ligne / Hors-ligne / Nombre d'actions en attente / Heure de dernière sync*).

---

## 🚀 Lancement de l'application

### Démarrer le serveur Expo :
```bash
npm start
# ou
npx expo start
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
    │   └── ProfileScreen.js    # Écran 5 : Profil & Gestion Sync/AsyncStorage
    └── services/
        └── api.js             # Client HTTP API Laravel avec détection d'IP dynamique
```
