import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthField } from '@/components/auth/AuthUI';
import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
  AppointmentRecord,
  CounsellorProfile,
  CounsellorResource,
  CounsellorResourceInput,
  createAvailability,
  createCounsellorResource,
  deleteAvailability,
  deleteCounsellorResource,
  getCounsellorAppointments,
  getCounsellorProfile,
  getCounsellorResources,
  updateAppointmentStatus,
  updateCounsellorProfile,
  updateCounsellorResource,
} from '@/services/counsellingService';

const categories = [
  'Stress Management',
  'Anxiety & Worry',
  'Sleep',
  'Academic Pressure',
  'Time Management',
  'Emotional Wellbeing',
  'Sleep & Rest',
  'Relaxation / Mindfulness',
  'Self-Care',
  'Study-Life Balance',
] as const;

const emptyResource: CounsellorResourceInput = {
  title: '',
  description: '',
  category: categories[0],
  content: '',
};

export default function CounsellorDashboardScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<CounsellorProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [resources, setResources] = useState<CounsellorResource[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [resource, setResource] = useState<CounsellorResourceInput>(emptyResource);
  const [editingResourceId, setEditingResourceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileResponse, appointmentsResponse, resourcesResponse] = await Promise.all([
        getCounsellorProfile(),
        getCounsellorAppointments(),
        getCounsellorResources(),
      ]);
      setProfile(profileResponse.counsellor);
      setAppointments(appointmentsResponse.appointments);
      setResources(resourcesResponse.resources);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your counsellor workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    try {
      const response = await updateCounsellorProfile({
        name: profile.name,
        phoneNumber: profile.phoneNumber || '',
        qualification: profile.qualification,
        specialization: profile.specialization,
        yearsOfExperience: profile.yearsOfExperience,
      });
      setProfile(response.counsellor);
      setMessage('Profile updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const saveAvailability = async () => {
    const start = new Date(`${date}T${time}`);
    if (!date || !time || !Number.isFinite(start.getTime())) {
      setError('Choose a valid future date and start time.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createAvailability(start.toISOString(), 30);
      setMessage('Availability added.');
      setDate('');
      setTime('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save availability.');
    } finally {
      setSaving(false);
    }
  };

  const changeAppointment = async (appointment: AppointmentRecord, status: 'confirmed' | 'cancelled' | 'completed') => {
    setError('');
    try {
      await updateAppointmentStatus(appointment._id, status);
      await load();
      setMessage(`Appointment ${status}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this appointment.');
    }
  };

  const submitResource = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingResourceId) {
        await updateCounsellorResource(editingResourceId, resource);
        setMessage('Resource updated.');
      } else {
        await createCounsellorResource(resource);
        setMessage('Resource published for students.');
      }
      setResource(emptyResource);
      setEditingResourceId('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this resource.');
    } finally {
      setSaving(false);
    }
  };

  const editResource = (item: CounsellorResource) => {
    setEditingResourceId(item._id);
    setResource({
      title: item.title,
      description: item.description,
      category: item.category,
      content: item.content,
      externalLink: item.externalLink,
      videoUrl: item.videoUrl,
      imageUrl: item.imageUrl,
      helpfulTips: item.helpfulTips,
    });
  };

  const removeResource = async (id: string) => {
    setError('');
    try {
      await deleteCounsellorResource(id);
      await load();
      setMessage('Resource removed from student resources.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove this resource.');
    }
  };

  const updateProfileField = <K extends keyof CounsellorProfile>(key: K, value: CounsellorProfile[K]) => {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  };
  const updateResourceField = (key: keyof CounsellorResourceInput, value: string) => {
    setResource((current) => ({ ...current, [key]: value }));
  };

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>UniWell · Counsellor</Text>
          <Text style={styles.welcome}>Hello, {user?.name || profile?.name || 'Counsellor'}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
      <PageHeading title="Counsellor workspace" subtitle="Manage your profile, availability, appointments, and student resources." />
      {loading ? <LoadingState label="Loading your workspace..." /> : null}
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>
      {!loading && profile ? (
        <>
          <SectionHeading title="Professional profile" detail="Students see this information in the counsellor directory." />
          <SurfaceCard style={styles.form}>
            <AuthField label="Name" value={profile.name} onChangeText={(value) => updateProfileField('name', value)} />
            <AuthField label="Phone number" value={profile.phoneNumber || ''} onChangeText={(value) => updateProfileField('phoneNumber', value)} keyboardType="phone-pad" />
            <AuthField label="Qualification" value={profile.qualification} onChangeText={(value) => updateProfileField('qualification', value)} />
            <AuthField label="Specialization" value={profile.specialization} onChangeText={(value) => updateProfileField('specialization', value)} />
            <AuthField label="Years of experience" value={String(profile.yearsOfExperience)} onChangeText={(value) => updateProfileField('yearsOfExperience', Number(value) || 0)} keyboardType="number-pad" />
            <AuthButton title="Save profile" onPress={() => void saveProfile()} loading={saving} />
          </SurfaceCard>

          <SectionHeading title="Availability" detail="Publish specific future appointment times for students to book." />
          <SurfaceCard style={styles.form}>
            <AuthField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-10-20" />
            <AuthField label="Start time (24-hour, HH:MM)" value={time} onChangeText={setTime} placeholder="10:30" />
            <Text style={styles.muted}>Sessions are scheduled in 30-minute slots.</Text>
            <AuthButton title="Add availability" onPress={() => void saveAvailability()} loading={saving} />
          </SurfaceCard>

          <SectionHeading title="Appointments" detail="Bookings and available times come from the shared appointment records." />
          {appointments.length === 0 ? <SurfaceCard><Text style={styles.muted}>No bookings or availability yet.</Text></SurfaceCard> : null}
          {appointments.map((appointment) => (
            <SurfaceCard key={appointment._id} style={styles.appointment}>
              <View style={styles.appointmentHeader}>
                <Text style={styles.appointmentTitle}>{appointment.studentId?.name || (appointment.status === 'available' ? 'Available slot' : 'Student appointment')}</Text>
                <Text style={styles.badge}>{appointment.status}</Text>
              </View>
              <Text style={styles.appointmentText}>{new Date(appointment.startsAt).toLocaleString()} · {appointment.durationMinutes} min</Text>
              {appointment.studentId ? (
                <>
                  <Text style={styles.appointmentText}>{appointment.sessionType} session</Text>
                  <Text style={styles.appointmentText}>{appointment.studentId.email}{appointment.studentId.phoneNumber ? ` · ${appointment.studentId.phoneNumber}` : ''}</Text>
                  {appointment.studentId.faculty ? <Text style={styles.appointmentText}>{appointment.studentId.faculty}{appointment.studentId.year ? ` · Year ${appointment.studentId.year}` : ''}</Text> : null}
                </>
              ) : null}
              {appointment.status === 'available' ? (
                <Pressable accessibilityRole="button" onPress={() => void deleteAvailability(appointment._id).then(load).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to remove availability.'))}>
                  <Text style={styles.action}>Remove availability</Text>
                </Pressable>
              ) : null}
              {appointment.status === 'pending' ? (
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" onPress={() => void changeAppointment(appointment, 'confirmed')} style={styles.actionButton}><Text style={styles.actionText}>Confirm</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void changeAppointment(appointment, 'cancelled')} style={styles.cancelButton}><Text style={styles.actionText}>Cancel</Text></Pressable>
                </View>
              ) : null}
              {appointment.status === 'confirmed' ? (
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" onPress={() => void changeAppointment(appointment, 'completed')} style={styles.actionButton}><Text style={styles.actionText}>Mark completed</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void changeAppointment(appointment, 'cancelled')} style={styles.cancelButton}><Text style={styles.actionText}>Cancel</Text></Pressable>
                </View>
              ) : null}
            </SurfaceCard>
          ))}

          <SectionHeading title="Student self-help resources" detail="Publish or edit resources that appear in the student resource library." />
          <SurfaceCard style={styles.form}>
            <AuthField label="Title" value={resource.title} onChangeText={(value) => updateResourceField('title', value)} />
            <AuthField label="Short description" value={resource.description} onChangeText={(value) => updateResourceField('description', value)} />
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {categories.map((category) => (
              <Pressable key={category} onPress={() => updateResourceField('category', category)} style={[styles.category, resource.category === category && styles.categorySelected]}>
                <Text style={[styles.categoryText, resource.category === category && styles.categoryTextSelected]}>{category}</Text>
                </Pressable>
              ))}
            </View>
            <AuthField label="Resource content" value={resource.content} onChangeText={(value) => updateResourceField('content', value)} multiline />
            <AuthField label="Optional resource URL" value={resource.externalLink || ''} onChangeText={(value) => updateResourceField('externalLink', value)} autoCapitalize="none" keyboardType="url" />
            <AuthButton title={editingResourceId ? 'Update resource' : 'Publish resource'} onPress={() => void submitResource()} loading={saving} />
            {editingResourceId ? <Pressable onPress={() => { setResource(emptyResource); setEditingResourceId(''); }}><Text style={styles.action}>Cancel editing</Text></Pressable> : null}
          </SurfaceCard>
          {resources.map((item) => (
            <SurfaceCard key={item._id} style={styles.resourceCard}>
              <Text style={styles.resourceTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.category} · {item.description}</Text>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={() => editResource(item)}><Text style={styles.action}>Edit</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => void removeResource(item._id)}><Text style={styles.remove}>Remove</Text></Pressable>
              </View>
            </SurfaceCard>
          ))}
        </>
      ) : null}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  brand: { color: Colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  welcome: { color: Colors.accent, fontSize: 20, fontWeight: '800' },
  logout: { minHeight: 42, paddingHorizontal: Space.md, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  logoutText: { color: Colors.accent, fontWeight: '800', fontSize: 13 },
  form: { gap: Space.sm },
  categoryRow: { flexDirection: 'row', gap: Space.xs, flexWrap: 'wrap' },
  category: { paddingHorizontal: Space.sm, paddingVertical: Space.xs, borderRadius: Radius.pill, backgroundColor: Colors.paleBlue },
  categorySelected: { backgroundColor: Colors.primary },
  categoryText: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  categoryTextSelected: { color: Colors.white },
  fieldLabel: { color: Colors.accent, fontSize: 13, fontWeight: '800' },
  muted: { color: Colors.muted, fontSize: 14, lineHeight: 20 },
  appointment: { gap: Space.xs },
  appointmentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.xs },
  appointmentTitle: { flex: 1, color: Colors.accent, fontSize: 15, fontWeight: '800' },
  badge: { color: Colors.accent, backgroundColor: Colors.paleBlue, paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.pill, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  appointmentText: { color: Colors.muted, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: Space.md, marginTop: Space.xs, flexWrap: 'wrap' },
  actionButton: { paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: Radius.md, backgroundColor: Colors.primary },
  cancelButton: { paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: Radius.md, backgroundColor: Colors.paleCoral },
  actionText: { color: Colors.accent, fontSize: 13, fontWeight: '800' },
  action: { color: Colors.primary, fontSize: 14, fontWeight: '800', paddingVertical: Space.xs },
  resourceCard: { gap: Space.xs },
  resourceTitle: { color: Colors.accent, fontSize: 15, fontWeight: '800' },
  remove: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
});
