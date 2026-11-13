import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import StatCards from '../components/StatCards';
import TaskCard from '../components/TaskCard';
import SyncBanner from '../components/SyncBanner';
import { COLORS } from '../constants/theme';

/**
 * Screen 1: Accueil (Partie 4)
 * Présentation de l'application et statistiques
 */
export default function HomeScreen({ navigation }) {
  const { stats, tasks } = useTasks();

  // Get top 2 recent tasks
  const recentTasks = tasks.slice(0, 2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SyncBanner />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Presentation */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkbox-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>MyTasks</Text>
          <Text style={styles.subtitle}>Organisez vos tâches, atteignez vos objectifs !</Text>
        </View>

        {/* Statistics Cards */}
        <StatCards stats={stats} />

        {/* Main CTA Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Tâches')}
          >
            <Ionicons name="list" size={18} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Mes tâches</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.successButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TaskForm', { mode: 'add' })}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Ajouter une tâche</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Tasks Section */}
        {recentTasks.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tâches récentes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tâches')}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {recentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                variant="full"
                onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  successButton: {
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  recentSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
