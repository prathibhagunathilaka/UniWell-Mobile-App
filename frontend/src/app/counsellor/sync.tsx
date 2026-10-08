import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, PrimaryButton, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
  AppointmentRecord,
  CalendarSyncStatus,
  createCalendarLink,
  disableCalendarLink,
  exportCalendar,
  getCalendarSyncStatus,
  getCounsellorAppointments,
} from '@/services/counsellingService';
import { addAppointmentToDeviceCalendar } from '@/utils/deviceCalendar';
import { saveAndShareTextFile } from '@/utils/shareFile';

// FR4 "Booking Sync Confirmation": the counsellor taps "Add to my calendar" and the phone's own
// calendar opens with the booking pre-filled. They choose any account (Google, iCloud, Outlook...)
// and save it there. The private subscription link stays available as an optional extra.
export default function CounsellorSyncScreen() {
  const [status, setStatus] = useState<CalendarSyncStatus | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [sync, list] = await Promise.all([getCalendarSyncStatus(), getCounsellorAppointments()]);
      setStatus(sync);
      setAppointments(list.appointments);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load sync status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // Upcoming booked sessions only (not open slots, not past, not cancelled).
  const upcoming = useMemo(
    () => appointments
      .filter((a) => a.studentId && ['pending', 'confirmed'].includes(a.status) && new Date(a.startsAt) > new Date())
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [appointments],
  );

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(done);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const addOne = async (a: AppointmentRecord) => {
    setError('');
    setMessage('');
    try {
      const result = await addAppointmentToDeviceCalendar(a);
      if (result === 'cancelled') return false;
      setAdded((prev) => ({ ...prev, [a._id]: true }));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open your calendar.');
      return false;
    }
  };

  // Opens the calendar one booking at a time; stops if the counsellor backs out.
  const addAll = async () => {
    setBusy(true);
    let count = 0;
    for (const a of upcoming.filter((x) => !added[x._id])) {
      if (!(await addOne(a))) break;
      count += 1;
    }
    if (count > 0) setMessage(`${count} booking${count === 1 ? '' : 's'} sent to your calendar.`);
    setBusy(false);
  };

  const shareLink = () => status?.feedUrl && Share.share({ message: status.feedUrl, title: 'UniWell calendar link' });
  const shareIcs = () => run(async () => {
    const file = await exportCalendar();
    await saveAndShareTextFile(file.filename, file.ics, 'text/calendar', 'public.calendar-event');
  }, 'Calendar file ready. Open it with your calendar app, or save it to Files / Drive.');

  const remaining = upcoming.filter((a) => !added[a._id]).length;

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/counsellor" label="Workspace" />
      <PageHeading title="Booking sync" subtitle="Add your student bookings to the calendar app on your phone, in whichever account you use." />
      {loading ? <LoadingState label="Checking sync status..." /> : null}
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>
      {status ? (
        <>
          <SurfaceCard style={styles.confirm}>
            <Text style={styles.confirmTitle}>✓ Bookings are saved to your UniWell calendar automatically</Text>
            <Text style={styles.detail}>{status.upcomingBookings ?? 0} upcoming booking(s), {status.pendingBookings ?? 0} waiting for your confirmation.</Text>
          </SurfaceCard>

          <SectionHeading title="Add to my phone's calendar" detail="Your calendar opens with the details filled in. Pick your Google (or any other) account and tap Save." />
          <SurfaceCard style={styles.card}>
            {upcoming.length === 0 ? <Text style={styles.detail}>No upcoming bookings to add yet.</Text> : null}
            {upcoming.map((a) => (
              <View key={a._id} style={styles.item}>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle}>{a.studentId?.name || 'Student'}</Text>
                  <Text style={styles.detail}>
                    {new Date(a.startsAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {a.sessionType}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${a.studentId?.name || 'student'} booking to calendar`}
                  disabled={busy}
                  onPress={() => void addOne(a)}
                  style={[styles.addBtn, added[a._id] && styles.addBtnDone, busy && styles.disabled]}
                >
                  <Text style={styles.addBtnText}>{added[a._id] ? '✓ Added' : 'Add'}</Text>
                </Pressable>
              </View>
            ))}
            {remaining > 1 ? <PrimaryButton title={`Add all ${remaining} bookings, one by one`} onPress={() => void addAll()} loading={busy} /> : null}
          </SurfaceCard>

          <SectionHeading title="Or subscribe automatically" detail="Optional. Add this private link to Google Calendar, Apple Calendar or Outlook; they refresh it on their own, so new bookings appear without tapping Add." />
          {status.enabled ? (
            <SurfaceCard style={styles.card}>
              <Text style={styles.link} selectable>{status.feedUrl}</Text>
              <Text style={styles.detail}>{status.lastFetchedAt ? `Last read by your calendar: ${new Date(status.lastFetchedAt).toLocaleString()}` : 'Not read by a calendar app yet.'}</Text>
              <PrimaryButton title="Share link" onPress={() => void shareLink()} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(createCalendarLink, 'New link created. The old link no longer works.')} style={styles.ghost}><Text style={styles.ghostText}>Create a new link (invalidates the old one)</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(disableCalendarLink, 'Calendar link disabled.')} style={styles.ghost}><Text style={styles.danger}>Turn off link</Text></Pressable>
            </SurfaceCard>
          ) : (
            <SurfaceCard style={styles.card}>
              <Text style={styles.detail}>The link contains only student names, times and session type. No wellbeing data is ever included.</Text>
              <PrimaryButton title="Create private calendar link" onPress={() => void run(createCalendarLink, 'Calendar link created.')} loading={busy} />
            </SurfaceCard>
          )}

          <SectionHeading title="Export" detail="Create a PDF of your bookings as a table or calendar grid, for any date or range, with filters." />
          <SurfaceCard style={styles.card}>
            <PrimaryButton title="Export PDF (table or calendar)" onPress={() => router.push('/counsellor/export')} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void shareIcs()} style={styles.ghost}><Text style={styles.ghostText}>Share raw calendar file (.ics)</Text></Pressable>
          </SurfaceCard>
        </>
      ) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  confirm: { gap: Space.xs, backgroundColor: Colors.paleBlue },
  confirmTitle: { color: Colors.success, fontSize: 16, fontWeight: '800' },
  card: { gap: Space.sm },
  detail: { color: Colors.muted, fontSize: 13 },
  link: { color: Colors.accent, fontSize: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: Space.xs },
  itemCopy: { flex: 1, gap: 2 },
  itemTitle: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  addBtn: { minWidth: 76, minHeight: 44, paddingHorizontal: Space.md, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  addBtnDone: { backgroundColor: Colors.paleBlue },
  addBtnText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  ghost: { minHeight: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: Colors.accent, fontSize: 13, fontWeight: '800' },
  danger: { color: Colors.error, fontSize: 13, fontWeight: '800' },
});
