import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HugIllustration } from '@/components/wellbeing/HugIllustration';
import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import {
  Eyebrow,
  PageHeading,
  SurfaceCard,
  WellbeingPage,
} from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';

const sections: {
  icon: string;
  title: string;
  description: string;
  tone: 'urgent' | 'blue' | 'coral';
  destination: Href;
}[] = [
  {
    icon: '!',
    title: 'Immediate Help',
    description: 'See clear steps and any configured emergency contact details.',
    tone: 'urgent',
    destination: { pathname: '/student/support/[topic]', params: { topic: 'immediate' } },
  },
  {
    icon: '⌂',
    title: 'University Support',
    description: 'View configured university wellbeing and support contacts.',
    tone: 'blue',
    destination: { pathname: '/student/support/[topic]', params: { topic: 'university' } },
  },
  {
    icon: '♡',
    title: 'Trusted Person',
    description: 'Reach out to someone you trust, such as a friend, family member, lecturer, or another person you feel safe with.',
    tone: 'coral',
    destination: '/student/trusted-person',
  },
  {
    icon: '✦',
    title: 'Counselling Support',
    description: 'See how to continue to the university counselling booking experience.',
    tone: 'blue',
    destination: '/student/counselling',
  },
  {
    icon: '✓',
    title: 'Safety Guidance',
    description: 'Open simple, supportive steps for staying safe and getting help.',
    tone: 'coral',
    destination: { pathname: '/student/support/[topic]', params: { topic: 'safety' } },
  },
] as const;

export default function EmergencySupportScreen() {
  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/dashboard" label="Dashboard" />
      <Eyebrow>Support when you need it</Eyebrow>
      <PageHeading title="Emergency Support" subtitle="Clear next steps and people who can help. Take this one moment at a time." />
      <HugIllustration />

      <View style={styles.alertBanner}>
        <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
        <View style={styles.alertCopy}>
          <Text style={styles.alertTitle}>Are you in immediate danger?</Text>
          <Text style={styles.alertText}>Contact your local emergency services now or go to the nearest emergency department. No emergency number is assumed for your location.</Text>
        </View>
      </View>

      <SurfaceCard style={styles.gentle}>
        <Text style={styles.gentleTitle}>Not ready to call? Start gently.</Text>
        <Text style={styles.gentleText}>Reading, writing to someone you trust or booking a quiet session are all valid first steps.</Text>
        <View style={styles.gentleRow}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/student/resources')} style={styles.gentleButton}><Text style={styles.gentleLabel}>Read self-help</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/student/trusted-person')} style={styles.gentleButton}><Text style={styles.gentleLabel}>Message someone I trust</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/student/counselling')} style={styles.gentleButton}><Text style={styles.gentleLabel}>Book a counsellor</Text></Pressable>
        </View>
      </SurfaceCard>

      {sections.map((section) => {
        const tone = section.tone === 'urgent' ? styles.urgentCard : section.tone === 'blue' ? styles.blueCard : styles.coralCard;
        const iconTone = section.tone === 'urgent' ? styles.urgentIcon : section.tone === 'blue' ? styles.blueIcon : styles.coralIcon;
        const content = (
          <>
            <View style={styles.cardHeading}>
              <View style={[styles.sectionIcon, iconTone]}><Text style={styles.sectionIconText}>{section.icon}</Text></View>
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            <Text style={styles.cardDescription}>{section.description}</Text>
            {'destination' in section ? <Text style={styles.cardLink}>View details  ›</Text> : null}
          </>
        );
        return (
          <Pressable
            key={section.title}
            accessibilityRole="button"
            onPress={() => router.push(section.destination)}
            style={({ pressed }) => [styles.supportCard, tone, pressed && styles.pressed]}
          >
            {content}
          </Pressable>
        );
      })}

      <SurfaceCard style={styles.reminder}>
        <Text style={styles.reminderTitle}>You deserve support</Text>
        <Text style={styles.reminderText}>If one option does not feel right, try another trusted person or service. Asking for help is a meaningful first step.</Text>
      </SurfaceCard>
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  gentle: { gap: Space.sm, backgroundColor: Colors.paleBlue },
  gentleTitle: { color: Colors.accent, fontSize: 17, fontWeight: '800' },
  gentleText: { color: Colors.muted, fontSize: 14 },
  gentleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  gentleButton: { minHeight: 44, paddingHorizontal: Space.md, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  gentleLabel: { color: Colors.accent, fontSize: 13, fontWeight: '800' },
  page: {
    gap: Space.md,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
    padding: Space.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E6B0A7',
    backgroundColor: '#FFF4F1',
  },
  alertIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  alertIconText: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: 20,
  },
  alertCopy: {
    flex: 1,
    gap: Space.xs,
  },
  alertTitle: {
    color: Colors.accent,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  alertText: {
    color: Colors.accent,
    fontSize: 13,
    lineHeight: 20,
  },
  supportCard: {
    gap: Space.sm,
    padding: Space.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  urgentCard: {
    borderColor: '#E6B0A7',
    backgroundColor: '#FFF9F7',
  },
  blueCard: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.white,
  },
  coralCard: {
    borderColor: '#F3C3B7',
    backgroundColor: Colors.white,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentIcon: {
    backgroundColor: Colors.paleCoral,
  },
  blueIcon: {
    backgroundColor: Colors.paleBlue,
  },
  coralIcon: {
    backgroundColor: Colors.paleCoral,
  },
  sectionIconText: {
    color: Colors.accent,
    fontSize: 20,
    fontWeight: '800',
  },
  cardTitle: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  cardDescription: {
    color: Colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  cardLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
  reminder: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  reminderTitle: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  reminderText: {
    color: '#E1ECF0',
    fontSize: 13,
    lineHeight: 20,
  },
});
