import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

/**
 * StatCards Component (Partie 2 & 4)
 * Displays 3 summary cards: Total, Terminées, À faire
 */
export default function StatCards({ stats }) {
  const { total = 0, completed = 0, pending = 0 } = stats || {};

  return (
    <View style={styles.container}>
      {/* Total Card */}
      <View style={[styles.card, { backgroundColor: COLORS.stats.total.background }]}>
        <Text style={[styles.label, { color: COLORS.stats.total.label }]}>Total</Text>
        <Text style={[styles.count, { color: COLORS.stats.total.text }]}>{total}</Text>
      </View>

      {/* Terminées Card */}
      <View style={[styles.card, { backgroundColor: COLORS.stats.completed.background }]}>
        <Text style={[styles.label, { color: COLORS.stats.completed.label }]}>Terminées</Text>
        <Text style={[styles.count, { color: COLORS.stats.completed.text }]}>{completed}</Text>
      </View>

      {/* À faire Card */}
      <View style={[styles.card, { backgroundColor: COLORS.stats.pending.background }]}>
        <Text style={[styles.label, { color: COLORS.stats.pending.label }]}>À faire</Text>
        <Text style={[styles.count, { color: COLORS.stats.pending.text }]}>{pending}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  card: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  count: {
    fontSize: 22,
    fontWeight: '800',
  },
});
