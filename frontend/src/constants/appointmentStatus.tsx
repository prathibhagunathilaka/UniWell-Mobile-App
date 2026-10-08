import { AppointmentRecord } from '@/services/counsellingService';

type Status = AppointmentRecord['status'];

export type StatusTone = {
  label: string;
  /** Pill text colour */
  text: string;
  /** Pill background */
  pill: string;
  /** Card background (used for past appointments) */
  cardBg: string;
  /** Accent bar / border colour */
  accent: string;
};

export const AppointmentStatusTones: Record<Status, StatusTone> = {
  available: { label: 'Available', text: '#112E3C', pill: '#EAF3F7', cardBg: '#FFFFFF', accent: '#C4DAE8' },
  pending: { label: 'Awaiting confirmation', text: '#8A5A00', pill: '#FFEFC7', cardBg: '#FFFFFF', accent: '#E5A92B' },
  confirmed: { label: 'Confirmed', text: '#1D5C48', pill: '#D6F0E4', cardBg: '#FFFFFF', accent: '#28745D' },
  completed: { label: 'Completed', text: '#1F4E8C', pill: '#DCE9FB', cardBg: '#F1F6FD', accent: '#3C7BD4' },
  cancelled: { label: 'Cancelled', text: '#8E2F28', pill: '#FADBD7', cardBg: '#FDF1EF', accent: '#C9574D' },
};
