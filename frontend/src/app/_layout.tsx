import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme, View } from 'react-native';

import { AuthRouteGuard } from '@/components/auth/AuthRouteGuard';
import { AppTopBar } from '@/components/navigation/AppTopBar';
import { RoleBottomNav } from '@/components/navigation/RoleBottomNav';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthRouteGuard>
          <View style={{ flex: 1 }}>
            <AppTopBar />
            <View style={{ flex: 1 }}>
              <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
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
