import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
    AppointmentRecord,
    getCounsellorAppointment,
    SharedCheckIn,
    updateAppointmentStatus,
} from '@/services/counsellingService';

// NEW: counsellor appointment details (Milestone 02 "Appointment Details" screen).
export default function CounsellorAppointmentDetailScreen() {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const [appointment, setAppointment] = useState<(AppointmentRecord & { shareCheckIn?: boolean }) | null>(null);
  const [shared, setShared] = useState<SharedCheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const response = await getCounsellorAppointment(id);
      setAppointment(response.appointment);
      setShared(response.sharedCheckIn);
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

  const change = async (status: 'confirmed' | 'cancelled' | 'completed') => {
    if (!appointment) return;
    setBusy(true);
    setError('');
    try {
      await updateAppointmentStatus(appointment._id, status);
      setMessage(`Appointment marked ${status}. The student has been notified.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this appointment.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Cancel this appointment? The student will be notified.')) void change('cancelled');
      return;
    }
    Alert.alert('Cancel this appointment?', 'The student will be notified.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel appointment', style: 'destructive', onPress: () => void change('cancelled') },
    ]);
  };

  const past = appointment ? new Date(appointment.startsAt) <= new Date() : false;

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/counsellor/calendar" label="Calendar" />
      <PageHeading title="Appointment details" subtitle="Booking information and actions." />
      {loading ? <LoadingState label="Loading appointment..." /> : null}
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>
      {appointment ? (
        <>
          <SurfaceCard style={styles.card}>
            <Text style={styles.label}>Student</Text>
            <Text style={styles.value}>{appointment.studentId?.name || 'Student'}</Text>
            {appointment.studentId?.faculty ? <Text style={styles.detail}>{appointment.studentId.faculty}{appointment.studentId.year ? ` · Year ${appointment.studentId.year}` : ''}</Text> : null}
            {appointment.studentId?.email ? <Text style={styles.detail}>{appointment.studentId.email}</Text> : null}
            {appointment.studentId?.phoneNumber ? <Text style={styles.detail}>{appointment.studentId.phoneNumber}</Text> : null}
            <Text style={styles.label}>When</Text>
            <Text style={styles.value}>{new Date(appointment.startsAt).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
            <Text style={styles.label}>Session</Text>
            <Text style={styles.value}>{appointment.sessionType.replace('-', ' ')} · {appointment.durationMinutes} min</Text>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{appointment.status}</Text>
            <Text style={styles.sync}>✓ Synced to your UniWell calendar automatically</Text>
          </SurfaceCard>

          <SectionHeading title="Student wellbeing summary" />
          {shared ? (
            <SurfaceCard style={styles.card}>
              <Text style={styles.detail}>Shared by the student on {new Date(shared.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.value}>{shared.wellbeingLevel} ({shared.wellbeingScore.toFixed(1)}/5)</Text>
              <Text style={styles.detail}>Mood: {shared.mood} · Stress: {shared.stressLevel}</Text>
              <Text style={styles.detail}>Sleep: {shared.sleepQuality} · Study coping: {shared.studyCoping}</Text>
            </SurfaceCard>
          ) : (
            <SurfaceCard><Text style={styles.detail}>{appointment.shareCheckIn ? 'The student has not completed a check-in yet.' : 'The student chose not to share their check-in. Private notes are never shown.'}</Text></SurfaceCard>
          )}

          {appointment.status === 'pending' ? (
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void change('confirmed')} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>Confirm</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={confirmCancel} style={[styles.secondary, busy && styles.disabled]}><Text style={styles.secondaryText}>Decline</Text></Pressable>
            </View>
          ) : null}
          {appointment.status === 'confirmed' ? (
            <View style={styles.actions}>
              {past ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void change('completed')} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>Mark completed</Text></Pressable> : null}
              <Pressable accessibilityRole="button" disabled={busy} onPress={confirmCancel} style={[styles.secondary, busy && styles.disabled]}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  card: { gap: Space.xs },
  label: { marginTop: Space.sm, color: Colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  value: { color: Colors.accent, fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  detail: { color: Colors.muted, fontSize: 14 },
  sync: { marginTop: Space.md, color: Colors.success, fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: Space.sm },
  primary: { flex: 1, minHeight: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  primaryText: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  secondary: { flex: 1, minHeight: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paleCoral, borderWidth: 1, borderColor: Colors.primary },
  secondaryText: { color: Colors.error, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
