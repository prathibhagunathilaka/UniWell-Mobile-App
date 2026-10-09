import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { InlineMessage, PageHeading, PrimaryButton, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { getSupportContacts, SupportContacts } from '@/services/counsellingService';

const content = {
  immediate: {
    title: 'Immediate Help',
    description: 'If you are in immediate danger, contact emergency services in your location or go to the nearest emergency department. If you can, move to a safer place and ask someone you trust to stay with you.',
  },
  university: {
    title: 'University Support',
    description: 'Your university support or wellbeing team can help you understand available services and next steps.',
  },
  safety: {
    title: 'Safety Guidance',
    description: 'Focus on one safe next step at a time. Move to a safer place if you can, contact someone you trust, and seek professional or emergency help when the situation feels urgent.',
  },
} as const;

type SupportTopic = keyof typeof content;

export default function SupportDetailsScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const selected = Object.hasOwn(content, topic) ? content[topic as SupportTopic] : null;
  const isImmediate = topic === 'immediate';
  const [linkError, setLinkError] = useState('');
  const [contacts, setContacts] = useState<SupportContacts | null>(null);
  const [contactsError, setContactsError] = useState('');

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        setContacts(await getSupportContacts());
      } catch {
        setContactsError('Contact information could not be loaded right now.');
      }
    });
  }, []);

  const openConfiguredLink = async (url: string) => {
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:', 'tel:'].includes(parsed.protocol)) {
        throw new Error('Unsupported support link.');
      }
      await Linking.openURL(parsed.toString());
      setLinkError('');
    } catch {
      setLinkError('This configured contact link could not be opened.');
    }
  };

  const phone = isImmediate ? contacts?.emergencyPhone : contacts?.universityPhone;
  const website = isImmediate ? contacts?.emergencyWebsite : contacts?.universityWebsite;
  const section = selected ? contacts?.directory?.[topic as SupportTopic] : undefined;
  const hasConfigured = Boolean(phone || website);

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/emergency" label="Support & Safety" />
      <PageHeading title={selected?.title || 'Support information'} subtitle={selected?.description || 'This support page is not available.'} />

      {isImmediate ? (
        <SurfaceCard style={styles.guidanceCard}>
          <Text style={styles.guidanceTitle}>If you may be in immediate danger</Text>
          <Text style={styles.guidanceText}>{section?.intro || 'Contact emergency services where you are or go to the nearest emergency department. If possible, tell a trusted person what is happening and ask them to stay with you.'}</Text>
        </SurfaceCard>
      ) : section?.intro ? (
        <SurfaceCard style={styles.introCard}><Text style={styles.guidanceText}>{section.intro}</Text></SurfaceCard>
      ) : null}

      {selected && hasConfigured ? (
        <SurfaceCard style={styles.contactCard}>
          {phone ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void openConfiguredLink(`tel:${phone.replace(/[^\d+]/g, '')}`)}
              style={styles.contactButton}
            >
              <Text style={styles.contactButtonText}>{isImmediate ? 'Call emergency contact' : 'Call university support'}</Text>
            </Pressable>
          ) : null}
          {website ? (
            <PrimaryButton
              title={isImmediate ? 'Open emergency support website' : 'Open university support website'}
              onPress={() => void openConfiguredLink(website)}
            />
          ) : null}
        </SurfaceCard>
      ) : null}

      {section?.steps?.length ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{isImmediate ? 'What to do right now' : 'Steps you can take'}</Text>
          {section.steps.map((step, index) => (
            <View key={step.title} style={styles.stepCard}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {section?.contacts?.length ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{isImmediate ? 'Who to contact' : topic === 'university' ? 'Support on campus' : 'More help'}</Text>
          {section.contacts.map((entry) => (
            <View key={entry.name} style={[styles.entryCard, isImmediate && styles.entryCardUrgent]}>
              <Text style={styles.entryName}>{entry.name}</Text>
              <Text style={styles.entryText}>{entry.description}</Text>
              {entry.availability ? <Text style={styles.entryMeta}>{entry.availability}</Text> : null}
              {entry.phone || entry.website ? (
                <View style={styles.entryActions}>
                  {entry.phone ? (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`Call ${entry.name} on ${entry.phone}`}
                      onPress={() => void openConfiguredLink(`tel:${entry.phone.replace(/[^\d+]/g, '')}`)}
                      style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.callText}>Call {entry.phone}</Text>
                    </Pressable>
                  ) : null}
                  {entry.website ? (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${entry.name} website`}
                      onPress={() => void openConfiguredLink(entry.website)}
                      style={({ pressed }) => [styles.webButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.webText}>Website</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {selected && !section && !hasConfigured ? (
        <SurfaceCard style={styles.contactCard}>
          <Text style={styles.notConfigured}>{contactsError || 'Contact information is not available yet.'}</Text>
        </SurfaceCard>
      ) : null}
      {linkError ? <InlineMessage tone="error">{linkError}</InlineMessage> : null}
      <View style={styles.bottomSpace} />
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: Space.md,
  },
  backLink: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  backArrow: {
    color: Colors.primary,
    fontSize: 28,
  },
  backLabel: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  contactCard: {
    gap: Space.sm,
    backgroundColor: Colors.paleBlue,
  },
  contactButton: {
    minHeight: 48,
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  contactButtonText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  notConfigured: {
    color: Colors.accent,
    fontSize: 14,
    lineHeight: 21,
  },
  guidanceCard: {
    gap: Space.sm,
    borderColor: '#E6B0A7',
    backgroundColor: '#FFF4F1',
  },
  guidanceTitle: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  guidanceText: {
    color: Colors.accent,
    fontSize: 14,
    lineHeight: 22,
  },
  introCard: { backgroundColor: Colors.white },
  group: { gap: Space.sm },
  groupTitle: { color: Colors.accent, fontSize: 17, fontWeight: '800' },
  stepCard: { flexDirection: 'row', gap: Space.md, padding: Space.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paleCoral },
  stepNumberText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  stepCopy: { flex: 1, gap: 3 },
  stepTitle: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  stepText: { color: Colors.muted, fontSize: 14, lineHeight: 21 },
  entryCard: { gap: Space.xs, padding: Space.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, borderTopWidth: 4, borderTopColor: Colors.secondary, backgroundColor: Colors.white },
  entryCardUrgent: { borderTopColor: Colors.primary },
  entryName: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  entryText: { color: Colors.muted, fontSize: 14, lineHeight: 21 },
  entryMeta: { color: Colors.success, fontSize: 12, fontWeight: '800' },
  entryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.xs },
  callButton: { minHeight: 44, paddingHorizontal: Space.md, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.primary },
  callText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  webButton: { minHeight: 44, paddingHorizontal: Space.md, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.paleBlue },
  webText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  bottomSpace: {
    height: Space.xl,
  },
});
