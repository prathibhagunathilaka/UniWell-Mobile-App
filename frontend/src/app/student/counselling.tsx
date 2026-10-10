import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { CounsellorProfile, getCounsellors } from '@/services/counsellingService';

export default function CounsellingDirectoryScreen() {
  const [counsellors, setCounsellors] = useState<CounsellorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [soonestFirst, setSoonestFirst] = useState(false);

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

  // NEW: search by name/specialisation and sort by soonest availability.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = counsellors.filter((c) => !q || `${c.name} ${c.specialization} ${c.qualification}`.toLowerCase().includes(q));
    return soonestFirst
      ? [...filtered].sort((a, b) => new Date(a.nextAvailableAt || '9999').getTime() - new Date(b.nextAvailableAt || '9999').getTime())
      : filtered;
  }, [counsellors, query, soonestFirst]);

  const nextLabel = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const day = d.toDateString() === today.toDateString() ? 'Today' : d.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return `Next: ${day}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/dashboard" label="Dashboard" />
      <PageHeading title="Find a counsellor" subtitle="Explore approved university counsellors and choose a time that works for you." />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/student/appointments')}
        style={({ pressed }) => [styles.appointmentsLink, pressed && styles.pressed]}
      >
        <Text style={styles.appointmentsLinkText}>View my appointments</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {counsellors.length > 1 ? (
        <View style={styles.tools}>
          <TextInput
            accessibilityLabel="Search counsellors"
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or topic, e.g. anxiety"
            placeholderTextColor={Colors.muted}
            style={styles.search}
          />
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: soonestFirst }} onPress={() => setSoonestFirst((v) => !v)} style={[styles.sortChip, soonestFirst && styles.sortChipOn]}>
            <Text style={[styles.sortText, soonestFirst && styles.sortTextOn]}>{soonestFirst ? '✓ Soonest available first' : 'Sort by soonest available'}</Text>
          </Pressable>
        </View>
      ) : null}

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
      {!loading && !error && counsellors.length > 0 && visible.length === 0 ? (
        <SurfaceCard style={styles.empty}><Text style={styles.emptyText}>No counsellors match “{query}”. Try a shorter word.</Text></SurfaceCard>
      ) : null}
      {!loading && !error && visible.length > 0 ? (
        <View style={styles.list}>
          <SectionHeading title="Approved counsellors" detail={`${visible.length} available profile${visible.length === 1 ? '' : 's'}`} />
          {visible.map((counsellor) => (
            <Pressable
              key={counsellor._id}
              accessibilityRole="button"
              accessibilityLabel={`${counsellor.name}, view profile and book`}
              onPress={() => router.push({ pathname: '/student/counselling/[id]', params: { id: counsellor._id } })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardMain}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{counsellor.name.trim().charAt(0).toUpperCase()}</Text></View>
                <View style={styles.copy}>
                  <Text style={styles.name}>{counsellor.name}</Text>
                  <Text style={styles.specialization}>{counsellor.specialization}</Text>
                  <Text style={styles.qualification}>{counsellor.qualification}</Text>
                </View>
              </View>
              <View style={styles.chipRow}>
                <View style={styles.chip}><Text style={styles.chipText}>{counsellor.yearsOfExperience} yrs experience</Text></View>
                {counsellor.nextAvailableAt ? <View style={[styles.chip, styles.chipNext]}><Text style={[styles.chipText, styles.next]}>{nextLabel(counsellor.nextAvailableAt)}</Text></View> : null}
              </View>
              <View style={styles.cta}><Text style={styles.ctaText}>View profile & book</Text><Text style={styles.ctaArrow}>›</Text></View>
            </Pressable>
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
  tools: { gap: Space.sm },
  search: { minHeight: 48, paddingHorizontal: Space.md, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, color: Colors.accent, fontSize: 15 },
  sortChip: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: Space.md, borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  sortChipOn: { backgroundColor: Colors.paleCoral, borderColor: Colors.primary },
  sortText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
  sortTextOn: { color: Colors.accent },
  next: { color: Colors.success, fontSize: 12, fontWeight: '800' },
  list: { gap: Space.sm },
  card: {
    gap: Space.sm,
    padding: Space.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 4,
    borderTopColor: Colors.primary,
    shadowColor: '#112E3C',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs },
  chip: { paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Colors.paleBlue },
  chipNext: { backgroundColor: '#D6F0E4' },
  chipText: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Space.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  ctaText: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  ctaArrow: { color: Colors.primary, fontSize: 22, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  avatar: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: Colors.paleCoral,
  },
  avatarText: { color: Colors.accent, fontSize: 20, fontWeight: '800' },
  copy: { flex: 1, gap: 3 },
  name: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  specialization: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  qualification: { color: Colors.muted, fontSize: 12, lineHeight: 18 },
});
