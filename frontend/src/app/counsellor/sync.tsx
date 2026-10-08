import { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, PrimaryButton, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
    CalendarSyncStatus,
    createCalendarLink,
    disableCalendarLink,
    exportCalendar,
    getCalendarSyncStatus,
} from '@/services/counsellingService';

// NEW (FR4): "Booking Sync Confirmation". UniWell is the source of truth, and the counsellor can
// also subscribe Google/Apple/Outlook calendar to a private link so nothing is copied by hand.
export default function CounsellorSyncScreen() {
  const [status, setStatus] = useState<CalendarSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setStatus(await getCalendarSyncStatus());
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

  const shareLink = () => status?.feedUrl && Share.share({ message: status.feedUrl, title: 'UniWell calendar link' });
  const shareIcs = () => run(async () => {
    const file = await exportCalendar();
    await Share.share({ message: file.ics, title: file.filename });
  }, 'Calendar exported.');

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/counsellor" label="Workspace" />
      <PageHeading title="Booking sync" subtitle="Keep every student booking on your own calendar without copying anything by hand." />
      {loading ? <LoadingState label="Checking sync status..." /> : null}
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>
      {status ? (
        <>
          <SurfaceCard style={styles.confirm}>
            <Text style={styles.confirmTitle}>✓ Bookings are saved to your UniWell calendar automatically</Text>
            <Text style={styles.detail}>{status.upcomingBookings ?? 0} upcoming booking(s), {status.pendingBookings ?? 0} waiting for your confirmation.</Text>
          </SurfaceCard>

          <SectionHeading title="Subscribe from your calendar app" detail="Optional. Add this private link to Google Calendar, Apple Calendar or Outlook; they refresh it on their own." />
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

          <SectionHeading title="One-off export" detail="Send a .ics copy of your bookings to another app." />
          <SurfaceCard style={styles.card}>
            <PrimaryButton title="Export bookings (.ics)" onPress={() => void shareIcs()} loading={busy} />
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
  ghost: { minHeight: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: Colors.accent, fontSize: 13, fontWeight: '800' },
  danger: { color: Colors.error, fontSize: 13, fontWeight: '800' },
});
