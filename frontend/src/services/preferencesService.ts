import { apiFetch } from './api';

export type Preferences = {
  pushEnabled: boolean;
  remindersEnabled: boolean;
};

export const getPreferences = () =>
  apiFetch<{ preferences: Preferences }>('/auth/preferences').then((response) => response.preferences);

export const updatePreferences = (changes: Partial<Preferences>) =>
  apiFetch<{ preferences: Preferences }>('/auth/preferences', {
    method: 'PATCH',
    body: JSON.stringify(changes),
  }).then((response) => response.preferences);

// Invalidates every sign-in for this account (all devices, including this one).
export const logoutAllDevices = () => apiFetch<{ message: string }>('/auth/logout-all', { method: 'POST' });
