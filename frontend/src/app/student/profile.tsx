import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
  deleteStudentAccount,
  requestProfileOtp,
  StudentProfileUpdate,
  updateStudentProfile,
  verifyProfileOtp,
} from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import {
  AuthButton,
  AuthField,
  AuthMessage,
  AuthPage,
  AuthLinkText,
} from '@/components/auth/AuthUI';
import { SurfaceCard } from '@/components/wellbeing/WellbeingUI';

type ProfileAction = 'update' | 'delete';

export default function StudentProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [faculty, setFaculty] = useState(user?.faculty || '');
  const [year, setYear] = useState(user?.year ? String(user.year) : '');
  const [editing, setEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<ProfileAction | null>(null);
  const [otp, setOtp] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const requestVerification = async (action: ProfileAction) => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await requestProfileOtp(action);
      setPendingAction(action);
      setOtp('');
      setShowDeleteConfirmation(false);
      setMessage(response.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to request a verification code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndApply = async () => {
    if (!pendingAction || !/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code sent to your registered email.');
      return;
    }
    if (
      pendingAction === 'update' &&
      (name.trim().length < 2 ||
        !/^\+?[0-9().\-\s]{5,25}$/.test(phoneNumber.trim()) ||
        (phoneNumber.match(/\d/g) || []).length < 5 ||
        !faculty.trim() ||
        !Number.isInteger(Number(year)) ||
        Number(year) < 1 ||
        Number(year) > 12)
    ) {
      setError('Check your name, phone number, faculty, and year before verifying this update.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);
    try {
      const verification = await verifyProfileOtp(pendingAction, otp.trim());
      if (pendingAction === 'delete') {
        await deleteStudentAccount(verification.verificationToken);
        await logout();
        return;
      }

      const changes: StudentProfileUpdate = {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        faculty: faculty.trim(),
        year: Number(year),
      };
      const response = await updateStudentProfile(verification.verificationToken, changes);
      updateUser(response.user);
      setEditing(false);
      setPendingAction(null);
      setOtp('');
      setMessage(response.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify and save this change.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage title="Student Profile" subtitle="Review and manage the profile information connected to your account.">
      <Link href="/student/dashboard" asChild>
        <Pressable accessibilityRole="button"><AuthLinkText>‹ Back to wellbeing home</AuthLinkText></Pressable>
      </Link>

      <SurfaceCard style={styles.identityCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.trim().charAt(0).toUpperCase() || 'U'}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{user?.name || 'Student'}</Text>
          <Text style={styles.identityDetail}>{user?.email}</Text>
          <Text style={styles.role}>Student account</Text>
        </View>
      </SurfaceCard>

      <View style={styles.readOnlyGroup}>
        <Text style={styles.sectionTitle}>Account details</Text>
        <ReadOnly label="University email" value={user?.email || 'Not available'} />
        <ReadOnly label="Student ID" value={user?.studentId || 'Not available'} />
        <ReadOnly label="Role" value="Student" />
      </View>

      <View style={styles.editGroup}>
        <Text style={styles.sectionTitle}>Profile information</Text>
        {editing ? (
          <>
            <AuthField label="Full name" value={name} onChangeText={setName} autoComplete="name" />
            <AuthField label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" autoComplete="tel" />
            <AuthField label="Faculty / School" value={faculty} onChangeText={setFaculty} />
            <AuthField label="Year of study" value={year} onChangeText={setYear} keyboardType="number-pad" />
            <AuthButton title="Send verification code" onPress={() => void requestVerification('update')} loading={loading} />
            <Pressable accessibilityRole="button" onPress={() => { setEditing(false); setPendingAction(null); setError(''); setMessage(''); }}>
              <AuthLinkText>Cancel editing</AuthLinkText>
            </Pressable>
          </>
        ) : (
          <>
            <ReadOnly label="Phone number" value={user?.phoneNumber || 'Not provided'} />
            <ReadOnly label="Faculty / School" value={user?.faculty || 'Not provided'} />
            <ReadOnly label="Year of study" value={user?.year ? String(user.year) : 'Not provided'} />
            <AuthButton title="Edit profile" onPress={() => { setEditing(true); setError(''); setMessage(''); }} />
          </>
        )}
      </View>

      {pendingAction ? (
        <SurfaceCard style={styles.verificationCard}>
          <Text style={styles.sectionTitle}>Verify this {pendingAction === 'delete' ? 'account deletion' : 'profile update'}</Text>
          <Text style={styles.helpText}>Enter the 6-digit code sent to your registered email. It expires after five minutes.</Text>
          <AuthField
            label="6-digit verification code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <AuthButton title={pendingAction === 'delete' ? 'Verify and delete account' : 'Verify and save profile'} onPress={() => void verifyAndApply()} loading={loading} />
          <Pressable accessibilityRole="button" onPress={() => void requestVerification(pendingAction)} disabled={loading}>
            <AuthLinkText>Request another code</AuthLinkText>
          </Pressable>
        </SurfaceCard>
      ) : null}

      <AuthMessage error>{error}</AuthMessage>
      <AuthMessage>{message}</AuthMessage>

      <View style={styles.deleteArea}>
        <Text style={styles.deleteTitle}>Delete Account</Text>
        <Text style={styles.helpText}>Account deletion permanently removes your account and its saved check-in history.</Text>
        {!showDeleteConfirmation ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => { setShowDeleteConfirmation(true); setError(''); setMessage(''); }}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </Pressable>
        ) : (
          <SurfaceCard style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete your account?</Text>
            <Text style={styles.helpText}>This action cannot be undone. Your account and check-in history will be permanently deleted after email verification.</Text>
            <AuthButton title="Send deletion verification code" onPress={() => void requestVerification('delete')} loading={loading} />
            <Pressable accessibilityRole="button" onPress={() => setShowDeleteConfirmation(false)}>
              <AuthLinkText>Cancel</AuthLinkText>
            </Pressable>
          </SurfaceCard>
        )}
      </View>
    </AuthPage>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readOnly}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <Text style={styles.readOnlyValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Colors.paleBlue,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  avatarText: {
    color: Colors.accent,
    fontSize: 24,
    fontWeight: '900',
  },
  identityCopy: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: Colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  identityDetail: {
    color: Colors.muted,
    fontSize: 13,
  },
  role: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  readOnlyGroup: {
    gap: Space.sm,
  },
  editGroup: {
    gap: Space.sm,
  },
  sectionTitle: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  readOnly: {
    gap: 4,
    paddingVertical: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  readOnlyLabel: {
    color: Colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  readOnlyValue: {
    color: Colors.accent,
    fontSize: 15,
  },
  verificationCard: {
    gap: Space.sm,
    backgroundColor: Colors.paleBlue,
  },
  helpText: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  deleteArea: {
    gap: Space.sm,
    marginTop: Space.md,
    paddingTop: Space.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deleteTitle: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '800',
  },
  deleteButton: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  deleteButtonText: {
    color: Colors.error,
    fontWeight: '800',
  },
  confirmCard: {
    gap: Space.sm,
    backgroundColor: Colors.paleCoral,
    borderColor: Colors.error,
  },
  confirmTitle: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '900',
  },
});
