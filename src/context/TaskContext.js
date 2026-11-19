import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { INITIAL_TASKS } from '../data/initialTasks';
import { authApi, taskApi, collaborationApi } from '../services/api';
import { clearAuthToken, getAuthToken, saveAuthToken } from '../services/authToken';
import { getTaskStats } from '../utils/taskUtils';
import { deleteTaskPhoto } from '../utils/photoUtils';
import { deleteTaskAttachment } from '../utils/attachmentUtils';
import {
  clearLocationReminderGeofences,
  syncLocationReminderGeofences,
  cancelDateReminder,
} from '../utils/reminderUtils';

const STORAGE_KEY = '@mytasks_data_v1';
const SYNC_QUEUE_KEY = '@mytasks_sync_queue_v1';
const LAST_SYNC_KEY = '@mytasks_last_sync_v1';
const AUTH_USER_KEY = '@mytasks_auth_user_v1';
const userStorageKey = (key, userId) => `${key}:${userId}`;

const synchronizeTaskAttachments = async (taskId, desiredAttachments = []) => {
  const task = await taskApi.getById(taskId);
  const serverAttachments = Array.isArray(task.attachments) ? task.attachments : [];
  const serverByClientId = new Map(
    serverAttachments
      .filter((attachment) => attachment.clientId)
      .map((attachment) => [attachment.clientId, attachment])
  );
  const retainedServerIds = new Set(
    desiredAttachments
      .filter((attachment) => attachment.serverId || attachment.downloadUrl)
      .map((attachment) => attachment.serverId || attachment.id)
  );

  for (const attachment of desiredAttachments) {
    const uploaded = serverByClientId.get(attachment.id);
    if (uploaded) retainedServerIds.add(uploaded.id);
  }
  for (const attachment of serverAttachments) {
    if (!retainedServerIds.has(attachment.id)) {
      await taskApi.deleteAttachment(taskId, attachment.id);
    }
  }

  const synchronized = [];
  for (const attachment of desiredAttachments) {
    if (attachment.serverId || attachment.downloadUrl) {
      synchronized.push({
        ...attachment,
        serverId: attachment.serverId || attachment.id,
      });
      continue;
    }

    const uploaded = serverByClientId.get(attachment.id)
      || await taskApi.uploadAttachment(taskId, attachment);
    synchronized.push({
      ...uploaded,
      serverId: uploaded.id,
      uri: attachment.uri,
      localId: attachment.id,
    });
  }
  return synchronized;
};

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPendingCount, setSyncPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Keep a ref to avoid stale closures in syncQueue processing
  const syncQueueRef = useRef([]);
  const isSyncingRef = useRef(false);
  const notifiedNotificationIdsRef = useRef(new Set());
  const currentUserRef = useRef(null);

  // Helper to format date DD/MM/YYYY
  const getCurrentFormattedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper to persist tasks to AsyncStorage
  const persistTasks = useCallback(async (newTasks) => {
    try {
      setTasks(newTasks);
      const userId = currentUserRef.current?.id;
      if (userId) {
        await AsyncStorage.setItem(
          userStorageKey(STORAGE_KEY, userId),
          JSON.stringify(newTasks)
        );
      }
    } catch (error) {
      console.error('Error saving tasks to AsyncStorage:', error);
    }
  }, []);

  // Helper to persist sync queue
  const persistSyncQueue = useCallback(async (newQueue) => {
    try {
      syncQueueRef.current = newQueue;
      setSyncPendingCount(newQueue.length);
      const userId = currentUserRef.current?.id;
      if (userId) {
        await AsyncStorage.setItem(
          userStorageKey(SYNC_QUEUE_KEY, userId),
          JSON.stringify(newQueue)
        );
      }
    } catch (error) {
      console.error('Error saving sync queue to AsyncStorage:', error);
    }
  }, []);

  // Enqueue an action when offline or when an API call fails
  const enqueueAction = async (action) => {
    const updatedQueue = [...syncQueueRef.current, { ...action, queuedAt: Date.now() }];
    await persistSyncQueue(updatedQueue);
  };

  /**
   * Flush the offline sync queue and synchronize with Laravel API
   */
  const flushSyncQueue = useCallback(async (userId = currentUserRef.current?.id || null) => {
    if (isSyncingRef.current || !userId) return;

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      const queue = [...syncQueueRef.current];

      if (queue.length > 0) {
        // Send all queued operations to Laravel batch sync endpoint
        const response = await taskApi.syncBatch(queue);
        if (response && response.status === 'success') {
          let synchronizedTasks = response.tasks;
          if (Array.isArray(synchronizedTasks)) {
            for (const action of queue) {
              const taskId = action.type === 'CREATE'
                ? action.task?.id
                : action.type === 'UPDATE' ? action.id : null;
              const desiredAttachments = action.type === 'CREATE'
                ? action.task?.attachments
                : action.type === 'UPDATE' ? action.changes?.attachments : null;
              if (
                !taskId
                || !Array.isArray(desiredAttachments)
                || !synchronizedTasks.some((task) => task.id === taskId)
              ) {
                continue;
              }

              const attachments = await synchronizeTaskAttachments(taskId, desiredAttachments);
              synchronizedTasks = synchronizedTasks.map((task) =>
                task.id === taskId ? { ...task, attachments } : task
              );
            }
          }

          // Remove only the actions included in this request. Actions queued
          // while the request was in flight must remain pending.
          const remainingQueue = syncQueueRef.current.filter(
            (action) => !queue.includes(action)
          );
          await persistSyncQueue(remainingQueue);
          if (remainingQueue.length === 0 && Array.isArray(synchronizedTasks)) {
            await persistTasks(synchronizedTasks);
          }
        }
      } else {
        // No pending actions: fetch fresh tasks from Laravel
        const serverTasks = await taskApi.getAll();
        if (syncQueueRef.current.length === 0 && Array.isArray(serverTasks)) {
          await persistTasks(serverTasks);
        }
      }

      const syncTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(syncTimestamp);
      await AsyncStorage.setItem(LAST_SYNC_KEY, syncTimestamp);
    } catch (error) {
      console.log('Sync with Laravel skipped or failed (offline/unreachable):', error.message);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [persistSyncQueue, persistTasks]);

  /**
   * Initial load: Instant local cache read, followed by background sync
   */
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        await clearLocationReminderGeofences().catch(() => {});
        currentUserRef.current = null;
        setCurrentUser(null);
        setUsers([]);
        setTasks([]);
        setNotifications([]);
        syncQueueRef.current = [];
        setSyncPendingCount(0);
        return;
      }

      const cachedUserValue = await AsyncStorage.getItem(AUTH_USER_KEY);
      let user = cachedUserValue ? JSON.parse(cachedUserValue) : null;
      try {
        user = await authApi.me();
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } catch (error) {
        if (error.status === 401) {
          await clearAuthToken();
          await AsyncStorage.removeItem(AUTH_USER_KEY);
          await clearLocationReminderGeofences().catch(() => {});
          currentUserRef.current = null;
          setCurrentUser(null);
          setUsers([]);
          setTasks([]);
          setNotifications([]);
          syncQueueRef.current = [];
          setSyncPendingCount(0);
          return;
        }
        if (!user) throw error;
      }

      currentUserRef.current = user;
      setCurrentUser(user);
      collaborationApi.getUsers().then(setUsers).catch(() => {});
      collaborationApi.getNotifications().then(setNotifications).catch(() => {});

      const storedData = await AsyncStorage.getItem(userStorageKey(STORAGE_KEY, user.id));
      setTasks(storedData ? JSON.parse(storedData) : []);

      const storedQueue = await AsyncStorage.getItem(userStorageKey(SYNC_QUEUE_KEY, user.id));
      const parsedQueue = storedQueue ? JSON.parse(storedQueue) : [];
      syncQueueRef.current = parsedQueue;
      setSyncPendingCount(parsedQueue.length);

      const storedLastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (storedLastSync) {
        setLastSyncTime(storedLastSync);
      }

      const net = await NetInfo.fetch();
      const online = Boolean(net.isConnected && net.isInternetReachable !== false);
      setIsOnline(online);

      if (online) {
        void flushSyncQueue(user.id);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [flushSyncQueue]);

  const authenticate = async (method, name, email, password, passwordConfirmation) => {
    const result = method === 'register'
      ? await authApi.register(name, email, password, passwordConfirmation)
      : await authApi.login(email, password);
    await saveAuthToken(result.token);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
    await loadTasks();
  };

  const logout = async () => {
    let logoutError = null;
    try {
      await authApi.logout();
    } catch (error) {
      if (error.status !== 401) logoutError = error;
    } finally {
      await clearLocationReminderGeofences().catch(() => {});
      await clearAuthToken();
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      currentUserRef.current = null;
      setCurrentUser(null);
      setUsers([]);
      setTasks([]);
      setNotifications([]);
      syncQueueRef.current = [];
      setSyncPendingCount(0);
    }
    if (logoutError) throw logoutError;
  };

  // Monitor network connectivity changes
  useEffect(() => {
    queueMicrotask(() => {
      void loadTasks();
    });
    let didMount = true;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      // Automatically flush queue when coming back online
      if (online && didMount) {
        void flushSyncQueue();
      }
    });

    return () => {
      didMount = false;
      unsubscribe();
    };
  }, [flushSyncQueue, loadTasks]);

  useEffect(() => {
    if (!currentUser) return;
    void syncLocationReminderGeofences(tasks, currentUser.id).catch((error) => {
      console.error('Unable to synchronize location reminders:', error);
    });
  }, [tasks, currentUser]);

  // CRUD Operations (Offline-First)

  const addTask = async ({
    id,
    title,
    description,
    priority = 'Moyenne',
    status = 'À faire',
    photoUri = null,
    attachments = [],
    observerIds = [],
    reminderAt = null,
    locationReminder = null,
    dateNotificationId = null,
  }) => {
    const newTask = {
      id: id || Date.now().toString(),
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'Moyenne',
      status: status || 'À faire',
      createdAt: getCurrentFormattedDate(),
      photoUri,
      attachments,
      creatorId: currentUser?.id || null,
      observerIds,
      reminderAt,
      locationReminder,
      dateNotificationId,
    };

    // 1. Instant local update
    const updated = [newTask, ...tasks];
    await persistTasks(updated);

    // 2. Online sync or queue
    if (isOnline && syncQueueRef.current.length === 0) {
      try {
        await taskApi.create(newTask);
        if (attachments.length > 0) {
          newTask.attachments = await synchronizeTaskAttachments(newTask.id, attachments);
          await persistTasks([newTask, ...tasks]);
        }
      } catch (_err) {
        await enqueueAction({ type: 'CREATE', task: newTask });
      }
    } else {
      await enqueueAction({ type: 'CREATE', task: newTask });
    }

    return newTask;
  };

  const updateTask = async (id, updatedFields) => {
    // 1. Instant local update
    const existingTask = tasks.find((task) => task.id === id);
    if (
      existingTask
      && Number(existingTask.creatorId ?? existingTask.creator_id) !== Number(currentUser?.id)
    ) {
      return false;
    }
    const updated = tasks.map((task) =>
      task.id === id ? { ...task, ...updatedFields } : task
    );
    await persistTasks(updated);
    if (
      existingTask?.photoUri
      && Object.prototype.hasOwnProperty.call(updatedFields, 'photoUri')
      && existingTask.photoUri !== updatedFields.photoUri
    ) {
      await deleteTaskPhoto(existingTask.photoUri);
    }

    // 2. Online sync or queue
    if (isOnline && syncQueueRef.current.length === 0) {
      try {
        await taskApi.update(id, updatedFields);
        if (Object.prototype.hasOwnProperty.call(updatedFields, 'attachments')) {
          const synchronizedAttachments = await synchronizeTaskAttachments(
            id,
            updatedFields.attachments || []
          );
          await persistTasks(updated.map((task) =>
            task.id === id ? { ...task, attachments: synchronizedAttachments } : task
          ));
        }
      } catch (_err) {
        await enqueueAction({ type: 'UPDATE', id, changes: updatedFields });
      }
    } else {
      await enqueueAction({ type: 'UPDATE', id, changes: updatedFields });
    }
    return true;
  };

  const deleteTask = async (id) => {
    const taskToDelete = tasks.find((task) => task.id === id);
    if (
      taskToDelete
      && Number(taskToDelete.creatorId ?? taskToDelete.creator_id) !== Number(currentUser?.id)
    ) {
      return false;
    }
    // 1. Instant local update
    const updated = tasks.filter((task) => task.id !== id);
    await persistTasks(updated);
    if (taskToDelete?.photoUri) {
      await deleteTaskPhoto(taskToDelete.photoUri);
    }
    if (taskToDelete?.dateNotificationId) {
      await cancelDateReminder(taskToDelete.dateNotificationId);
    }
    if (Array.isArray(taskToDelete?.attachments)) {
      await Promise.all(
        taskToDelete.attachments.map((attachment) => deleteTaskAttachment(attachment))
      );
    }

    // 2. Online sync or queue
    if (isOnline && syncQueueRef.current.length === 0) {
      try {
        await taskApi.delete(id);
      } catch (_err) {
        await enqueueAction({ type: 'DELETE', id });
      }
    } else {
      await enqueueAction({ type: 'DELETE', id });
    }
    return true;
  };

  const toggleTaskStatus = async (id) => {
    const currentTask = tasks.find((t) => t.id === id);
    if (!currentTask) return;

    const nextStatus = currentTask.status === 'Terminée' ? 'À faire' : 'Terminée';
    await updateTask(id, { status: nextStatus });
  };

  const resetToDefaultTasks = async () => {
    const visibleInitialTasks = INITIAL_TASKS.map((task) => ({
      ...task,
      creatorId: currentUser?.id || null,
      observerIds: [],
    }));
    await persistTasks(visibleInitialTasks);
    const resetAction = { type: 'REPLACE', tasks: visibleInitialTasks };

    if (isOnline && syncQueueRef.current.length === 0) {
      try {
        const response = await taskApi.syncBatch([resetAction]);
        if (response && response.status === 'success') {
          await persistSyncQueue([]);
        }
      } catch (_e) {
        await enqueueAction(resetAction);
      }
    } else {
      await enqueueAction(resetAction);
    }
  };

  const clearAllTasks = async () => {
    await persistTasks([]);

    const clearAction = { type: 'CLEAR' };
    if (isOnline && syncQueueRef.current.length === 0) {
      try {
        const response = await taskApi.syncBatch([clearAction]);
        if (response && response.status === 'success') {
          await persistSyncQueue([]);
        }
      } catch (_e) {
        await enqueueAction(clearAction);
      }
    } else {
      await enqueueAction(clearAction);
    }
  };

  const refreshNotifications = useCallback(async ({ notify = true } = {}) => {
    if (!currentUser) return [];
    const userNotifications = await collaborationApi.getNotifications();
    setNotifications(userNotifications);

    if (notify && Platform.OS !== 'web') {
      const currentPermission = await Notifications.getPermissionsAsync();
      const permission = currentPermission.status === 'granted'
        ? currentPermission
        : await Notifications.requestPermissionsAsync();
      if (permission.status === 'granted') {
        for (const notification of userNotifications) {
          if (
            !notification.read
            && !notifiedNotificationIdsRef.current.has(notification.id)
          ) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: notification.title,
                body: notification.body,
                data: {
                  taskId: notification.task_id,
                  notificationId: notification.id,
                },
              },
              trigger: null,
            });
            notifiedNotificationIdsRef.current.add(notification.id);
          }
        }
      }
    }
    return userNotifications;
  }, [currentUser]);

  const markNotificationRead = useCallback(async (notificationId) => {
    if (!currentUser) return;
    await collaborationApi.markNotificationRead(notificationId);
    setNotifications((current) => current.map((notification) =>
      notification.id === notificationId ? { ...notification, read: true } : notification
    ));
  }, [currentUser]);

  // Statistics calculation
  const stats = getTaskStats(tasks);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        stats,
        isOnline,
        isSyncing,
        syncPendingCount,
        lastSyncTime,
        syncNow: flushSyncQueue,
        loadTasks,
        authenticate,
        logout,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        resetToDefaultTasks,
        clearAllTasks,
        users,
        currentUser,
        notifications,
        refreshNotifications,
        markNotificationRead,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
