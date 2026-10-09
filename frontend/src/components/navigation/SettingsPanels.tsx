import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { PropsWithChildren, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UniWellLogo } from '@/components/brand/UniWellLogo';
import { supportContacts } from '@/constants/supportContacts';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { logoutAllDevices } from '@/services/preferencesService';

type Role = 'student' | 'counsellor' | 'admin';
type IconName = keyof typeof Ionicons.glyphMap;

// Optional: set EXPO_PUBLIC_SUPPORT_EMAIL in .env to show an "Email support" row in Help & support.
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || '';

const open = async (url: string) => {
  try {
    await Linking.openURL(url);
  } catch {
    // Nothing useful to do if the device can't open the link.
  }
};

const confirmAction = (title: string, message: string, confirmLabel: string, cancelLabel: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    const confirmFn = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    if (confirmFn?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

// Shared frame: back arrow + title above scrollable content. Rendered inside the settings menu sheet.
export function PanelShell({ title, onBack, children }: PropsWithChildren<{ title: string; onBack: () => void }>) {
  return (
    <View style={styles.shell}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <Ionicons name="chevron-back" size={22} color={Colors.accent} />
        <Text style={styles.headerTitle}>{title}</Text>
      </Pressable>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} bounces={false} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

function ActionRow({ icon, label, hint, danger = false, busy = false, onPress }: { icon: IconName; label: string; hint?: string; danger?: boolean; busy?: boolean; onPress: () => void }) {
  const color = danger ? Colors.error : Colors.accent;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionLabel, { color }]}>{label}</Text>
        {hint ? <Text style={styles.actionHint}>{hint}</Text> : null}
      </View>
      {busy ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={Colors.muted} />}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------
// Privacy & security
// ---------------------------------------------------------------------------------------------
export function PrivacyContent({
  role,
  onChangePassword,
  onManageAccount,
  onSignedOut,
}: {
  role: Role;
  onChangePassword: () => void;
  onManageAccount: () => void;
  onSignedOut: () => void;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signOutEverywhere = () =>
    confirmAction(t('Sign out everywhere?'), t('Ends every active sign-in, including this one.'), t('Sign out'), t('Cancel'), async () => {
      setBusy(true);
      setError('');
      try {
        await logoutAllDevices();
        onSignedOut();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to sign you out of all devices right now.');
        setBusy(false);
      }
    });

  return (
    <>
      <View style={styles.note}>
        <Ionicons name="shield-checkmark-outline" size={20} color={Colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.noteTitle}>Your privacy</Text>
          <Text style={styles.noteText}>Your wellbeing check-ins are private to you unless you choose to share them.</Text>
        </View>
      </View>

      <ActionRow icon="key-outline" label="Change password" hint="We'll email you a verification code." onPress={onChangePassword} />
      <ActionRow icon="phone-portrait-outline" label="Sign out of all devices" hint="Ends every active sign-in, including this one." busy={busy} onPress={signOutEverywhere} />
      {role === 'student' ? <ActionRow icon="person-remove-outline" label="Manage or delete my account" danger onPress={onManageAccount} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Help & support
// ---------------------------------------------------------------------------------------------
const FAQS: Record<Role, { q: string; a: string }[]> = {
  student: [
    { q: 'How do I book a session?', a: 'Open Counsellors, choose a counsellor, view their profile and pick an open slot.' },
    { q: 'How do I change or cancel a session?', a: 'Open Sessions, tap the appointment, and reschedule or cancel it from there.' },
    { q: 'When will I get reminders?', a: 'About 24 hours and about 1 hour before a session. You can switch them off under Settings > Session reminders.' },
    { q: 'Who can see my check-ins?', a: 'Only you, unless you choose to share your latest check-in.' },
  ],
  counsellor: [
    { q: 'How do I add availability?', a: 'Open Availability and post the slots you are free for. Students can only book open slots.' },
    { q: 'How do I see bookings in my phone calendar?', a: 'Open Sync to add bookings to your device calendar or subscribe to your calendar feed.' },
    { q: 'When will I get reminders?', a: 'About 1 hour before a session. You can switch them off under Settings > Session reminders.' },
  ],
  admin: [
    { q: 'How do I review a new counsellor?', a: 'Open Counsellors to see registrations and approve or decline them.' },
    { q: 'Where are the usage reports?', a: 'Open Reports for usage figures and wellbeing summaries.' },
  ],
};

function Faq({ q, a }: { q: string; a: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.faq}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((v) => !v)} style={({ pressed }) => [styles.faqHead, pressed && styles.actionPressed]}>
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.muted} />
      </Pressable>
      {expanded ? <Text style={styles.faqA}>{a}</Text> : null}
    </View>
  );
}

export function HelpContent({ role, onHelpNow }: { role: Role; onHelpNow: () => void }) {
  const hasContacts = Boolean(supportContacts.universityPhone || supportContacts.universityWebsite || SUPPORT_EMAIL);
  return (
    <>
      {role === 'student' ? (
        <View style={styles.urgent}>
          <Text style={styles.urgentTitle}>If you may be in immediate danger</Text>
          <Pressable accessibilityRole="button" onPress={onHelpNow} style={({ pressed }) => [styles.urgentButton, pressed && styles.pressed]}>
            <Text style={styles.urgentButtonText}>Open Help now</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.section}>Common questions</Text>
      {FAQS[role].map((item) => (
        <Faq key={item.q} q={item.q} a={item.a} />
      ))}

      {hasContacts ? <Text style={styles.section}>Contact us</Text> : null}
      {supportContacts.universityPhone ? <ActionRow icon="call-outline" label="Call the counselling centre" hint={supportContacts.universityPhone} onPress={() => void open(`tel:${supportContacts.universityPhone}`)} /> : null}
      {supportContacts.universityWebsite ? <ActionRow icon="globe-outline" label="Visit the counselling website" onPress={() => void open(supportContacts.universityWebsite)} /> : null}
      {SUPPORT_EMAIL ? <ActionRow icon="mail-outline" label="Email support" hint={SUPPORT_EMAIL} onPress={() => void open(`mailto:${SUPPORT_EMAIL}`)} /> : null}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------------------------
export function AboutContent() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <>
      <View style={styles.aboutHero}>
        <UniWellLogo size={56} showName />
        <Text style={styles.version}>Version {version}</Text>
      </View>
      <Text style={styles.noteText}>UniWell is a university wellbeing app for check-ins, counselling bookings and support.</Text>
      <Text style={[styles.noteText, { marginTop: Space.sm }]}>UniWell is not an emergency service. If you are in danger, contact your local emergency number.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  shell: { flexShrink: 1 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Space.xs, paddingHorizontal: Space.sm },
  headerTitle: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.7 },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { gap: Space.sm, padding: Space.sm, paddingTop: Space.xs },
  note: { flexDirection: 'row', gap: Space.sm, padding: Space.sm, borderRadius: Radius.md, backgroundColor: Colors.paleBlue },
  noteTitle: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  noteText: { color: Colors.muted, fontSize: 13, lineHeight: 19 },
  action: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingHorizontal: Space.sm, paddingVertical: Space.xs, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  actionPressed: { backgroundColor: Colors.paleBlue },
  actionLabel: { fontSize: 14, fontWeight: '700' },
  actionHint: { color: Colors.muted, fontSize: 12, marginTop: 2 },
  error: { color: Colors.error, fontSize: 13 },
  urgent: { gap: Space.xs, padding: Space.sm, borderRadius: Radius.md, backgroundColor: Colors.paleCoral, borderWidth: 1, borderColor: '#F3C3B7' },
  urgentTitle: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  urgentButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.primary },
  urgentButtonText: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  section: { color: Colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: Space.xs },
  faq: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, overflow: 'hidden' },
  faqHead: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingHorizontal: Space.sm },
  faqQ: { flex: 1, color: Colors.accent, fontSize: 14, fontWeight: '700' },
  faqA: { color: Colors.muted, fontSize: 13, lineHeight: 19, paddingHorizontal: Space.sm, paddingBottom: Space.sm },
  aboutHero: { alignItems: 'center', gap: Space.xs, paddingVertical: Space.sm },
  version: { color: Colors.muted, fontSize: 13, fontWeight: '700' },
});
