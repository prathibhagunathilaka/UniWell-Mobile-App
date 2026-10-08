import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import {
  Eyebrow,
  InlineMessage,
  LoadingState,
  PageHeading,
  SectionHeading,
  SurfaceCard,
  WellbeingIllustration,
  WellbeingPage,
} from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { getResources, ResourceItem } from '@/services/resourceService';

const categories = [
  'All',
  'Stress Management',
  'Anxiety & Worry',
  'Sleep',
  'Sleep & Rest',
  'Academic Pressure',
  'Time Management',
  'Emotional Wellbeing',
  'Relaxation / Mindfulness',
  'Self-Care',
  'Study-Life Balance',
];

const categoryIcon = (category: string) => {
  if (category === 'Sleep' || category === 'Sleep & Rest') return '☾';
  if (category === 'Academic Pressure') return '▤';
  if (category === 'Anxiety & Worry') return '♡';
  if (category === 'Time Management') return '◷';
  if (category === 'Emotional Wellbeing') return '✿';
  return '✦';
};

export default function ResourcesScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resolvedCategory, setResolvedCategory] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [error, setError] = useState('');
  const loading = resolvedCategory !== selectedCategory;

  useEffect(() => {
    let active = true;
    getResources(selectedCategory === 'All' ? undefined : selectedCategory)
      .then((response) => {
        if (active) {
          setResources(response.resources.filter((resource) => resource.isActive));
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load self-help resources. Please try again.');
          setResources([]);
        }
      })
      .finally(() => {
        if (active) setResolvedCategory(selectedCategory);
      });

    return () => {
      active = false;
    };
  }, [selectedCategory, retryVersion]);

  const visibleResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return resources;
    return resources.filter((resource) =>
      `${resource.title} ${resource.description} ${resource.category} ${resource.content} ${(resource.helpfulTips || []).join(' ')}`.toLowerCase().includes(query),
    );
  }, [resources, search]);

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/dashboard" label="Dashboard" />
      <Eyebrow>Small steps, helpful ideas</Eyebrow>
      <PageHeading title="Self-help Resources" subtitle="Explore practical wellbeing guidance for student life, at your own pace." />
      <WellbeingIllustration label="A gentle illustration for exploring wellbeing resources" />

      <SurfaceCard style={styles.searchCard}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="Search resources"
          value={search}
          onChangeText={setSearch}
          placeholder="Search topics or resources"
          placeholderTextColor={Colors.muted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}>
            <Text style={styles.clearSearch}>×</Text>
          </Pressable>
        ) : null}
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeading title="Browse by topic" detail="Resources are provided by the UniWell service." />
        <View style={styles.categoryGrid}>
          {categories.map((category) => {
            const active = category === selectedCategory;
            return (
              <Pressable
                key={category}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedCategory(category)}
                style={[styles.categoryCard, active && styles.categoryCardSelected]}
              >
                <Text style={[styles.categoryIcon, active && styles.categoryIconSelected]}>{category === 'All' ? '✧' : categoryIcon(category)}</Text>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelSelected]}>{category}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeading
          title={selectedCategory === 'All' ? 'Explore resources' : selectedCategory}
          detail={loading ? 'Loading from UniWell...' : `${visibleResources.length} ${visibleResources.length === 1 ? 'resource' : 'resources'}`}
        />

        {loading ? <LoadingState label="Loading resources from UniWell..." /> : null}
        {!loading && error ? (
          <View style={styles.stateGroup}>
            <InlineMessage tone="error">{error}</InlineMessage>
            <Pressable accessibilityRole="button" onPress={() => { setResolvedCategory(null); setRetryVersion((value) => value + 1); }} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {!loading && !error && visibleResources.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✿</Text>
            <Text style={styles.emptyTitle}>{search ? 'No matching resources' : 'Nothing here just yet'}</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try another phrase or choose a different topic.' : 'There are no active resources in this topic right now.'}
            </Text>
            {search ? (
              <Pressable accessibilityRole="button" onPress={() => setSearch('')} style={styles.emptyAction}>
                <Text style={styles.emptyActionText}>Clear search</Text>
              </Pressable>
            ) : null}
          </SurfaceCard>
        ) : null}
        {!loading && !error ? visibleResources.map((resource) => (
          <Pressable
            key={resource._id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/student/resource/[id]', params: { id: resource._id } })}
            style={({ pressed }) => [styles.resourceCard, pressed && styles.pressed]}
          >
            <View style={styles.resourceCardTop}>
              <View style={styles.resourceIcon}><Text style={styles.resourceIconText}>{categoryIcon(resource.category)}</Text></View>
              <Text style={styles.resourceCategory}>{resource.category}</Text>
              <Text style={styles.resourceArrow}>↗</Text>
            </View>
            <Text style={styles.resourceTitle}>{resource.title}</Text>
            <Text style={styles.resourceDescription}>{resource.description}</Text>
            <Text style={styles.readMore}>Read resource  ›</Text>
          </Pressable>
        )) : null}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>Go at your own pace</Text>
        <Text style={styles.noteText}>These ideas are here to support reflection and do not replace professional care.</Text>
      </View>
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: Space.lg,
  },
  searchCard: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.xs,
    gap: Space.sm,
  },
  searchIcon: {
    color: Colors.primary,
    fontSize: 24,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    color: Colors.accent,
    fontSize: 14,
  },
  clearSearch: {
    color: Colors.muted,
    fontSize: 23,
    paddingHorizontal: Space.xs,
  },
  section: {
    gap: Space.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  categoryCard: {
    minHeight: 76,
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: Space.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  categoryCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    color: Colors.primary,
    fontSize: 20,
  },
  categoryIconSelected: {
    color: Colors.accent,
  },
  categoryLabel: {
    color: Colors.accent,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    fontWeight: '700',
  },
  categoryLabelSelected: {
    color: Colors.accent,
  },
  stateGroup: {
    gap: Space.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    paddingHorizontal: Space.md,
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Space.lg,
    backgroundColor: Colors.paleBlue,
  },
  emptyIcon: {
    fontSize: 30,
    color: Colors.primary,
  },
  emptyTitle: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyAction: {
    padding: Space.sm,
  },
  emptyActionText: {
    color: Colors.primary,
    fontWeight: '800',
  },
  resourceCard: {
    padding: Space.md,
    gap: Space.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    shadowColor: Colors.accent,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  pressed: {
    opacity: 0.86,
  },
  resourceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  resourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paleBlue,
  },
  resourceIconText: {
    color: Colors.accent,
    fontSize: 20,
  },
  resourceCategory: {
    flex: 1,
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  resourceArrow: {
    color: Colors.muted,
    fontSize: 17,
  },
  resourceTitle: {
    color: Colors.accent,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  resourceDescription: {
    color: Colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  readMore: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  note: {
    padding: Space.md,
    backgroundColor: Colors.paleCoral,
    borderRadius: Radius.md,
    gap: Space.xs,
  },
  noteTitle: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  noteText: {
    color: Colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});