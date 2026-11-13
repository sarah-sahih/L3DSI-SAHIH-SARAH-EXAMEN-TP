import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';

export default function SyncBanner() {
  const { isOnline, isSyncing, syncPendingCount, lastSyncTime, syncNow } = useTasks();

  return (
    <View style={[styles.container, isOnline ? styles.onlineBg : styles.offlineBg]}>
      <View style={styles.leftSection}>
        <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
        <Text style={styles.statusText}>
          {isOnline ? 'En ligne (Laravel API)' : 'Mode hors-ligne (Local)'}
        </Text>

        {syncPendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>
              {syncPendingCount} en attente
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.syncButton}
        onPress={syncNow}
        disabled={isSyncing}
        activeOpacity={0.7}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          <View style={styles.syncButtonContent}>
            <Ionicons name="sync-outline" size={14} color="#475569" style={styles.syncIcon} />
            <Text style={styles.lastSyncText}>
              {lastSyncTime ? lastSyncTime : 'Sync'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  onlineBg: {
    backgroundColor: '#F0FDF4',
  },
  offlineBg: {
    backgroundColor: '#FFFBEB',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: '#16A34A',
  },
  offlineDot: {
    backgroundColor: '#D97706',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  syncButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  syncButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIcon: {
    marginRight: 4,
  },
  lastSyncText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
