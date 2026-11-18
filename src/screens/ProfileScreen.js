import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTasks } from '../context/TaskContext';
import { COLORS } from '../constants/theme';
import { getTaskStats, getTasksCreatedByUser } from '../utils/taskUtils';

/**
 * Screen 5: Profil (4ème onglet de navigation)
 * Informations utilisateur et statistiques globales
 */
export default function ProfileScreen({ navigation }) {
  const {
    tasks,
    currentUser,
    logout,
    notifications,
    syncNow,
  } = useTasks();
  const ownTasks = getTasksCreatedByUser(tasks, currentUser?.id);
  const ownTaskStats = getTaskStats(ownTasks);
  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;

  useFocusEffect(
    React.useCallback(() => {
      void syncNow();
    }, [syncNow])
  );

  const completionRate =
    ownTaskStats.total > 0
      ? Math.round((ownTaskStats.completed / ownTaskStats.total) * 100)
      : 0;

  const handleLogout = () => {
    logout().catch((error) => {
      Alert.alert('Déconnexion locale effectuée', error.message);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.name}>{currentUser?.name || 'Utilisateur MyTasks'}</Text>
          <Text style={styles.email}>{currentUser?.email || 'etudiant@universite.fr'}</Text>
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
              <Text style={styles.statValue}>{ownTaskStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.stats.completed.text }]}>
                {ownTaskStats.completed}
              </Text>
              <Text style={styles.statLabel}>Terminées</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.stats.pending.text }]}>
                {ownTaskStats.pending}
              </Text>
              <Text style={styles.statLabel}>À faire</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Centre de notifications</Text>
              <Text style={styles.actionSubtitle}>
                {unreadNotificationCount > 0
                  ? `${unreadNotificationCount} notification(s) non lue(s)`
                  : 'Consulter les commentaires et rappels'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionTitle, { color: COLORS.danger }]}>Se déconnecter</Text>
              <Text style={styles.actionSubtitle}>Fermer cette session sur cet appareil</Text>
            </View>
          </TouchableOpacity>
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
  activeUserRow: {
    backgroundColor: '#EFF6FF',
  },
  unreadNotification: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});
