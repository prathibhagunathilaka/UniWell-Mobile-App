import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
  cancelStudentAppointment,
  CounsellorProfile,
  CounsellorSlot,
  createAppointment,
  getCounsellor,
  getCounsellorAvailability,
} from '@/services/counsellingService';

const sessionTypes = [
  { key: 'online', label: 'Online' },
  { key: 'in-person', label: 'In person' },
  { key: 'phone', label: 'Phone' },
] as const;

export default function CounsellorProfileScreen() {
  const { id: routeId, rescheduleFrom } = useLocalSearchParams<{ id: string; rescheduleFrom?: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const [counsellor, setCounsellor] = useState<CounsellorProfile | null>(null);
  const [slots, setSlots] = useState<CounsellorSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [sessionType, setSessionType] = useState<(typeof sessionTypes)[number]['key']>('online');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [shareCheckIn, setShareCheckIn] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
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

  // NEW: group times by day so students pick a date first, then a time (calendar + time-slot layout).
  const days = useMemo(() => {
    const map = new Map<string, { key: string; weekday: string; dayNumber: string; long: string; slots: CounsellorSlot[] }>();
    [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).forEach((slot) => {
      const d = new Date(slot.startsAt);
      const key = d.toDateString();
      if (!map.has(key)) {
        map.set(key, {
          key,
          weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
          dayNumber: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
          long: d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
          slots: [],
        });
      }
      map.get(key)!.slots.push(slot);
    });
    return [...map.values()];
  }, [slots]);
  const activeDay = days.find((d) => d.key === selectedDay)?.key || days[0]?.key || '';
  const selectedSlotRecord = slots.find((s) => s._id === selectedSlot);

  const book = async () => {
    if (!selectedSlot) {
      setError('Choose an available time before booking.');
      return;
    }
    setBooking(true);
    setError('');
    try {
      const response = await createAppointment(selectedSlot, sessionType, shareCheckIn);
      // Rescheduling: the new time is secured first; only then is the old booking released.
      if (rescheduleFrom) {
        await cancelStudentAppointment(Array.isArray(rescheduleFrom) ? rescheduleFrom[0] : rescheduleFrom).catch(() => undefined);
      }
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
          {rescheduleFrom ? <InlineMessage tone="info">You are rescheduling. Your current booking stays until the new time is confirmed.</InlineMessage> : null}
          <SectionHeading title="Choose a day and time" detail="Times are shown in your local timezone." />
          {slots.length ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow} accessibilityRole="tablist">
                {days.map((day) => {
                  const on = day.key === activeDay;
                  return (
                    <Pressable
                      key={day.key}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${day.long}, ${day.slots.length} times`}
                      onPress={() => setSelectedDay(day.key)}
                      style={[styles.dayChip, on && styles.dayChipOn]}
                    >
                      <Text style={[styles.dayName, on && styles.dayTextOn]}>{day.weekday}</Text>
                      <Text style={[styles.dayNum, on && styles.dayTextOn]}>{day.dayNumber}</Text>
                      <Text style={[styles.dayCount, on && styles.dayTextOn]}>{day.slots.length} open</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.dayHeading}>{days.find((d) => d.key === activeDay)?.long}</Text>
              <View style={styles.timeGrid}>
                {(days.find((d) => d.key === activeDay)?.slots || []).map((slot) => {
                  const selected = selectedSlot === slot._id;
                  return (
                    <Pressable
                      key={slot._id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => setSelectedSlot(slot._id)}
                      style={[styles.timeChip, selected && styles.timeChipOn]}
                    >
                      <Text style={[styles.timeText, selected && styles.timeTextOn]}>{new Date(slot.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {selectedSlotRecord ? (
                <SurfaceCard style={styles.summary}>
                  <Text style={styles.summaryTitle}>Your selection</Text>
                  <Text style={styles.summaryText}>{new Date(selectedSlotRecord.startsAt).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {selectedSlotRecord.durationMinutes} min</Text>
                </SurfaceCard>
              ) : null}
            </>

          ) : (
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
              <SurfaceCard style={styles.shareCard}>
                <View style={styles.shareCopy}>
                  <Text style={styles.shareTitle}>Share my latest check-in</Text>
                  <Text style={styles.shareText}>Optional. Only this counsellor can see a short summary. Off by default.</Text>
                </View>
                <Switch
                  accessibilityLabel="Share my latest check-in with this counsellor"
                  value={shareCheckIn}
                  onValueChange={setShareCheckIn}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                />
              </SurfaceCard>
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
  dayRow: { gap: Space.sm, paddingVertical: Space.xs },
  dayChip: { minWidth: 84, alignItems: 'center', gap: 2, padding: Space.sm, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  dayChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayName: { color: Colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  dayNum: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  dayCount: { color: Colors.muted, fontSize: 11 },
  dayTextOn: { color: Colors.white },
  dayHeading: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  timeChip: { minWidth: 92, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.md, borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  timeChipOn: { backgroundColor: Colors.paleCoral, borderColor: Colors.primary, borderWidth: 2 },
  timeText: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  timeTextOn: { color: Colors.accent, fontWeight: '900' },
  summary: { gap: 2, backgroundColor: Colors.paleBlue },
  summaryTitle: { color: Colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  summaryText: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  types: { flexDirection: 'row', gap: Space.sm, flexWrap: 'wrap' },
  type: { paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  selectedType: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
  selectedTypeText: { color: Colors.white },
  bookButton: { minHeight: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  shareCard: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  shareCopy: { flex: 1, gap: 3 },
  shareTitle: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  shareText: { color: Colors.muted, fontSize: 13 },
  disabled: { opacity: 0.6 },
  bookLabel: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
});
