import { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';

export function WellbeingPage({ children, contentContainerStyle }: PropsWithChildren<{ contentContainerStyle?: StyleProp<ViewStyle> }>) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.page, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

export function WellbeingIllustration({ label = 'A moment for your wellbeing' }: { label?: string }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.illustration}>
      <View style={styles.sun}>
        <Text style={styles.sunGlyph}>✦</Text>
      </View>
      <View style={styles.orbit} />
      <View style={styles.leafOne} />
      <View style={styles.leafTwo} />
      <View style={styles.illustrationBase}>
        <View style={styles.bookPageLeft} />
        <View style={styles.bookPageRight} />
      </View>
      <View style={styles.illustrationDot} />
    </View>
  );
}

export function Eyebrow({ children }: PropsWithChildren) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.headingGroup}>
      <Text style={styles.heading}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

export function SurfaceCard({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  ...props
}: Omit<PressableProps, 'style'> & { title: string; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        (disabled || loading) && styles.disabledButton,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  );
}

export function InlineMessage({ children, tone = 'info' }: PropsWithChildren<{ tone?: 'info' | 'error' | 'success' }>) {
  if (!children) return null;

  const toneStyle = tone === 'error' ? styles.errorMessage : tone === 'success' ? styles.successMessage : styles.infoMessage;
  return (
    <View accessibilityRole={tone === 'error' ? 'alert' : undefined} style={[styles.message, toneStyle]}>
      <Text style={styles.messageText}>{children}</Text>
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <SurfaceCard style={styles.stateCard}>
      <ActivityIndicator color={Colors.primary} />
      <Text style={styles.stateText}>{label}</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  page: {
    flexGrow: 1,
    paddingHorizontal: Space.md,
    paddingTop: Space.lg,
    paddingBottom: Space.xxl,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 760,
    gap: Space.md,
  },
  illustration: {
    height: 174,
    width: '100%',
    borderRadius: Radius.xl,
    backgroundColor: Colors.secondary,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sun: {
    height: 68,
    width: 68,
    borderRadius: 34,
    position: 'absolute',
    top: 22,
    right: '19%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBE6B7',
  },
  sunGlyph: {
    color: Colors.accent,
    fontSize: 30,
  },
  orbit: {
    width: 208,
    height: 208,
    borderRadius: 104,
    borderWidth: 1,
    borderColor: 'rgba(17, 46, 60, 0.13)',
    position: 'absolute',
    top: 13,
  },
  leafOne: {
    width: 34,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: 36,
    left: '24%',
    transform: [{ rotate: '-34deg' }],
  },
  leafTwo: {
    width: 28,
    height: 54,
    borderRadius: 28,
    backgroundColor: '#79A895',
    position: 'absolute',
    bottom: 39,
    right: '25%',
    transform: [{ rotate: '34deg' }],
  },
  illustrationBase: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: 76,
  },
  bookPageLeft: {
    height: 34,
    width: 48,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 7,
    backgroundColor: Colors.white,
    transform: [{ rotate: '-8deg' }],
  },
  bookPageRight: {
    height: 34,
    width: 48,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 7,
    backgroundColor: '#FFF8F5',
    transform: [{ rotate: '8deg' }],
  },
  illustrationDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    top: 52,
    left: '29%',
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headingGroup: {
    gap: Space.xs,
  },
  heading: {
    color: Colors.accent,
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  sectionHeading: {
    gap: 4,
  },
  sectionTitle: {
    color: Colors.accent,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
  },
  sectionDetail: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  surface: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Space.md,
    gap: Space.sm,
    shadowColor: Colors.accent,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  primaryButton: {
    minHeight: 54,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  message: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  infoMessage: {
    backgroundColor: Colors.paleBlue,
    borderColor: Colors.secondary,
  },
  errorMessage: {
    backgroundColor: '#FFF1EF',
    borderColor: '#EBC2BC',
  },
  successMessage: {
    backgroundColor: '#EDF7F1',
    borderColor: '#B5D9C9',
  },
  messageText: {
    color: Colors.accent,
    fontSize: 14,
    lineHeight: 21,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  stateText: {
    textAlign: 'center',
    color: Colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});
