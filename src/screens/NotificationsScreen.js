import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { COLORS } from '../constants/theme';

export default function NotificationsScreen({ navigation }) {
  const { notifications, refreshNotifications, markNotificationRead } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    setRefreshing(true);
    setLoadError('');

    refreshNotifications({ notify: false })
      .catch((error) => {
        if (active) setLoadError(error.message);
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [refreshNotifications]));

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id);
      } catch (error) {
        Alert.alert('Notification non lue', error.message);
      }
    }

    if (notification.task_id) {
      navigation.navigate('TaskDetail', { taskId: notification.task_id });
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notification, !item.read && styles.unreadNotification]}
      testID={`notification-${item.id}`}
      activeOpacity={0.75}
      onPress={() => handleNotificationPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}`}
    >
      <View style={styles.icon}>
        <Ionicons
          name={item.read ? 'chatbubble-outline' : 'chatbubble-ellipses'}
          size={20}
          color={COLORS.primary}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        {item.task?.title ? (
          <Text style={styles.taskTitle} numberOfLines={1}>
            Tâche : {item.task.title}
          </Text>
        ) : null}
      </View>
      {!item.read ? <View style={styles.unreadDot} /> : null}
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {refreshing ? <ActivityIndicator size="small" color={COLORS.primary} /> : <View style={styles.headerSpacer} />}
      </View>

      {loadError ? (
        <Text style={styles.errorText}>Actualisation impossible : {loadError}</Text>
      ) : null}
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderNotification}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyText}>Les nouveaux commentaires apparaîtront ici.</Text>
          </View>
        }
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
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 40,
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  body: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  taskTitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    paddingHorizontal: 16,
    paddingTop: 12,
    color: COLORS.danger,
    fontSize: 13,
  },
});
