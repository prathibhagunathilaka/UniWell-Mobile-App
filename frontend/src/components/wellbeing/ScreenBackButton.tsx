import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { WellbeingColors as Colors, WellbeingSpace as Space } from '@/constants/wellbeingTheme';

export function ScreenBackButton({ fallback, label = 'Back' }: { fallback: Href; label?: string }) {
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={goBack} style={styles.button}>
      <Text style={styles.arrow}>‹</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  arrow: {
    color: Colors.primary,
    fontSize: 28,
    lineHeight: 32,
  },
  label: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
});
