import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { CheckInRecord, getCheckIns } from '@/services/checkinService';

export default function CheckInHistoryScreen() {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getCheckIns();
      setCheckIns(response.checkIns);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your check-in history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/dashboard" label="Dashboard" />
      <PageHeading title="Check-in history" subtitle="Your saved check-ins, available only to you." />
      {loading ? <LoadingState label="Loading check-in history..." /> : null}
      {error ? (
        <View style={styles.state}>
          <InlineMessage tone="error">{error}</InlineMessage>
          <Pressable onPress={() => void load()}><Text style={styles.retry}>Try again</Text></Pressable>
        </View>
      ) : null}
      {!loading && !error && checkIns.length === 0 ? (
        <SurfaceCard><Text style={styles.empty}>Your saved check-ins will appear here.</Text></SurfaceCard>
      ) : null}
      {!loading && !error ? checkIns.map((checkIn) => (
        <Link
          key={checkIn._id}
          href={{
            pathname: '/student/check-in-result',
            params: { id: checkIn._id },
          }}
          asChild
        >
          <Pressable accessibilityRole="button" style={styles.card}>
            <View style={styles.heading}>
              <Text style={styles.level}>{checkIn.wellbeingLevel}</Text>
              <Text style={styles.score}>{checkIn.wellbeingScore.toFixed(1)} / 5</Text>
            </View>
            <Text style={styles.date}>{new Date(checkIn.createdAt).toLocaleString()}</Text>
            <Text style={styles.detail}>Mood: {checkIn.mood} · Stress: {checkIn.stressLevel}</Text>
            <Text style={styles.open}>View result  ›</Text>
          </Pressable>
        </Link>
      )) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  state: { gap: Space.sm },
  retry: { color: Colors.primary, fontWeight: '800' },
  empty: { color: Colors.muted, fontSize: 14 },
  card: { gap: Space.xs, padding: Space.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  level: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  score: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  date: { color: Colors.muted, fontSize: 12 },
  detail: { color: Colors.accent, fontSize: 13 },
  open: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
});
