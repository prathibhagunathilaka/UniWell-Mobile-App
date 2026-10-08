import { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { WellbeingIllustration } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors } from '@/constants/wellbeingTheme';

export const PRIMARY = Colors.primary;
export const SECONDARY = Colors.secondary;

export function AuthPage({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandText}>U</Text>
          </View>
          <Text style={styles.brandName}>UniWell</Text>
        </View>
        <WellbeingIllustration label="A calm moment for student wellbeing" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.form}>{children}</View>
      </View>
    </ScrollView>
  );
}

export function AuthField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.style]}
        placeholderTextColor={Colors.muted}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
    >
      {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>{title}</Text>}
    </Pressable>
  );
}

export function AuthMessage({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  if (!children) return null;

  return (
    <Text accessibilityRole={error ? 'alert' : undefined} style={[styles.message, error && styles.error]}>
      {children}
    </Text>
  );
}

export function AuthLinkText({ children }: PropsWithChildren) {
  return <Text style={styles.linkText}>{children}</Text>;
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    gap: 16,
  },
  brandRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  brandName: {
    color: Colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: Colors.accent,
    fontSize: 19,
    fontWeight: '800',
  },
  form: {
    gap: 14,
  },
  title: {
    color: Colors.accent,
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  fieldWrap: {
    gap: 7,
  },
  fieldLabel: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.accent,
  },
  button: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  message: {
    color: Colors.accent,
    fontSize: 14,
    lineHeight: 21,
  },
  error: {
    color: Colors.error,
  },
  linkText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 5,
  },
});
