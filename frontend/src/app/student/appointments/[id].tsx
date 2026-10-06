import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { AppointmentRecord, getStudentAppointment } from '@/services/counsellingService';

const statusLabels: Record<AppointmentRecord['status'], string> = {
  available: 'Available',
  pending: 'Awaiting counsellor confirmation',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export default function StudentAppointmentDetailsScreen() {
  const { id: routeId, confirmation } = useLocalSearchParams<{ id: string; confirmation?: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const response = await getStudentAppointment(id);
      setAppointment(response.appointment);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this appointment.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/appointments" label="My appointments" />
      <PageHeading
        title={confirmation === '1' ? 'Booking received' : 'Appointment details'}
        subtitle={confirmation === '1'
          ? 'Your booking has been saved. The counsellor will confirm the session.'
          : 'Your appointment information and latest status.'}
      />
      {loading ? <LoadingState label="Loading appointment..." /> : null}
      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      {appointment ? (
        <SurfaceCard style={styles.card}>
          {confirmation === '1' ? <Text style={styles.confirmation}>Booking submitted successfully</Text> : null}
          <Text style={styles.label}>Counsellor</Text>
          <Text style={styles.value}>{appointment.counsellorId?.name || 'Counsellor'}</Text>
          {appointment.counsellorId?.specialization ? <Text style={styles.detail}>{appointment.counsellorId.specialization}</Text> : null}
          <Text style={styles.label}>Date and time</Text>
          <Text style={styles.value}>{new Date(appointment.startsAt).toLocaleString(undefined, {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
          })}</Text>
          <Text style={styles.label}>Session</Text>
          <Text style={styles.value}>{appointment.sessionType.replace('-', ' ')} · {appointment.durationMinutes} minutes</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{statusLabels[appointment.status]}</Text>
          {confirmation === '1' ? (
            <Link href="/student/appointments" asChild>
              <Pressable accessibilityRole="button" style={styles.linkButton}>
                <Text style={styles.link}>Go to My Appointments</Text>
              </Pressable>
            </Link>
          ) : null}
        </SurfaceCard>
      ) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  card: { gap: Space.xs },
  label: { marginTop: Space.sm, color: Colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  value: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  detail: { color: Colors.muted, fontSize: 14 },
  confirmation: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  linkButton: { marginTop: Space.md },
  link: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
});
