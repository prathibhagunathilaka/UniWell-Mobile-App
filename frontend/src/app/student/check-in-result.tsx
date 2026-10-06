import { Link, useLocalSearchParams } from 'expo-router';
import { DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';

import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
  Eyebrow,
  PageHeading,
  PrimaryButton,
  SectionHeading,
  SurfaceCard,
  WellbeingIllustration,
  WellbeingPage,
} from '@/components/wellbeing/WellbeingUI';
import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';

const reflections: Record<string, string> = {
  'Needs Support': 'It sounds like today may feel especially heavy. Consider reaching out to someone you trust or exploring support when you feel ready.',
  Moderate: 'Some parts of today may feel challenging. Small, kind steps can make the day feel more manageable.',
  'Doing Okay': 'Your answers suggest you are doing okay today. Keep noticing what helps you feel steady.',
  Positive: 'It is good to notice the things supporting you today. Keep making room for those helpful moments.',
};

export default function CheckInResultScreen() {
  const params = useLocalSearchParams<{
    mood?: string;
    stressLevel?: string;
    sleepQuality?: string;
    studyCoping?: string;
    wellbeingLevel?: string;
    wellbeingScore?: string;
  }>();

  const wellbeingLevel = String(params.wellbeingLevel || 'Moderate');
  const mood = String(params.mood || '—');
  const stressLevel = String(params.stressLevel || '—');
  const sleepQuality = String(params.sleepQuality || '—');
  const studyCoping = String(params.studyCoping || '—');
  const parsedScore = Number(params.wellbeingScore);
  const hasScore = Number.isFinite(parsedScore) && parsedScore >= 1 && parsedScore <= 5;
  const scorePercent: DimensionValue = hasScore ? `${(parsedScore / 5) * 100}%` : '0%';

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/dashboard" label="Dashboard" />
      <Eyebrow>Your reflection</Eyebrow>
      <PageHeading title="Your Check-in Result" subtitle="Thank you for taking a moment to notice how you are doing." />
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
