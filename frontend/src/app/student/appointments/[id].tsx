import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { AppointmentRecord, cancelStudentAppointment, getStudentAppointment, getStudentAppointmentCalendar, submitSessionFeedback } from '@/services/counsellingService';

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
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState('');
  const [rating, setRating] = useState(0);

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

  const doCancel = async () => {
    if (!id) return;
    setCancelling(true);
    setError('');
    try {
      await cancelStudentAppointment(id);
      setNotice('Your appointment was cancelled and the time was released.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to cancel this appointment.');
    } finally {
      setCancelling(false);
    }
  };

  // NEW (FR2 "cancel"): always confirm before cancelling to prevent accidental taps.
  const confirmCancel = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Cancel this appointment?')) void doCancel();
      return;
    }
    Alert.alert('Cancel this appointment?', 'The counsellor will be told and the time will be offered to other students.', [
      { text: 'Keep appointment', style: 'cancel' },
      { text: 'Cancel appointment', style: 'destructive', onPress: () => void doCancel() },
    ]);
  };

  // NEW: add this session to the phone's own calendar.
  const addToCalendar = async () => {
    if (!id) return;
    try {
      const file = await getStudentAppointmentCalendar(id);
      await Share.share({ title: file.filename, message: file.ics });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to export this session.');
    }
  };

  // NEW: reschedule = pick a new time with the same counsellor; the old time is released afterwards.
  const reschedule = () => {
    if (!appointment?.counsellorId) return;
    router.push({
      pathname: '/student/counselling/[id]',
      params: { id: appointment.counsellorId._id || (appointment.counsellorId as { id?: string }).id || '', rescheduleFrom: appointment._id },
    });
  };

  // NEW: one-tap rating after a completed session (feeds anonymised satisfaction reporting).
  const sendRating = async (value: number) => {
    if (!id) return;
    setRating(value);
    try {
      await submitSessionFeedback(id, value);
      setNotice('Thank you. Your feedback helps improve the service and is shared anonymously.');
      await load();
    } catch (cause) {
      setRating(0);
      setError(cause instanceof Error ? cause.message : 'Unable to save your feedback.');
    }
  };

  const canCancel = Boolean(appointment)
    && ['pending', 'confirmed'].includes(appointment!.status)
    && new Date(appointment!.startsAt) > new Date();

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
      <InlineMessage tone="success">{notice}</InlineMessage>
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
          <Text style={styles.label}>Reminders</Text>
          <Text style={styles.detail}>You will get a notification 24 hours and 1 hour before the session.</Text>
          {canCancel ? (
            <View style={styles.actionRow}>
              <Pressable accessibilityRole="button" onPress={() => void addToCalendar()} style={styles.secondaryButton}><Text style={styles.secondaryText}>Add to my calendar</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={reschedule} style={styles.secondaryButton}><Text style={styles.secondaryText}>Reschedule</Text></Pressable>
            </View>
          ) : null}
          {appointment.status === 'completed' ? (
            <View style={styles.feedback}>
              <Text style={styles.label}>How was this session?</Text>
              {appointment.feedbackRating ? (
                <Text style={styles.detail}>You rated this session {appointment.feedbackRating}/5.</Text>
              ) : (
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} out of 5`} onPress={() => void sendRating(n)} style={styles.star}>
                      <Text style={[styles.starText, n <= rating && styles.starOn]}>★</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : null}
          {canCancel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: cancelling, busy: cancelling }}
              disabled={cancelling}
              onPress={confirmCancel}
              style={[styles.cancelButton, cancelling && { opacity: 0.6 }]}
            >
              <Text style={styles.cancelText}>{cancelling ? 'Cancelling...' : 'Cancel appointment'}</Text>
            </Pressable>
          ) : null}
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
  actionRow: { flexDirection: 'row', gap: Space.sm, marginTop: Space.md },
  secondaryButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paleBlue, borderWidth: 1, borderColor: Colors.border },
  secondaryText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  feedback: { marginTop: Space.md, gap: Space.xs },
  stars: { flexDirection: 'row', gap: Space.xs },
  star: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  starText: { fontSize: 32, color: Colors.border },
  starOn: { color: Colors.primary },
  cancelButton: { marginTop: Space.md, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paleCoral, borderWidth: 1, borderColor: Colors.primary },
  cancelText: { color: Colors.error, fontSize: 14, fontWeight: '800' },
  link: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
});
