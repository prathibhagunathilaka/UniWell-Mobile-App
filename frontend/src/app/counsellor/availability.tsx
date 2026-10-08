import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AuthButton, AuthField } from '@/components/auth/AuthUI';
import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { BulkAvailabilityResult, createAvailabilityBulk } from '@/services/counsellingService';

const SLOT_MS = 30 * 60 * 1000;

// NEW: publish several slots at once (consecutive slots, repeated weekly) and see exactly
// which ones clashed instead of a single opaque error (addresses issue U6).
export default function CounsellorAvailabilityScreen() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [count, setCount] = useState('4');
  const [weeks, setWeeks] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BulkAvailabilityResult | null>(null);

  const submit = async () => {
    setError('');
    setResult(null);
    const first = new Date(`${date}T${time}`);
    const perDay = Math.min(Math.max(parseInt(count, 10) || 0, 1), 16);
    const repeat = Math.min(Math.max(parseInt(weeks, 10) || 0, 1), 8);
    if (!date || !time || !Number.isFinite(first.getTime())) {
      setError('Enter a valid date (YYYY-MM-DD) and start time (HH:MM).');
      return;
    }
    const slots: string[] = [];
    for (let w = 0; w < repeat; w += 1) {
      for (let i = 0; i < perDay; i += 1) {
        slots.push(new Date(first.getTime() + w * 7 * 24 * 60 * 60 * 1000 + i * SLOT_MS).toISOString());
      }
    }
    setSaving(true);
    try {
      setResult(await createAvailabilityBulk(slots));
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
      <PageHeading title="Manage availability" subtitle="Publish consecutive 30-minute slots and repeat them weekly." />
      <SurfaceCard style={styles.form}>
        <AuthField label="First day (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-10-20" />
        <AuthField label="Start time (24-hour, HH:MM)" value={time} onChangeText={setTime} placeholder="09:00" />
        <AuthField label="Slots per day (1-16)" value={count} onChangeText={setCount} keyboardType="number-pad" />
        <AuthField label="Repeat for how many weeks (1-8)" value={weeks} onChangeText={setWeeks} keyboardType="number-pad" />
        <Text style={styles.hint}>Example: 09:00 with 4 slots publishes 09:00, 09:30, 10:00 and 10:30.</Text>
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
  hint: { color: Colors.muted, fontSize: 13 },
  skippedTitle: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  skipped: { color: Colors.error, fontSize: 13 },
});
