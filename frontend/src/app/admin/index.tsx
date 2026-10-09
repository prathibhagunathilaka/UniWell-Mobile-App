import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { AdminOverview, getAdminOverview, getUsageReport, UsageReport } from '@/services/adminService';
import { getPendingCounsellors, updateCounsellorApproval } from '@/services/counsellingService';

type PendingCounsellor = {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  qualification: string;
  specialization: string;
  yearsOfExperience: number;
};

type Tone = 'good' | 'warn' | 'bad' | 'neutral';
type Insight = { tone: Exclude<Tone, 'neutral'>; text: string; action?: { label: string; onPress: () => void } };

const DAY = 24 * 60 * 60 * 1000;
const TREND_DAYS = 14;
const toneColor: Record<Tone, string> = { good: Colors.success, warn: '#B26A00', bad: Colors.error, neutral: Colors.accent };
const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? 'n/a' : `${v}%`);

function Kpi({ label, value, hint, tone = 'neutral', icon }: { label: string; value: string; hint?: string; tone?: Tone; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.kpi} accessible accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ''}`}>
      <View style={styles.kpiTop}>
        <Ionicons name={icon} size={16} color={Colors.muted} />
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      <Text style={[styles.kpiValue, { color: toneColor[tone] }]}>{value}</Text>
      {hint ? <Text style={styles.kpiHint}>{hint}</Text> : null}
    </View>
  );
}

function Bar({ label, value, max, color = Colors.secondary }: { label: string; value: number; max: number; color?: string }) {
  return (
    <View style={styles.barRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${max ? (value / max) * 100 : 0}%`, backgroundColor: color }]} /></View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

// Admin home: key service analytics first, then what needs a decision (approvals), then detail.
export default function AdminDashboardScreen() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [report, setReport] = useState<UsageReport | null>(null);
  const [counsellors, setCounsellors] = useState<PendingCounsellor[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const now = Date.now();
    // Independent requests: one failing should not blank the whole page.
    const [ov, rep, pending] = await Promise.allSettled([
      getAdminOverview(),
      getUsageReport({ from: new Date(now - 30 * DAY).toISOString(), to: new Date(now).toISOString() }),
      getPendingCounsellors(),
    ]);
    if (ov.status === 'fulfilled') setOverview(ov.value.overview);
    if (rep.status === 'fulfilled') setReport(rep.value.report);
    if (pending.status === 'fulfilled') setCounsellors(pending.value.counsellors);
    const failed = [ov, rep, pending].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    setError(failed.length ? (failed[0].reason instanceof Error ? failed[0].reason.message : 'Some figures could not be loaded.') : '');
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const decide = async (counsellor: PendingCounsellor, status: 'active' | 'suspended') => {
    setUpdating(counsellor._id);
    setError('');
    try {
      await updateCounsellorApproval(counsellor._id, status);
      setCounsellors((current) => current.filter((item) => item._id !== counsellor._id));
      setMessage(status === 'active' ? `${counsellor.name} is approved and can now log in.` : `${counsellor.name} was declined.`);
      void getAdminOverview().then((r) => setOverview(r.overview)).catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this counsellor account.');
    } finally {
      setUpdating('');
    }
  };

  // Plain-language "what stands out", generated from the numbers.
  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    if (counsellors.length > 0) {
      list.push({ tone: 'warn', text: `${counsellors.length} counsellor application${counsellors.length === 1 ? ' is' : 's are'} waiting for your decision.` });
    }
    if (overview) {
      const { next7Days, awaitingConfirmation } = overview;
      if (next7Days.booked + next7Days.openSlots === 0) {
        list.push({ tone: 'bad', text: 'No counsellor availability is published for the next 7 days. Students cannot book.' });
      } else if (next7Days.openSlots === 0) {
        list.push({ tone: 'bad', text: 'Every slot in the next 7 days is taken. Students may be turned away.' });
      } else if ((next7Days.utilisation ?? 0) >= 85) {
        list.push({ tone: 'warn', text: `Capacity is ${next7Days.utilisation}% booked for the next 7 days. Ask counsellors to add availability.` });
      }
      if (awaitingConfirmation >= 5) {
        list.push({ tone: 'warn', text: `${awaitingConfirmation} upcoming bookings are still waiting for a counsellor to confirm.` });
      }
      if (overview.users.counsellors.active === 0) {
        list.push({ tone: 'bad', text: 'There are no active counsellors.' });
      }
    }
    if (report) {
      if ((report.totals.cancellationRate ?? 0) >= 25) {
        list.push({ tone: 'warn', text: `${report.totals.cancellationRate}% of bookings in the last 30 days were cancelled. Review reminders and slot lengths.` });
      }
      if (report.totals.completionRate !== null && report.totals.completionRate < 70) {
        list.push({ tone: 'warn', text: `Only ${report.totals.completionRate}% of past sessions are marked completed. Counsellors may need to close sessions off.` });
      }
      if (!report.satisfaction.suppressed && report.satisfaction.average < 3.5) {
        list.push({ tone: 'warn', text: `Session satisfaction is ${report.satisfaction.average}/5. Worth a closer look.` });
      }
    }
    return list;
  }, [counsellors.length, overview, report]);

  // Bookings per day for the last 14 days, in the server's reporting time zone.
  const trend = useMemo(() => {
    if (!report) return [];
    const offset = (report.timeZoneOffsetMinutes ?? 0) * 60 * 1000;
    const counts = new Map(report.byDay.map((d) => [d.date, d.count]));
    return Array.from({ length: TREND_DAYS }, (_, i) => {
      const date = new Date(Date.now() + offset - (TREND_DAYS - 1 - i) * DAY);
      const key = date.toISOString().slice(0, 10);
      return { key, day: date.getUTCDate(), count: counts.get(key) || 0 };
    });
  }, [report]);
  const trendMax = Math.max(1, ...trend.map((t) => t.count));
  const trendTotal = trend.reduce((n, t) => n + t.count, 0);

  const sessionMix = report ? Object.entries(report.bySessionType) : [];
  const sessionMax = Math.max(1, ...sessionMix.map(([, v]) => v));
  const levels = report && !report.checkIns.suppressed ? Object.entries(report.checkIns.levels) : [];
  const levelMax = Math.max(1, ...levels.map(([, v]) => (typeof v === 'number' ? v : 0)));
  const topWorkload = report ? report.workload.slice(0, 3) : [];

  const utilisation = overview?.next7Days.utilisation ?? null;
  const utilTone: Tone = utilisation === null ? 'neutral' : utilisation >= 85 ? 'bad' : utilisation >= 70 ? 'warn' : 'good';
  const cancelTone: Tone = report?.totals.cancellationRate == null ? 'neutral' : report.totals.cancellationRate >= 25 ? 'bad' : report.totals.cancellationRate >= 15 ? 'warn' : 'good';

  const approvals = (
    <>
      <SectionHeading title="Counsellor applications" detail="Review details before directory access is enabled." />
      {counsellors.map((counsellor) => (
        <SurfaceCard key={counsellor._id} style={styles.card}>
          <Text style={styles.name}>{counsellor.name}</Text>
          <Text style={styles.detail}>{counsellor.email}</Text>
          <Text style={styles.detail}>{counsellor.qualification}</Text>
          <Text style={styles.detail}>{counsellor.specialization} · {counsellor.yearsOfExperience} years of experience</Text>
          {counsellor.phoneNumber ? <Text style={styles.detail}>{counsellor.phoneNumber}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={Boolean(updating)} onPress={() => void decide(counsellor, 'active')} style={[styles.approve, updating && styles.disabled]}>
              <Text style={styles.actionLabel}>{updating === counsellor._id ? 'Saving...' : 'Approve'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={Boolean(updating)} onPress={() => void decide(counsellor, 'suspended')} style={[styles.decline, updating && styles.disabled]}>
              <Text style={styles.actionLabel}>Decline</Text>
            </Pressable>
          </View>
        </SurfaceCard>
      ))}
    </>
  );

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <View style={styles.headRow}>
        <View style={styles.headCopy}><PageHeading title="Overview" subtitle="How UniWell is being used, and what needs you." /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh figures" disabled={loading} onPress={() => void load()} style={[styles.refresh, loading && styles.disabled]}>
          <Ionicons name="refresh" size={20} color={Colors.accent} />
        </Pressable>
      </View>
      {updatedAt ? <Text style={styles.updated}>Updated {updatedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · usage figures cover the last 30 days</Text> : null}
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>
      {loading && !overview && !report ? <LoadingState label="Loading overview..." /> : null}

      {insights.length > 0 ? (
        <SurfaceCard style={styles.attention}>
          <Text style={styles.attentionTitle}>Needs attention</Text>
          {insights.map((item) => (
            <View key={item.text} style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: toneColor[item.tone] }]} />
              <Text style={styles.insightText}>{item.text}</Text>
            </View>
          ))}
        </SurfaceCard>
      ) : overview || report ? (
        <SurfaceCard style={styles.allGood}>
          <Text style={styles.allGoodText}>✓ All clear. Nothing needs your attention right now.</Text>
        </SurfaceCard>
      ) : null}

      {overview ? (
        <>
          <SectionHeading title="Right now" />
          <View style={styles.kpis}>
            <Kpi icon="calendar-outline" label="Sessions today" value={String(overview.today.bookings)} />
            <Kpi icon="speedometer-outline" label="Capacity, next 7 days" value={fmtPct(utilisation)} tone={utilTone} hint={`${overview.next7Days.booked} booked · ${overview.next7Days.openSlots} open`} />
            <Kpi icon="people-outline" label="Students" value={String(overview.users.students)} hint={`+${overview.users.newStudents7d} this week`} />
            <Kpi icon="medkit-outline" label="Active counsellors" value={String(overview.users.counsellors.active)} hint={overview.users.counsellors.pending ? `${overview.users.counsellors.pending} awaiting approval` : undefined} tone={overview.users.counsellors.active === 0 ? 'bad' : 'neutral'} />
          </View>
        </>
      ) : null}

      {counsellors.length > 0 ? approvals : null}

      {report ? (
        <>
          <SectionHeading title="Last 30 days" />
          <View style={styles.kpis}>
            <Kpi icon="albums-outline" label="Bookings" value={String(report.totals.bookings)} />
            <Kpi icon="checkmark-done-outline" label="Completed" value={fmtPct(report.totals.completionRate)} hint="of past sessions" tone={report.totals.completionRate === null ? 'neutral' : report.totals.completionRate >= 70 ? 'good' : 'warn'} />
            <Kpi icon="close-circle-outline" label="Cancelled" value={fmtPct(report.totals.cancellationRate)} tone={cancelTone} />
            <Kpi icon="happy-outline" label="Satisfaction" value={report.satisfaction.suppressed ? 'n/a' : `${report.satisfaction.average}/5`} hint={report.satisfaction.suppressed ? 'needs 5+ ratings' : `${report.satisfaction.responses} ratings`} />
          </View>

          <SurfaceCard style={styles.chart}>
            <Text style={styles.chartTitle}>Bookings per day (last {TREND_DAYS} days)</Text>
            <Text style={styles.muted}>{trendTotal === 0 ? 'No bookings in this period.' : `${trendTotal} bookings${report.peak ? ` · busiest on ${report.peak.weekday}s around ${String(report.peak.hour).padStart(2, '0')}:00` : ''}`}</Text>
            <View style={styles.spark} accessible accessibilityLabel={`Bookings per day over the last ${TREND_DAYS} days, ${trendTotal} in total`}>
              {trend.map((t) => (
                <View key={t.key} style={styles.sparkCol}>
                  <View style={styles.sparkTrack}><View style={[styles.sparkFill, { height: `${(t.count / trendMax) * 100}%`, backgroundColor: t.count ? Colors.primary : Colors.border }]} /></View>
                  <Text style={styles.sparkLabel}>{t.day}</Text>
                </View>
              ))}
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.chart}>
            <Text style={styles.chartTitle}>How students attend</Text>
            {sessionMix.every(([, v]) => v === 0) ? <Text style={styles.muted}>No bookings yet.</Text> : sessionMix.map(([k, v]) => <Bar key={k} label={k === 'in-person' ? 'In person' : k[0].toUpperCase() + k.slice(1)} value={v} max={sessionMax} />)}
          </SurfaceCard>

          <SectionHeading title="Student wellbeing" detail="Anonymous aggregate of check-ins." />
          <SurfaceCard style={styles.chart}>
            {report.checkIns.suppressed ? (
              <Text style={styles.muted}>{report.checkIns.reason}</Text>
            ) : (
              <>
                <Text style={styles.chartTitle}>{report.checkIns.total} check-ins from {report.checkIns.participants} students · average {report.checkIns.averageScore}/5</Text>
                {levels.map(([k, v]) => <Bar key={k} label={k} value={typeof v === 'number' ? v : 0} max={levelMax} color={k === 'Needs Support' ? Colors.primary : Colors.secondary} />)}
                {levels.some(([, v]) => typeof v !== 'number') ? <Text style={styles.muted}>Groups under 5 are hidden to protect privacy.</Text> : null}
              </>
            )}
          </SurfaceCard>

          <SectionHeading title="Counsellor workload" detail="Busiest counsellors in the last 30 days." />
          {topWorkload.length === 0 ? <SurfaceCard><Text style={styles.muted}>No active counsellors yet.</Text></SurfaceCard> : null}
          {topWorkload.map((w) => (
            <SurfaceCard key={w.counsellorId} style={styles.chart}>
              <View style={styles.workHead}>
                <Text style={styles.workName}>{w.name}</Text>
                <Text style={styles.workCount}>{w.bookings} bookings</Text>
              </View>
              <Text style={styles.muted}>{w.completed} completed · {w.cancelled} cancelled · {w.upcoming} upcoming · {w.openSlots} open slots</Text>
            </SurfaceCard>
          ))}
        </>
      ) : null}

      {overview && counsellors.length === 0 ? (
        <SurfaceCard style={styles.allGood}><Text style={styles.allGoodText}>✓ No counsellor applications are waiting.</Text></SurfaceCard>
      ) : null}

      <SectionHeading title="Go deeper" />
      <Pressable accessibilityRole="button" onPress={() => router.push('/admin/counsellors')} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <View style={styles.linkCopy}>
          <Text style={styles.linkTitle}>Manage counsellors</Text>
          <Text style={styles.detail}>Approve, suspend, reactivate or remove counsellor accounts.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/admin/reports')} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <View style={styles.linkCopy}>
          <Text style={styles.linkTitle}>Full usage reports</Text>
          <Text style={styles.detail}>Filter by period, counsellor and session type. Peak hours, workload, CSV export.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
      </Pressable>
      {overview ? <Text style={styles.footnote}>{overview.resources} self-help resources are published for students. All figures are aggregate; no student is identifiable.</Text> : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  headCopy: { flex: 1 },
  refresh: { width: 44, height: 44, marginTop: Space.xs, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  updated: { color: Colors.muted, fontSize: 12, marginTop: -Space.sm },
  attention: { gap: Space.sm, backgroundColor: Colors.paleCoral, borderWidth: 1, borderColor: Colors.primary },
  attentionTitle: { color: Colors.accent, fontSize: 15, fontWeight: '900' },
  insightRow: { flexDirection: 'row', gap: Space.sm, alignItems: 'flex-start' },
  insightDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  insightText: { flex: 1, color: Colors.accent, fontSize: 14, lineHeight: 20 },
  allGood: { backgroundColor: Colors.paleBlue },
  allGoodText: { color: Colors.success, fontSize: 14, fontWeight: '800' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  kpi: { flexGrow: 1, flexBasis: '45%', gap: 2, padding: Space.md, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kpiLabel: { flex: 1, color: Colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  kpiValue: { fontSize: 28, fontWeight: '900' },
  kpiHint: { color: Colors.muted, fontSize: 12 },
  chart: { gap: Space.sm },
  chartTitle: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  muted: { color: Colors.muted, fontSize: 13, lineHeight: 18 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 96 },
  sparkCol: { flex: 1, height: '100%', alignItems: 'center', gap: 4 },
  sparkTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: 4, backgroundColor: Colors.paleBlue, overflow: 'hidden' },
  sparkFill: { width: '100%', minHeight: 2, borderRadius: 4 },
  sparkLabel: { color: Colors.muted, fontSize: 9 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  barLabel: { width: 96, color: Colors.muted, fontSize: 12 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: Colors.paleBlue, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  barValue: { width: 30, textAlign: 'right', color: Colors.accent, fontSize: 12, fontWeight: '800' },
  workHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Space.sm },
  workName: { flex: 1, color: Colors.accent, fontSize: 15, fontWeight: '800' },
  workCount: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  card: { gap: Space.xs },
  name: { color: Colors.accent, fontSize: 17, fontWeight: '800' },
  detail: { color: Colors.muted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: Space.sm, marginTop: Space.sm },
  approve: { minHeight: 44, flex: 1, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  decline: { minHeight: 44, flex: 1, borderRadius: Radius.md, backgroundColor: Colors.paleCoral, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  link: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.md, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  linkCopy: { flex: 1, gap: 2 },
  linkTitle: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  footnote: { color: Colors.muted, fontSize: 12, textAlign: 'center' },
  disabled: { opacity: 0.6 },
});
