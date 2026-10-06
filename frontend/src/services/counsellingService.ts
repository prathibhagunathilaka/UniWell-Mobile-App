import { apiFetch } from './api';

export type CounsellorProfile = {
  _id: string;
  id?: string;
  name: string;
  qualification: string;
  specialization: string;
  yearsOfExperience: number;
  phoneNumber?: string;
};

export type CounsellorSlot = {
  _id: string;
  startsAt: string;
  durationMinutes: number;
};

export type AppointmentRecord = {
  _id: string;
  startsAt: string;
  durationMinutes: number;
  sessionType: 'in-person' | 'online' | 'phone';
  status: 'available' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
  counsellorId?: CounsellorProfile;
  studentId?: {
    _id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    faculty?: string;
    year?: number;
  } | null;
};

export type CounsellorResourceInput = {
  title: string;
  description: string;
  category: string;
  content: string;
  externalLink?: string;
  videoUrl?: string;
  imageUrl?: string;
  helpfulTips?: string[];
};

export type CounsellorResource = CounsellorResourceInput & {
  _id: string;
  createdBy?: { name: string } | null;
};

export const getCounsellors = () =>
  apiFetch<{ counsellors: CounsellorProfile[] }>('/counsellors');

export const getCounsellor = (id: string) =>
  apiFetch<{ counsellor: CounsellorProfile }>(`/counsellors/${id}`);

export const getCounsellorAvailability = (id: string) =>
  apiFetch<{ slots: CounsellorSlot[] }>(`/counsellors/${id}/availability`);

export const createAvailability = (startsAt: string, durationMinutes: number) =>
  apiFetch<{ slot: CounsellorSlot }>('/appointments/availability', {
    method: 'POST',
    body: JSON.stringify({ startsAt, durationMinutes }),
  });

export const deleteAvailability = (id: string) =>
  apiFetch<{ message: string }>(`/appointments/availability/${id}`, { method: 'DELETE' });

export const createAppointment = (slotId: string, sessionType: AppointmentRecord['sessionType']) =>
  apiFetch<{ appointment: AppointmentRecord }>('/appointments', {
    method: 'POST',
    body: JSON.stringify({ slotId, sessionType }),
  });

export const getStudentAppointments = () =>
  apiFetch<{ appointments: AppointmentRecord[] }>('/appointments/mine');

export const getCounsellorAppointments = () =>
  apiFetch<{ appointments: AppointmentRecord[] }>('/appointments/counsellor');

export const getStudentAppointment = (id: string) =>
  apiFetch<{ appointment: AppointmentRecord }>(`/appointments/${id}`);

export const updateAppointmentStatus = (
  id: string,
  status: Extract<AppointmentRecord['status'], 'confirmed' | 'cancelled' | 'completed'>,
) =>
  apiFetch<{ appointment: AppointmentRecord }>(`/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const getCounsellorResources = () =>
  apiFetch<{ resources: CounsellorResource[] }>('/resources');

export const createCounsellorResource = (resource: CounsellorResourceInput) =>
  apiFetch<{ resource: CounsellorResource }>('/resources', {
    method: 'POST',
    body: JSON.stringify(resource),
  });

export const updateCounsellorResource = (id: string, resource: CounsellorResourceInput) =>
  apiFetch<{ resource: CounsellorResource }>(`/resources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(resource),
  });

export const deleteCounsellorResource = (id: string) =>
  apiFetch<{ message: string }>(`/resources/${id}`, { method: 'DELETE' });

export const getCounsellorProfile = () =>
  apiFetch<{ counsellor: CounsellorProfile }>('/counsellors/me');

export const updateCounsellorProfile = (profile: Pick<CounsellorProfile, 'name' | 'phoneNumber' | 'qualification' | 'specialization' | 'yearsOfExperience'>) =>
  apiFetch<{ counsellor: CounsellorProfile }>('/counsellors/me', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });

export const getPendingCounsellors = () =>
  apiFetch<{ counsellors: (CounsellorProfile & { email: string })[] }>('/admin/counsellors/pending');

export const updateCounsellorApproval = (id: string, status: 'active' | 'suspended') =>
  apiFetch<{ counsellor: CounsellorProfile & { status: string } }>(`/admin/counsellors/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export type TrustedPerson = {
  name: string;
  phoneNumber: string;
  relationship: string;
};

export type SupportContacts = {
  universityPhone: string;
  universityWebsite: string;
  emergencyPhone: string;
  emergencyWebsite: string;
};

export const getSupportContacts = () =>
  apiFetch<SupportContacts>('/support/contacts');

export const getTrustedPerson = () =>
  apiFetch<{ trustedPerson: TrustedPerson | null }>('/support/trusted-person');

export const saveTrustedPerson = (trustedPerson: TrustedPerson) =>
  apiFetch<{ trustedPerson: TrustedPerson }>('/support/trusted-person', {
    method: 'PUT',
    body: JSON.stringify(trustedPerson),
  });

export const deleteTrustedPerson = () =>
  apiFetch<{ message: string }>('/support/trusted-person', { method: 'DELETE' });
