
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
  const isLoginRequest = path === '/auth/login' || path === '/auth/admin/login';
  const isOtpRequest = path.includes('otp') || path === '/auth/forgot-password' || path === '/auth/reset-password';

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

  if (response.status === 401 && token && !isLoginRequest && unauthorizedHandler) {
    await unauthorizedHandler();
  }

  const contentType = response.headers.get('content-type') || '';
  const responseBody = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const responseMessage = typeof responseBody === 'string' ? '' : responseBody?.message;
    const fallbackMessages: Record<number, string> = {
      400: 'Please check your information and try again.',
      401: 'Your session has expired. Please sign in again.',
      404: isOtpRequest
        ? 'Verification service is currently unavailable.'
        : isLoginRequest
          ? 'Sign-in service is currently unavailable. Please try again.'
          : 'The requested service is unavailable. Please try again.',
      429: 'Too many attempts. Please try again later.',
    };
    const message = isOtpRequest && response.status === 503
      ? 'Unable to send verification code. Please try again.'
      : response.status === 404
        ? fallbackMessages[404]
        : response.status === 401 && token && !isLoginRequest
          ? fallbackMessages[401]
          : typeof responseMessage === 'string' && responseMessage
            ? responseMessage
            : fallbackMessages[response.status] || (response.status >= 500
              ? 'The service is temporarily unavailable. Please try again.'
              : 'Request failed. Please try again.');
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (typeof responseBody === 'string' ? JSON.parse(responseBody || '{}') : responseBody) as T;
};
