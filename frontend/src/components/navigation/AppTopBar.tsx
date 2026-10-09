import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UniWellLogo } from '@/components/brand/UniWellLogo';
import { AboutContent, HelpContent, PanelShell, PrivacyContent } from '@/components/navigation/SettingsPanels';
import { NotificationBell } from '@/components/wellbeing/NotificationBell';
import { LanguageCode, LANGUAGES } from '@/constants/translations';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { useAuth } from '@/contexts/AuthContext';
import { FONT_SIZE_OPTIONS, useFontScale } from '@/contexts/FontScaleContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { APPEARANCE_OPTIONS, useAppTheme } from '@/contexts/ThemeContext';
import { getPreferences, Preferences, updatePreferences } from '@/services/preferencesService';

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
  // Every role has its own profile screen.
  const openProfile = () => {
    setMenuOpen(false);
    if (role === 'student') router.push('/student/profile');
    if (role === 'counsellor') router.push('/counsellor/profile');
    if (role === 'admin') router.push('/admin/profile');
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
        role={role}
        initial={initial}
        onClose={() => setMenuOpen(false)}
        onProfile={openProfile}
      />
    </>
  );
}

type Panel = 'privacy' | 'help' | 'about' | null;

function MenuSheet({
  visible,
  top,
  name,
  roleLabel,
  role,
  initial,
  onClose,
  onProfile,
}: {
  visible: boolean;
  top: number;
  name: string;
  roleLabel: string;
  role: Role;
  initial: string;
  onClose: () => void;
  onProfile: () => void;
}) {
  const { logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  // Font size, appearance and language are applied app-wide and remembered on this device.
  const { size: fontSize, setSize: setFontSize } = useFontScale();
  const { preference: appearance, setPreference: setAppearance } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  // Notification settings are saved on the server (the backend honours them when sending).
  const [prefs, setPrefs] = useState<Preferences>({ pushEnabled: true, remindersEnabled: true });
  const [prefsError, setPrefsError] = useState('');

  useEffect(() => {
    if (!visible || !settingsOpen) return;
    let active = true;
    getPreferences()
      .then((loaded) => {
        if (!active) return;
        setPrefs(loaded);
        setPrefsError('');
      })
      .catch(() => {
        if (active) setPrefsError("Couldn't load your notification settings.");
      });
    return () => {
      active = false;
    };
  }, [visible, settingsOpen]);

  const changePref = async (key: keyof Preferences, value: boolean) => {
    const previous = prefs;
    setPrefs({ ...previous, [key]: value });
    setPrefsError('');
    try {
      setPrefs(await updatePreferences({ [key]: value }));
    } catch {
      setPrefs(previous);
      setPrefsError("Couldn't save that change. Please try again.");
    }
  };

  const close = () => {
    setSettingsOpen(false);
    setPanel(null);
    onClose();
  };

  const go = (path: '/auth/forgot-password' | '/student/emergency') => {
    close();
    router.push(path);
  };

  const panelTitle = panel === 'privacy' ? 'Privacy & security' : panel === 'help' ? 'Help & support' : 'About UniWell';
  const languageLabel = LANGUAGES.find((item) => item.code === language)?.label ?? 'English';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close menu" />
      <View style={[styles.sheet, { top }]} pointerEvents="box-none">
        {panel ? (
          <PanelShell title={panelTitle} onBack={() => setPanel(null)}>
            {panel === 'privacy' ? (
              <PrivacyContent
                role={role}
                onChangePassword={() => go('/auth/forgot-password')}
                onManageAccount={() => {
                  close();
                  onProfile();
                }}
                onSignedOut={() => {
                  close();
                  void logout();
                }}
              />
            ) : null}
            {panel === 'help' ? <HelpContent role={role} onHelpNow={() => go('/student/emergency')} /> : null}
            {panel === 'about' ? <AboutContent /> : null}
          </PanelShell>
        ) : (
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
                <Segmented options={FONT_SIZE_OPTIONS} value={fontSize} onChange={setFontSize} />

                <Text style={styles.settingLabel}>Appearance</Text>
                <Segmented options={APPEARANCE_OPTIONS} value={appearance} onChange={setAppearance} />

                <Text style={styles.settingLabel}>Language</Text>
                <Segmented
                  options={LANGUAGES.map((item) => item.label)}
                  value={languageLabel}
                  onChange={(label) => {
                    const next = LANGUAGES.find((item) => item.label === label);
                    if (next) setLanguage(next.code as LanguageCode);
                  }}
                />

                <ToggleRow label="Push notifications" value={prefs.pushEnabled} onChange={(v) => void changePref('pushEnabled', v)} />
                <ToggleRow label="Session reminders" value={prefs.remindersEnabled} onChange={(v) => void changePref('remindersEnabled', v)} />
                {prefsError ? <Text style={styles.settingError}>{prefsError}</Text> : null}

                <MenuRow compact icon="lock-closed-outline" label="Privacy & security" trailing="chevron-forward" onPress={() => setPanel('privacy')} />
                <MenuRow compact icon="help-circle-outline" label="Help & support" trailing="chevron-forward" onPress={() => setPanel('help')} />
                <MenuRow compact icon="information-circle-outline" label="About UniWell" trailing="chevron-forward" onPress={() => setPanel('about')} />
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
        )}
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

  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17, 46, 60, 0.28)' },
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
  settingError: { color: Colors.error, fontSize: 12 },
  toggleLabel: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
});
