import * as Calendar from 'expo-calendar';
import { Linking, Platform } from 'react-native';

import type { AppointmentRecord } from '@/services/counsellingService';

export type AddToCalendarResult = 'saved' | 'cancelled' | 'opened-web';

const pad = (n: number) => String(n).padStart(2, '0');

// Google Calendar wants UTC timestamps like 20261009T093000Z.
const gcalStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

const sessionLabel = (type: AppointmentRecord['sessionType']) =>
  type === 'in-person' ? 'In-person session' : type === 'online' ? 'Online session' : 'Phone session';

// Builds the pre-filled event details from a UniWell booking.
export const buildEventDetails = (a: AppointmentRecord) => {
  const startDate = new Date(a.startsAt);
  const endDate = new Date(startDate.getTime() + (a.durationMinutes || 30) * 60 * 1000);
  const student = a.studentId?.name || 'Student';
  const notes = [
    `${sessionLabel(a.sessionType)} (${a.durationMinutes || 30} min)`,
    `Status: ${a.status}`,
    a.studentId?.email ? `Student email: ${a.studentId.email}` : '',
    a.studentId?.phoneNumber ? `Student phone: ${a.studentId.phoneNumber}` : '',
    'Booked via UniWell.',
  ].filter(Boolean).join('\n');

  return {
    title: `Counselling: ${student}`,
    startDate,
    endDate,
    notes,
    location: a.sessionType === 'in-person' ? 'Counselling office' : sessionLabel(a.sessionType),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    alarms: [{ relativeOffset: -30 }],
  };
};

// Web fallback: opens Google Calendar's "add event" page already filled in.
const openGoogleCalendarTemplate = async (a: AppointmentRecord) => {
  const d = buildEventDetails(a);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: d.title,
    dates: `${gcalStamp(d.startDate)}/${gcalStamp(d.endDate)}`,
    details: d.notes,
    location: d.location,
  });
  await Linking.openURL(`https://calendar.google.com/calendar/render?${params.toString()}`);
};

/**
 * Opens the phone's own calendar "new event" screen with everything filled in.
 * The counsellor picks whichever account/calendar they like (Google, iCloud, Outlook...)
 * and taps Save. No calendar permission is needed because the OS UI does the saving.
 */
export const addAppointmentToDeviceCalendar = async (a: AppointmentRecord): Promise<AddToCalendarResult> => {
  if (Platform.OS === 'web') {
    await openGoogleCalendarTemplate(a);
    return 'opened-web';
  }
  const result = await Calendar.createEventInCalendarAsync(buildEventDetails(a));
  return result.action === 'canceled' ? 'cancelled' : 'saved';
};
