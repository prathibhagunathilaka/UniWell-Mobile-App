import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { PRIMARY } from './AuthUI';

export function RoleRoutePlaceholder({ role, owner }: { role: string; owner: string }) {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>UniWell</Text>
      <Text style={styles.title}>{role} access</Text>
      <Text style={styles.description}>
        Authentication and role protection are ready. The {role.toLowerCase()} dashboard is owned by {owner} and is not implemented here.
      </Text>
      <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.button}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: '#F7F9FC',
  },
  brand: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: '800',
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
  },
  description: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    minHeight: 48,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
