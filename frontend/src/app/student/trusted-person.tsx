import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { AuthButton, AuthField, AuthMessage } from '@/components/auth/AuthUI';
import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { deleteTrustedPerson, getTrustedPerson, saveTrustedPerson, TrustedPerson } from '@/services/counsellingService';

export default function TrustedPersonScreen() {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await getTrustedPerson();
      setName(response.trustedPerson?.name || '');
      setPhoneNumber(response.trustedPerson?.phoneNumber || '');
      setRelationship(response.trustedPerson?.relationship || '');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your trusted person.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const person: TrustedPerson = { name: name.trim(), phoneNumber: phoneNumber.trim(), relationship: relationship.trim() };
      await saveTrustedPerson(person);
      setMessage('Your trusted person was saved securely to your account.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your trusted person.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await deleteTrustedPerson();
      setName('');
      setPhoneNumber('');
      setRelationship('');
      setMessage('Your trusted person was removed from your account.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove your trusted person.');
    } finally {
      setSaving(false);
    }
  };

  const callTrustedPerson = async () => {
    try {
      await Linking.openURL(`tel:${phoneNumber.replace(/[^\d+]/g, '')}`);
    } catch {
      setError('Unable to open the phone app on this device.');
    }
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/emergency" label="Support & Safety" />
      <PageHeading title="Trusted person" subtitle="Save someone you feel safe contacting. This information is private to your account." />
      {loading ? null : (
        <SurfaceCard style={styles.card}>
          <AuthField label="Name" value={name} onChangeText={setName} autoComplete="name" />
          <AuthField label="Relationship" value={relationship} onChangeText={setRelationship} />
          <AuthField label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" autoComplete="tel" />
          {phoneNumber.trim() ? (
            <Pressable accessibilityRole="button" onPress={() => void callTrustedPerson()} style={styles.callButton}>
              <Text style={styles.callLabel}>Call trusted person</Text>
            </Pressable>
          ) : null}
          <AuthMessage error>{error}</AuthMessage>
          <AuthMessage>{message}</AuthMessage>
          <AuthButton title="Save trusted person" onPress={() => void save()} loading={saving} />
          {name || phoneNumber || relationship ? (
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => void remove()}>
              <Text style={styles.remove}>Remove trusted person</Text>
            </Pressable>
          ) : null}
        </SurfaceCard>
      )}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  card: { gap: Space.sm },
  callButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: Colors.paleBlue },
  callLabel: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  remove: { color: Colors.primary, fontSize: 14, fontWeight: '800', paddingVertical: Space.sm, textAlign: 'center' },
});
