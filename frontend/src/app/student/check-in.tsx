import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenBackButton } from '@/components/wellbeing/ScreenBackButton';
import {
  Eyebrow,
  InlineMessage,
  PageHeading,
  PrimaryButton,
  SurfaceCard,
  WellbeingIllustration,
  WellbeingPage,
} from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';
import { createCheckIn } from '@/services/checkinService';

const questions = [
  { field: 'mood', title: 'How is your mood today?', icon: '☀', options: ['Very Low', 'Low', 'Okay', 'Good', 'Very Good'] },
  { field: 'stressLevel', title: 'What is your current stress level?', icon: '✦', options: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'] },
  { field: 'sleepQuality', title: 'How was your sleep?', icon: '☾', options: ['Very Poor', 'Poor', 'Okay', 'Good', 'Very Good'] },
  { field: 'studyCoping', title: 'How are you coping with your studies?', icon: '▤', options: ['Very Difficult', 'Difficult', 'Okay', 'Well', 'Very Well'] },
] as const;

type QuestionField = (typeof questions)[number]['field'];
type FormState = Record<QuestionField, string> & { note: string };

const emptyForm: FormState = {
  mood: '',
  stressLevel: '',
  sleepQuality: '',
  studyCoping: '',
  note: '',
};

export default function CheckInScreen() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<QuestionField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const submissionLocked = useRef(false);
  const completedCount = questions.filter(({ field }) => Boolean(form[field])).length;

  const validate = () => {
    const nextErrors: Partial<Record<QuestionField, string>> = {};
    for (const { field, title } of questions) {
      if (!form[field]) nextErrors[field] = `Please answer: ${title.toLowerCase()}`;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSelect = (field: QuestionField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setApiError('');
  };

  const handleSubmit = async () => {
    if (submissionLocked.current || !validate()) return;

    submissionLocked.current = true;
    setIsSubmitting(true);
    setApiError('');

    try {
      const response = await createCheckIn({
        mood: form.mood,
        stressLevel: form.stressLevel,
        sleepQuality: form.sleepQuality,
        studyCoping: form.studyCoping,
        note: form.note.trim(),
      });
      const checkIn = response.checkIn;

      router.push({
        pathname: '/student/check-in-result',
        params: {
          id: checkIn._id,
        },
      });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to save your check-in. Please try again.');
    } finally {
      submissionLocked.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <WellbeingPage contentContainerStyle={styles.page}>
        <ScreenBackButton fallback="/student/dashboard" label="Dashboard" />
        <Eyebrow>Daily Check-in · {completedCount} of {questions.length} questions</Eyebrow>
        <PageHeading title="Daily Check-in" subtitle="Take a moment to check in with yourself today." />
        <WellbeingIllustration label="A calm illustration to accompany your daily wellbeing check-in" />

        <View style={styles.progressTrack} accessibilityLabel={`${completedCount} of ${questions.length} questions answered`}>
          <View style={[styles.progressValue, { width: `${(completedCount / questions.length) * 100}%` }]} />
        </View>

        {questions.map(({ field, title, icon, options }, index) => (
          <SurfaceCard key={field} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <View style={styles.questionIcon}><Text style={styles.questionIconText}>{icon}</Text></View>
              <View style={styles.questionHeaderText}>
                <Text style={styles.questionNumber}>QUESTION {index + 1}</Text>
                <Text style={styles.questionTitle}>{title}</Text>
              </View>
            </View>
            <View style={styles.optionGrid}>
              {options.map((option) => {
                const selected = form[field] === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityLabel={`${field === 'stressLevel' ? 'Stress' : field === 'sleepQuality' ? 'Sleep' : field === 'studyCoping' ? 'Study & Coping' : 'Mood'}: ${option}`}
                    accessibilityState={{ selected, disabled: isSubmitting }}
                    disabled={isSubmitting}
                    onPress={() => handleSelect(field, option)}
                    style={[styles.optionButton, selected && styles.optionButtonSelected]}
                  >
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option}</Text>
                    <View style={[styles.selectionMark, selected && styles.selectionMarkSelected]}>
                      {selected ? <Text style={styles.selectionTick}>✓</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {errors[field] ? <Text accessibilityRole="alert" style={styles.errorText}>{errors[field]}</Text> : null}
          </SurfaceCard>
        ))}

        <SurfaceCard style={styles.noteCard}>
          <Text style={styles.questionTitle}>A note to yourself <Text style={styles.optional}>(optional)</Text></Text>
          <Text style={styles.noteHint}>Anything you would like to remember about how today feels?</Text>
          <TextInput
            multiline
            editable={!isSubmitting}
            value={form.note}
            onChangeText={(value) => setForm((current) => ({ ...current, note: value }))}
            placeholder="Write a few words, or leave this blank..."
            placeholderTextColor={Colors.muted}
            style={styles.textArea}
            textAlignVertical="top"
            maxLength={500}
            accessibilityLabel="Optional personal note"
          />
          <Text style={styles.characterCount}>{form.note.length}/500</Text>
        </SurfaceCard>

        {apiError ? <InlineMessage tone="error">{apiError}</InlineMessage> : null}

        <PrimaryButton
          title={isSubmitting ? 'Saving your check-in...' : 'Submit Check-in'}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
          loading={isSubmitting}
        />
        <Text style={styles.privacyNote}>Your reflection is private to your account.</Text>
      </WellbeingPage>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  page: {
    gap: Space.md,
  },
  progressTrack: {
    height: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondary,
    overflow: 'hidden',
  },
  progressValue: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
  },
  questionCard: {
    padding: Space.md,
    gap: Space.md,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  questionIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paleBlue,
  },
  questionIconText: {
    color: Colors.accent,
    fontSize: 21,
  },
  questionHeaderText: {
    flex: 1,
    gap: 3,
  },
  questionNumber: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  questionTitle: {
    color: Colors.accent,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  optionButton: {
    minHeight: 46,
    width: '48%',
    flexGrow: 1,
    flexBasis: '44%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.sm,
    backgroundColor: Colors.white,
  },
  optionButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionLabel: {
    flexShrink: 1,
    color: Colors.accent,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  optionLabelSelected: {
    color: Colors.accent,
  },
  selectionMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionMarkSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  selectionTick: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    lineHeight: 19,
  },
  noteCard: {
    gap: Space.sm,
  },
  optional: {
    color: Colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  noteHint: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  textArea: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.accent,
  },
  characterCount: {
    color: Colors.muted,
    fontSize: 11,
    textAlign: 'right',
  },
  privacyNote: {
    color: Colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
});
