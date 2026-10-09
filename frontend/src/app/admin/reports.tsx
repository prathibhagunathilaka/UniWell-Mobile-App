import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Dropdown } from '@/components/wellbeing/Dropdown';
import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, PrimaryButton, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
  exportUsageReport,
  getAllCounsellors,
  getUsageReport,
  ReportFilters,
  UsageReport,
} from '@/services/adminService';
import { saveAndShareTextFile } from '@/utils/shareFile';
import { buildUsageReportHtml } from '@/utils/usageReportPdf';

const DAY = 24 * 60 * 60 * 1000;
const ranges = [
  { key: '30', label: 'Last 30 days', back: 30, forward: 0 },
  { key: '90', label: 'Last 90 days', back: 90, forward: 0 },
  { key: '180', label: 'Last 6 months', back: 180, forward: 0 },
] as const;
const sessionTypes = [
  { key: '', label: 'All types' },
  { key: 'online', label: 'Online' },
  { key: 'in-person', label: 'In person' },
  { key: 'phone', label: 'Phone' },
] as const;

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.kpi} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {hint ? <Text style={styles.kpiHint}>{hint}</Text> : null}
    </View>
  );
}

function Bars({ data, highlight }: { data: { label: string; value: number }[]; highlight?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.bars}>
      {data.map((d) => (
        <View key={d.label} style={styles.barRow} accessible accessibilityLabel={`${d.label}: ${d.value} bookings`}>
          <Text style={styles.barLabel}>{d.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(d.value / max) * 100}%`, backgroundColor: d.label === highlight ? Colors.primary : Colors.secondary }]} />
          </View>
          <Text style={styles.barValue}>{d.value}</Text>
        </View>
      ))}
    </View>
  );
}

const fmtPct = (v: number | null) => (v === null ? 'n/a' : `${v}%`);

// NEW (FR5): anonymised, filterable usage reports with workload view and CSV export.
export default function AdminReportsScreen() {
  const [range, setRange] = useState<(typeof ranges)[number]['key']>('90');
  const [sessionType, setSessionType] = useState<ReportFilters['sessionType']>('');
  const [counsellorId, setCounsellorId] = useState('');
  const [counsellors, setCounsellors] = useState<{ _id: string; name: string }[]>([]);
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const buildFilters = useCallback((): ReportFilters => {
    const selected = ranges.find((r) => r.key === range)!;
    const now = Date.now();
    return {
      from: new Date(now - selected.back * DAY).toISOString(),
      to: new Date(now + 30 * DAY).toISOString(),
      sessionType,
      counsellorId,
    };
  }, [range, sessionType, counsellorId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getUsageReport(buildFilters());
      setReport(response.report);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the report.');
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    getAllCounsellors().then((r) => setCounsellors(r.counsellors.filter((c) => (c as { status: string }).status === 'active'))).catch(() => undefined);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    setMessage('');
    try {
      const file = await exportUsageReport(buildFilters());
      const result = await saveAndShareTextFile(file.filename, file.csv);
      setMessage(result === 'downloaded'
        ? `Downloaded ${file.filename}. It contains aggregate numbers only.`
        : `${file.filename} is ready. Choose Save to Files / Drive, or an app such as Excel. It contains aggregate numbers only.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to export the report.');
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (!report) return;
    setExportingPdf(true);
    setError('');
    setMessage('');
    try {
      const html = buildUsageReportHtml({
        report,
        rangeLabel: ranges.find((r) => r.key === range)?.label ?? '',
        sessionTypeLabel: sessionTypes.find((t) => t.key === sessionType)?.label ?? 'All types',
        counsellorLabel: counsellors.find((c) => c._id === counsellorId)?.name ?? 'All counsellors',
      });
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        setMessage('Choose “Save as PDF” in the print dialog.');
        return;
      }
      let uri = '';
      try {
        uri = (await Print.printToFileAsync({ html, width: 595, height: 842 })).uri;
      } catch {
        await Print.printAsync({ html }); // fallback: system print dialog has "Save as PDF"
        setMessage('Choose “Save as PDF” in the print dialog.');
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save or share the usage report' });
        setMessage('PDF ready. It contains aggregate numbers only.');
      } else {
        await Print.printAsync({ uri });
        setMessage('Choose “Save as PDF” in the print dialog.');
      }
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? `Unable to create the PDF: ${cause.message}` : 'Unable to create the PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const hourData = report
    ? report.byHour.filter((h) => h.hour >= 6 && h.hour <= 21).map((h) => ({ label: `${String(h.hour).padStart(2, '0')}:00`, value: h.count }))
    : [];

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/admin" label="Administration" />
      <PageHeading title="Usage reports" subtitle="Aggregate service numbers. No student is ever identifiable here." />

      <SectionHeading title="Filters" />
      <View style={styles.chips}>
        {ranges.map((r) => (
          <Pressable key={r.key} accessibilityRole="radio" accessibilityState={{ checked: range === r.key }} onPress={() => setRange(r.key)} style={[styles.chip, range === r.key && styles.chipOn]}>
            <Text style={[styles.chipText, range === r.key && styles.chipTextOn]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.chips}>
        {sessionTypes.map((t) => (
          <Pressable key={t.key} accessibilityRole="radio" accessibilityState={{ checked: sessionType === t.key }} onPress={() => setSessionType(t.key)} style={[styles.chip, sessionType === t.key && styles.chipOn]}>
            <Text style={[styles.chipText, sessionType === t.key && styles.chipTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <Dropdown
        label="Counsellor"
        value={counsellorId}
        onChange={setCounsellorId}
        options={[{ value: '', label: 'All counsellors' }, ...counsellors.map((c) => ({ value: c._id, label: c.name }))]}
      />

      {loading ? <LoadingState label="Building report..." /> : null}
      {!report && !loading ? <InlineMessage tone="error">{error}</InlineMessage> : null}

      {report && !loading ? (
        <>
          <View style={styles.kpis}>
            <Kpi label="Bookings" value={String(report.totals.bookings)} />
            <Kpi label="Completion rate" value={fmtPct(report.totals.completionRate)} hint="of past sessions" />
            <Kpi label="Cancellations" value={fmtPct(report.totals.cancellationRate)} />
            <Kpi label="Capacity used" value={fmtPct(report.totals.overallUtilisation)} hint={`${report.totals.openSlots} open slots`} />
          </View>

          {report.insights.length ? (
            <SurfaceCard style={styles.insights}>
              <Text style={styles.insightTitle}>What the numbers suggest</Text>
              {report.insights.map((i) => <Text key={i} style={styles.insight}>• {i}</Text>)}
            </SurfaceCard>
          ) : null}

          <SectionHeading title="Peak periods" detail={report.peak ? `Busiest: ${report.peak.weekday}s, around ${String(report.peak.hour).padStart(2, '0')}:00` : 'No bookings in this period.'} />
          <SurfaceCard style={styles.chart}>
            <Text style={styles.chartTitle}>By weekday</Text>
            <Bars data={report.byWeekday.map((d) => ({ label: d.label.slice(0, 3), value: d.count }))} highlight={report.peak?.weekday.slice(0, 3)} />
          </SurfaceCard>
          <SurfaceCard style={styles.chart}>
            <Text style={styles.chartTitle}>By hour of day</Text>
            <Bars data={hourData} highlight={report.peak ? `${String(report.peak.hour).padStart(2, '0')}:00` : undefined} />
          </SurfaceCard>

          <SectionHeading title="Counsellor workload" detail="Bookings handled versus open capacity." />
          {report.workload.length === 0 ? <SurfaceCard><Text style={styles.muted}>No active counsellors.</Text></SurfaceCard> : null}
          {report.workload.map((w) => (
            <Pressable
              key={w.counsellorId}
              accessibilityRole="button"
              accessibilityLabel={`${w.name}, ${w.bookings} bookings. Open detailed workload`}
              onPress={() => router.push({ pathname: '/admin/reports/[id]', params: { id: w.counsellorId, range } })}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <SurfaceCard style={styles.workload}>
                <View style={styles.workHead}>
                  <Text style={styles.workName}>{w.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
                </View>
                <Text style={styles.muted}>{w.bookings} bookings · {w.completed} completed · {w.cancelled} cancelled · {w.upcoming} upcoming</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.min(100, w.utilisationRate ?? 0)}%`, backgroundColor: (w.utilisationRate ?? 0) >= 85 ? Colors.error : Colors.primary }]} />
                </View>
                <Text style={styles.muted}>Capacity used {fmtPct(w.utilisationRate)} · {w.openSlots} open slots</Text>
                <Text style={styles.tapHint}>Tap for full details and trend</Text>
              </SurfaceCard>
            </Pressable>
          ))}

          <SectionHeading title="Session satisfaction" />
          <SurfaceCard style={styles.chart}>
            {report.satisfaction.suppressed ? (
              <Text style={styles.muted}>{report.satisfaction.reason}</Text>
            ) : (
              <Text style={styles.chartTitle}>{report.satisfaction.average}/5 average from {report.satisfaction.responses} anonymous ratings</Text>
            )}
          </SurfaceCard>

          <SectionHeading title="Student wellbeing (aggregate)" />
          <SurfaceCard style={styles.chart}>
            {report.checkIns.suppressed ? (
              <Text style={styles.muted}>{report.checkIns.reason}</Text>
            ) : (
              <>
                <Text style={styles.chartTitle}>{report.checkIns.total} check-ins from {report.checkIns.participants} students · average {report.checkIns.averageScore}/5</Text>
                <Bars data={Object.entries(report.checkIns.levels).map(([label, v]) => ({ label, value: typeof v === 'number' ? v : 0 }))} />
              </>
            )}
          </SurfaceCard>

          <Text style={styles.privacy}>{report.anonymisation}</Text>
          <InlineMessage tone="error">{error}</InlineMessage>
          <InlineMessage tone="success">{message}</InlineMessage>
          <PrimaryButton title="Export report (PDF)" onPress={() => void exportPdf()} loading={exportingPdf} disabled={exporting} />
          <PrimaryButton title="Export report (CSV)" onPress={() => void exportCsv()} loading={exporting} disabled={exportingPdf} style={styles.secondaryButton} />
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
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  kpi: { flexGrow: 1, flexBasis: '45%', padding: Space.md, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  kpiValue: { color: Colors.accent, fontSize: 26, fontWeight: '900' },
  kpiLabel: { color: Colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  kpiHint: { color: Colors.muted, fontSize: 12 },
  insights: { gap: Space.xs, backgroundColor: Colors.paleCoral },
  insightTitle: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  insight: { color: Colors.accent, fontSize: 13 },
  chart: { gap: Space.sm },
  chartTitle: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  bars: { gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  barLabel: { width: 96, color: Colors.muted, fontSize: 12 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: Colors.paleBlue, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  barValue: { width: 30, textAlign: 'right', color: Colors.accent, fontSize: 12, fontWeight: '800' },
  workload: { gap: Space.xs },
  workHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  workName: { flex: 1, color: Colors.accent, fontSize: 16, fontWeight: '800' },
  tapHint: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  secondaryButton: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary },
  muted: { color: Colors.muted, fontSize: 13 },
  privacy: { color: Colors.muted, fontSize: 12, textAlign: 'center' },
});
