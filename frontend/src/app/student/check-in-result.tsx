import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import {
  Eyebrow,
  InlineMessage,
  LoadingState,
  PageHeading,
  PrimaryButton,
  SectionHeading,
  SurfaceCard,
  WellbeingIllustration,
  WellbeingPage,
} from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { CheckInRecord, getCheckInById } from '@/services/checkinService';

const reflections: Record<string, string> = {
  'Needs Support': 'It sounds like today may feel especially heavy. Consider reaching out to someone you trust or exploring support when you feel ready.',
  Moderate: 'Some parts of today may feel challenging. Small, kind steps can make the day feel more manageable.',
  'Doing Okay': 'Your answers suggest you are doing okay today. Keep noticing what helps you feel steady.',
  Positive: 'It is good to notice the things supporting you today. Keep making room for those helpful moments.',
};

export default function CheckInResultScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    mood?: string;
    stressLevel?: string;
    sleepQuality?: string;
    studyCoping?: string;
    wellbeingLevel?: string;
    wellbeingScore?: string;
  }>();

  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [checkIn, setCheckIn] = useState<CheckInRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(routeId));
  const [error, setError] = useState('');

  const loadCheckIn = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    setError('');
    try {
      const response = await getCheckInById(routeId);
      setCheckIn(response.checkIn);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this check-in.');
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    if (routeId) void Promise.resolve().then(loadCheckIn);
  }, [loadCheckIn, routeId]);

  const paramValue = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] || '' : value || '';
  const hasLegacyResult = !routeId && Boolean(
    params.mood || params.stressLevel || params.sleepQuality || params.studyCoping || params.wellbeingScore,
  );
  const wellbeingLevel = checkIn?.wellbeingLevel || paramValue(params.wellbeingLevel) || '—';
  const mood = checkIn?.mood || paramValue(params.mood) || '—';
  const stressLevel = checkIn?.stressLevel || paramValue(params.stressLevel) || '—';
  const sleepQuality = checkIn?.sleepQuality || paramValue(params.sleepQuality) || '—';
  const studyCoping = checkIn?.studyCoping || paramValue(params.studyCoping) || '—';
  const parsedScore = checkIn?.wellbeingScore ?? Number(paramValue(params.wellbeingScore));
  const hasScore = Number.isFinite(parsedScore) && parsedScore >= 1 && parsedScore <= 5;
  const scorePercent: DimensionValue = hasScore ? `${(parsedScore / 5) * 100}%` : '0%';
  const hasResult = Boolean(checkIn || hasLegacyResult);

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/dashboard" label="Dashboard" />
      <Eyebrow>Your reflection</Eyebrow>
      <PageHeading title="Your Check-in Result" subtitle="Thank you for taking a moment to notice how you are doing." />
      {loading ? <LoadingState label="Loading your saved check-in..." /> : null}
      {error ? (
        <View style={styles.state}>
          <InlineMessage tone="error">{error}</InlineMessage>
          <Pressable accessibilityRole="button" onPress={() => void loadCheckIn()}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      {!loading && !error && !hasResult ? (
        <InlineMessage tone="error">This check-in result is unavailable. Open a saved check-in from your history.</InlineMessage>
      ) : null}
      {hasResult && !loading ? (
        <>
          <WellbeingIllustration label="A hopeful illustration celebrating your wellbeing reflection" />

          <SurfaceCard style={styles.scoreCard}>
            <View style={styles.scoreTop}>
              <View style={styles.scoreCopy}>
                <Text style={styles.scoreCaption}>YOUR WELLBEING TODAY</Text>
                <Text style={styles.level}>{wellbeingLevel}</Text>
              </View>
              <View style={styles.scoreBadge}>
                <Text style={styles.score}>{hasScore ? parsedScore.toFixed(2).replace(/\.?0+$/, '') : '—'}</Text>
                <Text style={styles.scoreTotal}>/ 5</Text>
              </View>
            </View>
            <View style={styles.scoreTrack}>
              <View style={[styles.scoreProgress, { width: scorePercent }]} />
            </View>
            <Text style={styles.reflection}>{reflections[wellbeingLevel] || 'Your check-in is a snapshot of today, not a definition of you.'}</Text>
          </SurfaceCard>

          <View style={styles.section}>
            <SectionHeading title="Your responses" detail="A snapshot of what you shared today." />
            <SurfaceCard style={styles.summaryCard}>
              <SummaryRow icon="☀" label="Mood" value={mood} />
              <SummaryRow icon="✦" label="Stress" value={stressLevel} />
              <SummaryRow icon="☾" label="Sleep" value={sleepQuality} />
              <SummaryRow icon="▤" label="Study & coping" value={studyCoping} />
            </SurfaceCard>
          </View>
          {checkIn?.note.trim() ? (
            <SurfaceCard style={styles.noteCard}>
              <Text style={styles.noteTitle}>Your note</Text>
              <Text style={styles.noteText}>{checkIn.note}</Text>
            </SurfaceCard>
          ) : null}

          <View style={styles.section}>
            <SectionHeading title="A gentle next step" detail="Choose one small thing that feels helpful." />
            <Link href="/student/resources" asChild>
              <PrimaryButton title="Explore Self-help Resources" />
            </Link>
            <SurfaceCard style={styles.counsellingCard}>
              <Text style={styles.counsellingIcon}>♡</Text>
              <View style={styles.counsellingCopy}>
                <Text style={styles.counsellingTitle}>Counselling support</Text>
                <Text style={styles.counsellingText}>Your university can guide you toward support when you are ready.</Text>
              </View>
            </SurfaceCard>
          </View>

          <Link href="/student" asChild>
            <Pressable accessibilityRole="button" style={styles.homeButton}>
              <Text style={styles.homeButtonText}>Back to wellbeing home</Text>
            </Pressable>
          </Link>
        </>
      ) : null}
    </WellbeingPage>
  );
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryLabelWrap}>
        <Text style={styles.summaryIcon}>{icon}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: Space.lg,
  },
  state: {
    gap: Space.sm,
  },
  retry: {
    color: Colors.primary,
    fontWeight: '800',
  },
  noteCard: {
    gap: Space.xs,
    backgroundColor: Colors.paleCoral,
  },
  noteTitle: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  noteText: {
    color: Colors.accent,
    fontSize: 14,
    lineHeight: 21,
  },
  scoreCard: {
    padding: Space.lg,
    backgroundColor: Colors.paleBlue,
    borderColor: Colors.secondary,
    gap: Space.md,
  },
  scoreTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  scoreCopy: {
    flex: 1,
    gap: Space.xs,
  },
  scoreCaption: {
    color: Colors.muted,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '800',
  },
  level: {
    color: Colors.accent,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  scoreBadge: {
    minWidth: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  score: {
    color: Colors.accent,
    fontSize: 25,
    fontWeight: '800',
  },
  scoreTotal: {
    color: Colors.muted,
    fontSize: 11,
  },
  scoreTrack: {
    height: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
  },
  reflection: {
    color: Colors.accent,
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    gap: Space.md,
  },
  summaryCard: {
    paddingVertical: Space.xs,
  },
  summaryRow: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  summaryLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  summaryIcon: {
    color: Colors.primary,
    fontSize: 18,
    width: 23,
    textAlign: 'center',
  },
  summaryLabel: {
    color: Colors.muted,
    fontSize: 14,
  },
  summaryValue: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 1,
  },
  counsellingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  counsellingIcon: {
    color: Colors.primary,
    fontSize: 28,
  },
  counsellingCopy: {
    flex: 1,
    gap: 4,
  },
  counsellingTitle: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  counsellingText: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  homeButton: {
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paleCoral,
  },
  homeButtonText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
});
