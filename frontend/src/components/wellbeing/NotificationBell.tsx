import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WellbeingColors as Colors, WellbeingRadius as Radius } from '@/constants/wellbeingTheme';
import { getUnreadCount } from '@/services/notificationService';

// NEW: bell with an unread badge, polled every 60s.
export function NotificationBell({ role }: { role: 'student' | 'counsellor' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      getUnreadCount().then((r) => active && setCount(r.unreadCount)).catch(() => undefined);
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `Notifications, ${count} unread` : 'Notifications'}
      onPress={() => router.push(role === 'student' ? '/student/notifications' : '/counsellor/notifications')}
      style={styles.button}
    >
      <Text style={styles.glyph}>🔔</Text>
      {count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  glyph: { fontSize: 18 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  badgeText: { color: Colors.accent, fontSize: 10, fontWeight: '900' },
});
