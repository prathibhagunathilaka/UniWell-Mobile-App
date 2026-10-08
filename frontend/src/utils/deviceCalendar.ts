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

// Same idea for the student's own booking: "UniWell session with <counsellor>".
export const buildStudentEventDetails = (a: AppointmentRecord) => {
  const startDate = new Date(a.startsAt);
  const endDate = new Date(startDate.getTime() + (a.durationMinutes || 30) * 60 * 1000);
  const counsellor = a.counsellorId?.name || 'your counsellor';
  return {
    title: `UniWell session with ${counsellor}`,
    startDate,
    endDate,
    notes: [
      `${sessionLabel(a.sessionType)} (${a.durationMinutes || 30} min)`,
      a.status === 'pending' ? 'Waiting for the counsellor to confirm.' : 'Confirmed.',
      'Booked via UniWell.',
    ].join('\n'),
    location: a.sessionType === 'in-person' ? 'Counselling office' : sessionLabel(a.sessionType),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    alarms: [{ relativeOffset: -60 }, { relativeOffset: -24 * 60 }],
  };
};

type EventDetails = ReturnType<typeof buildEventDetails>;

// Web fallback: opens Google Calendar's "add event" page already filled in.
const openGoogleCalendarTemplate = async (d: EventDetails) => {
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
const openInCalendar = async (details: EventDetails): Promise<AddToCalendarResult> => {
  if (Platform.OS === 'web') {
    await openGoogleCalendarTemplate(details);
    return 'opened-web';
  }
  const result = await Calendar.createEventInCalendarAsync(details);
  return result.action === 'canceled' ? 'cancelled' : 'saved';
};

export const addAppointmentToDeviceCalendar = (a: AppointmentRecord) => openInCalendar(buildEventDetails(a));

// Student side: same behaviour for their own session.
export const addStudentSessionToDeviceCalendar = (a: AppointmentRecord) => openInCalendar(buildStudentEventDetails(a));
