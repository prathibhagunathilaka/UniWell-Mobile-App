import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
  createAppointment,
  CounsellorProfile,
  CounsellorSlot,
  getCounsellor,
  getCounsellorAvailability,
} from '@/services/counsellingService';

const sessionTypes = [
  { key: 'online', label: 'Online' },
  { key: 'in-person', label: 'In person' },
  { key: 'phone', label: 'Phone' },
] as const;

export default function CounsellorProfileScreen() {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const [counsellor, setCounsellor] = useState<CounsellorProfile | null>(null);
  const [slots, setSlots] = useState<CounsellorSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [sessionType, setSessionType] = useState<(typeof sessionTypes)[number]['key']>('online');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [profileResponse, slotsResponse] = await Promise.all([
        getCounsellor(id),
        getCounsellorAvailability(id),
      ]);
      setCounsellor(profileResponse.counsellor);
      setSlots(slotsResponse.slots);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this counsellor right now.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const book = async () => {
    if (!selectedSlot) {
      setError('Choose an available time before booking.');
      return;
    }
    setBooking(true);
    setError('');
    try {
      const response = await createAppointment(selectedSlot, sessionType);
      router.replace({
        pathname: '/student/appointments/[id]',
        params: { id: response.appointment._id, confirmation: '1' },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to book this time. Please try another slot.');
      await load();
    } finally {
      setBooking(false);
    }
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/counselling" label="Counsellors" />
      {loading ? <LoadingState label="Loading counsellor profile..." /> : null}
      {!loading && counsellor ? (
        <>
          <PageHeading title={counsellor.name} subtitle={counsellor.specialization} />
          <SurfaceCard style={styles.profile}>
            <Text style={styles.qualification}>{counsellor.qualification}</Text>
            <Text style={styles.experience}>{counsellor.yearsOfExperience} years of experience</Text>
          </SurfaceCard>
          <SectionHeading title="Available sessions" detail="Choose a time published by this counsellor. Times are shown in your local timezone." />
          {slots.length ? slots.map((slot) => {
            const selected = selectedSlot === slot._id;
            return (
              <Pressable
                key={slot._id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setSelectedSlot(slot._id)}
                style={[styles.slot, selected && styles.selectedSlot]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <View style={styles.slotCopy}>
                  <Text style={styles.slotDate}>{new Date(slot.startsAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                  <Text style={styles.slotTime}>{new Date(slot.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {slot.durationMinutes} min</Text>
                </View>
              </Pressable>
            );
          }) : (
            <SurfaceCard><Text style={styles.empty}>No upcoming availability has been posted.</Text></SurfaceCard>
          )}
          {slots.length ? (
            <>
              <SectionHeading title="Session type" />
              <View style={styles.types}>
                {sessionTypes.map((type) => (
                  <Pressable
                    key={type.key}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: sessionType === type.key }}
                    onPress={() => setSessionType(type.key)}
                    style={[styles.type, sessionType === type.key && styles.selectedType]}
                  >
                    <Text style={[styles.typeText, sessionType === type.key && styles.selectedTypeText]}>{type.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: booking, busy: booking }}
                disabled={booking}
                onPress={() => void book()}
                style={[styles.bookButton, booking && styles.disabled]}
              >
                <Text style={styles.bookLabel}>{booking ? 'Booking...' : 'Book selected session'}</Text>
              </Pressable>
            </>
          ) : null}
        </>
      ) : null}
      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  profile: { gap: Space.xs, backgroundColor: Colors.paleBlue },
  qualification: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  experience: { color: Colors.muted, fontSize: 14 },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedSlot: { borderColor: Colors.primary, backgroundColor: Colors.paleCoral },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.muted },
  radioSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  slotCopy: { gap: 3 },
  slotDate: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  slotTime: { color: Colors.muted, fontSize: 14 },
  empty: { color: Colors.muted, fontSize: 14 },
  types: { flexDirection: 'row', gap: Space.sm, flexWrap: 'wrap' },
  type: { paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  selectedType: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
  selectedTypeText: { color: Colors.white },
  bookButton: { minHeight: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  disabled: { opacity: 0.6 },
  bookLabel: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
});
