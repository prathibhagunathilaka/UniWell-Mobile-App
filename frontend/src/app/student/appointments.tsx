import { Link } from 'expo-router';
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
    return (
      <Link
        key={appointment._id}
        href={{ pathname: '/student/appointments/[id]', params: { id: appointment._id } }}
        asChild
      >
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.card,
            isPast
              ? { backgroundColor: tone.cardBg, borderColor: tone.accent, borderLeftColor: tone.accent }
              : styles.cardUpcoming,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.cardTop}>
            <Text style={styles.counsellorName}>{appointment.counsellorId?.name || 'Counsellor'}</Text>
            <View style={[styles.statusPill, { backgroundColor: tone.pill }]}>
              <View style={[styles.statusDot, { backgroundColor: tone.accent }]} />
              <Text style={[styles.statusText, { color: tone.text }]}>{tone.label}</Text>
            </View>
          </View>
          <Text style={styles.date}>{new Date(appointment.startsAt).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}</Text>
          <Text style={styles.meta}>{appointment.sessionType.replace('-', ' ')} · {appointment.durationMinutes} minutes</Text>
          <Text style={styles.details}>View details  ›</Text>
        </Pressable>
      </Link>
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
          <Link href="/student/counselling" asChild>
            <Pressable accessibilityRole="button" style={styles.bookButton}><Text style={styles.bookLabel}>Book a Counsellor</Text></Pressable>
          </Link>
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
  card: { gap: Space.xs, padding: Space.md, borderRadius: Radius.lg, borderWidth: 1, borderLeftWidth: 6 },
  cardUpcoming: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
    borderLeftColor: Colors.primary,
    shadowColor: '#112E3C',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: { opacity: 0.8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space.sm },
  counsellorName: { flex: 1, color: Colors.accent, fontSize: 15, fontWeight: '800' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.pill },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },
  date: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  details: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  bookButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.md, backgroundColor: Colors.primary, marginTop: Space.xs },
  bookLabel: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
});
