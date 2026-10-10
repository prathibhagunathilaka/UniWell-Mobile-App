import { apiFetch } from './api';

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'reminder_5m'
  | 'session_ongoing'
  | 'system';

export type AppNotification = {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  appointmentId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export const getNotifications = () =>
  apiFetch<{ notifications: AppNotification[]; unreadCount: number }>('/notifications');

export const getUnreadCount = () =>
  apiFetch<{ unreadCount: number }>('/notifications/unread-count');

export const markNotificationRead = (id: string) =>
  apiFetch<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH' });

export const markAllNotificationsRead = () =>
  apiFetch<{ message: string }>('/notifications/read-all', { method: 'PATCH' });

// NEW: device push token (phone notifications). The backend stores it against the signed-in user.
export const savePushToken = (token: string, platform: string) =>
  apiFetch<{ message: string }>('/notifications/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });

export const removePushToken = (token: string) =>
  apiFetch<{ message: string }>('/notifications/push-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
