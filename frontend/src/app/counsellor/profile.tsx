// Counsellor profile: view and update the counsellor's own details shown to students.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
    AuthButton,
    AuthField,
    AuthLinkText,
    AuthMessage,
    AuthPage,
} from '@/components/auth/AuthUI';
import { SurfaceCard } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { useAuth } from '@/contexts/AuthContext';
import { CounsellorProfile, getCounsellorProfile, updateCounsellorProfile } from '@/services/counsellingService';

type Profile = CounsellorProfile & { email?: string; status?: string };

export default function CounsellorProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [years, setYears] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fill = (p: Profile) => {
    setProfile(p);
    setName(p.name);
    setPhoneNumber(p.phoneNumber || '');
    setQualification(p.qualification || '');
    setSpecialization(p.specialization || '');
    setYears(String(p.yearsOfExperience ?? 0));
  };

  useEffect(() => {
    let active = true;
    getCounsellorProfile()
      .then((response) => active && fill(response.counsellor as Profile))
      .catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : 'Unable to load your profile.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    const yearsNumber = Number(years);
    if (
      name.trim().length < 2 ||
      !/^\+?[0-9().\-\s]{5,25}$/.test(phoneNumber.trim()) ||
      !qualification.trim() ||
      !specialization.trim() ||
      !Number.isInteger(yearsNumber) ||
      yearsNumber < 0 ||
      yearsNumber > 80
    ) {
      setError('Check your name, phone number, qualification, specialization, and years of experience.');
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await updateCounsellorProfile({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        qualification: qualification.trim(),
        specialization: specialization.trim(),
        yearsOfExperience: yearsNumber,
      });
      fill({ ...profile, ...(response.counsellor as Profile) });
      if (user) updateUser({ ...user, name: response.counsellor.name });
      setEditing(false);
      setMessage('Profile updated. Students see the new details in the counsellor directory.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    if (profile) fill(profile);
    setEditing(false);
    setError('');
    setMessage('');
  };

  const displayName = profile?.name || user?.name || 'Counsellor';
  const email = profile?.email || user?.email || 'Not available';

  return (
    <AuthPage
      title="Counsellor Profile"
      subtitle="Review and manage the professional details students see in the counsellor directory."
      back={{ fallback: '/counsellor', label: 'Back' }}
    >
      <SurfaceCard style={styles.identityCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.trim().charAt(0).toUpperCase() || 'C'}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.identityDetail}>{email}</Text>
          <Text style={styles.role}>Counsellor account</Text>
        </View>
      </SurfaceCard>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Account details</Text>
        <ReadOnly label="Email" value={email} />
        <ReadOnly label="Role" value="Counsellor" />
        <ReadOnly label="Account status" value={(profile?.status || user?.status || 'active').replace(/^./, (c) => c.toUpperCase())} />
      </View>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Professional information</Text>
        {loading ? <ActivityIndicator color={Colors.primary} /> : null}
        {!loading && editing ? (
          <>
            <AuthField label="Full name" value={name} onChangeText={setName} autoComplete="name" />
            <AuthField label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" autoComplete="tel" />
            <AuthField label="Qualification" value={qualification} onChangeText={setQualification} />
            <AuthField label="Specialization" value={specialization} onChangeText={setSpecialization} />
            <AuthField label="Years of experience" value={years} onChangeText={setYears} keyboardType="number-pad" />
            <AuthButton title="Save changes" onPress={() => void save()} loading={saving} />
            <Pressable accessibilityRole="button" onPress={cancelEditing}>
              <AuthLinkText>Cancel editing</AuthLinkText>
            </Pressable>
          </>
        ) : null}
        {!loading && !editing ? (
          <>
            <ReadOnly label="Phone number" value={profile?.phoneNumber || 'Not provided'} />
            <ReadOnly label="Qualification" value={profile?.qualification || 'Not provided'} />
            <ReadOnly label="Specialization" value={profile?.specialization || 'Not provided'} />
            <ReadOnly label="Years of experience" value={profile ? String(profile.yearsOfExperience ?? 0) : 'Not provided'} />
            <AuthButton title="Edit profile" disabled={!profile} onPress={() => { setEditing(true); setError(''); setMessage(''); }} />
          </>
        ) : null}
      </View>

      <AuthMessage error>{error}</AuthMessage>
      <AuthMessage>{message}</AuthMessage>

      <View style={styles.signOutArea}>
        <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Log out</Text>
        </Pressable>
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
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: Space.md, backgroundColor: Colors.paleBlue },
  avatar: { width: 56, height: 56, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  avatarText: { color: Colors.accent, fontSize: 24, fontWeight: '900' },
  identityCopy: { flex: 1, gap: 3 },
  name: { color: Colors.accent, fontSize: 18, fontWeight: '800' },
  identityDetail: { color: Colors.muted, fontSize: 13 },
  role: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  group: { gap: Space.sm },
  sectionTitle: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  readOnly: { gap: 4, paddingVertical: Space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  readOnlyLabel: { color: Colors.muted, fontSize: 12, fontWeight: '700' },
  readOnlyValue: { color: Colors.accent, fontSize: 15 },
  signOutArea: { marginTop: Space.md, paddingTop: Space.md, borderTopWidth: 1, borderTopColor: Colors.border },
  signOutButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: Colors.error, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  signOutText: { color: Colors.error, fontWeight: '800' },
});
