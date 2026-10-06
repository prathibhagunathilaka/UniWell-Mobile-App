import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthButton, AuthField, AuthLinkText, AuthMessage, AuthPage } from '@/components/auth/AuthUI';
import {
  requestPasswordReset,
  resetPassword as resetPasswordRequest,
  verifyPasswordResetOtp,
} from '@/services/authService';
import { isValidEmail, isValidPassword } from '@/services/authValidation';

type RecoveryStep = 'email' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submitEmail = async () => {
    setError('');
    setMessage('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await requestPasswordReset(email.trim());
      setMessage(response.message);
      setStep('otp');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to request a reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    setError('');
    setMessage('');
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyPasswordResetOtp(email.trim(), otp.trim());
      setResetToken(response.resetToken);
      setStep('password');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify that code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async () => {
    setError('');
    if (!isValidPassword(password)) {
      setError('Use at least 8 characters with uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await resetPasswordRequest(resetToken, password);
      setMessage(response.message);
      setResetToken('');
      setStep('email');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update your password. Request a new code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const title = step === 'email' ? 'Reset your password' : step === 'otp' ? 'Verify your code' : 'Choose a new password';
  const subtitle = step === 'email'
    ? 'Enter the email linked to your account. If an account exists, we will email a verification code.'
    : step === 'otp'
      ? `Enter the six-digit verification code sent to ${email}. It expires in five minutes.`
      : 'Choose a new password for your UniWell account.';

  return (
    <AuthPage title={title} subtitle={subtitle}>
      {step === 'email' ? (
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
      ) : null}

      {step === 'otp' ? (
        <AuthField
          label="6-digit verification code"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
        />
      ) : null}

      {step === 'password' ? (
        <View style={{ gap: 16 }}>
          <AuthField label="New password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete="new-password" />
          <AuthField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoComplete="new-password" />
          <Pressable accessibilityRole="button" onPress={() => setShowPassword((visible) => !visible)}>
            <AuthLinkText>{showPassword ? 'Hide passwords' : 'Show passwords'}</AuthLinkText>
          </Pressable>
        </View>
      ) : null}

      <AuthMessage error>{error}</AuthMessage>
      <AuthMessage>{message}</AuthMessage>
      {step === 'email' ? <AuthButton title="Send verification code" onPress={() => void submitEmail()} loading={loading} /> : null}
      {step === 'otp' ? <AuthButton title="Verify code" onPress={() => void submitOtp()} loading={loading} /> : null}
      {step === 'password' ? <AuthButton title="Update password" onPress={() => void submitPassword()} loading={loading} /> : null}
      <Link href="/auth/login" asChild>
        <Pressable><AuthLinkText>Back to sign in</AuthLinkText></Pressable>
      </Link>
    </AuthPage>
  );
}
