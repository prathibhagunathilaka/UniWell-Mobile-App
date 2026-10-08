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

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/emergency" label="Support & Safety" />
      <PageHeading title={selected?.title || 'Support information'} subtitle={selected?.description || 'This support page is not available.'} />

      {selected && (isImmediate || topic === 'university') ? (
        <SurfaceCard style={styles.contactCard}>
          {phone ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void openConfiguredLink(`tel:${phone.replace(/[^\d+]/g, '')}`)}
              style={styles.contactButton}
            >
              <Text style={styles.contactButtonText}>{isImmediate ? 'Call configured emergency contact' : 'Call university support'}</Text>
            </Pressable>
          ) : null}
          {website ? (
            <PrimaryButton
              title={isImmediate ? 'Open emergency support website' : 'Open university support website'}
              onPress={() => void openConfiguredLink(website)}
            />
          ) : null}
          {!phone && !website ? (
            <Text style={styles.notConfigured}>
              {contactsError || 'Contact information is not configured yet.'}
            </Text>
          ) : null}
          {linkError ? <InlineMessage tone="error">{linkError}</InlineMessage> : null}
        </SurfaceCard>
      ) : null}

      {isImmediate ? (
        <SurfaceCard style={styles.guidanceCard}>
          <Text style={styles.guidanceTitle}>If you may be in immediate danger</Text>
          <Text style={styles.guidanceText}>Contact emergency services where you are or go to the nearest emergency department. If possible, tell a trusted person what is happening and ask them to stay with you.</Text>
        </SurfaceCard>
      ) : null}
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
  bottomSpace: {
    height: Space.xl,
  },
});
