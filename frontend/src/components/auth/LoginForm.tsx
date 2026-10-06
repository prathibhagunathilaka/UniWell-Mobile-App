import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthField, AuthLinkText, AuthMessage, AuthPage } from './AuthUI';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/services/authService';
import { WellbeingColors } from '@/constants/wellbeingTheme';

export function LoginForm({ requiredRole }: { requiredRole?: UserRole }) {
  const { login, sessionNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password, requiredRole);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage
      title={requiredRole === 'admin' ? 'Admin Login' : 'Welcome back'}
      subtitle={requiredRole === 'admin' ? 'Sign in with your authorized administrator account.' : 'Sign in to continue to UniWell.'}
    >
      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoComplete="password"
        textContentType="password"
      />
      <Pressable accessibilityRole="button" onPress={() => setShowPassword((visible) => !visible)}>
        <Text style={styles.showPassword}>{showPassword ? 'Hide password' : 'Show password'}</Text>
      </Pressable>
      <AuthMessage error>{error}</AuthMessage>
      <AuthMessage>{sessionNotice}</AuthMessage>
      <AuthButton title="Sign In" onPress={() => void submit()} loading={loading} />

      {!requiredRole ? (
        <>
          <Link href="/auth/forgot-password" asChild>
            <Pressable><AuthLinkText>Forgot password?</AuthLinkText></Pressable>
          </Link>
          <Link href={'/auth/register' as any} asChild>
            <Pressable><AuthLinkText>New to UniWell? Choose your role</AuthLinkText></Pressable>
          </Link>
          <Link href="/auth/admin-login" asChild>
            <Pressable><AuthLinkText>Administrator sign in</AuthLinkText></Pressable>
          </Link>
        </>
      ) : (
        <Link href="/auth/login" asChild>
          <Pressable><AuthLinkText>Back to sign in</AuthLinkText></Pressable>
        </Link>
      )}
      <View style={styles.privacyNote}>
        <Text style={styles.privacyText}>Never share your password or verification codes with anyone.</Text>
      </View>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  showPassword: {
    color: WellbeingColors.primary,
    fontWeight: '700',
    paddingVertical: 4,
  },
  privacyNote: {
    borderLeftWidth: 3,
    borderLeftColor: WellbeingColors.primary,
    paddingLeft: 12,
    marginTop: 3,
  },
  privacyText: {
    color: WellbeingColors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
