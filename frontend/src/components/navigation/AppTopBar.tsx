import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UniWellLogo } from '@/components/brand/UniWellLogo';
import { NotificationBell } from '@/components/wellbeing/NotificationBell';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'student' | 'counsellor' | 'admin';
type IconName = keyof typeof Ionicons.glyphMap;

const roleOfPath = (pathname: string): Role | null =>
  pathname === '/student' || pathname.startsWith('/student/')
    ? 'student'
    : pathname === '/counsellor' || pathname.startsWith('/counsellor/')
      ? 'counsellor'
      : pathname === '/admin' || pathname.startsWith('/admin/')
        ? 'admin'
        : null;

const ROLE_LABEL: Record<Role, string> = { student: 'Student', counsellor: 'Counsellor', admin: 'Administrator' };

// NEW: one shared top bar for every signed-in screen. It also reserves the safe-area inset so
// nothing sits under the phone's clock / battery / network icons. On public screens (welcome,
// login, register) it renders only that empty safe-area gap, so every view gets the breathing room.
export function AppTopBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [barBottom, setBarBottom] = useState(insets.top + 60);

  const pathRole = roleOfPath(pathname);
  const role = user && token && pathRole === user.role ? (user.role as Role) : null;

  if (!role) {
    return <View style={{ height: insets.top + 8, backgroundColor: Colors.background }} />;
  }

  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'U';
  // Only students have a profile screen today; for other roles this stays a dummy link.
  const openProfile = () => {
    setMenuOpen(false);
    if (role === 'student') router.push('/student/profile');
  };

  return (
    <>
      <View
        style={[styles.bar, { paddingTop: insets.top + Space.xs }]}
        onLayout={(e) => setBarBottom(e.nativeEvent.layout.height)}
      >
        <View style={styles.left}>
          <NotificationBell role={role} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={openProfile}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            accessibilityState={{ expanded: menuOpen }}
            onPress={() => setMenuOpen((open) => !open)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="menu" size={26} color={Colors.accent} />
          </Pressable>
        </View>
        <UniWellLogo size={40} />
      </View>

      <MenuSheet
        visible={menuOpen}
        top={barBottom}
        name={user?.name || 'Your account'}
        roleLabel={ROLE_LABEL[role]}
        initial={initial}
        onClose={() => setMenuOpen(false)}
        onProfile={openProfile}
      />
    </>
  );
}

function MenuSheet({
  visible,
  top,
  name,
  roleLabel,
  initial,
  onClose,
  onProfile,
}: {
  visible: boolean;
  top: number;
  name: string;
  roleLabel: string;
  initial: string;
  onClose: () => void;
  onProfile: () => void;
}) {
  const { logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // DUMMY settings state: visual only, nothing is saved or applied anywhere.
  const [fontSize, setFontSize] = useState<'Small' | 'Default' | 'Large'>('Default');
  const [appearance, setAppearance] = useState<'Light' | 'Dark' | 'System'>('Light');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const close = () => {
    setSettingsOpen(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close menu" />
      <View style={[styles.sheet, { top }]} pointerEvents="box-none">
        <ScrollView style={styles.sheetScroll} bounces={false} showsVerticalScrollIndicator={false}>
          <View style={styles.userRow}>
            <View style={styles.sheetAvatar}><Text style={styles.avatarText}>{initial}</Text></View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.userName}>{name}</Text>
              <Text style={styles.userRole}>{roleLabel}</Text>
            </View>
          </View>

          <MenuRow icon="person-outline" label="My profile" onPress={() => { onProfile(); }} />
          <MenuRow
            icon="settings-outline"
            label="Settings"
            trailing={settingsOpen ? 'chevron-up' : 'chevron-down'}
            onPress={() => setSettingsOpen((open) => !open)}
          />

          {settingsOpen ? (
            <View style={styles.settings}>
              <Text style={styles.settingLabel}>Font size</Text>
              <Segmented options={['Small', 'Default', 'Large']} value={fontSize} onChange={setFontSize} />

              <Text style={styles.settingLabel}>Appearance</Text>
              <Segmented options={['Light', 'Dark', 'System']} value={appearance} onChange={setAppearance} />

              <ToggleRow label="Push notifications" value={pushEnabled} onChange={setPushEnabled} />
              <ToggleRow label="Session reminders" value={remindersEnabled} onChange={setRemindersEnabled} />

              <MenuRow compact icon="language-outline" label="Language" detail="English" trailing="chevron-forward" onPress={() => undefined} />
              <MenuRow compact icon="lock-closed-outline" label="Privacy & security" trailing="chevron-forward" onPress={() => undefined} />
              <MenuRow compact icon="help-circle-outline" label="Help & support" trailing="chevron-forward" onPress={() => undefined} />
              <MenuRow compact icon="information-circle-outline" label="About UniWell" trailing="chevron-forward" onPress={() => undefined} />
            </View>
          ) : null}

          <View style={styles.divider} />
          <MenuRow
            icon="log-out-outline"
            label="Log out"
            danger
            onPress={() => {
              close();
              void logout();
            }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  detail,
  trailing,
  danger = false,
  compact = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  trailing?: IconName;
  danger?: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  const color = danger ? Colors.error : Colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, compact && styles.rowCompact, pressed && styles.rowPressed]}
    >
      <Ionicons name={icon} size={compact ? 18 : 22} color={color} />
      <Text style={[styles.rowLabel, compact && styles.rowLabelCompact, { color }]}>{label}</Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      {trailing ? <Ionicons name={trailing} size={18} color={Colors.muted} /> : null}
    </Pressable>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (next: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[styles.segment, selected && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextOn]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.md,
    paddingBottom: Space.sm,
    backgroundColor: Colors.background,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  pressed: { opacity: 0.7 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paleBlue, borderWidth: 1, borderColor: Colors.secondary },
  avatarText: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  iconButton: { width: 42, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17, 46, 60, 0.28)' },
  sheet: {
    position: 'absolute',
    left: Space.md,
    right: Space.md,
    maxHeight: '75%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    overflow: 'hidden',
  },
  sheetScroll: { padding: Space.sm },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.sm, marginBottom: Space.xs, borderRadius: Radius.md, backgroundColor: Colors.paleBlue },
  sheetAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  userName: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  userRole: { color: Colors.muted, fontSize: 12, fontWeight: '700' },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingHorizontal: Space.sm, borderRadius: Radius.md },
  rowCompact: { minHeight: 42 },
  rowPressed: { backgroundColor: Colors.paleBlue },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  rowLabelCompact: { fontSize: 14, fontWeight: '600' },
  rowDetail: { color: Colors.muted, fontSize: 13 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Space.xs },
  settings: { gap: Space.xs, paddingHorizontal: Space.sm, paddingBottom: Space.sm, marginLeft: Space.md, borderLeftWidth: 2, borderLeftColor: Colors.paleBlue },
  settingLabel: { color: Colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: Space.xs },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: Radius.pill, backgroundColor: Colors.paleBlue },
  segment: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
  segmentOn: { backgroundColor: Colors.white },
  segmentText: { color: Colors.muted, fontSize: 13, fontWeight: '700' },
  segmentTextOn: { color: Colors.accent, fontWeight: '900' },
  toggleRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
});
