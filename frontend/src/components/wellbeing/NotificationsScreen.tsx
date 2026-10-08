import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
    AppNotification,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '@/services/notificationService';

const icons: Record<string, string> = {
  booking_created: '＋',
  booking_confirmed: '✓',
  booking_cancelled: '✕',
  booking_completed: '★',
  reminder_24h: '⏰',
  reminder_1h: '⏰',
  system: 'ℹ',
};

type Props = {
  role: 'student' | 'counsellor';
};

// NEW (FR3): shared in-app notification centre for appointment reminders and updates.
export function NotificationsScreen({ role }: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await getNotifications();
      setItems(response.notifications);
      setUnread(response.unreadCount);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const open = async (item: AppNotification) => {
    if (!item.readAt) {
      void markNotificationRead(item._id).then(load).catch(() => undefined);
    }
    if (item.appointmentId) {
      router.push(
        role === 'student'
          ? { pathname: '/student/appointments/[id]', params: { id: item.appointmentId } }
          : { pathname: '/counsellor/appointments/[id]', params: { id: item.appointmentId } },
      );
    }
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update notifications.');
    }
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback={role === 'student' ? '/student/dashboard' : '/counsellor'} label="Back" />
      <PageHeading title="Notifications" subtitle="Appointment reminders and booking updates." />
      {unread > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => void readAll()} style={styles.readAll}>
          <Text style={styles.readAllText}>Mark all {unread} as read</Text>
        </Pressable>
      ) : null}
      {loading ? <LoadingState label="Loading notifications..." /> : null}
      <InlineMessage tone="error">{error}</InlineMessage>
      {!loading && !error && items.length === 0 ? (
        <SurfaceCard><Text style={styles.empty}>You are all caught up. Reminders appear here 24 hours and 1 hour before a session.</Text></SurfaceCard>
      ) : null}
      {items.map((item) => (
        <Pressable
          key={item._id}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.body}`}
          onPress={() => void open(item)}
          style={[styles.item, !item.readAt && styles.unread]}
        >
          <View style={styles.icon}><Text style={styles.iconText}>{icons[item.type] || 'ℹ'}</Text></View>
          <View style={styles.copy}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
          {!item.readAt ? <View style={styles.dot} /> : null}
        </Pressable>
      ))}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  readAll: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: Space.md, borderRadius: Radius.pill, backgroundColor: Colors.paleBlue },
  readAllText: { color: Colors.accent, fontSize: 13, fontWeight: '800' },
  empty: { color: Colors.muted, fontSize: 14 },
  item: { flexDirection: 'row', gap: Space.md, alignItems: 'flex-start', padding: Space.md, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  unread: { backgroundColor: Colors.paleCoral, borderColor: Colors.primary },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.secondary },
  iconText: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  copy: { flex: 1, gap: 3 },
  title: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  body: { color: Colors.accent, fontSize: 14 },
  time: { color: Colors.muted, fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 6 },
});
