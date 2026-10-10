import { router } from 'expo-router';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApiError, registerAuthTokenProvider, registerUnauthorizedHandler } from '@/services/api';
import {
  AuthUser,
  CounsellorRegistration,
  getCurrentUser,
  login as loginRequest,
  registerCounsellor as registerCounsellorRequest,
  registerStudent as registerStudentRequest,
  StudentRegistration,
  UserRole,
} from '@/services/authService';
import { readStoredAuthToken, removeStoredAuthToken, storeAuthToken } from '@/services/authStorage';
import { unregisterPushToken } from '@/services/pushService';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  sessionNotice: string;
  authFlowStarted: boolean;
  beginAuthFlow: () => void;
  updateUser: (user: AuthUser) => void;
  login: (identifier: string, password: string, requiredRole?: UserRole) => Promise<AuthUser>;
  registerStudent: (registration: StudentRegistration, verificationToken: string) => Promise<AuthUser>;
  registerCounsellor: (registration: CounsellorRegistration, verificationToken: string) => Promise<string>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_RESTORE_TIMEOUT_MS = 15_000;

const routeForRole = (role: UserRole) => {
  if (role === 'student') return '/student/dashboard';
  if (role === 'counsellor') return '/counsellor';
  return '/admin';
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState('');
  const [authFlowStarted, setAuthFlowStarted] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    await removeStoredAuthToken();
  }, []);

  const signOut = useCallback(async () => {
    // Everything below runs in the same tick so React renders ONE state: no user, auth flow started,
    // heading to the login form. (Clearing the session first used to let the route guard briefly see
    // "signed out + welcome not seen" and bounce the person to the Get Started screen.)
    setAuthFlowStarted(true);
    const clearing = clearSession();
    router.replace('/auth/login');
    await clearing;
  }, [clearSession]);

  const beginAuthFlow = useCallback(() => {
    setAuthFlowStarted(true);
    router.replace('/auth/login');
  }, []);

  const setSession = useCallback(async (sessionToken: string, sessionUser: AuthUser) => {
    await storeAuthToken(sessionToken);
    tokenRef.current = sessionToken;
    setToken(sessionToken);
    setUser(sessionUser);
    setSessionNotice('');
  }, []);

  useEffect(() => {
    registerAuthTokenProvider(() => tokenRef.current);
    registerUnauthorizedHandler(signOut);

    let mounted = true;
    const restoreSession = async () => {
      console.info('[AUTH] initialization started');
      try {
        const storedToken = await readStoredAuthToken();
        console.info('[AUTH] token exists:', Boolean(storedToken));
        if (!storedToken) {
          console.info('[AUTH] token valid: false');
          console.info('[AUTH] user exists: false');
          console.info('[AUTH] user role: null');
          console.info('[AUTH] isAuthenticated: false');
          return;
        }

        tokenRef.current = storedToken;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SESSION_RESTORE_TIMEOUT_MS);
        let response: Awaited<ReturnType<typeof getCurrentUser>>;
        try {
          response = await getCurrentUser(controller.signal);
        } finally {
          clearTimeout(timeout);
        }
        if (mounted) {
          setToken(storedToken);
          setUser(response.user);
          console.info('[AUTH] token valid:', true);
          console.info('[AUTH] user exists:', Boolean(response.user));
          console.info('[AUTH] user role:', response.user?.role ?? null);
          console.info('[AUTH] isAuthenticated:', Boolean(response.user && storedToken));
        }
      } catch (error) {
        const invalidSession = error instanceof ApiError && error.status === 401;
        if (invalidSession) {
          await clearSession();
        } else {
          tokenRef.current = null;
        }

        if (mounted) {
          console.info('[AUTH] user exists: false');
          console.info('[AUTH] user role: null');
          console.info('[AUTH] isAuthenticated: false');
          if (invalidSession) {
            console.info('[AUTH] token valid:', false);
            setSessionNotice('Your saved session is no longer valid. Please sign in again.');
          } else {
            setToken(null);
            setUser(null);
            console.info('[AUTH] token valid: unknown (session validation failed)');
            setSessionNotice('Unable to validate your saved session. Please check your connection and try again.');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
          console.info('[AUTH] initialization complete');
        }
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
      registerAuthTokenProvider(null);
      registerUnauthorizedHandler(null);
    };
  }, [clearSession, signOut]);

  const login = useCallback(async (identifier: string, password: string, requiredRole?: UserRole) => {
    const session = await loginRequest(identifier, password, requiredRole);
    if (requiredRole && session.user.role !== requiredRole) {
      throw new Error(`This sign-in page is for ${requiredRole} accounts.`);
    }

    await setSession(session.token, session.user);
    router.replace(routeForRole(session.user.role));
    return session.user;
  }, [setSession]);

  const registerStudent = useCallback(async (registration: StudentRegistration, verificationToken: string) => {
    const session = await registerStudentRequest(registration, verificationToken);
    await setSession(session.token, session.user);
    router.replace('/student/dashboard');
    return session.user;
  }, [setSession]);

  const registerCounsellor = useCallback(async (registration: CounsellorRegistration, verificationToken: string) => {
    const response = await registerCounsellorRequest(registration, verificationToken);
    return response.message;
  }, []);

  // Explicit sign-out by the person: stop phone notifications for this account first, then sign out.
  const logout = useCallback(async () => {
    await unregisterPushToken();
    await signOut();
  }, [signOut]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(user && token),
    loading,
    sessionNotice,
    authFlowStarted,
    beginAuthFlow,
    updateUser: setUser,
    login,
    registerStudent,
    registerCounsellor,
    logout,
  }), [user, token, loading, sessionNotice, authFlowStarted, beginAuthFlow, login, registerStudent, registerCounsellor, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
};

export const getAuthenticatedHome = (user: AuthUser | null) =>
  user ? routeForRole(user.role) : '/';
