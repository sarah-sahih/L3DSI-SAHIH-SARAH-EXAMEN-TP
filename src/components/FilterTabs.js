import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';

const FILTERS = ['Toutes', 'À faire', 'Terminées'];

/**
 * FilterTabs Component (Partie 2 & 4)
 * Allows filtering tasks by status: Toutes / À faire / Terminées
 */
export default function FilterTabs({ activeFilter, onSelectFilter }) {
  return (
    <View style={styles.container}>
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter;
        return (
          <TouchableOpacity
            key={filter}
            activeOpacity={0.8}
            onPress={() => onSelectFilter(filter)}
            style={[styles.tab, isActive ? styles.activeTab : styles.inactiveTab]}
          >
            <Text style={[styles.tabText, isActive ? styles.activeTabText : styles.inactiveTabText]}>
              {filter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  inactiveTab: {
    backgroundColor: '#F1F5F9',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  inactiveTabText: {
    color: '#64748B',
  },
});
