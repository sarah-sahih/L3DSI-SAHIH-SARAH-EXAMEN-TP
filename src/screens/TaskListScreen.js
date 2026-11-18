import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import StatCards from '../components/StatCards';
import SearchBar from '../components/SearchBar';
import FilterTabs from '../components/FilterTabs';
import TaskCard from '../components/TaskCard';
import { COLORS } from '../constants/theme';
import { filterTasks, getTaskStats, getTasksCreatedByUser } from '../utils/taskUtils';

/**
 * Screen 2: Liste des tâches (Partie 2 & Partie 4)
 * Affichage dynamique avec FlatList, filtres, recherche et statistiques
 */
export default function TaskListScreen({ navigation }) {
  const { tasks, syncNow, toggleTaskStatus, currentUser } = useTasks();
  const ownTasks = useMemo(
    () => getTasksCreatedByUser(tasks, currentUser?.id),
    [tasks, currentUser?.id]
  );
  const ownTaskStats = getTaskStats(ownTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Toutes');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncNow();
    setRefreshing(false);
  };

  // Filter & Search logic
  const filteredTasks = useMemo(() => {
    return filterTasks(ownTasks, activeFilter, searchQuery);
  }, [ownTasks, activeFilter, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes tâches</Text>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('TaskForm', { mode: 'add' })}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Stat Cards */}
            <StatCards stats={ownTaskStats} />

            {/* Search Bar */}
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher une tâche..."
            />

            {/* Filter Tabs */}
            <FilterTabs activeFilter={activeFilter} onSelectFilter={setActiveFilter} />

            {/* Results count label */}
            <View style={styles.countRow}>
              <Text style={styles.countText}>
                {filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''}{' '}
                {activeFilter !== 'Toutes' ? `(${activeFilter.toLowerCase()})` : ''}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            variant="compact"
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
            onToggleStatus={
              Number(item.creatorId ?? item.creator_id) === Number(currentUser?.id)
                ? toggleTaskStatus
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucune tâche trouvée</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Essayez de modifier votre recherche'
                : 'Vous n’avez pas encore créé de tâche. Appuyez sur + pour en ajouter une.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  countRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
