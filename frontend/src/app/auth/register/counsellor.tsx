import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { AuthButton, AuthField, AuthLinkText, AuthMessage, AuthPage } from '@/components/auth/AuthUI';
import { useAuth } from '@/contexts/AuthContext';
import { requestRegistrationOtp, verifyRegistrationOtp } from '@/services/authService';
import { isValidEmail, isValidPassword, isValidPhoneNumber } from '@/services/authValidation';

export default function CounsellorRegistrationScreen() {
  const { registerCounsellor } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
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
  const [success, setSuccess] = useState('');

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
    setSuccess('');
  };

  const sendOtp = async () => {
    setError('');
    setSuccess('');
    if (!isValidEmail(email)) {
      setError('Enter a valid professional email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await requestRegistrationOtp(email.trim());
      setOtpSent(true);
      setOtp('');
      setCooldown(response.resendAfterSeconds);
      setOtpExpiresIn(response.expiresInSeconds);
      setSuccess(response.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    setSuccess('');
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit OTP sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyRegistrationOtp(email.trim(), otp.trim());
      setVerificationToken(response.verificationToken);
      setSuccess('Email verified successfully. You can now submit your registration.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError('');
    setSuccess('');
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !qualification.trim() || !specialization.trim() || !experience || !password || !confirmPassword) {
      setError('Complete all required fields.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid professional email address.');
      return;
    }
    if (!verificationToken) {
      setError('Verify your email address before submitting your registration.');
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
    const yearsOfExperience = Number(experience);
    if (!Number.isInteger(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 80) {
      setError('Enter a valid number of years of experience.');
      return;
    }

    setLoading(true);
    try {
      const message = await registerCounsellor({
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        qualification: qualification.trim(),
        specialization: specialization.trim(),
        yearsOfExperience,
        password,
      }, verificationToken);
      setSuccess(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage title="Counsellor Registration" subtitle="Submit your details for university review. Access remains pending until approval.">
      <AuthField label="Full name" value={name} onChangeText={setName} autoComplete="name" />
      <AuthField label="Professional email" value={email} onChangeText={changeEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
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
      <AuthField label="Qualification" value={qualification} onChangeText={setQualification} />
      <AuthField label="Specialization" value={specialization} onChangeText={setSpecialization} />
      <AuthField label="Years of experience" value={experience} onChangeText={setExperience} keyboardType="number-pad" />
      <AuthField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete="new-password" />
      <AuthField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoComplete="new-password" />
      <Pressable accessibilityRole="button" onPress={() => setShowPassword((visible) => !visible)}>
        <AuthLinkText>{showPassword ? 'Hide passwords' : 'Show passwords'}</AuthLinkText>
      </Pressable>
      <AuthMessage error>{error}</AuthMessage>
      <AuthMessage>{success}</AuthMessage>
      <AuthButton title="Submit for Approval" onPress={() => void submit()} loading={loading} disabled={!verificationToken} />
      <Link href="/auth/login" asChild>
        <Pressable><AuthLinkText>Back to sign in</AuthLinkText></Pressable>
      </Link>
    </AuthPage>
  );
}
