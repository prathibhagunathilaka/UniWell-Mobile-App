import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UniWellLogo } from '@/components/brand/UniWellLogo';
import { PrimaryButton, WellbeingIllustration } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors } from '@/constants/wellbeingTheme';
import { useAuth } from '@/contexts/AuthContext';

// Get Started (welcome) screen — the first screen signed-out users see.
export default function GetStartedScreen() {
  const { beginAuthFlow } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <UniWellLogo size={44} showName />
        <WellbeingIllustration label="A calm moment for student wellbeing" />
        <Text style={styles.title}>Your wellbeing, supported.</Text>
        <Text style={styles.subtitle}>
          Check in, book counselling and find support that fits student life — all in one place.
        </Text>
        <PrimaryButton title="Get Started" onPress={beginAuthFlow} />
        <Link href="/auth/register" asChild>
          <Pressable accessibilityRole="link">
            <Text style={styles.link}>New here? Create an account</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: Colors.background,
  },
  content: { width: '100%', maxWidth: 520, gap: 18 },
  title: { color: Colors.accent, fontSize: 32, lineHeight: 40, fontWeight: '800' },
  subtitle: { color: Colors.muted, fontSize: 16, lineHeight: 24 },
  link: { color: Colors.accent, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 6 },
});
