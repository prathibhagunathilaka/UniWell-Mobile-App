import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';

export type QuickLink = { label: string; detail: string; href: Href };

export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <View style={styles.grid}>
      {links.map((link) => (
        <Pressable
          key={link.label}
          accessibilityRole="button"
          accessibilityLabel={`${link.label}. ${link.detail}`}
          onPress={() => router.push(link.href)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <Text style={styles.label}>{link.label}</Text>
          <Text style={styles.detail}>{link.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  card: { flexGrow: 1, flexBasis: '45%', minHeight: 84, gap: 4, padding: Space.md, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  pressed: { opacity: 0.85 },
  label: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  detail: { color: Colors.muted, fontSize: 12 },
});
