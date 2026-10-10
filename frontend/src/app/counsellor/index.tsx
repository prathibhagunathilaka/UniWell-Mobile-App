// Counsellor home: shows today's sessions, pending requests and quick links to calendar, availability and sync.
import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineMessage, LoadingState, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { AppointmentStatusTones } from '@/constants/appointmentStatus';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentRecord, getCounsellorAppointments, updateAppointmentStatus } from '@/services/counsellingService';

type IconName = keyof typeof Ionicons.glyphMap;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const greetingFor = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const endsAt = (a: AppointmentRecord) => new Date(a.startsAt).getTime() + a.durationMinutes * MINUTE;

const untilLabel = (startsAtMs: number, nowMs: number) => {
  const diff = startsAtMs - nowMs;
  if (diff <= 0) return 'happening now';
  const mins = Math.round(diff / MINUTE);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours} h ${mins % 60 ? `${mins % 60} min` : ''}`.trim();
  return new Date(startsAtMs).toLocaleDateString(undefined, { weekday: 'long' });
};

const confirmCancel = (onYes: () => void) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm('Cancel this appointment? The student will be notified.')) onYes();
    return;
  }
  Alert.alert('Cancel this appointment?', 'The student will be notified.', [
    { text: 'Keep', style: 'cancel' },
    { text: 'Cancel appointment', style: 'destructive', onPress: onYes },
  ]);
};

const openAppointment = (id: string) => router.push({ pathname: '/counsellor/appointments/[id]', params: { id } });

// Counsellor home: what matters today, at a glance. Profile, availability and resources live on their own pages.
export default function CounsellorHomeScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await getCounsellorAppointments();
      setAppointments(response.appointments);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your appointments.');
    } finally {
      setNow(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    const timer = setInterval(() => void load(), MINUTE); // new bookings + "in X min" stay fresh
    return () => clearInterval(timer);
  }, [load]);

  const change = async (appointment: AppointmentRecord, status: 'confirmed' | 'cancelled' | 'completed') => {
    setBusyId(appointment._id);
    setError('');
    setMessage('');
    try {
      await updateAppointmentStatus(appointment._id, status);
      setMessage(`Appointment ${status}. The student has been notified.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this appointment.');
    } finally {
      setBusyId('');
    }
  };

  const summary = useMemo(() => {
    const nowMs = now.getTime();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + DAY;
    const byTime = (a: AppointmentRecord, b: AppointmentRecord) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

    const booked = appointments.filter((a) => a.studentId);
    const today = booked
      .filter((a) => ['pending', 'confirmed', 'completed'].includes(a.status))
      .filter((a) => {
        const t = new Date(a.startsAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd;
      })
      .sort(byTime);
    const upcoming = booked.filter((a) => ['pending', 'confirmed'].includes(a.status) && endsAt(a) > nowMs).sort(byTime);
    const todayIds = new Set(today.map((a) => a._id));

    return {
      today,
      stillToGo: today.filter((a) => a.status !== 'completed' && a.status !== 'cancelled' && endsAt(a) > nowMs).length,
      doneToday: today.filter((a) => a.status === 'completed').length,
      next: upcoming[0],
      pendingAll: upcoming.filter((a) => a.status === 'pending').length,
      pendingLater: upcoming.filter((a) => a.status === 'pending' && !todayIds.has(a._id)).length,
      openSlots: appointments.filter((a) => a.status === 'available' && new Date(a.startsAt).getTime() > nowMs).length,
    };
  }, [appointments, now]);

  const { today, next } = summary;
  const nowMs = now.getTime();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const nextStart = next ? new Date(next.startsAt).getTime() : 0;
  const nextIsToday = next ? new Date(next.startsAt).toDateString() === now.toDateString() : false;

  const links: { label: string; detail: string; icon: IconName; href: Href }[] = [
    { label: 'Calendar', detail: 'Week view of bookings', icon: 'calendar-outline', href: '/counsellor/calendar' },
    { label: 'Availability', detail: 'Add or repeat slots', icon: 'time-outline', href: '/counsellor/availability' },
    { label: 'Student resources', detail: 'Publish self-help content', icon: 'library-outline', href: '/counsellor/resources' },
    { label: 'Booking sync', detail: 'Google / Apple / Outlook', icon: 'sync-outline', href: '/counsellor/sync' },
  ];

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.greeting}>{greetingFor(now)}, {user?.name || 'Counsellor'}</Text>
      </View>

      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>
      {loading ? <LoadingState label="Loading your day..." /> : null}

      {!loading ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>Today</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroNumber}>{today.length}</Text>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{today.length === 1 ? 'session' : 'sessions'} scheduled</Text>
                <Text style={styles.heroSub}>
                  {today.length === 0 ? 'A clear day so far' : `${summary.stillToGo} still to go · ${summary.doneToday} completed`}
                </Text>
              </View>
            </View>
            <View style={styles.heroNext}>
              <Ionicons name="time-outline" size={18} color={Colors.accent} />
              {next ? (
                <Pressable accessibilityRole="button" onPress={() => openAppointment(next._id)} style={styles.heroNextCopy}>
                  <Text style={styles.heroNextLabel}>
                    Next: {nextIsToday ? timeOf(next.startsAt) : new Date(next.startsAt).toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + timeOf(next.startsAt)} with {next.studentId?.name || 'a student'}
                  </Text>
                  <Text style={styles.heroNextSub}>{untilLabel(nextStart, nowMs)} · tap to view</Text>
                </Pressable>
              ) : (
                <Text style={[styles.heroNextLabel, { flex: 1 }]}>No upcoming sessions booked</Text>
              )}
            </View>
          </View>

          <View style={styles.tiles}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${summary.pendingAll} bookings need confirmation`}
              onPress={() => router.push('/counsellor/calendar')}
              style={[styles.tile, summary.pendingAll > 0 && styles.tileAlert]}
            >
              <Text style={[styles.tileNumber, summary.pendingAll > 0 && styles.tileNumberAlert]}>{summary.pendingAll}</Text>
              <Text style={styles.tileLabel}>Need your reply</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${summary.openSlots} open slots`}
              onPress={() => router.push('/counsellor/availability')}
              style={styles.tile}
            >
              <Text style={styles.tileNumber}>{summary.openSlots}</Text>
              <Text style={styles.tileLabel}>Open slots</Text>
            </Pressable>
            <View style={styles.tile}>
              <Text style={styles.tileNumber}>{summary.doneToday}</Text>
              <Text style={styles.tileLabel}>Done today</Text>
            </View>
          </View>

          {summary.pendingLater > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/counsellor/calendar')} style={styles.notice}>
              <Ionicons name="alert-circle" size={20} color={Colors.primary} />
              <Text style={styles.noticeText}>
                {summary.pendingLater} booking request{summary.pendingLater === 1 ? '' : 's'} on later days {summary.pendingLater === 1 ? 'needs' : 'need'} confirmation
              </Text>
              <Text style={styles.noticeAction}>Open calendar</Text>
            </Pressable>
          ) : null}

          <SectionHeading title="Today's appointments" detail={today.length ? 'Tap a session for student details and the shared check-in.' : undefined} />
          {today.length === 0 ? (
            <SurfaceCard style={styles.empty}>
              <Ionicons name="cafe-outline" size={28} color={Colors.muted} />
              <Text style={styles.emptyTitle}>No appointments today</Text>
              <Text style={styles.emptyText}>New bookings for today will appear here automatically.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/counsellor/availability')}>
                <Text style={styles.link}>Add availability</Text>
              </Pressable>
            </SurfaceCard>
          ) : null}
          {today.map((appointment) => {
            const tone = AppointmentStatusTones[appointment.status];
            const student = appointment.studentId;
            const busy = busyId === appointment._id;
            const detail = [
              appointment.sessionType.charAt(0).toUpperCase() + appointment.sessionType.slice(1),
              student?.faculty,
              student?.year ? `Year ${student.year}` : undefined,
            ].filter(Boolean).join(' · ');
            return (
              <View key={appointment._id} style={[styles.card, { borderLeftColor: tone.accent, backgroundColor: tone.cardBg }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Open appointment with ${student?.name || 'student'}`} onPress={() => openAppointment(appointment._id)} style={styles.cardMain}>
                  <View style={styles.timeCol}>
                    <Text style={styles.time}>{timeOf(appointment.startsAt)}</Text>
                    <Text style={styles.duration}>{appointment.durationMinutes} min</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text numberOfLines={1} style={styles.studentName}>{student?.name || 'Student'}</Text>
                    <Text numberOfLines={1} style={styles.cardMeta}>{detail}</Text>
                    <View style={styles.chips}>
                      <Text style={[styles.pill, { color: tone.text, backgroundColor: tone.pill }]}>{tone.label}</Text>
                      {appointment.shareCheckIn ? <Text style={styles.sharedChip}>Check-in shared</Text> : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
                </Pressable>
                {appointment.status === 'pending' ? (
                  <View style={styles.actions}>
                    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void change(appointment, 'confirmed')} style={[styles.primaryAction, busy && styles.disabled]}>
                      <Text style={styles.primaryActionText}>Confirm</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={busy} onPress={() => confirmCancel(() => void change(appointment, 'cancelled'))} style={[styles.secondaryAction, busy && styles.disabled]}>
                      <Text style={styles.secondaryActionText}>Decline</Text>
                    </Pressable>
                  </View>
                ) : null}
                {appointment.status === 'confirmed' ? (
                  <View style={styles.actions}>
                    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void change(appointment, 'completed')} style={[styles.primaryAction, busy && styles.disabled]}>
                      <Text style={styles.primaryActionText}>Mark completed</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={busy} onPress={() => confirmCancel(() => void change(appointment, 'cancelled'))} style={[styles.secondaryAction, busy && styles.disabled]}>
                      <Text style={styles.secondaryActionText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}

          <SectionHeading title="Quick actions" />
          <View style={styles.links}>
            {links.map((link) => (
              <Pressable
                key={link.label}
                accessibilityRole="button"
                accessibilityLabel={`${link.label}. ${link.detail}`}
                onPress={() => router.push(link.href)}
                style={({ pressed }) => [styles.link_card, pressed && styles.pressed]}
              >
                <View style={styles.linkIcon}><Ionicons name={link.icon} size={22} color={Colors.accent} /></View>
                <Text style={styles.linkLabel}>{link.label}</Text>
                <Text style={styles.linkDetail}>{link.detail}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  header: { gap: 2 },
  date: { color: Colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  greeting: { color: Colors.accent, fontSize: 24, lineHeight: 30, fontWeight: '800' },

  hero: { gap: Space.sm, padding: Space.md, borderRadius: Radius.lg, backgroundColor: Colors.accent },
  heroEyebrow: { color: Colors.secondary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  heroNumber: { color: Colors.white, fontSize: 56, lineHeight: 62, fontWeight: '900' },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  heroSub: { color: Colors.secondary, fontSize: 13 },
  heroNext: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.sm, borderRadius: Radius.md, backgroundColor: Colors.secondary },
  heroNextCopy: { flex: 1, gap: 1 },
  heroNextLabel: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  heroNextSub: { color: Colors.accent, fontSize: 12 },

  tiles: { flexDirection: 'row', gap: Space.sm },
  tile: { flex: 1, minHeight: 78, justifyContent: 'center', gap: 2, padding: Space.sm, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  tileAlert: { backgroundColor: Colors.paleCoral, borderColor: Colors.primary },
  tileNumber: { color: Colors.accent, fontSize: 26, fontWeight: '900' },
  tileNumberAlert: { color: Colors.primary },
  tileLabel: { color: Colors.muted, fontSize: 12, fontWeight: '700' },

  notice: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.sm, padding: Space.md, borderRadius: Radius.md, backgroundColor: Colors.paleCoral, borderWidth: 1, borderColor: Colors.primary },
  noticeText: { flex: 1, minWidth: 180, color: Colors.accent, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  noticeAction: { color: Colors.primary, fontSize: 13, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: Space.lg },
  emptyTitle: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  emptyText: { color: Colors.muted, fontSize: 13, textAlign: 'center' },
  link: { color: Colors.primary, fontSize: 14, fontWeight: '800', paddingVertical: Space.xs },

  card: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 5, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md },
  timeCol: { width: 68, gap: 2 },
  time: { color: Colors.accent, fontSize: 16, fontWeight: '900' },
  duration: { color: Colors.muted, fontSize: 12 },
  cardInfo: { flex: 1, gap: 3 },
  studentName: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  cardMeta: { color: Colors.muted, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs, marginTop: 2 },
  pill: { paddingHorizontal: Space.sm, paddingVertical: 3, borderRadius: Radius.pill, overflow: 'hidden', fontSize: 11, fontWeight: '800' },
  sharedChip: { paddingHorizontal: Space.sm, paddingVertical: 3, borderRadius: Radius.pill, overflow: 'hidden', fontSize: 11, fontWeight: '800', color: Colors.accent, backgroundColor: Colors.paleBlue },
  actions: { flexDirection: 'row', gap: Space.sm, paddingHorizontal: Space.md, paddingBottom: Space.md },
  primaryAction: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.primary },
  primaryActionText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  secondaryAction: { minHeight: 44, paddingHorizontal: Space.md, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  secondaryActionText: { color: Colors.error, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.55 },

  links: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  link_card: { flexGrow: 1, flexBasis: '45%', gap: 4, padding: Space.md, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  pressed: { opacity: 0.85 },
  linkIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paleBlue, marginBottom: 2 },
  linkLabel: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  linkDetail: { color: Colors.muted, fontSize: 12 },
});
