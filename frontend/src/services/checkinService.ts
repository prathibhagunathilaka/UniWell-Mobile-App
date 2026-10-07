import { apiFetch } from './api';

const CHECK_IN_REQUEST_TIMEOUT_MS = 35_000;

export type CheckInPayload = {
  mood: string;
  stressLevel: string;
  sleepQuality: string;
  studyCoping: string;
  note?: string;
};

export type CheckInRecord = {
  _id: string;
  mood: string;
  stressLevel: string;
  sleepQuality: string;
  studyCoping: string;
  note: string;
  wellbeingScore: number;
  wellbeingLevel: string;
  createdAt: string;
};

export type CheckInTrendPoint = Pick<CheckInRecord, '_id' | 'createdAt' | 'wellbeingScore'>;

export const createCheckIn = async (payload: CheckInPayload) => {
  // Bound submissions that take too long, then clear the timer regardless of outcome.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_IN_REQUEST_TIMEOUT_MS);

  try {
    return await apiFetch<{ message: string; checkIn: CheckInRecord }>('/checkins', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('The check-in request timed out. Check your check-in history before trying again.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const getCheckIns = async (limit?: number) => {
  const params = limit === undefined ? '' : `?limit=${encodeURIComponent(String(limit))}`;
  return apiFetch<{ checkIns: CheckInRecord[] }>(`/checkins${params}`);
};

export const getCheckInTrend = async () => {
  return apiFetch<{ checkIns: CheckInTrendPoint[] }>('/checkins/trend');
};

export const getCheckInById = async (id: string) => {
  return apiFetch<{ checkIn: CheckInRecord }>(`/checkins/${id}`);
};
