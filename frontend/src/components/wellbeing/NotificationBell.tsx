import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WellbeingColors as Colors, WellbeingRadius as Radius } from '@/constants/wellbeingTheme';
import { getUnreadCount } from '@/services/notificationService';

// CHANGED: standard bell icon; also usable for admin (no notifications screen yet, so it is a dummy there).
export function NotificationBell({ role }: { role: 'student' | 'counsellor' | 'admin' }) {
  const [count, setCount] = useState(0);
  const hasInbox = role !== 'admin';

  useEffect(() => {
    if (!hasInbox) return;
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
  }, [hasInbox]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `Notifications, ${count} unread` : 'Notifications'}
      onPress={() => {
        if (hasInbox) router.push(role === 'student' ? '/student/notifications' : '/counsellor/notifications');
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="notifications-outline" size={22} color={Colors.accent} />
      {count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 42, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  pressed: { opacity: 0.7 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  badgeText: { color: Colors.accent, fontSize: 10, fontWeight: '900' },
});
