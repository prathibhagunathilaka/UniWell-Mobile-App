import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthLinkText, AuthPage } from '@/components/auth/AuthUI';
import { PrimaryButton } from '@/components/wellbeing/WellbeingUI';
import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';

const roles = [
  {
    id: 'student',
    icon: '✦',
    title: 'Student',
    detail: 'Check in with your wellbeing and find support that fits student life.',
  },
  {
    id: 'counsellor',
    icon: '♡',
    title: 'University Counsellor',
    detail: 'Submit your professional details for university review.',
  },
  {
    id: 'admin',
    icon: '⌂',
    title: 'Campus Administration',
    detail: 'Sign in with an authorized campus administrator account.',
  },
] as const;

type RoleId = (typeof roles)[number]['id'];

export default function RegisterRoleScreen() {
  const [selectedRole, setSelectedRole] = useState<RoleId>('student');

  const continueToRole = () => {
    if (selectedRole === 'student') {
      router.push('/auth/register/student');
    } else if (selectedRole === 'counsellor') {
      router.push('/auth/register/counsellor');
    } else {
      router.push('/auth/admin-login');
    }
  };

  return (
    <AuthPage title="Choose Your Role" subtitle="Choose the path that best describes how you use UniWell.">
      <View style={styles.roleList}>
        {roles.map((role) => {
          const selected = selectedRole === role.id;
          return (
            <Pressable
              key={role.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setSelectedRole(role.id)}
              style={[styles.roleCard, selected && styles.roleCardSelected]}
            >
              <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>
                <Text style={[styles.roleIconText, selected && styles.roleIconTextSelected]}>{role.icon}</Text>
              </View>
              <View style={styles.roleText}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDetail}>{role.detail}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton title="Continue" onPress={continueToRole} />
      {selectedRole === 'admin' ? (
        <Text style={styles.securityNote}>Administrator accounts cannot be created from public registration.</Text>
      ) : null}
      <Link href="/auth/login" asChild>
        <Pressable><AuthLinkText>Already have an account? Sign in</AuthLinkText></Pressable>
      </Link>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  roleList: {
    gap: Space.sm,
  },
  roleCard: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  roleCardSelected: {
    backgroundColor: Colors.paleCoral,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paleBlue,
  },
  roleIconSelected: {
    backgroundColor: Colors.primary,
  },
  roleIconText: {
    fontSize: 24,
    color: Colors.accent,
  },
  roleIconTextSelected: {
    color: Colors.accent,
  },
  roleText: {
    flex: 1,
    gap: 4,
  },
  roleTitle: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  roleDetail: {
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  securityNote: {
    color: Colors.muted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
});
