import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { resolveAssetUrl } from '#/lib/asset-url';
import { signIn, signOut, useSession } from '#/lib/auth-client';

const AUTH_USER_CACHE_KEY = 'vornway.auth.cached-user';

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  updatedAt: Date;
}

function getInitialOnlineState() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<
      Omit<User, 'updatedAt'> & { updatedAt: string }
    >;

    if (!parsed.id || !parsed.email) return null;

    return {
      id: parsed.id,
      name: parsed.name ?? '',
      email: parsed.email,
      image: parsed.image ?? null,
      updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(0),
    };
  } catch {
    return null;
  }
}

function writeCachedUser(user: User) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    AUTH_USER_CACHE_KEY,
    JSON.stringify({
      ...user,
      updatedAt: user.updatedAt.toISOString(),
    }),
  );
}

function clearCachedUser() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_USER_CACHE_KEY);
}

export type AuthContextProps = {
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  user: User | null;
};

export const AuthContext = createContext<AuthContextProps | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    readCachedUser(),
  );
  const [isOnline, setIsOnline] = useState(getInitialOnlineState);
  const [loading, setLoading] = useState(false);
  const [forcedLoggedOut, setForcedLoggedOut] = useState(false);
  const { data, isPending } = useSession();

  const isAuthenticated =
    !forcedLoggedOut && (data !== null || (!isOnline && currentUser !== null));

  const login = useCallback(async (email: string, otp: string) => {
    const result = await signIn.emailOtp({
      email,
      otp,
    });
    if (result.error) {
      throw new Error(result.error.code);
    }
  }, []);

  const logout = useCallback(async () => {
    setForcedLoggedOut(true);
    setLoading(true);
    await signOut();
    clearCachedUser();
    setCurrentUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (data) {
      setForcedLoggedOut(false);
      const user = {
        id: data?.user.id ?? '',
        name: data?.user.name ?? '',
        email: data?.user.email ?? '',
        image: resolveAssetUrl(
          data?.user.image ?? null,
          data?.user.updatedAt ?? null,
        ),
        updatedAt: data?.user.updatedAt ?? new Date(0),
      };

      setCurrentUser(user);
      writeCachedUser(user);
      return;
    }

    if (!data && isOnline) {
      clearCachedUser();
      setCurrentUser(null);
    }
  }, [data, isOnline]);

  return (
    <AuthContext.Provider
      value={{
        loading: (isPending && isOnline) || loading,
        isAuthenticated,
        login,
        logout,
        user: currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
