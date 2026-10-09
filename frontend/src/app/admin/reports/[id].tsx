import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BarList, LineChart } from '@/components/wellbeing/Charts';
import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { getManagedCounsellors, getUsageReport, ManagedCounsellor, UsageReport } from '@/services/adminService';

const DAY = 24 * 60 * 60 * 1000;
const RANGES = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: '180', label: '6 months', days: 180 },
] as const;

const SESSION_LABEL: Record<string, string> = { 'in-person': 'In person', online: 'Online', phone: 'Phone' };
const STATUS_LABEL: Record<string, string> = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_TONE: Record<ManagedCounsellor['status'], string> = { active: 'Active', pending: 'Awaiting approval', suspended: 'Suspended / declined' };

const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? 'n/a' : `${v}%`);
const weekLabel = (weekStart: string) =>
  new Date(`${weekStart}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ''}`}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

// Everything about one counsellor: profile, workload numbers, weekly trend line chart and patterns.
export default function CounsellorWorkloadDetailScreen() {
  const { id, range: rangeParam } = useLocalSearchParams<{ id: string; range?: string }>();
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>(RANGES.some((r) => r.key === rangeParam) ? (rangeParam as '30' | '90' | '180') : '90');
  const [report, setReport] = useState<UsageReport | null>(null);
  const [profile, setProfile] = useState<ManagedCounsellor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const days = RANGES.find((r) => r.key === range)?.days ?? 90;
    const now = Date.now();
    const [rep, list] = await Promise.allSettled([
      // Past period plus the next 30 days so upcoming bookings show on the chart.
      getUsageReport({ from: new Date(now - days * DAY).toISOString(), to: new Date(now + 30 * DAY).toISOString(), counsellorId: id }),
      getManagedCounsellors(),
    ]);
    if (rep.status === 'fulfilled') {
      setReport(rep.value.report);
      setError('');
    } else {
      setError(rep.reason instanceof Error ? rep.reason.message : 'Unable to load this counsellor’s report.');
    }
    if (list.status === 'fulfilled') setProfile(list.value.counsellors.find((c) => c._id === id) ?? null);
    setLoading(false);
  }, [id, range]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const insights = useMemo(() => {
    if (!report) return [] as string[];
    const out: string[] = [];
    const t = report.totals;
    if (t.bookings === 0) out.push('No bookings in this period.');
    if ((t.cancellationRate ?? 0) >= 25) out.push(`${t.cancellationRate}% of bookings were cancelled.`);
    if (report.cancellations.byCounsellor > report.cancellations.byStudent && report.cancellations.byCounsellor > 0) {
      out.push(`Most cancellations (${report.cancellations.byCounsellor}) were made by the counsellor, not students.`);
    }
    if (t.completionRate !== null && t.completionRate < 70) out.push(`Only ${t.completionRate}% of past sessions are marked completed.`);
    if (t.openSlots === 0 && t.bookings > 0) out.push('No open slots left. Students cannot book this counsellor.');
    else if ((t.overallUtilisation ?? 0) >= 85) out.push(`Capacity is ${t.overallUtilisation}% used. Consider asking for more availability.`);
    if ((profile?.stats.pendingBookings ?? 0) >= 3) out.push(`${profile?.stats.pendingBookings} upcoming bookings are waiting for confirmation.`);
    if (!report.satisfaction.suppressed && report.satisfaction.average < 3.5) out.push(`Satisfaction is ${report.satisfaction.average}/5.`);
    return out;
  }, [report, profile]);

  const t = report?.totals;
  const weekly = report?.weekly ?? [];
  const labels = weekly.map((w) => weekLabel(w.weekStart));
  const weekdayRows = report ? report.byWeekday.map((d) => ({ label: d.label, value: d.count })) : [];
  const hourRows = report ? report.byHour.filter((h) => h.count > 0).map((h) => ({ label: `${String(h.hour).padStart(2, '0')}:00`, value: h.count })) : [];
  const sessionRows = report ? Object.entries(report.bySessionType).map(([k, v]) => ({ label: SESSION_LABEL[k] || k, value: v })) : [];
  const statusRows = report ? Object.entries(report.byStatus).map(([k, v]) => ({ label: STATUS_LABEL[k] || k, value: v })) : [];

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/admin/reports" label="Reports" />
      <PageHeading title={profile?.name || 'Counsellor'} subtitle={profile ? `${profile.specialization || 'Counsellor'} · ${STATUS_TONE[profile.status]}` : 'Workload details'} />
      <InlineMessage tone="error">{error}</InlineMessage>

      <View style={styles.chips}>
        {RANGES.map((r) => (
          <Pressable key={r.key} accessibilityRole="radio" accessibilityState={{ checked: range === r.key }} onPress={() => setRange(r.key)} style={[styles.chip, range === r.key && styles.chipOn]}>
            <Text style={[styles.chipText, range === r.key && styles.chipTextOn]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading && !report ? <LoadingState label="Loading counsellor details..." /> : null}

      {profile ? (
        <SurfaceCard style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          {profile.qualification ? <Text style={styles.detail}>{profile.qualification}</Text> : null}
          {profile.yearsOfExperience !== undefined ? <Text style={styles.detail}>{profile.yearsOfExperience} years of experience</Text> : null}
          <Text style={styles.detail}>{profile.email}{profile.phoneNumber ? ` · ${profile.phoneNumber}` : ''}</Text>
          <Text style={styles.detail}>Joined {new Date(profile.createdAt).toLocaleDateString()}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/admin/counsellors')} style={styles.manage}><Text style={styles.manageText}>Manage account</Text></Pressable>
        </SurfaceCard>
      ) : null}

      {insights.length > 0 ? (
        <SurfaceCard style={styles.attention}>
          <Text style={styles.cardTitle}>Worth noticing</Text>
          {insights.map((text) => <Text key={text} style={styles.insight}>• {text}</Text>)}
        </SurfaceCard>
      ) : null}

      {report && t ? (
        <>
          <SectionHeading title="At a glance" detail={`Last ${RANGES.find((r) => r.key === range)?.label} and the next 30 days`} />
          <View style={styles.stats}>
            <Stat label="Bookings" value={String(t.bookings)} />
            <Stat label="Completed" value={String(t.completed)} hint={`${fmtPct(t.completionRate)} of past sessions`} tone={Colors.success} />
            <Stat label="Cancelled" value={String(t.cancelled)} hint={`${fmtPct(t.cancellationRate)} · ${report.cancellations.byStudent} by students, ${report.cancellations.byCounsellor} by counsellor`} tone={(t.cancellationRate ?? 0) >= 25 ? Colors.error : undefined} />
            <Stat label="Upcoming" value={String(t.upcoming)} hint={profile ? `${profile.stats.pendingBookings} unconfirmed` : undefined} />
            <Stat label="Open slots" value={String(t.openSlots)} hint={`${fmtPct(t.overallUtilisation)} capacity used`} />
            <Stat label="Satisfaction" value={report.satisfaction.suppressed ? 'n/a' : `${report.satisfaction.average}/5`} hint={report.satisfaction.suppressed ? 'needs 5+ ratings' : `${report.satisfaction.responses} ratings`} />
          </View>

          <SurfaceCard style={styles.card}>
            <Text style={styles.cardTitle}>Weekly bookings</Text>
            <Text style={styles.detail}>Bookings, completed and cancelled sessions per week (weeks start Monday).</Text>
            {weekly.length < 2 ? (
              <Text style={styles.detail}>Not enough weeks of data to draw a trend yet.</Text>
            ) : (
              <LineChart
                labels={labels}
                series={[
                  { name: 'Bookings', color: Colors.primary, values: weekly.map((w) => w.bookings) },
                  { name: 'Completed', color: Colors.success, values: weekly.map((w) => w.completed) },
                  { name: 'Cancelled', color: Colors.error, values: weekly.map((w) => w.cancelled) },
                ]}
              />
            )}
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <Text style={styles.cardTitle}>Busiest days</Text>
            {report.peak ? <Text style={styles.detail}>Peak: {report.peak.weekday}s around {String(report.peak.hour).padStart(2, '0')}:00</Text> : null}
            <BarList rows={weekdayRows} color={Colors.primary} />
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <Text style={styles.cardTitle}>Busiest times of day</Text>
            <BarList rows={hourRows} />
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <Text style={styles.cardTitle}>Session types</Text>
            <BarList rows={sessionRows} />
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <Text style={styles.cardTitle}>Booking outcomes</Text>
            <BarList rows={statusRows} />
          </SurfaceCard>
          <Text style={styles.footnote}>Counts only. No student names or session notes are shown here.</Text>
        </>
      ) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: Space.md, borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: Colors.white },
  card: { gap: Space.sm },
  cardTitle: { color: Colors.accent, fontSize: 15, fontWeight: '900' },
  detail: { color: Colors.muted, fontSize: 13, lineHeight: 18 },
  attention: { gap: Space.xs, backgroundColor: Colors.paleCoral, borderWidth: 1, borderColor: Colors.primary },
  insight: { color: Colors.accent, fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  stat: { flexGrow: 1, flexBasis: '45%', gap: 2, padding: Space.md, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  statLabel: { color: Colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  statValue: { color: Colors.accent, fontSize: 26, fontWeight: '900' },
  statHint: { color: Colors.muted, fontSize: 11 },
  manage: { minHeight: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paleBlue, marginTop: Space.xs },
  manageText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  footnote: { color: Colors.muted, fontSize: 12, textAlign: 'center' },
});
