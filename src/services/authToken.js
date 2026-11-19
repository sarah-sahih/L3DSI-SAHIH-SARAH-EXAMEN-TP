import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'mytasks_auth_token_v1';

export const getAuthToken = () => (
  Platform.OS === 'web'
    ? AsyncStorage.getItem(TOKEN_KEY)
    : SecureStore.getItemAsync(TOKEN_KEY)
);

export const saveAuthToken = (token) => (
  Platform.OS === 'web'
    ? AsyncStorage.setItem(TOKEN_KEY, token)
    : SecureStore.setItemAsync(TOKEN_KEY, token)
);

export const clearAuthToken = () => (
  Platform.OS === 'web'
    ? AsyncStorage.removeItem(TOKEN_KEY)
    : SecureStore.deleteItemAsync(TOKEN_KEY)
);
