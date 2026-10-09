import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, PrimaryButton, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { useAuth } from '@/contexts/AuthContext';
import { AppointmentRecord, getCounsellorAppointments } from '@/services/counsellingService';
import { buildAppointmentsHtml, DAY_MS, ExportFormat, MAX_RANGE_DAYS, pageSize } from '@/utils/appointmentPdf';

type Status = Exclude<AppointmentRecord['status'], 'cancelled'>;
type Session = AppointmentRecord['sessionType'];

const STATUS_OPTIONS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'available', label: 'Open slots' },
];
const SESSION_OPTIONS: { key: Session; label: string }[] = [
  { key: 'in-person', label: 'In person' },
  { key: 'online', label: 'Online' },
  { key: 'phone', label: 'Phone' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// Strict YYYY-MM-DD -> local Date (null when invalid, e.g. 2026-02-31).
const parseDay = (text: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
};

const presets = () => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return [
    { label: 'Today', from: today, to: today },
    { label: 'This week', from: monday, to: new Date(monday.getTime() + 6 * DAY_MS) },
    { label: 'This month', from: new Date(today.getFullYear(), today.getMonth(), 1), to: new Date(today.getFullYear(), today.getMonth() + 1, 0) },
    { label: 'Next 30 days', from: today, to: new Date(today.getTime() + 30 * DAY_MS) },
  ];
};

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{on ? '✓ ' : ''}{label}</Text>
    </Pressable>
  );
}

// Counsellor PDF export: table or calendar-grid layout, date / date-range selection and filters.
export default function CounsellorExportScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [format, setFormat] = useState<ExportFormat>('table');
  const [fromText, setFromText] = useState(() => fmt(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [toText, setToText] = useState(() => fmt(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));
  const [statuses, setStatuses] = useState<Status[]>(['pending', 'confirmed', 'completed']);
  const [sessions, setSessions] = useState<Session[]>(['in-person', 'online', 'phone']);
  const [search, setSearch] = useState('');
  const [includeContacts, setIncludeContacts] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getCounsellorAppointments();
      setAppointments(response.appointments);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const from = parseDay(fromText);
  const to = parseDay(toText);
  const rangeError = !from || !to
    ? 'Enter dates as YYYY-MM-DD, e.g. 2026-10-15.'
    : to < from
      ? 'The end date must be on or after the start date.'
      : (to.getTime() - from.getTime()) / DAY_MS > MAX_RANGE_DAYS
        ? `Choose a range of ${MAX_RANGE_DAYS} days or fewer.`
        : '';

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const filtered = useMemo(() => {
    if (rangeError || !from || !to) return [];
    const start = startOfDay(from).getTime();
    const end = endOfDay(to).getTime();
    const needle = search.trim().toLowerCase();
    return appointments.filter((a) => {
      const t = new Date(a.startsAt).getTime();
      if (t < start || t > end) return false;
      if (a.status === 'cancelled' || !statuses.includes(a.status)) return false;
      if (a.status === 'available') return !needle; // open slots have no student to match
      if (!sessions.includes(a.sessionType)) return false;
      return !needle || (a.studentId?.name || '').toLowerCase().includes(needle);
    });
  }, [appointments, from, to, rangeError, statuses, sessions, search]);

  const filterSummary = () => {
    const parts = [
      `Status: ${statuses.length ? STATUS_OPTIONS.filter((s) => statuses.includes(s.key)).map((s) => s.label).join(', ') : 'none'}`,
      `Sessions: ${sessions.length === SESSION_OPTIONS.length ? 'all' : SESSION_OPTIONS.filter((s) => sessions.includes(s.key)).map((s) => s.label).join(', ') || 'none'}`,
    ];
    if (search.trim()) parts.push(`Student: “${search.trim()}”`);
    return parts.join(' · ');
  };

  const exportPdf = async () => {
    setError('');
    setMessage('');
    // Validate on press (instead of silently disabling the button) so the reason is always shown.
    if (!from || !to || rangeError) {
      setError(rangeError || 'Enter a valid start and end date.');
      return;
    }
    if (filtered.length === 0) {
      setError('No appointments match these dates and filters, so there is nothing to export. Widen the date range or turn on more statuses (e.g. Open slots).');
      return;
    }
    setExporting(true);
    try {
      const html = buildAppointmentsHtml({
        format,
        from: startOfDay(from),
        to: endOfDay(to),
        appointments: filtered,
        counsellorName: user?.name || 'Counsellor',
        filterSummary: filterSummary(),
        includeContacts,
      });
      if (Platform.OS === 'web') {
        await Print.printAsync({ html }); // browser print dialog -> "Save as PDF"
        setMessage('Choose “Save as PDF” in the print dialog.');
        return;
      }

      let uri = '';
      try {
        const result = await Print.printToFileAsync({ html, ...pageSize(format) });
        uri = result.uri;
      } catch {
        // Fallback: the system print dialog also has "Save as PDF".
        await Print.printAsync({ html });
        setMessage('Choose “Save as PDF” in the print dialog.');
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save or share your appointments PDF' });
        setMessage('PDF ready. If you closed the share sheet, tap Export again to reopen it.');
      } else {
        await Print.printAsync({ uri });
        setMessage('Choose “Save as PDF” in the print dialog.');
      }
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? `Unable to create the PDF: ${cause.message}` : 'Unable to create the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const applyPreset = (p: { from: Date; to: Date }) => {
    setFromText(fmt(p.from));
    setToText(fmt(p.to));
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/counsellor/sync" label="Booking sync" />
      <PageHeading title="Export appointments" subtitle="Create a PDF as a table or a calendar grid, for the dates and filters you choose." />
      {loading ? <LoadingState label="Loading appointments..." /> : null}

      <SectionHeading title="Layout" />
      <View style={styles.row}>
        <Chip label="Table" on={format === 'table'} onPress={() => setFormat('table')} />
        <Chip label="Calendar grid" on={format === 'grid'} onPress={() => setFormat('grid')} />
      </View>
      <Text style={styles.hint}>{format === 'table' ? 'One row per appointment, sorted by date and time (portrait).' : 'A month-style grid with each booking in its day (landscape).'}</Text>

      <SectionHeading title="Date or date range" detail="For a single day, use the same date in both boxes." />
      <View style={styles.row}>
        {presets().map((p) => <Chip key={p.label} label={p.label} on={fmt(p.from) === fromText && fmt(p.to) === toText} onPress={() => applyPreset(p)} />)}
      </View>
      <SurfaceCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>From (YYYY-MM-DD)</Text>
            <TextInput value={fromText} onChangeText={setFromText} placeholder="2026-10-01" placeholderTextColor={Colors.muted} keyboardType="numbers-and-punctuation" maxLength={10} accessibilityLabel="From date" style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>To (YYYY-MM-DD)</Text>
            <TextInput value={toText} onChangeText={setToText} placeholder="2026-10-31" placeholderTextColor={Colors.muted} keyboardType="numbers-and-punctuation" maxLength={10} accessibilityLabel="To date" style={styles.input} />
          </View>
        </View>
        {rangeError ? <Text style={styles.error}>{rangeError}</Text> : null}
      </SurfaceCard>

      <SectionHeading title="Filters" />
      <SurfaceCard style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.row}>
          {STATUS_OPTIONS.map((s) => <Chip key={s.key} label={s.label} on={statuses.includes(s.key)} onPress={() => toggle(statuses, s.key, setStatuses)} />)}
        </View>
        <Text style={styles.label}>Session type</Text>
        <View style={styles.row}>
          {SESSION_OPTIONS.map((s) => <Chip key={s.key} label={s.label} on={sessions.includes(s.key)} onPress={() => toggle(sessions, s.key, setSessions)} />)}
        </View>
        <Text style={styles.label}>Student name contains</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Optional" placeholderTextColor={Colors.muted} autoCapitalize="none" accessibilityLabel="Student name filter" style={styles.input} />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchTitle}>Include student email and phone</Text>
            <Text style={styles.hint}>Off by default. Only used in the table layout.</Text>
          </View>
          <Switch value={includeContacts} onValueChange={setIncludeContacts} trackColor={{ true: Colors.primary }} />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.summary}>
        <Text style={styles.summaryText}>{rangeError ? 'Fix the dates to see matches.' : `${filtered.length} appointment${filtered.length === 1 ? '' : 's'} will be exported.`}</Text>
      </SurfaceCard>
      {/* Messages sit right above the button so they are visible where the user tapped. */}
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>
      <PrimaryButton title={Platform.OS === 'web' ? 'Print / save as PDF' : 'Export PDF to device'} onPress={() => void exportPdf()} loading={exporting} disabled={loading} />
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  card: { gap: Space.sm },
  field: { flex: 1, minWidth: 140, gap: 4 },
  label: { color: Colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  hint: { color: Colors.muted, fontSize: 12, lineHeight: 18 },
  error: { color: Colors.error, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 44, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: Space.sm, fontSize: 16, color: Colors.accent },
  chip: { minHeight: 40, paddingHorizontal: Space.md, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.paleBlue, borderColor: Colors.accent },
  chipText: { color: Colors.muted, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: Colors.accent },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, marginTop: Space.xs },
  switchCopy: { flex: 1, gap: 2 },
  switchTitle: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  summary: { backgroundColor: Colors.paleBlue },
  summaryText: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
});
