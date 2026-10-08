import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { InlineMessage, LoadingState, PageHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { getManagedCounsellors, ManagedCounsellor, removeCounsellor, setCounsellorStatus } from '@/services/adminService';

type Filter = 'all' | ManagedCounsellor['status'];

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
];

const STATUS_STYLE: Record<ManagedCounsellor['status'], { label: string; bg: string; fg: string }> = {
  pending: { label: 'Awaiting approval', bg: Colors.paleCoral, fg: Colors.primary },
  active: { label: 'Active', bg: Colors.paleBlue, fg: Colors.success },
  suspended: { label: 'Suspended / declined', bg: Colors.border, fg: Colors.muted },
};

const ORDER: Record<ManagedCounsellor['status'], number> = { pending: 0, active: 1, suspended: 2 };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const confirmAction = (title: string, message: string, confirmLabel: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Keep as is', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

// Manage every counsellor account in one place: approve or decline applications,
// suspend or reactivate, and remove accounts.
export default function AdminCounsellorsScreen() {
  const [counsellors, setCounsellors] = useState<ManagedCounsellor[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await getManagedCounsellors();
      setCounsellors(response.counsellors);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load counsellors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const counts = useMemo(() => ({
    all: counsellors.length,
    pending: counsellors.filter((c) => c.status === 'pending').length,
    active: counsellors.filter((c) => c.status === 'active').length,
    suspended: counsellors.filter((c) => c.status === 'suspended').length,
  }), [counsellors]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return counsellors
      .filter((c) => (filter === 'all' || c.status === filter)
        && (!needle || `${c.name} ${c.email} ${c.specialization || ''}`.toLowerCase().includes(needle)))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name));
  }, [counsellors, filter, search]);

  const run = async (c: ManagedCounsellor, action: () => Promise<string>) => {
    setBusyId(c._id);
    setError('');
    setMessage('');
    try {
      setMessage(await action());
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusyId('');
    }
  };

  const approve = (c: ManagedCounsellor) =>
    run(c, async () => {
      await setCounsellorStatus(c._id, 'active');
      return `${c.name} is approved and can now log in.`;
    });

  const reactivate = (c: ManagedCounsellor) =>
    run(c, async () => {
      await setCounsellorStatus(c._id, 'active');
      return `${c.name} is active again and can log in. They will need to publish availability again.`;
    });

  const decline = (c: ManagedCounsellor) =>
    confirmAction(`Decline ${c.name}?`, 'They will not be able to log in. You can reactivate the account later.', 'Decline', () =>
      void run(c, async () => {
        await setCounsellorStatus(c._id, 'suspended');
        return `${c.name} was declined.`;
      }));

  const suspend = (c: ManagedCounsellor) =>
    confirmAction(
      `Suspend ${c.name}?`,
      `They will be logged out and blocked from signing in. ${plural(c.stats.upcomingBookings, 'upcoming booking')} will be cancelled and those students notified, and their open slots will be removed.`,
      'Suspend',
      () => void run(c, async () => {
        const result = await setCounsellorStatus(c._id, 'suspended');
        return `${c.name} was suspended. ${plural(result.releasedBookings, 'booking')} cancelled and students notified.`;
      }),
    );

  const remove = (c: ManagedCounsellor) =>
    confirmAction(
      `Remove ${c.name} permanently?`,
      `This deletes the account and cannot be undone. ${plural(c.stats.upcomingBookings, 'upcoming booking')} will be cancelled and those students notified. Past sessions and published resources are kept.`,
      'Remove permanently',
      () => void run(c, async () => {
        const result = await removeCounsellor(c._id);
        return `${c.name} was removed. ${plural(result.releasedBookings, 'booking')} cancelled and students notified.`;
      }),
    );

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <PageHeading title="Counsellors" subtitle="Approve applications and manage every counsellor account." />
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} accessibilityRole="radio" accessibilityState={{ checked: filter === f.key }} onPress={() => setFilter(f.key)} style={[styles.chip, filter === f.key && styles.chipOn]}>
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label} ({counts[f.key]})</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search by name, email or specialization" placeholderTextColor={Colors.muted} autoCapitalize="none" accessibilityLabel="Search counsellors" style={styles.search} />

      {loading ? <LoadingState label="Loading counsellors..." /> : null}
      {!loading && shown.length === 0 ? (
        <SurfaceCard><Text style={styles.muted}>{counsellors.length === 0 ? 'No counsellor accounts yet.' : 'No counsellors match this filter.'}</Text></SurfaceCard>
      ) : null}

      {shown.map((c) => {
        const st = STATUS_STYLE[c.status];
        const busy = busyId === c._id;
        return (
          <SurfaceCard key={c._id} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.name}>{c.name}</Text>
              <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text></View>
            </View>
            <Text style={styles.detail}>{c.email}</Text>
            {c.qualification ? <Text style={styles.detail}>{c.qualification}</Text> : null}
            {c.specialization ? <Text style={styles.detail}>{c.specialization}{c.yearsOfExperience !== undefined ? ` · ${plural(c.yearsOfExperience, 'year')} of experience` : ''}</Text> : null}
            {c.phoneNumber ? <Text style={styles.detail}>{c.phoneNumber}</Text> : null}
            <Text style={styles.detail}>Applied {new Date(c.createdAt).toLocaleDateString()}</Text>
            {c.status === 'active' ? (
              <Text style={styles.stats}>{plural(c.stats.upcomingBookings, 'upcoming booking')} ({c.stats.pendingBookings} unconfirmed) · {plural(c.stats.openSlots, 'open slot')}</Text>
            ) : null}

            <View style={styles.actions}>
              {c.status === 'pending' ? (
                <>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => void approve(c)} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? 'Saving...' : 'Approve'}</Text></Pressable>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => decline(c)} style={[styles.secondary, busy && styles.disabled]}><Text style={styles.secondaryText}>Decline</Text></Pressable>
                </>
              ) : null}
              {c.status === 'active' ? (
                <>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => suspend(c)} style={[styles.secondary, busy && styles.disabled]}><Text style={styles.secondaryText}>{busy ? 'Saving...' : 'Suspend'}</Text></Pressable>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => remove(c)} style={[styles.danger, busy && styles.disabled]}><Text style={styles.dangerText}>Remove</Text></Pressable>
                </>
              ) : null}
              {c.status === 'suspended' ? (
                <>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => void reactivate(c)} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? 'Saving...' : 'Reactivate'}</Text></Pressable>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => remove(c)} style={[styles.danger, busy && styles.disabled]}><Text style={styles.dangerText}>Remove</Text></Pressable>
                </>
              ) : null}
            </View>
          </SurfaceCard>
        );
      })}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: Space.md, borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: Colors.white },
  search: { minHeight: 46, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: Space.md, fontSize: 15, color: Colors.accent },
  muted: { color: Colors.muted, fontSize: 14 },
  card: { gap: Space.xs },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  name: { flex: 1, color: Colors.accent, fontSize: 17, fontWeight: '800' },
  badge: { paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.pill },
  badgeText: { fontSize: 11, fontWeight: '800' },
  detail: { color: Colors.muted, fontSize: 13 },
  stats: { color: Colors.accent, fontSize: 13, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: Space.sm, marginTop: Space.sm },
  primary: { flex: 1, minHeight: 44, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  secondary: { flex: 1, minHeight: 44, borderRadius: Radius.md, backgroundColor: Colors.paleCoral, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  danger: { flex: 1, minHeight: 44, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: Colors.error, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
