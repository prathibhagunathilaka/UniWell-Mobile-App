import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

// eslint-disable-next-line import/no-unresolved

import { AuthButton, AuthField, AuthLinkText, AuthMessage, AuthPage } from '@/components/auth/AuthUI';
import { useAuth } from '@/contexts/AuthContext';
import { requestRegistrationOtp, verifyRegistrationOtp } from '@/services/authService';
import { isValidEmail, isValidPassword, isValidPhoneNumber } from '@/services/authValidation';

export default function StudentRegistrationScreen() {
  const { registerStudent } = useAuth();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [faculty, setFaculty] = useState('');
  const [year, setYear] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (cooldown <= 0 && otpExpiresIn <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((remaining) => Math.max(remaining - 1, 0));
      setOtpExpiresIn((remaining) => Math.max(remaining - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown, otpExpiresIn]);

  const changeEmail = (value: string) => {
    setEmail(value);
    setOtp('');
    setOtpSent(false);
    setVerificationToken('');
    setCooldown(0);
    setOtpExpiresIn(0);
    setMessage('');
  };

  const sendOtp = async () => {
    setError('');
    setMessage('');
    if (!isValidEmail(email)) {
      setError('Enter a valid university email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await requestRegistrationOtp(email.trim());
      setOtpSent(true);
      setOtp('');
      setCooldown(response.resendAfterSeconds);
      setOtpExpiresIn(response.expiresInSeconds);
      setMessage(response.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    setMessage('');
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit OTP sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyRegistrationOtp(email.trim(), otp.trim());
      setVerificationToken(response.verificationToken);
      setMessage('Email verified successfully. You can now create your account.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError('');
    if (!name.trim() || !studentId.trim() || !email.trim() || !phoneNumber.trim() || !faculty.trim() || !year || !password || !confirmPassword) {
      setError('Complete all required fields.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid university email address.');
      return;
    }
    if (!verificationToken) {
      setError('Verify your email address before creating your account.');
      return;
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      setError('Enter a valid phone number with at least five digits.');
      return;
    }
    if (!isValidPassword(password)) {
      setError('Use at least 8 characters with uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    const studyYear = Number(year);
    if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 12) {
      setError('Enter a valid study year.');
      return;
    }

    setLoading(true);
    try {
      await registerStudent({
        name: name.trim(),
        studentId: studentId.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        faculty: faculty.trim(),
        year: studyYear,
        password,
      }, verificationToken);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage title="Student Registration" subtitle="Create your UniWell student account. Your role is assigned automatically.">
      <AuthField label="Full name" value={name} onChangeText={setName} autoComplete="name" />
      <AuthField label="Student ID" value={studentId} onChangeText={setStudentId} autoCapitalize="characters" />
      <AuthField label="University email" value={email} onChangeText={changeEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <AuthButton
        title={otpSent ? 'Resend verification code' : 'Send verification code'}
        onPress={() => void sendOtp()}
        loading={loading}
        disabled={Boolean(verificationToken) || cooldown > 0}
      />
      {otpSent && !verificationToken ? (
        <>
          <AuthField label="6-digit verification code" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
          <AuthButton title="Verify email" onPress={() => void verifyOtp()} loading={loading} />
          <AuthMessage>
            {otpExpiresIn > 0 ? `Code expires in ${otpExpiresIn}s. ` : 'This code has expired. '}
            {cooldown > 0 ? `Request another in ${cooldown}s.` : 'You can request another code now.'}
          </AuthMessage>
        </>
      ) : null}
      <AuthField label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" autoComplete="tel" />
      <AuthField label="Faculty / School" value={faculty} onChangeText={setFaculty} />
      <AuthField label="Year of study" value={year} onChangeText={setYear} keyboardType="number-pad" />
      <AuthField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete="new-password" />
      <AuthField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoComplete="new-password" />
      <Pressable accessibilityRole="button" onPress={() => setShowPassword((visible) => !visible)}>
        <AuthLinkText>{showPassword ? 'Hide passwords' : 'Show passwords'}</AuthLinkText>
      </Pressable>
      <AuthMessage error>{error}</AuthMessage>
      <AuthMessage>{message}</AuthMessage>
      <AuthButton title="Create Student Account" onPress={() => void submit()} loading={loading} disabled={!verificationToken} />
      <Link href="/auth/login" asChild>
        <Pressable><AuthLinkText>Already registered? Sign in</AuthLinkText></Pressable>
      </Link>
    </AuthPage>
  );
}
