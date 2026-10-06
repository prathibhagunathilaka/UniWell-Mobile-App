import { LoginForm } from '@/components/auth/LoginForm';

export default function AdminLoginScreen() {
  return <LoginForm requiredRole="admin" />;
}
