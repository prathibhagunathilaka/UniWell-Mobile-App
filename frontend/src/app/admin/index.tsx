import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { QuickLinks } from '@/components/wellbeing/QuickLinks';
import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { getPendingCounsellors, updateCounsellorApproval } from '@/services/counsellingService';

type PendingCounsellor = {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  qualification: string;
  specialization: string;
  yearsOfExperience: number;
};

export default function AdminDashboardScreen() {
  const [counsellors, setCounsellors] = useState<PendingCounsellor[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPendingCounsellors();
      setCounsellors(response.counsellors);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load pending counsellors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const decide = async (counsellor: PendingCounsellor, status: 'active' | 'suspended') => {
    setUpdating(counsellor._id);
    setError('');
    try {
      await updateCounsellorApproval(counsellor._id, status);
      setCounsellors((current) => current.filter((item) => item._id !== counsellor._id));
      setMessage(status === 'active' ? `${counsellor.name} is approved and can now log in.` : `${counsellor.name} was declined.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this counsellor account.');
    } finally {
      setUpdating('');
    }
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <QuickLinks links={[{ label: 'Usage reports', detail: 'Volume, peak periods, completion, workload', href: '/admin/reports' }]} />
      <PageHeading title="Counsellor approvals" subtitle="Review counsellor registration details before directory access is enabled." />
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>
      <SectionHeading title="Pending applications" />
      {loading ? <LoadingState label="Loading pending applications..." /> : null}
      {!loading && !error && counsellors.length === 0 ? (
        <SurfaceCard><Text style={styles.empty}>There are no counsellor applications awaiting review.</Text></SurfaceCard>
      ) : null}
      {counsellors.map((counsellor) => (
        <SurfaceCard key={counsellor._id} style={styles.card}>
          <Text style={styles.name}>{counsellor.name}</Text>
          <Text style={styles.detail}>{counsellor.email}</Text>
          <Text style={styles.detail}>{counsellor.qualification}</Text>
          <Text style={styles.detail}>{counsellor.specialization} · {counsellor.yearsOfExperience} years of experience</Text>
          {counsellor.phoneNumber ? <Text style={styles.detail}>{counsellor.phoneNumber}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={Boolean(updating)} onPress={() => void decide(counsellor, 'active')} style={[styles.approve, updating && styles.disabled]}>
              <Text style={styles.actionLabel}>{updating === counsellor._id ? 'Saving...' : 'Approve'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={Boolean(updating)} onPress={() => void decide(counsellor, 'suspended')} style={[styles.decline, updating && styles.disabled]}>
              <Text style={styles.actionLabel}>Decline</Text>
            </Pressable>
          </View>
        </SurfaceCard>
      ))}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  card: { gap: Space.xs },
  name: { color: Colors.accent, fontSize: 17, fontWeight: '800' },
  detail: { color: Colors.muted, fontSize: 13 },
  empty: { color: Colors.muted, fontSize: 14 },
  actions: { flexDirection: 'row', gap: Space.sm, marginTop: Space.sm },
  approve: { minHeight: 44, flex: 1, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  decline: { minHeight: 44, flex: 1, borderRadius: Radius.md, backgroundColor: Colors.paleCoral, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
