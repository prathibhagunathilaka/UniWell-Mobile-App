// Admin profile: view and update the admin account's own details.
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
import { AdminProfile, getAdminProfile, updateAdminProfile } from '@/services/adminService';

export default function AdminProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fill = (p: AdminProfile) => {
    setProfile(p);
    setName(p.name);
    setPhoneNumber(p.phoneNumber || '');
  };

  useEffect(() => {
    let active = true;
    getAdminProfile()
      .then((response) => active && fill(response.admin))
      .catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : 'Unable to load your profile.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    const phone = phoneNumber.trim();
    if (name.trim().length < 2 || (phone && (!/^\+?[0-9().\-\s]{5,25}$/.test(phone) || (phone.match(/\d/g) || []).length < 5))) {
      setError('Enter a valid name and, if you add one, a valid phone number.');
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await updateAdminProfile({ name: name.trim(), phoneNumber: phone });
      fill(response.admin);
      if (user) updateUser({ ...user, name: response.admin.name });
      setEditing(false);
      setMessage('Profile updated.');
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

  const displayName = profile?.name || user?.name || 'Administrator';
  const email = profile?.email || user?.email || 'Not available';

  return (
    <AuthPage
      title="Administrator Profile"
      subtitle="Review and manage the details connected to your administrator account."
      back={{ fallback: '/admin', label: 'Back' }}
    >
      <SurfaceCard style={styles.identityCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.trim().charAt(0).toUpperCase() || 'A'}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.identityDetail}>{email}</Text>
          <Text style={styles.role}>Administrator account</Text>
        </View>
      </SurfaceCard>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Account details</Text>
        <ReadOnly label="Email" value={email} />
        {profile?.username ? <ReadOnly label="Username" value={profile.username} /> : null}
        <ReadOnly label="Role" value="Administrator" />
        <ReadOnly label="Account status" value={(profile?.status || user?.status || 'active').replace(/^./, (c) => c.toUpperCase())} />
      </View>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Profile information</Text>
        {loading ? <ActivityIndicator color={Colors.primary} /> : null}
        {!loading && editing ? (
          <>
            <AuthField label="Full name" value={name} onChangeText={setName} autoComplete="name" />
            <AuthField label="Phone number (optional)" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" autoComplete="tel" />
            <AuthButton title="Save changes" onPress={() => void save()} loading={saving} />
            <Pressable accessibilityRole="button" onPress={cancelEditing}>
              <AuthLinkText>Cancel editing</AuthLinkText>
            </Pressable>
          </>
        ) : null}
        {!loading && !editing ? (
          <>
            <ReadOnly label="Full name" value={profile?.name || displayName} />
            <ReadOnly label="Phone number" value={profile?.phoneNumber || 'Not provided'} />
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
