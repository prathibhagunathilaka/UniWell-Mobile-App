import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { AppointmentRecord, getCounsellorAppointments } from '@/services/counsellingService';

const DAY = 24 * 60 * 60 * 1000;

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
      {days.map(({ start, items }) => (
        <SurfaceCard key={start.toISOString()} style={[styles.day, start.toDateString() === todayKey && styles.today]}>
          <Text style={styles.dayTitle}>{start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
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
      ))}
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
  dayTitle: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  empty: { color: Colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', gap: Space.md, padding: Space.sm, borderRadius: Radius.md, alignItems: 'center' },
  time: { width: 68, color: Colors.accent, fontSize: 14, fontWeight: '800' },
  rowCopy: { flex: 1 },
  who: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  chip: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
