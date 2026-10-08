import { apiFetch } from './api';

export type ReportFilters = {
  from?: string;
  to?: string;
  counsellorId?: string;
  sessionType?: 'online' | 'in-person' | 'phone' | '';
};

export type WorkloadRow = {
  counsellorId: string;
  name: string;
  bookings: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  openSlots: number;
  utilisationRate: number | null;
};

export type UsageReport = {
  filters: { from: string; to: string };
  generatedAt: string;
  timeZoneOffsetMinutes?: number;
  totals: {
    bookings: number;
    completed: number;
    cancelled: number;
    upcoming: number;
    completionRate: number | null;
    cancellationRate: number | null;
    overallUtilisation: number | null;
    openSlots: number;
  };
  byStatus: Record<string, number>;
  bySessionType: Record<string, number>;
  peak: { weekday: string; hour: number; bookingsAtPeakWeekday: number; bookingsAtPeakHour: number } | null;
  byWeekday: { label: string; count: number }[];
  byHour: { hour: number; count: number }[];
  byDay: { date: string; count: number }[];
  workload: WorkloadRow[];
  satisfaction: { suppressed: true; reason: string } | { suppressed: false; responses: number; average: number };
  checkIns:
    | { suppressed: true; reason: string }
    | {
        suppressed: false;
        total: number;
        participants: number;
        averageScore: number;
        levels: Record<string, number | string>;
        daily: { date: string; averageScore: number | null }[];
      };
  insights: string[];
  anonymisation: string;
};

const toQuery = (filters: ReportFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const getUsageReport = (filters: ReportFilters) =>
  apiFetch<{ report: UsageReport }>(`/admin/reports/summary${toQuery(filters)}`);

export const exportUsageReport = (filters: ReportFilters) =>
  apiFetch<{ filename: string; csv: string }>(`/admin/reports/export${toQuery(filters)}`);

export const getAllCounsellors = () =>
  apiFetch<{ counsellors: { _id: string; name: string; status: string; specialization?: string }[] }>('/admin/counsellors');

// Live platform numbers for the admin home page (counts only, no personal data).
export type AdminOverview = {
  generatedAt: string;
  users: {
    students: number;
    newStudents7d: number;
    counsellors: { active: number; pending: number; suspended: number };
  };
  today: { bookings: number };
  next7Days: { booked: number; openSlots: number; utilisation: number | null };
  awaitingConfirmation: number;
  resources: number;
};

export const getAdminOverview = () => apiFetch<{ overview: AdminOverview }>('/admin/overview');

export type ManagedCounsellor = {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  qualification?: string;
  specialization?: string;
  yearsOfExperience?: number;
  status: 'pending' | 'active' | 'suspended';
  createdAt: string;
  stats: { upcomingBookings: number; pendingBookings: number; openSlots: number };
};

export const getManagedCounsellors = () => apiFetch<{ counsellors: ManagedCounsellor[] }>('/admin/counsellors/all');

// Approve / decline an application, or suspend / reactivate a counsellor.
export const setCounsellorStatus = (id: string, status: 'active' | 'suspended') =>
  apiFetch<{ counsellor: { _id: string; name: string; status: string }; releasedBookings: number }>(`/admin/counsellors/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const removeCounsellor = (id: string) =>
  apiFetch<{ message: string; releasedBookings: number }>(`/admin/counsellors/${id}`, { method: 'DELETE' });
