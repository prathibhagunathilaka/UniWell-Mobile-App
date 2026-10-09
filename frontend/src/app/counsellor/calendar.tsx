import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { AppointmentRecord, createAvailabilityBulk, getCounsellorAppointments } from '@/services/counsellingService';

const DAY = 24 * 60 * 60 * 1000;
const SLOT_MS = 30 * 60 * 1000;
const MAX_SLOTS = 8;

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7; // Monday first
  d.setDate(d.getDate() - diff);
  return d;
};

const statusStyle = (status: AppointmentRecord['status']) => {
  switch (status) {
    case 'confirmed': return { bg: Colors.paleBlue, fg: Colors.success, label: 'Confirmed' };
    case 'pending': return { bg: Colors.paleCoral, fg: Colors.primary, label: 'Needs confirmation' };
    case 'completed': return { bg: Colors.border, fg: Colors.muted, label: 'Completed' };
    case 'available': return { bg: Colors.white, fg: Colors.muted, label: 'Open slot' };
    default: return { bg: Colors.white, fg: Colors.error, label: status };
  }
};

// NEW (FR4): week-by-week calendar of every booking, auto-populated from student bookings.
export default function CounsellorCalendarScreen() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [showOpen, setShowOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  // Per-day "+" panel: which day is open, plus its start time and number of 30-minute slots.
  const [addingDay, setAddingDay] = useState('');
  const [slotTime, setSlotTime] = useState('09:00');
  const [slotCount, setSlotCount] = useState(1);
  const [savingSlots, setSavingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await getCounsellorAppointments();
      setAppointments(response.appointments);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your calendar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    const timer = setInterval(() => void load(), 60000); // keep the view in sync with new bookings
    return () => clearInterval(timer);
  }, [load]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const start = new Date(weekStart.getTime() + i * DAY);
    const end = new Date(start.getTime() + DAY);
    const items = appointments
      .filter((a) => {
        const t = new Date(a.startsAt);
        return t >= start && t < end && (showOpen || a.status !== 'available');
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return { start, items };
  }), [appointments, weekStart, showOpen]);

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${new Date(weekStart.getTime() + 6 * DAY).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const bookedThisWeek = days.reduce((n, d) => n + d.items.filter((a) => ['pending', 'confirmed'].includes(a.status)).length, 0);
  const todayKey = new Date().toDateString();

  const toggleAdd = (day: Date) => {
    const key = day.toDateString();
    setSlotError('');
    setMessage('');
    setAddingDay((current) => (current === key ? '' : key));
  };

  const saveSlots = async (day: Date) => {
    setSlotError('');
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(slotTime.trim());
    if (!match) {
      setSlotError('Enter the start time as HH:MM in 24-hour format, e.g. 14:30.');
      return;
    }
    const first = new Date(day);
    first.setHours(Number(match[1]), Number(match[2]), 0, 0);
    if (first.getTime() <= Date.now()) {
      setSlotError('Choose a start time in the future.');
      return;
    }
    const slots = Array.from({ length: slotCount }, (_, i) => new Date(first.getTime() + i * SLOT_MS).toISOString());
    setSavingSlots(true);
    try {
      const result = await createAvailabilityBulk(slots);
      const added = result.created.length;
      if (added === 0) {
        setSlotError(result.skipped[0]?.reason || 'That time overlaps an existing slot or appointment.');
        return;
      }
      setMessage(`${added} slot${added === 1 ? '' : 's'} added on ${day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}${result.skipped.length ? ` (${result.skipped.length} skipped because of conflicts)` : ''}.`);
      setAddingDay('');
      setSlotCount(1);
      await load();
    } catch (cause) {
      setSlotError(cause instanceof Error ? cause.message : 'Unable to add availability.');
    } finally {
      setSavingSlots(false);
    }
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/counsellor" label="Workspace" />
      <PageHeading title="Appointment calendar" subtitle="Every student booking appears here automatically." />
      <View style={styles.weekBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous week" onPress={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY))} style={styles.nav}><Text style={styles.navText}>‹</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setWeekStart(startOfWeek(new Date()))} style={styles.weekCenter}>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Text style={styles.weekSub}>{bookedThisWeek} booked · tap for this week</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next week" onPress={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY))} style={styles.nav}><Text style={styles.navText}>›</Text></Pressable>
      </View>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: showOpen }} onPress={() => setShowOpen((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>{showOpen ? '✓ Showing open slots' : 'Open slots hidden'}</Text>
      </Pressable>
      {loading ? <LoadingState label="Loading calendar..." /> : null}
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>
      {days.map(({ start, items }) => {
        const dayKey = start.toDateString();
        const isPast = start.getTime() + DAY <= Date.now();
        const isAdding = addingDay === dayKey;
        const dayLabel = start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        return (
        <SurfaceCard key={start.toISOString()} style={[styles.day, dayKey === todayKey && styles.today]}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{dayLabel}</Text>
            {!isPast ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isAdding ? `Close add availability for ${dayLabel}` : `Add availability on ${dayLabel}`}
                onPress={() => toggleAdd(start)}
                style={[styles.plus, isAdding && styles.plusOn]}
              >
                <Ionicons name={isAdding ? 'close' : 'add'} size={22} color={isAdding ? Colors.accent : Colors.white} />
              </Pressable>
            ) : null}
          </View>
          {isAdding ? (
            <View style={styles.addPanel}>
              <Text style={styles.addTitle}>Open availability on this day</Text>
              <View style={styles.addRow}>
                <View style={styles.addField}>
                  <Text style={styles.addLabel}>Start time (HH:MM)</Text>
                  <TextInput
                    value={slotTime}
                    onChangeText={setSlotTime}
                    placeholder="09:00"
                    placeholderTextColor={Colors.muted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    accessibilityLabel="Start time"
                    style={styles.timeInput}
                  />
                </View>
                <View style={styles.addField}>
                  <Text style={styles.addLabel}>30-min slots</Text>
                  <View style={styles.stepper}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Fewer slots" onPress={() => setSlotCount((n) => Math.max(1, n - 1))} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable>
                    <Text style={styles.stepValue}>{slotCount}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="More slots" onPress={() => setSlotCount((n) => Math.min(MAX_SLOTS, n + 1))} style={styles.stepButton}><Text style={styles.stepText}>+</Text></Pressable>
                  </View>
                </View>
              </View>
              <Text style={styles.addHint}>
                {slotCount === 1 ? 'Publishes one 30-minute slot.' : `Publishes ${slotCount} back-to-back slots (${slotCount * 30} min).`} Students can book them straight away.
              </Text>
              {slotError ? <Text style={styles.addError}>{slotError}</Text> : null}
              <Pressable accessibilityRole="button" disabled={savingSlots} onPress={() => void saveSlots(start)} style={[styles.addButton, savingSlots && styles.disabled]}>
                <Text style={styles.addButtonText}>{savingSlots ? 'Adding...' : 'Add availability'}</Text>
              </Pressable>
            </View>
          ) : null}
          {items.length === 0 ? <Text style={styles.empty}>Nothing scheduled</Text> : null}
          {items.map((a) => {
            const st = statusStyle(a.status);
            const disabled = a.status === 'available';
            return (
              <Pressable
                key={a._id}
                disabled={disabled}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/counsellor/appointments/[id]', params: { id: a._id } })}
                style={[styles.row, { backgroundColor: st.bg }]}
              >
                <Text style={styles.time}>{new Date(a.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                <View style={styles.rowCopy}>
                  <Text style={styles.who}>{a.studentId?.name || (disabled ? 'Open slot' : 'Student')}</Text>
                  <Text style={[styles.chip, { color: st.fg }]}>{st.label}{a.studentId ? ` · ${a.sessionType}` : ''}</Text>
                </View>
              </Pressable>
            );
          })}
        </SurfaceCard>
        );
      })}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  weekBar: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  nav: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  navText: { color: Colors.accent, fontSize: 22, fontWeight: '800' },
  weekCenter: { flex: 1, alignItems: 'center' },
  weekLabel: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  weekSub: { color: Colors.muted, fontSize: 12 },
  toggle: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: Space.md, borderRadius: Radius.pill, backgroundColor: Colors.paleBlue },
  toggleText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
  day: { gap: Space.xs },
  today: { borderWidth: 2, borderColor: Colors.primary },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  dayTitle: { flex: 1, color: Colors.accent, fontSize: 15, fontWeight: '800' },
  plus: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  plusOn: { backgroundColor: Colors.paleBlue },
  addPanel: { gap: Space.sm, padding: Space.md, borderRadius: Radius.md, backgroundColor: Colors.paleBlue },
  addTitle: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  addRow: { flexDirection: 'row', gap: Space.md },
  addField: { flex: 1, gap: 4 },
  addLabel: { color: Colors.muted, fontSize: 12, fontWeight: '700' },
  timeInput: { minHeight: 44, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: Space.sm, fontSize: 16, color: Colors.accent },
  stepper: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  stepButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: Colors.accent, fontSize: 22, fontWeight: '800' },
  stepValue: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  addHint: { color: Colors.muted, fontSize: 12, lineHeight: 18 },
  addError: { color: Colors.error, fontSize: 13, fontWeight: '700' },
  addButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.primary },
  addButtonText: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  empty: { color: Colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', gap: Space.md, padding: Space.sm, borderRadius: Radius.md, alignItems: 'center' },
  time: { width: 68, color: Colors.accent, fontSize: 14, fontWeight: '800' },
  rowCopy: { flex: 1 },
  who: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  chip: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
