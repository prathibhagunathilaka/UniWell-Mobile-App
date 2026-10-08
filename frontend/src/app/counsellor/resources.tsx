import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthField } from '@/components/auth/AuthUI';
import { InlineMessage, LoadingState, PageHeading, SectionHeading, SurfaceCard, WellbeingPage } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import {
    CounsellorResource,
    CounsellorResourceInput,
    createCounsellorResource,
    deleteCounsellorResource,
    getCounsellorResources,
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

// Resources tab: add, edit and remove the self-help resources students see in their library.
// "list" shows everything published; "form" is a focused add/edit screen (so editing never
// leaves the form scrolled out of view).
export default function CounsellorResourcesScreen() {
  const [resources, setResources] = useState<CounsellorResource[]>([]);
  const [resource, setResource] = useState<CounsellorResourceInput>(emptyResource);
  const [editingResourceId, setEditingResourceId] = useState('');
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await getCounsellorResources();
      setResources(response.resources);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load resources.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const openNew = () => {
    setError('');
    setMessage('');
    setEditingResourceId('');
    setResource(emptyResource);
    setMode('form');
  };

  const openEdit = (item: CounsellorResource) => {
    setError('');
    setMessage('');
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
    setMode('form');
  };

  const closeForm = () => {
    setEditingResourceId('');
    setResource(emptyResource);
    setError('');
    setMode('list');
  };

  const submitResource = async () => {
    if (!resource.title.trim() || !resource.description.trim() || !resource.content.trim()) {
      setError('Please add a title, a short description and the resource content.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingResourceId) {
        await updateCounsellorResource(editingResourceId, resource);
        setMessage('Resource updated. Students see the new version now.');
      } else {
        await createCounsellorResource(resource);
        setMessage('Resource published for students.');
      }
      setResource(emptyResource);
      setEditingResourceId('');
      setMode('list');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this resource.');
    } finally {
      setSaving(false);
    }
  };

  const removeResource = async (id: string) => {
    setError('');
    setMessage('');
    setRemovingId(id);
    try {
      await deleteCounsellorResource(id);
      await load();
      setMessage('Resource removed from student resources.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove this resource.');
    } finally {
      setRemovingId('');
    }
  };

  // Always confirm before removing: students lose access straight away.
  const confirmRemove = (item: CounsellorResource) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Remove “${item.title}”? Students will no longer see it.`)) void removeResource(item._id);
      return;
    }
    Alert.alert(`Remove “${item.title}”?`, 'Students will no longer see this resource.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeResource(item._id) },
    ]);
  };

  const updateResourceField = (key: keyof CounsellorResourceInput, value: string) => {
    setResource((current) => ({ ...current, [key]: value }));
  };

  if (mode === 'form') {
    return (
      <WellbeingPage contentContainerStyle={styles.page}>
        <Pressable accessibilityRole="button" onPress={closeForm} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={Colors.accent} />
          <Text style={styles.backText}>Back to resources</Text>
        </Pressable>
        <PageHeading
          title={editingResourceId ? 'Edit resource' : 'New resource'}
          subtitle={editingResourceId ? 'Changes appear in the student resource library straight away.' : 'It will appear in the student resource library as soon as you publish it.'}
        />
        <InlineMessage tone="error">{error}</InlineMessage>
        <SurfaceCard style={styles.form}>
          <AuthField label="Title" value={resource.title} onChangeText={(value) => updateResourceField('title', value)} />
          <AuthField label="Short description" value={resource.description} onChangeText={(value) => updateResourceField('description', value)} />
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryRow}>
            {categories.map((category) => (
              <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: resource.category === category }} onPress={() => updateResourceField('category', category)} style={[styles.category, resource.category === category && styles.categorySelected]}>
                <Text style={[styles.categoryText, resource.category === category && styles.categoryTextSelected]}>{category}</Text>
              </Pressable>
            ))}
          </View>
          <AuthField label="Resource content" value={resource.content} onChangeText={(value) => updateResourceField('content', value)} multiline />
          <AuthField label="Optional resource URL" value={resource.externalLink || ''} onChangeText={(value) => updateResourceField('externalLink', value)} autoCapitalize="none" keyboardType="url" />
          <AuthButton title={editingResourceId ? 'Save changes' : 'Publish resource'} onPress={() => void submitResource()} loading={saving} />
          <Pressable accessibilityRole="button" onPress={closeForm} style={styles.cancel}>
            <Text style={styles.action}>Cancel</Text>
          </Pressable>
        </SurfaceCard>
      </WellbeingPage>
    );
  }

  return (
    <WellbeingPage contentContainerStyle={styles.page}>
      <PageHeading title="Student resources" subtitle="Add, edit or remove the self-help resources students can read in their library." />
      <InlineMessage tone="error">{error}</InlineMessage>
      <InlineMessage tone="success">{message}</InlineMessage>

      <Pressable accessibilityRole="button" onPress={openNew} style={styles.newButton}>
        <Ionicons name="add" size={22} color={Colors.accent} />
        <Text style={styles.newButtonText}>New resource</Text>
      </Pressable>

      <SectionHeading title="Published resources" detail={resources.length ? `${resources.length} available to students` : undefined} />
      {loading ? <LoadingState label="Loading resources..." /> : null}
      {!loading && resources.length === 0 ? <SurfaceCard><Text style={styles.muted}>No resources published yet. Tap “New resource” to add the first one.</Text></SurfaceCard> : null}
      {resources.map((item) => (
        <SurfaceCard key={item._id} style={styles.resourceCard}>
          <Text style={styles.resourceTitle}>{item.title}</Text>
          <Text style={styles.category2}>{item.category}</Text>
          <Text style={styles.muted} numberOfLines={2}>{item.description}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} onPress={() => openEdit(item)} style={styles.editBtn}>
              <Ionicons name="create-outline" size={18} color={Colors.accent} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`} disabled={removingId === item._id} onPress={() => confirmRemove(item)} style={[styles.removeBtn, removingId === item._id && styles.disabled]}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.removeText}>{removingId === item._id ? 'Removing...' : 'Remove'}</Text>
            </Pressable>
          </View>
        </SurfaceCard>
      ))}
    </WellbeingPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: Space.md },
  form: { gap: Space.sm },
  back: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 2 },
  backText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  newButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.xs, borderRadius: Radius.md, backgroundColor: Colors.primary },
  newButtonText: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  categoryRow: { flexDirection: 'row', gap: Space.xs, flexWrap: 'wrap' },
  category: { paddingHorizontal: Space.sm, paddingVertical: Space.xs, borderRadius: Radius.pill, backgroundColor: Colors.paleBlue },
  categorySelected: { backgroundColor: Colors.primary },
  categoryText: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  categoryTextSelected: { color: Colors.white },
  fieldLabel: { color: Colors.accent, fontSize: 13, fontWeight: '800' },
  muted: { color: Colors.muted, fontSize: 14, lineHeight: 20 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  action: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  resourceCard: { gap: Space.xs },
  resourceTitle: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  category2: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: Space.sm, marginTop: Space.sm },
  editBtn: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.xs, borderRadius: Radius.md, backgroundColor: Colors.paleBlue },
  editText: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  removeBtn: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.xs, borderRadius: Radius.md, backgroundColor: Colors.paleCoral, borderWidth: 1, borderColor: Colors.primary },
  removeText: { color: Colors.error, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
