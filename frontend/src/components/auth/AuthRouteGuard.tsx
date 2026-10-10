import { Redirect, usePathname } from 'expo-router';
import { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getAuthenticatedHome, useAuth } from '@/contexts/AuthContext';
import { PRIMARY } from './AuthUI';

export function AuthRouteGuard({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { user, token, loading, isAuthenticated } = useAuth();
  const requiredRole = pathname === '/student' || pathname.startsWith('/student/')
    ? 'student'
    : pathname === '/counsellor' || pathname.startsWith('/counsellor/')
      ? 'counsellor'
      : pathname === '/admin' || pathname.startsWith('/admin/')
        ? 'admin'
        : null;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading UniWell...</Text>
      </View>
    );
  }

  if (user && (pathname === '/' || pathname === '/auth/login')) {
    return <Redirect href={getAuthenticatedHome(user)} />;
  }

  // NOTE: the old rule that bounced signed-out users on /auth/* back to the Get Started screen was
  // removed. It caused logout to land on Get Started instead of the login form.

  if (requiredRole && (!user || !token)) {
    console.info('[ROUTER] protected route denied:', pathname, 'authenticated:', isAuthenticated);
    return <Redirect href="/auth/login" />;
  }

  if (requiredRole && user && user.role !== requiredRole) {
    console.info('[ROUTER] protected route role redirect:', pathname, 'user role:', user.role);
    return <Redirect href={getAuthenticatedHome(user)} />;
  }

  return children;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
});
