import { StyleSheet, Text, View } from 'react-native';

import { WellbeingColors as Colors, WellbeingRadius as Radius } from '@/constants/wellbeingTheme';

/**
 * A soft, abstract "hug": two warm shapes leaning in and wrapping around a heart.
 * Built from plain Views so it needs no image assets and matches the app palette.
 */
export function HugIllustration({ label = 'Two soft shapes embracing a heart, a gentle reminder that you are not alone' }: { label?: string }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.frame}>
      <View style={styles.glow} />
      <View style={styles.glowInner} />

      <View style={[styles.figureHead, styles.headLeft]} />
      <View style={[styles.figureBody, styles.bodyLeft]} />
      <View style={[styles.figureHead, styles.headRight]} />
      <View style={[styles.figureBody, styles.bodyRight]} />

      <View style={[styles.arm, styles.armLeft]} />
      <View style={[styles.arm, styles.armRight]} />

      <View style={styles.heart}>
        <Text style={styles.heartGlyph}>♥</Text>
      </View>

      <Text style={[styles.sparkle, { top: 22, left: '14%' }]}>✦</Text>
      <Text style={[styles.sparkle, { top: 36, right: '13%', fontSize: 12 }]}>✦</Text>
      <Text style={[styles.sparkle, { bottom: 20, right: '20%', fontSize: 10 }]}>✦</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 174,
    width: '100%',
    borderRadius: Radius.xl,
    backgroundColor: Colors.paleCoral,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: '#FFE1D8' },
  glowInner: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#FFD0C2' },

  figureHead: { position: 'absolute', width: 34, height: 34, borderRadius: 17, top: 34 },
  headLeft: { left: '50%', marginLeft: -62, backgroundColor: Colors.primary },
  headRight: { left: '50%', marginLeft: 28, backgroundColor: '#79A895' },

  figureBody: { position: 'absolute', width: 54, height: 78, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, bottom: -6 },
  bodyLeft: { left: '50%', marginLeft: -72, backgroundColor: Colors.primary, transform: [{ rotate: '10deg' }] },
  bodyRight: { left: '50%', marginLeft: 18, backgroundColor: '#79A895', transform: [{ rotate: '-10deg' }] },

  arm: { position: 'absolute', width: 96, height: 22, borderRadius: 11, bottom: 38 },
  armLeft: { left: '50%', marginLeft: -62, backgroundColor: '#FF9C80', transform: [{ rotate: '-8deg' }] },
  armRight: { left: '50%', marginLeft: -34, backgroundColor: '#9CC2AF', transform: [{ rotate: '8deg' }] },

  heart: {
    position: 'absolute',
    top: 64,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartGlyph: { color: Colors.primary, fontSize: 22, lineHeight: 26 },
  sparkle: { position: 'absolute', color: Colors.primary, fontSize: 16, opacity: 0.7 },
});
