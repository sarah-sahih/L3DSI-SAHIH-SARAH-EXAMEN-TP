import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { INITIAL_TASKS } from '../data/initialTasks';
import { taskApi } from '../services/api';

const STORAGE_KEY = '@mytasks_data_v1';
const SYNC_QUEUE_KEY = '@mytasks_sync_queue_v1';
const LAST_SYNC_KEY = '@mytasks_last_sync_v1';

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPendingCount, setSyncPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Keep a ref to avoid stale closures in syncQueue processing
  const syncQueueRef = useRef([]);
  const isSyncingRef = useRef(false);

  // Helper to format date DD/MM/YYYY
  const getCurrentFormattedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper to persist tasks to AsyncStorage
  const persistTasks = async (newTasks) => {
    try {
      setTasks(newTasks);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
    } catch (error) {
      console.error('Error saving tasks to AsyncStorage:', error);
    }
  };

  // Helper to persist sync queue
  const persistSyncQueue = async (newQueue) => {
    try {
      syncQueueRef.current = newQueue;
      setSyncPendingCount(newQueue.length);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(newQueue));
    } catch (error) {
      console.error('Error saving sync queue to AsyncStorage:', error);
    }
  };

  // Enqueue an action when offline or when an API call fails
  const enqueueAction = async (action) => {
    const updatedQueue = [...syncQueueRef.current, { ...action, queuedAt: Date.now() }];
    await persistSyncQueue(updatedQueue);
  };

  /**
   * Flush the offline sync queue and synchronize with Laravel API
   */
  const flushSyncQueue = useCallback(async () => {
    if (isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      const queue = syncQueueRef.current;

      if (queue.length > 0) {
        // Send all queued operations to Laravel batch sync endpoint
        const response = await taskApi.syncBatch(queue);
        if (response && response.status === 'success') {
          // Clear queue
          await persistSyncQueue([]);
          if (Array.isArray(response.tasks)) {
            await persistTasks(response.tasks);
          }
        }
      } else {
        // No pending actions: fetch fresh tasks from Laravel
        const serverTasks = await taskApi.getAll();
        if (Array.isArray(serverTasks) && serverTasks.length > 0) {
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
  }, []);

  /**
   * Initial load: Instant local cache read, followed by background sync
   */
  const loadTasks = async () => {
    try {
      setLoading(true);

      // 1. Read local tasks first (Instant UX)
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      let localTasks = [];
      if (storedData !== null) {
        localTasks = JSON.parse(storedData);
        setTasks(localTasks);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
        setTasks(INITIAL_TASKS);
        localTasks = INITIAL_TASKS;
      }

      // 2. Read existing sync queue
      const storedQueue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (storedQueue) {
        const parsedQueue = JSON.parse(storedQueue);
        syncQueueRef.current = parsedQueue;
        setSyncPendingCount(parsedQueue.length);
      }

      // 3. Read last sync time
      const storedLastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (storedLastSync) {
        setLastSyncTime(storedLastSync);
      }

      // 4. Initial network check & sync attempt
      const net = await NetInfo.fetch();
      const online = Boolean(net.isConnected && net.isInternetReachable !== false);
      setIsOnline(online);

      if (online) {
        // Attempt background sync
        flushSyncQueue();
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks(INITIAL_TASKS);
    } finally {
      setLoading(false);
    }
  };

  // Monitor network connectivity changes
  useEffect(() => {
    loadTasks();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      // Automatically flush queue when coming back online
      if (online) {
        flushSyncQueue();
      }
    });

    return () => unsubscribe();
  }, [flushSyncQueue]);

  // CRUD Operations (Offline-First)

  const addTask = async ({ title, description, priority = 'Moyenne', status = 'À faire' }) => {
    const newTask = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'Moyenne',
      status: status || 'À faire',
      createdAt: getCurrentFormattedDate(),
    };

    // 1. Instant local update
    const updated = [newTask, ...tasks];
    await persistTasks(updated);

    // 2. Online sync or queue
    if (isOnline && syncQueueRef.current.length === 0) {
      try {
        await taskApi.create(newTask);
      } catch (err) {
        await enqueueAction({ type: 'CREATE', task: newTask });
      }
    } else {
      await enqueueAction({ type: 'CREATE', task: newTask });
    }

    return newTask;
  };

  const updateTask = async (id, updatedFields) => {
    // 1. Instant local update
    const updated = tasks.map((task) =>
      task.id === id ? { ...task, ...updatedFields } : task
    );
    await persistTasks(updated);

    // 2. Online sync or queue
    if (isOnline && syncQueueRef.current.length === 0) {
      try {
        await taskApi.update(id, updatedFields);
      } catch (err) {
        await enqueueAction({ type: 'UPDATE', id, changes: updatedFields });
      }
    } else {
      await enqueueAction({ type: 'UPDATE', id, changes: updatedFields });
    }
  };

  const deleteTask = async (id) => {
    // 1. Instant local update
    const updated = tasks.filter((task) => task.id !== id);
    await persistTasks(updated);

    // 2. Online sync or queue
    if (isOnline && syncQueueRef.current.length === 0) {
      try {
        await taskApi.delete(id);
      } catch (err) {
        await enqueueAction({ type: 'DELETE', id });
      }
    } else {
      await enqueueAction({ type: 'DELETE', id });
    }
  };

  const toggleTaskStatus = async (id) => {
    const currentTask = tasks.find((t) => t.id === id);
    if (!currentTask) return;

    const nextStatus = currentTask.status === 'Terminée' ? 'À faire' : 'Terminée';
    await updateTask(id, { status: nextStatus });
  };

  const resetToDefaultTasks = async () => {
    await persistTasks(INITIAL_TASKS);
    await persistSyncQueue([]);
    if (isOnline) {
      try {
        // Push initial tasks as creates
        const actions = INITIAL_TASKS.map((t) => ({ type: 'CREATE', task: t }));
        await taskApi.syncBatch(actions);
      } catch (e) {
        console.warn('Could not reset on server:', e.message);
      }
    }
  };

  const clearAllTasks = async () => {
    const idsToDelete = tasks.map((t) => t.id);
    await persistTasks([]);
    if (isOnline) {
      try {
        const actions = idsToDelete.map((id) => ({ type: 'DELETE', id }));
        await taskApi.syncBatch(actions);
      } catch (e) {
        console.warn('Could not clear server tasks:', e.message);
      }
    }
  };

  // Statistics calculation
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'Terminée').length,
    pending: tasks.filter((t) => t.status === 'À faire').length,
  };

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
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        resetToDefaultTasks,
        clearAllTasks,
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
