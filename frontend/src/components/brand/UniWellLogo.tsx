import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { WellbeingColors as Colors } from '@/constants/wellbeingTheme';

// NEW: UniWell mark — a coral rounded tile holding a heart (wellbeing) with a small
// leaf sprouting from it (growth). Pure views + vector icon, so no image assets needed.
export function UniWellLogo({ size = 40, showName = false }: { size?: number; showName?: boolean }) {
  const radius = size * 0.32;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="UniWell" style={styles.row}>
      <View style={[styles.tile, { width: size, height: size, borderRadius: radius }]}>
        <View style={[styles.ring, { borderRadius: radius - 3 }]} />
        <Ionicons name="heart" size={size * 0.52} color={Colors.white} />
        <View style={[styles.leaf, { width: size * 0.26, height: size * 0.15, top: size * 0.1, right: size * 0.12, borderRadius: size * 0.15 }]} />
      </View>
      {showName ? <Text style={styles.name}>UniWell</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tile: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, overflow: 'hidden' },
  ring: { position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  leaf: { position: 'absolute', backgroundColor: Colors.accent, transform: [{ rotate: '-35deg' }] },
  name: { color: Colors.accent, fontSize: 17, fontWeight: '800' },
});
