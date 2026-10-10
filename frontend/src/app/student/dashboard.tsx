// Student home: greeting, quick actions and the student's upcoming counselling appointments.
import { Link, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import { useAuth } from '@/contexts/AuthContext';
import { CheckInRecord, CheckInTrendPoint, getCheckInTrend, getCheckIns } from '@/services/checkinService';
import { AppointmentRecord, getStudentAppointments } from '@/services/counsellingService';

const quickActions = [
  {
    title: 'Book a Counsellor',
    description: 'Find an approved counsellor and an available session time.',
    icon: '♡',
    href: '/student/counselling' as const,
    tone: Colors.paleCoral,
  },
  {
    title: 'Self-help Resources',
    description: 'Practical ideas for sleep, stress, and student life.',
    icon: '✿',
    href: '/student/resources' as const,
    tone: Colors.paleBlue,
  },
  {
    title: 'Immediate Help',
    description: 'Emergency support information and urgent next steps.',
    icon: '♡',
    href: '/student/emergency' as const,
    tone: Colors.paleCoral,
  },
  {
    title: 'Trusted Person',
    description: 'Save and privately view someone you trust.',
    icon: '✦',
    href: '/student/trusted-person' as const,
    tone: Colors.paleBlue,
  },
  {
    title: 'University Support',
    description: 'View configured university support contacts.',
    icon: '⌂',
    href: { pathname: '/student/support/[topic]', params: { topic: 'university' } } as const,
    tone: Colors.paleBlue,
  },
  {
    title: 'Safety Guidelines',
    description: 'Read practical steps for finding support and staying safe.',
    icon: '✓',
    href: { pathname: '/student/support/[topic]', params: { topic: 'safety' } } as const,
    tone: Colors.paleCoral,
  },
];

export default function StudentDashboardScreen() {
  const { user } = useAuth();
  const [latestCheckIn, setLatestCheckIn] = useState<CheckInRecord | null>(null);
  const [trend, setTrend] = useState<CheckInTrendPoint[]>([]);
  const [trendError, setTrendError] = useState('');
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [checkInError, setCheckInError] = useState('');
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentRecord[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState('');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const fetchDashboardData = useCallback(async () => {
      const [latestResult, trendResult] = await Promise.allSettled([getCheckIns(1), getCheckInTrend()]);
      if (latestResult.status === 'rejected') throw latestResult.reason;
      return {
        latest: latestResult.value.checkIns[0] || null,
        trend: trendResult.status === 'fulfilled' ? trendResult.value.checkIns : [],
        trendError: trendResult.status === 'rejected'
          ? trendResult.reason instanceof Error ? trendResult.reason.message : 'Your wellbeing trend could not be loaded.'
          : '',
      };
  }, []);

  const fetchAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    setAppointmentsError('');
    try {
      const response = await getStudentAppointments();
      const now = Date.now();
      setUpcomingAppointments(response.appointments.filter((appointment) =>
        new Date(appointment.startsAt).getTime() >= now &&
        ['pending', 'confirmed'].includes(appointment.status)));
    } catch (cause) {
      setAppointmentsError(cause instanceof Error ? cause.message : 'Your appointments could not be loaded.');
    } finally {
      setAppointmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchAppointments);
  }, [fetchAppointments]);

  useEffect(() => {
    let active = true;
    fetchDashboardData()
      .then((data) => {
        if (active) {
          setLatestCheckIn(data.latest);
          setTrend(data.trend);
          setTrendError(data.trendError);
        }
      })
      .catch((error: unknown) => {
        if (active) setCheckInError(error instanceof Error ? error.message : 'Your latest check-in could not be loaded.');
      })
      .finally(() => {
        if (active) setLoadingLatest(false);
      });

    return () => {
      active = false;
    };
  }, [fetchDashboardData]);

  const retryLatestCheckIn = () => {
    setLoadingLatest(true);
    setCheckInError('');
    fetchDashboardData()
      .then((data) => {
        setLatestCheckIn(data.latest);
        setTrend(data.trend);
        setTrendError(data.trendError);
      })
      .catch((error: unknown) => setCheckInError(error instanceof Error ? error.message : 'Your latest check-in could not be loaded.'))
      .finally(() => setLoadingLatest(false));
  };

  const orderedTrend = [...trend].reverse();
  const trendDifference = orderedTrend.length > 1
    ? orderedTrend[orderedTrend.length - 1].wellbeingScore - orderedTrend[0].wellbeingScore
    : 0;
  const trendDirection = trendDifference > 0.2
    ? 'improving'
    : trendDifference < -0.2
      ? 'decreasing'
      : 'stable';
  const trendInsight = trendDirection === 'improving'
    ? 'Your recent self-reported scores are trending upward.'
    : trendDirection === 'decreasing'
      ? 'Your recent self-reported scores are trending downward. Consider reaching out for support if that feels helpful.'
      : 'Your recent check-ins show a generally stable pattern.';

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <WellbeingIllustration label="A gentle illustration for your wellbeing dashboard" />

      <View style={styles.greeting}>
        <Eyebrow>{today}</Eyebrow>
        <PageHeading title={`${greeting}${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`} subtitle="You deserve a moment to pause and take care of yourself." />
      </View>

      <SurfaceCard style={styles.checkInCard}>
        <View style={styles.checkInCardTop}>
          <View style={styles.smallIcon}><Text style={styles.iconText}>✦</Text></View>
          <Text style={styles.overline}>A moment for you</Text>
        </View>
        <SectionHeading title="How are you feeling today?" detail="A quick check-in can help you notice what you need." />
        <Link href="/student/check-in" asChild>
          <PrimaryButton title="Start Daily Check-in" />
        </Link>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeading title="Your wellbeing" detail="A private reflection from your latest check-in." />
        {loadingLatest ? <LoadingState label="Loading your latest check-in..." /> : null}
        {!loadingLatest && checkInError ? (
          <View style={styles.stateWrap}>
            <InlineMessage tone="error">{checkInError}</InlineMessage>
            <Pressable onPress={retryLatestCheckIn} style={styles.retryButton}>
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {!loadingLatest && !checkInError && latestCheckIn ? (
          <SurfaceCard style={styles.latestCard}>
            <View style={styles.latestScore}>
              <Text style={styles.scoreNumber}>{latestCheckIn.wellbeingScore.toFixed(2).replace(/\.?0+$/, '')}</Text>
              <Text style={styles.scoreOutOf}>out of 5</Text>
            </View>
            <View style={styles.latestText}>
              <Text style={styles.latestLevel}>{latestCheckIn.wellbeingLevel}</Text>
              <Text style={styles.latestDate}>{new Date(latestCheckIn.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.latestMood}>Mood: {latestCheckIn.mood}</Text>
            </View>
          </SurfaceCard>
        ) : null}
        {!loadingLatest && !checkInError && !latestCheckIn ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/student/check-in')}
            style={({ pressed }) => [styles.emptyCard, pressed && styles.pressedCard]}
          >
            <Text style={styles.emptyIcon}>☀</Text>
            <Text style={styles.emptyTitle}>Your first check-in is waiting</Text>
            <Text style={styles.emptyText}>There is no pressure to have the perfect words. Start with how today feels.</Text>
            <Text style={styles.historyLinkText}>Start your check-in  ›</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeading title="Your Wellbeing Trend" detail="Your recent wellbeing scores from saved check-ins." />
        {loadingLatest ? <LoadingState label="Loading your check-in pattern..." /> : null}
        {!loadingLatest && trendError ? (
          <View style={styles.stateWrap}>
            <InlineMessage tone="error">{trendError}</InlineMessage>
            <Pressable onPress={retryLatestCheckIn} style={styles.retryButton}>
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {!loadingLatest && !trendError && orderedTrend.length < 2 ? (
          <SurfaceCard style={styles.trendCard}>
            <Text style={styles.emptyText}>Complete more daily check-ins to see your wellbeing trend.</Text>
          </SurfaceCard>
        ) : null}
        {!loadingLatest && !trendError && orderedTrend.length >= 2 ? (
          <SurfaceCard style={styles.trendCard}>
            <Text style={styles.trendDirection}>Recent pattern: {trendDirection}</Text>
            {orderedTrend.map((point) => (
              <View key={point._id} style={styles.trendRow}>
                <Text style={styles.trendDate}>{new Date(point.createdAt).toLocaleDateString(undefined, { weekday: 'short' })}</Text>
                <View style={styles.trendTrack}>
                  <View style={[styles.trendBar, { width: `${(point.wellbeingScore / 5) * 100}%` }]} />
                </View>
                <Text style={styles.trendScore}>{point.wellbeingScore.toFixed(2).replace(/\.?0+$/, '')}</Text>
              </View>
            ))}
            <Text style={styles.trendInsight}>{trendInsight}</Text>
            <Text style={styles.trendDisclaimer}>This reflects check-in responses only; it is not a diagnosis or medical measurement.</Text>
          </SurfaceCard>
        ) : null}
        <Link href="/student/check-in-history" asChild>
          <Pressable accessibilityRole="button" style={styles.historyLink}>
            <Text style={styles.historyLinkText}>View check-in history</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Support for your day" detail="Choose what feels helpful right now." />
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} asChild>
            <Pressable accessibilityRole="button" style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: action.tone }]}>
                <Text style={styles.actionIconText}>{action.icon}</Text>
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.appointmentHeading}>
          <SectionHeading title="Upcoming counselling sessions" detail="Your bookings and their current status." />
          <Link href="/student/appointments" asChild>
            <Pressable accessibilityRole="button"><Text style={styles.historyLinkText}>View all</Text></Pressable>
          </Link>
        </View>
        {appointmentsLoading ? <LoadingState label="Loading your upcoming sessions..." /> : null}
        {!appointmentsLoading && appointmentsError ? <InlineMessage tone="error">{appointmentsError}</InlineMessage> : null}
        {!appointmentsLoading && !appointmentsError && upcomingAppointments.length === 0 ? (
          <SurfaceCard style={styles.appointmentCard}>
            <Text style={styles.appointmentTitle}>No upcoming counselling sessions</Text>
            <Text style={styles.appointmentText}>You can book an available time with an approved counsellor whenever you are ready.</Text>
            <Link href="/student/counselling" asChild><PrimaryButton title="Book a Counsellor" /></Link>
          </SurfaceCard>
        ) : null}
        {!appointmentsLoading && !appointmentsError ? upcomingAppointments
          .slice(0, 2)
          .map((appointment) => (
            <Link key={appointment._id} href={{ pathname: '/student/appointments/[id]', params: { id: appointment._id } }} asChild>
              <Pressable accessibilityRole="button" style={styles.appointmentCard}>
                <View style={styles.appointmentCopy}>
                  <Text style={styles.appointmentTitle}>{appointment.counsellorId?.name || 'Counsellor'}</Text>
                  <Text style={styles.appointmentText}>{new Date(appointment.startsAt).toLocaleString(undefined, {
                    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}</Text>
                  <Text style={styles.appointmentStatus}>{appointment.status === 'confirmed' ? 'Confirmed' : 'Awaiting confirmation'} · {appointment.sessionType.replace('-', ' ')}</Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </Pressable>
            </Link>
          )) : null}
      </View>

      <View style={styles.supportNote}>
        <Text style={styles.supportTitle}>You do not have to navigate everything alone.</Text>
        <Text style={styles.supportText}>If you are in immediate danger, contact local emergency services or reach out to someone you trust.</Text>
      </View>
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: Space.md,
  },
  greeting: {
    gap: Space.xs,
    paddingTop: Space.xs,
  },
  checkInCard: {
    backgroundColor: Colors.paleCoral,
    borderColor: '#F3C3B7',
    padding: Space.lg,
  },
  checkInCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  smallIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: Colors.primary,
    fontSize: 19,
  },
  overline: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    gap: Space.md,
  },
  stateWrap: {
    gap: Space.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
  },
  retryLabel: {
    color: Colors.primary,
    fontWeight: '800',
  },
  latestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Colors.paleBlue,
    borderColor: Colors.secondary,
  },
  latestScore: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  scoreNumber: {
    color: Colors.accent,
    fontSize: 23,
    fontWeight: '800',
  },
  scoreOutOf: {
    color: Colors.muted,
    fontSize: 10,
  },
  latestText: {
    flex: 1,
    gap: 3,
  },
  latestLevel: {
    color: Colors.accent,
    fontSize: 17,
    fontWeight: '800',
  },
  latestDate: {
    color: Colors.muted,
    fontSize: 12,
  },
  latestMood: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  trendCard: {
    gap: Space.sm,
    backgroundColor: Colors.white,
  },
  trendDirection: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  trendRow: {
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  trendDate: {
    width: 34,
    color: Colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  trendTrack: {
    flex: 1,
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.paleBlue,
    overflow: 'hidden',
  },
  trendBar: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  trendScore: {
    width: 32,
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  trendInsight: {
    color: Colors.accent,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  trendDisclaimer: {
    color: Colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Space.xs,
    backgroundColor: Colors.white,
    paddingVertical: Space.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.md,
  },
  pressedCard: {
    opacity: 0.78,
  },
  emptyIcon: {
    color: Colors.primary,
    fontSize: 30,
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
  actionCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    borderRadius: Radius.lg,
    padding: Space.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    color: Colors.accent,
    fontSize: 24,
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  actionDescription: {
    color: Colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  actionArrow: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: '500',
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Space.md,
    backgroundColor: Colors.white,
  },
  appointmentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
  },
  appointmentCopy: {
    flex: 1,
    gap: 5,
  },
  appointmentTitle: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  appointmentText: {
    color: Colors.muted,
    fontSize: 13,
  },
  appointmentStatus: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  historyLink: {
    alignSelf: 'flex-start',
    paddingVertical: Space.xs,
  },
  historyLinkText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  supportNote: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    padding: Space.md,
    gap: Space.xs,
  },
  supportTitle: {
    color: Colors.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  supportText: {
    color: '#E1ECF0',
    fontSize: 12,
    lineHeight: 18,
  },
});
