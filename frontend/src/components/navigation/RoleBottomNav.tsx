import { Href, router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WellbeingColors as Colors } from '@/constants/wellbeingTheme';
import { useAuth } from '@/contexts/AuthContext';
import { getUnreadCount } from '@/services/notificationService';

type Role = 'student' | 'counsellor' | 'admin';

type Tab = {
  key: string;
  label: string;
  glyph: string;
  href?: Href;
  // Path prefixes that keep this tab highlighted (so sub-screens still show where you are).
  match?: string[];
  exact?: string[];
  action?: 'logout';
  badge?: 'unread';
};

// NEW: one constant bottom bar for every signed-in screen, with tabs chosen by role.
const TABS: Record<Role, Tab[]> = {
  student: [
    { key: 'home', label: 'Home', glyph: '🏠', href: '/student/dashboard', match: ['/student/dashboard', '/student/index', '/student/profile', '/student/resource', '/student/resources', '/student/support', '/student/trusted-person', '/student/notifications'], exact: ['/student'] },
    { key: 'checkin', label: 'Check-in', glyph: '📝', href: '/student/check-in', match: ['/student/check-in', '/student/check-in-history', '/student/check-in-result'] },
    { key: 'book', label: 'Counsellors', glyph: '🔎', href: '/student/counselling', match: ['/student/counselling'] },
    { key: 'sessions', label: 'Sessions', glyph: '📅', href: '/student/appointments', match: ['/student/appointments'] },
    { key: 'help', label: 'Help now', glyph: '🆘', href: '/student/emergency', match: ['/student/emergency'] },
  ],
  counsellor: [
    { key: 'home', label: 'Home', glyph: '🏠', href: '/counsellor', exact: ['/counsellor'], match: ['/counsellor/appointments'] },
    { key: 'calendar', label: 'Calendar', glyph: '📅', href: '/counsellor/calendar', match: ['/counsellor/calendar'] },
    { key: 'availability', label: 'Availability', glyph: '🕒', href: '/counsellor/availability', match: ['/counsellor/availability'] },
    { key: 'sync', label: 'Sync', glyph: '🔄', href: '/counsellor/sync', match: ['/counsellor/sync'] },
    { key: 'alerts', label: 'Alerts', glyph: '🔔', href: '/counsellor/notifications', match: ['/counsellor/notifications'], badge: 'unread' },
  ],
  admin: [
    { key: 'approvals', label: 'Approvals', glyph: '🛡️', href: '/admin', exact: ['/admin'] },
    { key: 'reports', label: 'Reports', glyph: '📊', href: '/admin/reports', match: ['/admin/reports'] },
    { key: 'logout', label: 'Sign out', glyph: '🚪', action: 'logout' },
  ],
};

const isActive = (tab: Tab, pathname: string) =>
  Boolean(tab.exact?.includes(pathname)) ||
  Boolean(tab.match?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)));

const roleOfPath = (pathname: string): Role | null =>
  pathname === '/student' || pathname.startsWith('/student/')
    ? 'student'
    : pathname === '/counsellor' || pathname.startsWith('/counsellor/')
      ? 'counsellor'
      : pathname === '/admin' || pathname.startsWith('/admin/')
        ? 'admin'
        : null;

export function RoleBottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const pathRole = roleOfPath(pathname);
  const role = user && token && pathRole === user.role ? (user.role as Role) : null;

  // Hide the bar while the keyboard is open so forms keep their room.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Unread badge for the Alerts tab (counsellors); refreshed on navigation and every minute.
  useEffect(() => {
    if (role !== 'counsellor') return;
    let active = true;
    const refresh = () => {
      getUnreadCount().then((r) => active && setUnread(r.unreadCount)).catch(() => undefined);
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [role, pathname]);

  if (!role || keyboardOpen) return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {TABS[role].map((tab) => {
        const active = isActive(tab, pathname);
        const urgent = tab.key === 'help';
        const badge = tab.badge === 'unread' ? unread : 0;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={badge ? `${tab.label}, ${badge} unread` : tab.label}
            onPress={() => {
              if (tab.action === 'logout') {
                void logout();
              } else if (tab.href && !active) {
                router.navigate(tab.href);
              }
            }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={[styles.indicator, active && styles.indicatorOn]} />
            <View>
              <Text style={[styles.glyph, !active && styles.glyphIdle]}>{tab.glyph}</Text>
              {badge > 0 ? (
                <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={[styles.label, active && styles.labelOn, urgent && !active && styles.labelUrgent]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 0,
  },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'flex-start', gap: 2, paddingBottom: 2 },
  pressed: { opacity: 0.7 },
  indicator: { alignSelf: 'stretch', height: 3, marginBottom: 5, backgroundColor: 'transparent', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  indicatorOn: { backgroundColor: Colors.primary },
  glyph: { fontSize: 20 },
  glyphIdle: { opacity: 0.65 },
  label: { color: Colors.muted, fontSize: 11, fontWeight: '700' },
  labelOn: { color: Colors.accent, fontWeight: '900' },
  labelUrgent: { color: Colors.error },
  badge: { position: 'absolute', top: -4, right: -10, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  badgeText: { color: Colors.accent, fontSize: 9, fontWeight: '900' },
});
