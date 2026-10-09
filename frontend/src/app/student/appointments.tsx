import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { AppointmentStatusTones } from '@/constants/appointmentStatus';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { AppointmentRecord, getStudentAppointments } from '@/services/counsellingService';


export default function StudentAppointmentsScreen() {
  const [upcoming, setUpcoming] = useState<AppointmentRecord[]>([]);
  const [earlier, setEarlier] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getStudentAppointments();
      const now = Date.now();
      const next = response.appointments.filter((item) =>
        new Date(item.startsAt).getTime() >= now && ['pending', 'confirmed'].includes(item.status));
      setUpcoming(next);
      setEarlier(response.appointments.filter((item) => !next.includes(item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const appointmentCard = (appointment: AppointmentRecord, isPast: boolean) => {
    const tone = AppointmentStatusTones[appointment.status];
    const name = appointment.counsellorId?.name || 'Counsellor';
    return (
      <Pressable
        key={appointment._id}
        accessibilityRole="button"
        accessibilityLabel={`Session with ${name}, ${tone.label}. View details`}
        onPress={() => router.push({ pathname: '/student/appointments/[id]', params: { id: appointment._id } })}
        style={({ pressed }) => [styles.card, { borderTopColor: tone.accent }, isPast && styles.cardPast, pressed && styles.pressed]}
      >
        <View style={styles.cardMain}>
          <View style={[styles.avatar, { backgroundColor: tone.pill }]}>
            <Text style={styles.avatarText}>{name.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.counsellorName}>{name}</Text>
            <Text style={styles.date}>{new Date(appointment.startsAt).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}</Text>
          </View>
        </View>
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: tone.pill }]}>
            <View style={[styles.statusDot, { backgroundColor: tone.accent }]} />
            <Text style={[styles.chipText, { color: tone.text }]}>{tone.label}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{appointment.sessionType.replace('-', ' ')} · {appointment.durationMinutes} min</Text>
          </View>
        </View>
        <View style={styles.cta}><Text style={styles.ctaText}>View details</Text><Text style={styles.ctaArrow}>›</Text></View>
      </Pressable>
    );
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/dashboard" label="Dashboard" />
      <PageHeading title="My counselling sessions" subtitle="Review upcoming and previous sessions with your counsellors." />
      {loading ? <LoadingState label="Loading your appointments..." /> : null}
      {error ? (
        <View style={styles.state}>
          <InlineMessage tone="error">{error}</InlineMessage>
          <Pressable onPress={() => void load()}><Text style={styles.retry}>Try again</Text></Pressable>
        </View>
      ) : null}
      {!loading && !error && upcoming.length === 0 && earlier.length === 0 ? (
        <SurfaceCard style={styles.empty}>
          <Text style={styles.emptyTitle}>No upcoming counselling sessions</Text>
          <Text style={styles.meta}>Book an available session when you are ready.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/student/counselling')} style={styles.bookButton}><Text style={styles.bookLabel}>Book a Counsellor</Text></Pressable>
        </SurfaceCard>
      ) : null}
      {!loading && !error && upcoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcoming.map((item) => appointmentCard(item, false))}
        </View>
      ) : null}
      {!loading && !error && earlier.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previous and cancelled</Text>
          {earlier.map((item) => appointmentCard(item, true))}
        </View>
      ) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  state: { gap: Space.sm },
  retry: { color: Colors.primary, fontSize: 14, fontWeight: '800', paddingVertical: Space.xs },
  empty: { gap: Space.sm },
  emptyTitle: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  meta: { color: Colors.muted, fontSize: 13, textTransform: 'capitalize' },
  section: { gap: Space.sm },
  sectionTitle: { color: Colors.accent, fontSize: 17, fontWeight: '800' },
  card: {
    gap: Space.sm,
    padding: Space.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 4,
    shadowColor: '#112E3C',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardPast: { shadowOpacity: 0.05, elevation: 1 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.accent, fontSize: 18, fontWeight: '800' },
  copy: { flex: 1, gap: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Colors.paleBlue },
  chipText: { color: Colors.accent, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Space.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  ctaText: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  ctaArrow: { color: Colors.primary, fontSize: 22, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  counsellorName: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  date: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  bookButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.md, backgroundColor: Colors.primary, marginTop: Space.xs },
  bookLabel: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
});
