import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'uniwell.auth.token';

export const readStoredAuthToken = async () => {
  if (Platform.OS === 'web') {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(AUTH_TOKEN_KEY);
  }

  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
};

export const storeAuthToken = async (token: string) => {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage === 'undefined') {
      throw new Error('Secure browser session storage is unavailable.');
    }
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
};

export const removeStoredAuthToken = async () => {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
};
