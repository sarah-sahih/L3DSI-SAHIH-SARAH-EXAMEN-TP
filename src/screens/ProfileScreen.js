import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { getApiBaseUrl } from '../services/api';
import { COLORS } from '../constants/theme';

/**
 * Screen 5: Profil (4ème onglet de navigation)
 * Informations utilisateur, statistiques globales et gestion du stockage AsyncStorage
 */
export default function ProfileScreen() {
  const {
    stats,
    resetToDefaultTasks,
    clearAllTasks,
    isOnline,
    isSyncing,
    syncPendingCount,
    lastSyncTime,
    syncNow,
  } = useTasks();

  const apiUrl = getApiBaseUrl();

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleResetDemoData = () => {
    Alert.alert(
      'Réinitialiser les données',
      'Voulez-vous restaurer les 5 tâches de démonstration du TP ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          onPress: async () => {
            await resetToDefaultTasks();
            Alert.alert('Succès', 'Les données de démonstration ont été restaurées !');
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Vider le stockage',
      'Êtes-vous sûr de vouloir supprimer toutes les tâches ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            await clearAllTasks();
            Alert.alert('Succès', 'Toutes les tâches ont été supprimées.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.name}>Utilisateur MyTasks</Text>
          <Text style={styles.email}>etudiant@universite.fr</Text>
        </View>

        {/* Global Progress Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Progression globale</Text>
            <Text style={styles.statsPercent}>{completionRate}%</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${completionRate}%` }]} />
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.stats.completed.text }]}>
                {stats.completed}
              </Text>
              <Text style={styles.statLabel}>Terminées</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.stats.pending.text }]}>
                {stats.pending}
              </Text>
              <Text style={styles.statLabel}>À faire</Text>
            </View>
          </View>
        </View>

        {/* Synchronisation Cloud & Laravel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synchronisation Laravel API</Text>

          <View style={styles.syncCard}>
            <View style={styles.syncRow}>
              <Text style={styles.syncLabel}>Statut réseau :</Text>
              <View style={styles.syncStatusBadge}>
                <View
                  style={[
                    styles.syncStatusDot,
                    { backgroundColor: isOnline ? '#16A34A' : '#D97706' },
                  ]}
                />
                <Text
                  style={[
                    styles.syncStatusText,
                    { color: isOnline ? '#16A34A' : '#D97706' },
                  ]}
                >
                  {isOnline ? 'En ligne' : 'Hors-ligne'}
                </Text>
              </View>
            </View>

            <View style={styles.syncRow}>
              <Text style={styles.syncLabel}>Serveur :</Text>
              <Text style={styles.syncUrlText} numberOfLines={1}>
                {apiUrl}
              </Text>
            </View>

            <View style={styles.syncRow}>
              <Text style={styles.syncLabel}>File d'attente hors-ligne :</Text>
              <Text style={styles.syncValueText}>
                {syncPendingCount > 0 ? `${syncPendingCount} action(s)` : 'À jour (0)'}
              </Text>
            </View>

            <View style={styles.syncRow}>
              <Text style={styles.syncLabel}>Dernière synchronisation :</Text>
              <Text style={styles.syncValueText}>
                {lastSyncTime ? lastSyncTime : 'Pas encore'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.syncButtonLarge, isSyncing && { opacity: 0.6 }]}
              onPress={async () => {
                await syncNow();
                Alert.alert('Synchronisation', 'Synchronisation avec Laravel terminée !');
              }}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.syncButtonText}>Synchroniser maintenant</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* AsyncStorage Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestion du stockage AsyncStorage</Text>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={handleResetDemoData}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Restaurer les données initiales</Text>
              <Text style={styles.actionSubtitle}>
                Réinitialise les 5 tâches de démonstration du sujet
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={handleClearAll}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash" size={20} color={COLORS.danger} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionTitle, { color: COLORS.danger }]}>
                Vider toutes les tâches
              </Text>
              <Text style={styles.actionSubtitle}>
                Supprime l'ensemble des données locales
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Project Info */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>À propos du projet</Text>
          <Text style={styles.aboutText}>
            TP React Native — Gestion de tâches avec composants dynamiques, FlatList, validation de
            formulaires, React Navigation et persistance locale AsyncStorage.
          </Text>
          <Text style={styles.versionText}>Version 1.0.0 • Expo SDK 58</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748B',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  statsPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  aboutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 12,
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  syncCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  syncLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  syncValueText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  syncUrlText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
    maxWidth: '55%',
  },
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  syncButtonLarge: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
