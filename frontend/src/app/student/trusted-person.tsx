import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthField, AuthMessage } from '@/components/auth/AuthUI';
import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import { PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
  addTrustedPerson,
  deleteTrustedPerson,
  getTrustedPeople,
  TrustedPerson,
  updateTrustedPerson,
} from '@/services/counsellingService';

const MAX_PEOPLE = 5;

export default function TrustedPersonScreen() {
  const [people, setPeople] = useState<TrustedPerson[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null); // null = adding new
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhoneNumber('');
    setRelationship('');
  };

  const load = useCallback(async () => {
    try {
      const response = await getTrustedPeople();
      setPeople(response.trustedPeople);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your trusted people.');
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
      const person: TrustedPerson = {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        relationship: relationship.trim(),
      };
      const response = editingId
        ? await updateTrustedPerson(editingId, person)
        : await addTrustedPerson(person);
      setPeople(response.trustedPeople);
      setMessage(editingId ? 'Trusted person updated.' : 'Trusted person saved to your account.');
      resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your trusted person.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await deleteTrustedPerson(id);
      setPeople(response.trustedPeople);
      if (editingId === id) resetForm();
      setMessage('Trusted person removed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove your trusted person.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (person: TrustedPerson) => {
    setEditingId(person._id || null);
    setName(person.name);
    setPhoneNumber(person.phoneNumber);
    setRelationship(person.relationship);
    setMessage('');
    setError('');
  };

  const call = async (phone: string) => {
    try {
      await Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
    } catch {
      setError('Unable to open the phone app on this device.');
    }
  };

  const limitReached = people.length >= MAX_PEOPLE && !editingId;

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <ScreenBackButton fallback="/student/emergency" label="Support & Safety" />
      <PageHeading
        title="Trusted people"
        subtitle={`Save up to ${MAX_PEOPLE} people you feel safe contacting. This information is private to your account.`}
      />
      {loading ? null : (
        <>
          {people.map((person) => (
            <SurfaceCard key={person._id} style={styles.card}>
              <Text style={styles.personName}>{person.name}</Text>
              <Text style={styles.personMeta}>{person.relationship} · {person.phoneNumber}</Text>
              <View style={styles.row}>
                <Pressable accessibilityRole="button" onPress={() => void call(person.phoneNumber)} style={[styles.callButton, styles.flex]}>
                  <Text style={styles.callLabel}>Call</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => edit(person)} style={[styles.callButton, styles.flex]}>
                  <Text style={styles.callLabel}>Edit</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={saving} onPress={() => person._id && void remove(person._id)} style={[styles.callButton, styles.flex]}>
                  <Text style={styles.removeLabel}>Remove</Text>
                </Pressable>
              </View>
            </SurfaceCard>
          ))}

          <SurfaceCard style={styles.card}>
            <Text style={styles.personName}>{editingId ? 'Edit trusted person' : 'Add a trusted person'}</Text>
            {limitReached ? (
              <Text style={styles.personMeta}>
                You have reached the limit of {MAX_PEOPLE}. Remove someone to add a new person.
              </Text>
            ) : (
              <>
                <AuthField label="Name" value={name} onChangeText={setName} autoComplete="name" />
                <AuthField label="Relationship" value={relationship} onChangeText={setRelationship} />
                <AuthField label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" autoComplete="tel" />
                <AuthButton title={editingId ? 'Update trusted person' : 'Save trusted person'} onPress={() => void save()} loading={saving} />
                {editingId ? (
                  <Pressable accessibilityRole="button" onPress={resetForm}>
                    <Text style={styles.cancel}>Cancel editing</Text>
                  </Pressable>
                ) : null}
              </>
            )}
            <AuthMessage error>{error}</AuthMessage>
            <AuthMessage>{message}</AuthMessage>
          </SurfaceCard>
        </>
      )}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  card: { gap: Space.sm },
  row: { flexDirection: 'row', gap: Space.sm },
  flex: { flex: 1 },
  personName: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  personMeta: { color: Colors.accent, fontSize: 14 },
  callButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: Colors.paleBlue },
  callLabel: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  removeLabel: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  cancel: { color: Colors.primary, fontSize: 14, fontWeight: '800', paddingVertical: Space.sm, textAlign: 'center' },
});
