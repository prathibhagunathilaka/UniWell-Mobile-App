import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { CounsellorProfile, getCounsellors } from '@/services/counsellingService';

export default function CounsellingDirectoryScreen() {
  const [counsellors, setCounsellors] = useState<CounsellorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCounsellors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getCounsellors();
      setCounsellors(response.counsellors);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load counsellors right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadCounsellors);
  }, [loadCounsellors]);

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/dashboard" label="Dashboard" />
      <PageHeading title="Find a counsellor" subtitle="Explore approved university counsellors and choose a time that works for you." />
      <Link href="/student/appointments" asChild>
        <Pressable accessibilityRole="button" style={styles.appointmentsLink}>
          <Text style={styles.appointmentsLinkText}>View my appointments</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </Link>

      {loading ? <LoadingState label="Loading approved counsellors..." /> : null}
      {error ? (
        <View style={styles.state}>
          <InlineMessage tone="error">{error}</InlineMessage>
          <Pressable accessibilityRole="button" onPress={() => void loadCounsellors()}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      {!loading && !error && counsellors.length === 0 ? (
        <SurfaceCard style={styles.empty}>
          <Text style={styles.emptyTitle}>No counsellors are available right now</Text>
          <Text style={styles.emptyText}>Please check back later or explore the available self-help resources.</Text>
        </SurfaceCard>
      ) : null}
      {!loading && !error && counsellors.length > 0 ? (
        <View style={styles.list}>
          <SectionHeading title="Approved counsellors" detail={`${counsellors.length} available profile${counsellors.length === 1 ? '' : 's'}`} />
          {counsellors.map((counsellor) => (
            <Link
              key={counsellor._id}
              href={{ pathname: '/student/counselling/[id]', params: { id: counsellor._id } }}
              asChild
            >
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{counsellor.name.trim().charAt(0).toUpperCase()}</Text></View>
                <View style={styles.copy}>
                  <Text style={styles.name}>{counsellor.name}</Text>
                  <Text style={styles.specialization}>{counsellor.specialization}</Text>
                  <Text style={styles.qualification}>{counsellor.qualification} · {counsellor.yearsOfExperience} years of experience</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  appointmentsLink: {
    minHeight: 48,
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.paleBlue,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  appointmentsLinkText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  chevron: { color: Colors.primary, fontSize: 24, fontWeight: '700' },
  state: { gap: Space.sm },
  retry: { color: Colors.primary, fontWeight: '800', padding: Space.xs },
  empty: { gap: Space.xs },
  emptyTitle: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  emptyText: { color: Colors.muted, fontSize: 14, lineHeight: 21 },
  list: { gap: Space.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { opacity: 0.78 },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: Colors.paleCoral,
  },
  avatarText: { color: Colors.accent, fontSize: 20, fontWeight: '800' },
  copy: { flex: 1, gap: 3 },
  name: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  specialization: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  qualification: { color: Colors.muted, fontSize: 12, lineHeight: 18 },
});
