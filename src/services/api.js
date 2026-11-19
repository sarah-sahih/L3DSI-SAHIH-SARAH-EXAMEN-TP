import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getAuthToken } from './authToken';

/**
 * Automatically determine the backend API URL:
 * - EXPO_PUBLIC_API_URL takes precedence when configured.
 * - On Web: http://127.0.0.1:8000/api
 * - On Android Emulator: http://10.0.2.2:8000/api
 * - On Physical Device via Expo Go: uses the Expo host IP.
 */
export const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

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

  // Fallback for iOS simulator and local development
  return 'http://127.0.0.1:8000/api';
};

const DEFAULT_TIMEOUT_MS = 10000;

const withoutAttachments = (task) => {
  const serverTask = { ...task };
  delete serverTask.attachments;
  delete serverTask.photoUri;
  return serverTask;
};

const sanitizeSyncAction = (action) => {
  if (action.type === 'CREATE' && action.task) {
    return { ...action, task: withoutAttachments(action.task) };
  }
  if (action.type === 'UPDATE' && action.changes) {
    return { ...action, changes: withoutAttachments(action.changes) };
  }
  if (action.type === 'REPLACE' && Array.isArray(action.tasks)) {
    return {
      ...action,
      tasks: action.tasks.map(withoutAttachments),
    };
  }
  return action;
};

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS, fetcher = fetch) {
  const { authenticated = true, ...requestOptions } = options;
  const token = authenticated ? await getAuthToken() : null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData;

  try {
    const response = await fetcher(url, {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestOptions.headers || {}),
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
      const healthUrl = `${baseUrl.replace(/\/api$/, '')}/up`;
      const res = await fetchWithTimeout(
        healthUrl,
        { method: 'GET', authenticated: false },
        3000
      );
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
    const res = await fetchWithTimeout(`${baseUrl}/tasks`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    return await res.json();
  },

  getById: async (id) => {
    const res = await fetchWithTimeout(`${getApiBaseUrl()}/tasks/${id}`);
    if (!res.ok) throw new Error(`Task Error: ${res.status}`);
    return res.json();
  },

  uploadAttachment: async (taskId, attachment) => {
    const formData = new FormData();
    formData.append('name', attachment.name);
    formData.append('clientId', attachment.id);
    formData.append('isPhoto', attachment.isPhoto ? '1' : '0');
    let uploadFetcher = fetch;

    if (Platform.OS === 'web') {
      const fileResponse = await fetch(attachment.uri);
      if (!fileResponse.ok) throw new Error('Impossible de lire le fichier sélectionné.');
      formData.append('file', await fileResponse.blob(), attachment.name);
    } else {
      const [{ File }, { fetch: expoFetch }] = await Promise.all([
        import('expo-file-system'),
        import('expo/fetch'),
      ]);
      formData.append('file', new File(attachment.uri), attachment.name);
      uploadFetcher = expoFetch;
    }

    const response = await fetchWithTimeout(
      `${getApiBaseUrl()}/tasks/${taskId}/attachments`,
      { method: 'POST', body: formData },
      60000,
      uploadFetcher
    );
    if (!response.ok) throw new Error(`Upload Error: ${response.status}`);
    return (await response.json()).attachment;
  },

  deleteAttachment: async (taskId, attachmentId) => {
    const response = await fetchWithTimeout(
      `${getApiBaseUrl()}/tasks/${taskId}/attachments/${attachmentId}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(`Attachment Delete Error: ${response.status}`);
    return response.json();
  },

  downloadAttachment: async (attachment) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Session expirée.');
    const downloadUrl = attachment.downloadUrl.startsWith('http')
      ? attachment.downloadUrl
      : `${getApiBaseUrl()}${attachment.downloadUrl}`;

    if (Platform.OS === 'web') {
      const response = await fetchWithTimeout(
        downloadUrl,
        { method: 'GET', headers: { Accept: '*/*' } },
        60000
      );
      if (!response.ok) throw new Error(`Download Error: ${response.status}`);
      return URL.createObjectURL(await response.blob());
    }

    const { File, Paths } = await import('expo-file-system');
    const safeName = attachment.name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
    const destination = new File(Paths.cache, `${Date.now()}-${safeName}`);
    const file = await File.downloadFileAsync(downloadUrl, destination, {
      headers: { Authorization: `Bearer ${token}` },
      idempotent: true,
    });
    return file.uri;
  },

  /**
   * Batch synchronize queued offline actions
   * @param {Array} actions [{ type: 'CREATE'|'UPDATE'|'DELETE'|'CLEAR'|'REPLACE', ... }]
   */
  syncBatch: async (actions) => {
    const baseUrl = getApiBaseUrl();
    const res = await fetchWithTimeout(`${baseUrl}/tasks/sync`, {
      method: 'POST',
      body: JSON.stringify({ actions: actions.map(sanitizeSyncAction) }),
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
      body: JSON.stringify(withoutAttachments(task)),
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
      body: JSON.stringify(withoutAttachments(changes)),
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

export const collaborationApi = {
  getUsers: async () => {
    const response = await fetchWithTimeout(`${getApiBaseUrl()}/users`);
    if (!response.ok) throw new Error(`Users Error: ${response.status}`);
    return response.json();
  },

  getDetails: async (taskId) => {
    const response = await fetchWithTimeout(
      `${getApiBaseUrl()}/tasks/${taskId}/collaboration`
    );
    if (!response.ok) throw new Error(`Collaboration Error: ${response.status}`);
    return response.json();
  },

  updateObservers: async (taskId, observerIds) => {
    const response = await fetchWithTimeout(
      `${getApiBaseUrl()}/tasks/${taskId}/observers`,
      {
        method: 'PUT',
        body: JSON.stringify({ observerIds }),
      }
    );
    if (!response.ok) throw new Error(`Observers Error: ${response.status}`);
    return response.json();
  },

  addComment: async (taskId, body) => {
    const response = await fetchWithTimeout(
      `${getApiBaseUrl()}/tasks/${taskId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      }
    );
    if (!response.ok) throw new Error(`Comment Error: ${response.status}`);
    return response.json();
  },

  getNotifications: async () => {
    const response = await fetchWithTimeout(
      `${getApiBaseUrl()}/notifications`
    );
    if (!response.ok) throw new Error(`Notifications Error: ${response.status}`);
    return response.json();
  },

  markNotificationRead: async (notificationId) => {
    const response = await fetchWithTimeout(
      `${getApiBaseUrl()}/notifications/${notificationId}/read`,
      {
        method: 'PUT',
      }
    );
    if (!response.ok) throw new Error(`Notification Error: ${response.status}`);
    return response.json();
  },
};

const authRequest = async (endpoint, payload) => {
  const response = await fetchWithTimeout(`${getApiBaseUrl()}/${endpoint}`, {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors).flat()[0]
      : null;
    const error = new Error(validationMessage || result.message || 'Impossible de se connecter.');
    error.status = response.status;
    throw error;
  }
  return result;
};

export const authApi = {
  login: (email, password) => authRequest('login', { email, password }),
  register: (name, email, password, passwordConfirmation) => authRequest('register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  }),
  me: async () => {
    const response = await fetchWithTimeout(`${getApiBaseUrl()}/user`);
    if (!response.ok) {
      const error = new Error(`Session invalide (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  },
  logout: async () => {
    const response = await fetchWithTimeout(`${getApiBaseUrl()}/logout`, { method: 'POST' });
    if (!response.ok) {
      const error = new Error(`Déconnexion impossible (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  },
};
