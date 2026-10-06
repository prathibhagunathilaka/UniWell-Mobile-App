
const defaultApiBase = 'http://172.20.10.4:5000/api';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || defaultApiBase).replace(/\/$/, '');

// Shared authentication integration point: Member 1 owns the real auth state/session provider.
// Member 2 only reads the current token via this provider and does not create its own login flow.
let authTokenProvider: (() => string | null) | null = null;
let unauthorizedHandler: (() => void | Promise<void>) | null = null;

export const registerAuthTokenProvider = (provider: (() => string | null) | null) => {
  authTokenProvider = provider;
};

export const registerUnauthorizedHandler = (handler: (() => void | Promise<void>) | null) => {
  unauthorizedHandler = handler;
};

export const getAuthToken = () => {
  if (!authTokenProvider) {
    return '';
  }

  return authTokenProvider() || '';
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  headers.set('Accept', 'application/json');

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && unauthorizedHandler) {
    await unauthorizedHandler();
  }

  const contentType = response.headers.get('content-type') || '';
  const responseBody = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const isOtpRequest = path === '/auth/forgot-password' || path === '/auth/profile/request-otp';
    const fallbackMessages: Record<number, string> = {
      400: 'Please check your information and try again.',
      401: 'Your session has expired. Please sign in again.',
      404: 'Verification service is currently unavailable.',
    };
    const message = isOtpRequest && response.status === 503
      ? 'Unable to send verification code. Please try again.'
      : typeof responseBody === 'string'
        ? fallbackMessages[response.status] || (response.status >= 500
          ? 'The service is temporarily unavailable. Please try again.'
          : 'Request failed. Please try again.')
        : fallbackMessages[response.status] || responseBody?.message || 'Request failed';
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (typeof responseBody === 'string' ? JSON.parse(responseBody || '{}') : responseBody) as T;
};
