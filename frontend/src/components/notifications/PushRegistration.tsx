import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { loadNotifications, registerForPushNotifications } from '@/services/pushService';

// Renders nothing. Registers the phone for push after sign-in and opens the Notifications screen
// when the person taps a notification. Does nothing in Expo Go.
export function PushRegistration() {
  const { isAuthenticated, user } = useAuth();
  const role = user?.role;

  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications().catch((error) => {
      console.info('[PUSH] registration skipped:', error?.message || error);
    });
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    let subscription: { remove: () => void } | undefined;

    loadNotifications().then((Notifications) => {
      if (!Notifications || !active) return;
      subscription = Notifications.addNotificationResponseReceivedListener(() => {
        if (role === 'student') router.push('/student/notifications');
        else if (role === 'counsellor') router.push('/counsellor/notifications');
      });
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [role]);

  return null;
}
