import { Ionicons } from '@expo/vector-icons';
import { Href, router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WellbeingColors as Colors } from '@/constants/wellbeingTheme';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'student' | 'counsellor' | 'admin';
type IconName = keyof typeof Ionicons.glyphMap;

type Tab = {
  key: string;
  label: string;
  icon: IconName;
  iconActive: IconName;
  href?: Href;
  // Path prefixes that keep this tab highlighted (so sub-screens still show where you are).
  match?: string[];
  exact?: string[];
  action?: 'logout';
};

// NEW: one constant bottom bar for every signed-in screen, with tabs chosen by role.
const TABS: Record<Role, Tab[]> = {
  student: [
    { key: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home', href: '/student/dashboard', match: ['/student/dashboard', '/student/index', '/student/profile', '/student/resource', '/student/resources', '/student/support', '/student/trusted-person', '/student/notifications'], exact: ['/student'] },
    { key: 'checkin', label: 'Check-in', icon: 'create-outline', iconActive: 'create', href: '/student/check-in', match: ['/student/check-in', '/student/check-in-history', '/student/check-in-result'] },
    { key: 'book', label: 'Counsellors', icon: 'search-outline', iconActive: 'search', href: '/student/counselling', match: ['/student/counselling'] },
    { key: 'sessions', label: 'Sessions', icon: 'calendar-outline', iconActive: 'calendar', href: '/student/appointments', match: ['/student/appointments'] },
    { key: 'help', label: 'Help now', icon: 'alert-circle-outline', iconActive: 'alert-circle', href: '/student/emergency', match: ['/student/emergency'] },
  ],
  counsellor: [
    { key: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home', href: '/counsellor', exact: ['/counsellor'], match: ['/counsellor/appointments', '/counsellor/profile', '/counsellor/notifications'] },
    { key: 'calendar', label: 'Calendar', icon: 'calendar-outline', iconActive: 'calendar', href: '/counsellor/calendar', match: ['/counsellor/calendar'] },
    { key: 'availability', label: 'Availability', icon: 'time-outline', iconActive: 'time', href: '/counsellor/availability', match: ['/counsellor/availability'] },
    { key: 'sync', label: 'Sync', icon: 'sync-outline', iconActive: 'sync', href: '/counsellor/sync', match: ['/counsellor/sync'] },
    { key: 'resources', label: 'Resources', icon: 'library-outline', iconActive: 'library', href: '/counsellor/resources', match: ['/counsellor/resources'] },
  ],
  admin: [
    { key: 'approvals', label: 'Approvals', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark', href: '/admin', exact: ['/admin'] },
    { key: 'reports', label: 'Reports', icon: 'bar-chart-outline', iconActive: 'bar-chart', href: '/admin/reports', match: ['/admin/reports'] },
    { key: 'logout', label: 'Sign out', icon: 'log-out-outline', iconActive: 'log-out', action: 'logout' },
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

  if (!role || keyboardOpen) return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {TABS[role].map((tab) => {
        const active = isActive(tab, pathname);
        const urgent = tab.key === 'help';
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
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
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={24}
                color={active ? Colors.accent : urgent ? Colors.error : Colors.muted}
              />
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
  label: { color: Colors.muted, fontSize: 11, fontWeight: '700' },
  labelOn: { color: Colors.accent, fontWeight: '900' },
  labelUrgent: { color: Colors.error },
});
