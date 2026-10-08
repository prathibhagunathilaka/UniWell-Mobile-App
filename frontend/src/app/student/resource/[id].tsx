import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import {
  Eyebrow,
  InlineMessage,
  LoadingState,
  PageHeading,
  PrimaryButton,
  SurfaceCard,
  WellbeingIllustration,
  WellbeingPage,
} from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { getResourceById, ResourceItem } from '@/services/resourceService';

const iconForCategory = (category: string) => {
  if (category === 'Sleep') return '☾';
  if (category === 'Academic Pressure') return '▤';
  if (category === 'Anxiety & Worry') return '♡';
  if (category === 'Time Management') return '◷';
  if (category === 'Emotional Wellbeing') return '✿';
  return '✦';
};

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkErrorResourceId, setLinkErrorResourceId] = useState('');
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const resourceId = id || '';
  const loading = resolvedId !== resourceId;

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!resourceId) throw new Error('This resource link is incomplete.');
        return getResourceById(resourceId);
      })
      .then((response) => {
        if (active) {
          setResource(response.resource?.isActive ? response.resource : null);
          setError('');
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unable to load this resource.');
          setResource(null);
        }
      })
      .finally(() => {
        if (active) setResolvedId(resourceId);
      });

    return () => {
      active = false;
    };
  }, [resourceId, retryVersion]);

  const openExternalLink = async (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Unsupported resource link.');
      }
      await Linking.openURL(parsed.toString());
      setLinkError('');
      setLinkErrorResourceId('');
    } catch {
      setLinkError('This link could not be opened on your device.');
      setLinkErrorResourceId(resourceId);
    }
  };
  const imageUrl = resource?.imageUrl && resource.imageUrl !== failedImageUrl
    ? (() => {
        try {
          const parsed = new URL(resource.imageUrl);
          return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
        } catch {
          return '';
        }
      })()
    : '';

  if (loading) {
    return (
      <WellbeingPage contentContainerStyle={styles.statePage}>
        <ScreenBackButton fallback="/student/resources" label="All resources" />
        <LoadingState label="Loading this resource..." />
      </WellbeingPage>
    );
  }

  if (error || !resource) {
    return (
      <WellbeingPage contentContainerStyle={styles.statePage}>
        <ScreenBackButton fallback="/student/resources" label="All resources" />
        <WellbeingIllustration label="A calm illustration for your resource library" />
        <PageHeading title="Resource unavailable" subtitle={error || 'This resource could not be found.'} />
        {error ? (
          <PrimaryButton title="Try again" onPress={() => { setResolvedId(null); setRetryVersion((value) => value + 1); }} />
        ) : null}
      </WellbeingPage>
    );
  }

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/resources" label="All resources" />
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          accessibilityLabel={`Image for ${resource.title}`}
          onError={() => setFailedImageUrl(resource.imageUrl || '')}
          style={styles.resourceImage}
        />
      ) : (
        <WellbeingIllustration label={`Illustration for ${resource.category}`} />
      )}
      <View style={styles.articleHeading}>
        <Eyebrow>{resource.category}</Eyebrow>
        <PageHeading title={resource.title} subtitle={resource.description} />
      </View>
      <View style={styles.articleMeta}>
        <View style={styles.articleIcon}><Text style={styles.articleIconText}>{iconForCategory(resource.category)}</Text></View>
        <Text style={styles.metaText}>A UniWell wellbeing guide</Text>
      </View>
      <SurfaceCard style={styles.articleCard}>
        <Text style={styles.articleLabel}>A few ideas to explore</Text>
        {resource.content.split(/\n{2,}/).map((paragraph, index) => (
          <Text key={`${index}-${paragraph.slice(0, 12)}`} style={styles.articleText}>{paragraph}</Text>
        ))}
      </SurfaceCard>
      {resource.helpfulTips?.length ? (
        <SurfaceCard style={styles.tipsCard}>
          <Text style={styles.articleLabel}>Helpful tips</Text>
          {resource.helpfulTips.map((tip, index) => (
            <Text key={`${index}-${tip.slice(0, 16)}`} style={styles.articleText}>• {tip}</Text>
          ))}
        </SurfaceCard>
      ) : null}
      {resource.externalLink ? (
        <View style={styles.externalGroup}>
          <PrimaryButton title="Open further reading" onPress={() => void openExternalLink(resource.externalLink || '')} />
          {linkError && linkErrorResourceId === resourceId ? <InlineMessage tone="error">{linkError}</InlineMessage> : null}
        </View>
      ) : null}
      {resource.videoUrl ? (
        <View style={styles.externalGroup}>
          <PrimaryButton title="Watch Video" onPress={() => void openExternalLink(resource.videoUrl || '')} />
          {linkError && linkErrorResourceId === resourceId ? <InlineMessage tone="error">{linkError}</InlineMessage> : null}
        </View>
      ) : null}
      <View style={styles.supportNote}>
        <Text style={styles.supportTitle}>Take what feels useful</Text>
        <Text style={styles.supportText}>You can revisit this guide whenever you need a gentle reminder.</Text>
      </View>
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: Space.md,
  },
  statePage: {
    justifyContent: 'center',
  },
  resourceImage: {
    width: '100%',
    height: 210,
    borderRadius: Radius.xl,
    backgroundColor: Colors.paleBlue,
  },
  backLink: {
    minHeight: 42,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  backArrow: {
    color: Colors.primary,
    fontSize: 27,
  },
  backLinkText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  articleHeading: {
    gap: Space.xs,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  articleIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paleBlue,
  },
  articleIconText: {
    color: Colors.accent,
    fontSize: 20,
  },
  metaText: {
    color: Colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  articleCard: {
    padding: Space.lg,
    gap: Space.md,
  },
  tipsCard: {
    padding: Space.lg,
    gap: Space.sm,
    backgroundColor: Colors.paleBlue,
  },
  articleLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  articleText: {
    color: Colors.accent,
    fontSize: 15,
    lineHeight: 25,
  },
  externalGroup: {
    gap: Space.sm,
  },
  supportNote: {
    padding: Space.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.paleCoral,
    gap: Space.xs,
  },
  supportTitle: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  supportText: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  backButton: {
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.paleBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: Colors.accent,
    fontWeight: '800',
  },
});
