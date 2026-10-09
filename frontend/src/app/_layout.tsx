// Keep these imports first: they install the app-wide text scaling, dark-mode and translation wrappers
// before any screen renders.
import { FontScaleProvider } from '@/contexts/FontScaleContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AppThemeProvider, DARK_COLORS, useAppTheme } from '@/contexts/ThemeContext';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { AuthRouteGuard } from '@/components/auth/AuthRouteGuard';
import { AppTopBar } from '@/components/navigation/AppTopBar';
import { RoleBottomNav } from '@/components/navigation/RoleBottomNav';
import { AuthProvider } from '@/contexts/AuthContext';

const UniWellDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: DARK_COLORS.background,
    card: DARK_COLORS.surface,
    border: DARK_COLORS.border,
    text: DARK_COLORS.text,
  },
};

function ThemedApp() {
  const { isDark } = useAppTheme();

  return (
    <ThemeProvider value={isDark ? UniWellDarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <AuthRouteGuard>
          <View style={{ flex: 1, backgroundColor: isDark ? DARK_COLORS.background : undefined }}>
            <AppTopBar />
            <View style={{ flex: 1 }}>
              <Stack
                initialRouteName="index"
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: isDark ? DARK_COLORS.background : undefined },
                }}
              >
                <Stack.Screen name="index" />
              </Stack>
            </View>
            <RoleBottomNav />
          </View>
        </AuthRouteGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <FontScaleProvider>
      <AppThemeProvider>
        <LanguageProvider>
          <ThemedApp />
        </LanguageProvider>
      </AppThemeProvider>
    </FontScaleProvider>
  );
}
