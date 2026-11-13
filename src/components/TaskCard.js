import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

/**
 * TaskCard Component (Partie 1)
 *
 * Props:
 * - task: { id, title, description, priority, status, createdAt }
 * - onPress: function called when card is clicked
 * - onToggleStatus: optional function called when status badge is clicked
 * - variant: 'full' (with description and date) or 'compact' (as seen in list)
 */
export default function TaskCard({ task, onPress, onToggleStatus, variant = 'full' }) {
  if (!task) return null;

  const { title, description, priority = 'Moyenne', status = 'À faire', createdAt } = task;

  const priorityStyle = COLORS.priority[priority] || COLORS.priority.Moyenne;
  const statusStyle = COLORS.status[status] || COLORS.status['À faire'];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.cardContainer,
        { borderLeftColor: priorityStyle.color, borderLeftWidth: 5 },
      ]}
    >
      <View style={styles.contentContainer}>
        {/* Title and Badges */}
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={styles.chevron} />
        </View>

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: priorityStyle.background }]}>
            <Text style={[styles.badgeText, { color: priorityStyle.color }]}>
              {priority}
            </Text>
          </View>

          <TouchableOpacity
            disabled={!onToggleStatus}
            onPress={onToggleStatus ? () => onToggleStatus(task.id) : undefined}
            style={[styles.badge, { backgroundColor: statusStyle.background }]}
          >
            <Text style={[styles.badgeText, { color: statusStyle.color }]}>
              {status}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description (if present and in full mode) */}
        {variant === 'full' && description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        {/* Date Row (if present and in full mode) */}
        {variant === 'full' && createdAt ? (
          <View style={styles.footerRow}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
              <Text style={styles.dateText}>Créée le {createdAt}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginVertical: 6,
    marginHorizontal: 16,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    paddingRight: 8,
  },
  chevron: {
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
