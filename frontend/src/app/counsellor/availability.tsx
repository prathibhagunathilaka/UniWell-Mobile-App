  // Builds the list of slot start times (slots per day x number of weeks) and sends them in one request.
  // The backend returns which slots were created and which were skipped because they clashed.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthField } from '@/components/auth/AuthUI';
import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { BulkAvailabilityResult, createAvailabilityBulk, SLOT_DURATIONS } from '@/services/counsellingService';

const MINUTE = 60 * 1000;
const WEEK = 7 * 24 * 60 * MINUTE;

const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const lengthLabel = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : minutes % 60 === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

// Publish consecutive slots of a chosen length, repeated weekly, and see exactly
// which ones clashed instead of a single opaque error (addresses issue U6).
export default function CounsellorAvailabilityScreen() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [count, setCount] = useState('4');
  const [weeks, setWeeks] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BulkAvailabilityResult | null>(null);

  const perDay = Math.min(Math.max(parseInt(count, 10) || 0, 1), 16);
  const repeat = Math.min(Math.max(parseInt(weeks, 10) || 0, 1), 8);

  const preview = useMemo(() => {
    const first = new Date(`${date}T${time}`);
    if (!date || !time || !Number.isFinite(first.getTime())) return '';
    const last = new Date(first.getTime() + (perDay - 1) * duration * MINUTE);
    const end = new Date(last.getTime() + duration * MINUTE);
    return `${perDay} slot${perDay === 1 ? '' : 's'} of ${lengthLabel(duration)} each: ${clock(first)} to ${clock(end)} (${lengthLabel(perDay * duration)} in total)${repeat > 1 ? `, repeated for ${repeat} weeks` : ''}.`;
  }, [date, time, duration, perDay, repeat]);

  const submit = async () => {
    setError('');
    setResult(null);
    const first = new Date(`${date}T${time}`);
    if (!date || !time || !Number.isFinite(first.getTime())) {
      setError('Enter a valid date (YYYY-MM-DD) and start time (HH:MM).');
      return;
    }
    const slots: string[] = [];
    for (let w = 0; w < repeat; w += 1) {
      for (let i = 0; i < perDay; i += 1) {
        slots.push(new Date(first.getTime() + w * WEEK + i * duration * MINUTE).toISOString());
      }
    }
    setSaving(true);
    try {
      setResult(await createAvailabilityBulk(slots, duration));
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : 'Unable to save availability.';
      setError(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/counsellor" label="Workspace" />
      <PageHeading title="Manage availability" subtitle="Choose how long each session is, publish consecutive slots and repeat them weekly." />
      <SurfaceCard style={styles.form}>
        <AuthField label="First day (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-10-20" />
        <AuthField label="Start time (24-hour, HH:MM)" value={time} onChangeText={setTime} placeholder="09:00" />
        <Text style={styles.fieldLabel}>Slot length</Text>
        <View style={styles.chipRow}>
          {SLOT_DURATIONS.map((minutes) => (
            <Pressable
              key={minutes}
              accessibilityRole="button"
              accessibilityState={{ selected: duration === minutes }}
              onPress={() => setDuration(minutes)}
              style={[styles.chip, duration === minutes && styles.chipOn]}
            >
              <Text style={[styles.chipText, duration === minutes && styles.chipTextOn]}>{lengthLabel(minutes)}</Text>
            </Pressable>
          ))}
        </View>
        <AuthField label="Slots per day (1-16)" value={count} onChangeText={setCount} keyboardType="number-pad" />
        <AuthField label="Repeat for how many weeks (1-8)" value={weeks} onChangeText={setWeeks} keyboardType="number-pad" />
        <Text style={styles.hint}>
          {preview || `Example: 09:00 with 4 slots of ${lengthLabel(duration)} publishes ${[0, 1, 2, 3].map((i) => {
            const t = 9 * 60 + i * duration;
            return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
          }).join(', ')}.`}
        </Text>
        <AuthButton title="Publish availability" onPress={() => void submit()} loading={saving} />
      </SurfaceCard>
      <InlineMessage tone="error">{error}</InlineMessage>
      {result ? (
        <>
          <SectionHeading title="Result" />
          <InlineMessage tone={result.created.length ? 'success' : 'error'}>
            {`${result.created.length} slot${result.created.length === 1 ? '' : 's'} published${result.skipped.length ? `, ${result.skipped.length} skipped` : ''}.`}
          </InlineMessage>
          {result.skipped.length ? (
            <SurfaceCard style={styles.form}>
              <Text style={styles.skippedTitle}>Skipped because of conflicts</Text>
              {result.skipped.slice(0, 20).map((s) => (
                <Text key={`${s.startsAt}-${s.reason}`} style={styles.skipped}>
                  {isNaN(new Date(s.startsAt).getTime()) ? s.startsAt : new Date(s.startsAt).toLocaleString()} - {s.reason}
                </Text>
              ))}
            </SurfaceCard>
          ) : null}
        </>
      ) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  form: { gap: Space.sm },
  fieldLabel: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs },
  chip: { minHeight: 40, paddingHorizontal: Space.md, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.paleBlue },
  chipOn: { backgroundColor: Colors.primary },
  chipText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: Colors.accent, fontWeight: '900' },
  hint: { color: Colors.muted, fontSize: 13, lineHeight: 19 },
  skippedTitle: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  skipped: { color: Colors.error, fontSize: 13 },
});
