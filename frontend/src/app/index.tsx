import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { UniWellLogo } from '@/components/brand/UniWellLogo';
import { InlineMessage, WellbeingIllustration } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { getAuthenticatedHome, useAuth } from '@/contexts/AuthContext';

export default function IndexRoute() {
  const { user, loading, sessionNotice, beginAuthFlow } = useAuth();

  useEffect(() => {
    if (!loading) {
      console.info('[ROUTER] initial route decision:', user ? getAuthenticatedHome(user) : 'Welcome (unauthenticated)');
    }
  }, [loading, user]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading UniWell...</Text>
      </View>
    );
  }

  if (user) {
    return <Redirect href={getAuthenticatedHome(user)} />;
  }

  return (
    <View style={styles.page}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <UniWellLogo size={44} showName />
        </View>

        <View style={styles.hero}>
          <WellbeingIllustration label="A calm, welcoming illustration for university wellbeing" />
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>A little space for you</Text>
            <Text style={styles.title}>Your Wellbeing Matters</Text>
            <Text style={styles.subtitle}>
              Take a moment to check in, find support, and access wellbeing resources designed for university life.
            </Text>
          </View>
          {sessionNotice ? <InlineMessage tone="error">{sessionNotice}</InlineMessage> : null}
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={beginAuthFlow}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>GET STARTED</Text>
          </Pressable>
          <View style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>A supportive space, on your terms</Text>
            <Text style={styles.privacyText}>Your check-ins are private to your account and are here to help you reflect.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  // Header pinned top, hero in the middle, actions pinned bottom: space-between spreads them out.
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    paddingBottom: Space.lg,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.sm,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: Space.lg,
  },
  copy: {
    gap: Space.sm,
  },
  footer: {
    gap: Space.md,
  },
  pressed: {
    opacity: 0.85,
  },
  eyebrow: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.accent,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  privacyCard: {
    backgroundColor: Colors.paleBlue,
    borderRadius: Radius.md,
    padding: Space.md,
    gap: Space.xs,
  },
  privacyTitle: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  privacyText: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
