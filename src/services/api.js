import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Automatically determine the backend API URL:
 * - On Web: http://127.0.0.1:8000/api
 * - On Android Emulator: http://10.0.2.2:8000/api
 * - On Physical Device via Expo Go: uses Expo host IP (e.g. 10.157.86.179)
 */
export const getApiBaseUrl = () => {
  // If running in browser
  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:8000/api';
  }

  // Extract IP from Expo host if available
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8000/api`;
  }

  // Fallback for Android emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api';
  }

  // Fallback default
  return 'http://10.157.86.179:8000/api';
};

const DEFAULT_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const taskApi = {
  /**
   * Health check to see if Laravel API is reachable
   */
  checkHealth: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/tasks`, { method: 'GET' }, 3000);
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get all tasks from Laravel
   */
  getAll: async () => {
    const baseUrl = getApiBaseUrl();
    const res = await fetchWithTimeout(`${baseUrl}/tasks`, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    return await res.json();
  },

  /**
   * Batch synchronize queued offline actions
   * @param {Array} actions [{ type: 'CREATE'|'UPDATE'|'DELETE', ... }]
   */
  syncBatch: async (actions) => {
    const baseUrl = getApiBaseUrl();
    const res = await fetchWithTimeout(`${baseUrl}/tasks/sync`, {
      method: 'POST',
      body: JSON.stringify({ actions }),
    });
    if (!res.ok) {
      throw new Error(`Sync Error: ${res.status}`);
    }
    return await res.json();
  },

  /**
   * Create task online
   */
  create: async (task) => {
    const baseUrl = getApiBaseUrl();
    const res = await fetchWithTimeout(`${baseUrl}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      throw new Error(`Create Error: ${res.status}`);
    }
    return await res.json();
  },

  /**
   * Update task online
   */
  update: async (id, changes) => {
    const baseUrl = getApiBaseUrl();
    const res = await fetchWithTimeout(`${baseUrl}/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    });
    if (!res.ok) {
      throw new Error(`Update Error: ${res.status}`);
    }
    return await res.json();
  },

  /**
   * Delete task online
   */
  delete: async (id) => {
    const baseUrl = getApiBaseUrl();
    const res = await fetchWithTimeout(`${baseUrl}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Delete Error: ${res.status}`);
    }
    return await res.json();
  },
};
