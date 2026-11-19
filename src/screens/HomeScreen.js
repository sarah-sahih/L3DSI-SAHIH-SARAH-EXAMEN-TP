import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTasks } from '../context/TaskContext';
import StatCards from '../components/StatCards';
import TaskCard from '../components/TaskCard';
import { COLORS } from '../constants/theme';
import {
  getTaskStats,
  getTasksCreatedByUser,
  getTasksObservedByUser,
} from '../utils/taskUtils';

/**
 * Screen 1: Accueil (Partie 4)
 * Présentation de l'application et statistiques
 */
export default function HomeScreen({ navigation }) {
  const { tasks, currentUser, syncNow } = useTasks();
  const ownTasks = getTasksCreatedByUser(tasks, currentUser?.id);
  const observedTasks = getTasksObservedByUser(tasks, currentUser?.id);
  const ownTaskStats = getTaskStats(ownTasks);

  useFocusEffect(
    React.useCallback(() => {
      void syncNow();
    }, [syncNow])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <StatCards stats={ownTaskStats} />

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
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tâches observées</Text>
          </View>

          {observedTasks.length > 0 ? observedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              variant="full"
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
            />
          )) : (
            <Text style={styles.emptyObservedText}>
              Vous n’êtes observateur d’aucune tâche pour le moment.
            </Text>
          )}
        </View>
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
  emptyObservedText: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    color: '#64748B',
    fontSize: 14,
  },
});
