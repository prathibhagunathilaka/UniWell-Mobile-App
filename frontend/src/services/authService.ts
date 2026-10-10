// API calls for login, registration and profile changes (including email verification codes).
import { apiFetch } from './api';

export type UserRole = 'student' | 'counsellor' | 'admin';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'pending' | 'suspended';
  studentId?: string;
  phoneNumber?: string;
  faculty?: string;
  year?: number;
};

export type StudentProfileUpdate = Partial<Pick<AuthUser, 'name' | 'phoneNumber' | 'faculty' | 'year'>>;

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type StudentRegistration = {
  name: string;
  email: string;
  studentId: string;
  phoneNumber: string;
  faculty: string;
  year: number;
  password: string;
};

export type CounsellorRegistration = {
  name: string;
  email: string;
  phoneNumber: string;
  qualification: string;
  specialization: string;
  yearsOfExperience: number;
  password: string;
};

export const login = (identifier: string, password: string, requiredRole?: UserRole) =>
  apiFetch<AuthSession>(requiredRole === 'admin' ? '/auth/admin/login' : '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });

export const requestRegistrationOtp = (email: string) =>
  apiFetch<{ message: string; expiresInSeconds: number; resendAfterSeconds: number }>('/auth/register/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const verifyRegistrationOtp = (email: string, otp: string) =>
  apiFetch<{ message: string; verificationToken: string }>('/auth/register/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });

export const registerStudent = (registration: StudentRegistration, verificationToken: string) =>
  apiFetch<AuthSession>('/auth/register/student', {
    method: 'POST',
    body: JSON.stringify({ ...registration, verificationToken }),
  });

export const registerCounsellor = (registration: CounsellorRegistration, verificationToken: string) =>
  apiFetch<{ message: string }>('/auth/register/counsellor', {
    method: 'POST',
    body: JSON.stringify({ ...registration, verificationToken }),
  });

export const getCurrentUser = (signal?: AbortSignal) =>
  apiFetch<{ user: AuthUser }>('/auth/me', { signal });

export const requestProfileOtp = (action: 'update' | 'delete') =>
  apiFetch<{ message: string }>('/auth/profile/request-otp', {
    method: 'POST',
    body: JSON.stringify({ action }),
  });

export const verifyProfileOtp = (action: 'update' | 'delete', otp: string) =>
  apiFetch<{ message: string; verificationToken: string }>('/auth/profile/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ action, otp }),
  });

export const updateStudentProfile = (verificationToken: string, changes: StudentProfileUpdate) =>
  apiFetch<{ message: string; user: AuthUser }>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ verificationToken, ...changes }),
  });

export const deleteStudentAccount = (verificationToken: string) =>
  apiFetch<{ message: string }>('/auth/profile', {
    method: 'DELETE',
    body: JSON.stringify({ verificationToken }),
  });

export const requestPasswordReset = (email: string) =>
  apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const verifyPasswordResetOtp = (email: string, otp: string) =>
  apiFetch<{ message: string; resetToken: string }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });

export const resetPassword = (resetToken: string, newPassword: string) =>
  apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ resetToken, newPassword }),
  });
