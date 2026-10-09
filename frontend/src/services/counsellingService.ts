import { apiFetch } from './api';

export type CounsellorProfile = {
  _id: string;
  id?: string;
  name: string;
  qualification: string;
  specialization: string;
  yearsOfExperience: number;
  phoneNumber?: string;
  nextAvailableAt?: string | null;
  openSlots?: number;
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
  shareCheckIn?: boolean;
  feedbackRating?: number | null;
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

export const SLOT_DURATIONS = [15, 30, 45, 60, 90] as const;

export const createAvailability = (startsAt: string, durationMinutes: number) =>
  apiFetch<{ slot: CounsellorSlot }>('/appointments/availability', {
    method: 'POST',
    body: JSON.stringify({ startsAt, durationMinutes }),
  });

export const deleteAvailability = (id: string) =>
  apiFetch<{ message: string }>(`/appointments/availability/${id}`, { method: 'DELETE' });

export const createAppointment = (
  slotId: string,
  sessionType: AppointmentRecord['sessionType'],
  shareCheckIn = false,
) =>
  apiFetch<{ appointment: AppointmentRecord }>('/appointments', {
    method: 'POST',
    body: JSON.stringify({ slotId, sessionType, shareCheckIn }),
  });

export const submitSessionFeedback = (id: string, rating: number) =>
  apiFetch<{ appointment: { feedbackRating: number } }>(`/appointments/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating }),
  });

export const getStudentAppointmentCalendar = (id: string) =>
  apiFetch<{ filename: string; ics: string }>(`/appointments/${id}/calendar`);

export const cancelStudentAppointment = (id: string) =>
  apiFetch<{ appointment: AppointmentRecord }>(`/appointments/${id}/cancel`, { method: 'PATCH' });

export type BulkAvailabilityResult = {
  created: { _id: string; startsAt: string }[];
  skipped: { startsAt: string; reason: string }[];
};

export const createAvailabilityBulk = (slots: string[], durationMinutes = 30) =>
  apiFetch<BulkAvailabilityResult>('/appointments/availability/bulk', {
    method: 'POST',
    body: JSON.stringify({ slots, durationMinutes }),
  });

export type SharedCheckIn = {
  mood: string;
  stressLevel: string;
  sleepQuality: string;
  studyCoping: string;
  wellbeingScore: number;
  wellbeingLevel: string;
  createdAt: string;
};

export const getCounsellorAppointment = (id: string) =>
  apiFetch<{ appointment: AppointmentRecord & { shareCheckIn?: boolean }; sharedCheckIn: SharedCheckIn | null }>(
    `/appointments/counsellor/${id}`,
  );

export type CalendarSyncStatus = {
  enabled: boolean;
  feedUrl: string | null;
  webcalUrl: string | null;
  lastFetchedAt: string | null;
  upcomingBookings?: number;
  pendingBookings?: number;
};

export const getCalendarSyncStatus = () => apiFetch<CalendarSyncStatus>('/calendar/status');
export const createCalendarLink = () => apiFetch<CalendarSyncStatus>('/calendar/token', { method: 'POST' });
export const disableCalendarLink = () => apiFetch<{ message: string }>('/calendar/token', { method: 'DELETE' });
export const exportCalendar = () => apiFetch<{ filename: string; ics: string }>('/calendar/export');

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
  _id?: string;
  name: string;
  phoneNumber: string;
  relationship: string;
};

export type SupportContactEntry = {
  name: string;
  description: string;
  phone: string;
  website: string;
  availability: string;
};

export type SupportStep = { title: string; text: string };

export type SupportSection = {
  intro: string;
  steps?: SupportStep[];
  contacts: SupportContactEntry[];
};

export type SupportContacts = {
  universityPhone: string;
  universityWebsite: string;
  emergencyPhone: string;
  emergencyWebsite: string;
  // Seeded by the backend (src/utils/supportDirectory.js). Optional so older backends still work.
  directory?: {
    immediate?: SupportSection;
    university?: SupportSection;
    safety?: SupportSection;
  };
};

export const getSupportContacts = () =>
  apiFetch<SupportContacts>('/support/contacts');

type TrustedPeopleResponse = { trustedPeople: TrustedPerson[]; max?: number };

export const getTrustedPeople = () =>
  apiFetch<TrustedPeopleResponse>('/support/trusted-people');

export const addTrustedPerson = (person: TrustedPerson) =>
  apiFetch<TrustedPeopleResponse>('/support/trusted-people', {
    method: 'POST',
    body: JSON.stringify(person),
  });

export const updateTrustedPerson = (id: string, person: TrustedPerson) =>
  apiFetch<TrustedPeopleResponse>(`/support/trusted-people/${id}`, {
    method: 'PUT',
    body: JSON.stringify(person),
  });

export const deleteTrustedPerson = (id: string) =>
  apiFetch<TrustedPeopleResponse>(`/support/trusted-people/${id}`, { method: 'DELETE' });
