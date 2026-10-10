import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { removePushToken, savePushToken } from './notificationService';

// Push needs a development build. Inside Expo Go (or on web) every function here quietly does nothing,
// so the app keeps working exactly as before for anyone still using Expo Go.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

let currentToken: string | null = null;
let handlerInstalled = false;

export const loadNotifications = async (): Promise<NotificationsModule | null> => {
  if (Platform.OS === 'web' || isExpoGo) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
};

// Registers this phone for push and sends its token to the backend. Returns the token, or null if
// push is unavailable here (Expo Go, emulator, permission denied, project not linked to EAS).
export const registerForPushNotifications = async (): Promise<string | null> => {
  const Notifications = await loadNotifications();
  if (!Notifications || !Device.isDevice) return null;

  if (!handlerInstalled) {
    // Show the notification as a banner even while the app is open.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerInstalled = true;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'UniWell',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    console.info('[PUSH] permission not granted');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('[PUSH] no EAS projectId found. Run "eas init" and rebuild the development build.');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await savePushToken(token, Platform.OS);
  currentToken = token;
  console.info('[PUSH] registered');
  return token;
};

// Called on sign-out so the previous user stops receiving notifications on this phone.
// Never blocks sign-out for more than 3 seconds and never throws.
export const unregisterPushToken = async (): Promise<void> => {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  try {
    await Promise.race([
      removePushToken(token),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch {
    // ignore: the backend also moves a token to whoever signs in next on this phone
  }
};
