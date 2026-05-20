import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { signIn, signOut, useSession } from '#/lib/auth-client';
import { resolveAssetUrl } from '#/lib/asset-url';

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  updatedAt: Date;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const { data, isPending } = useSession();

  const isAuthenticated = data !== null;

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
    setLoading(true);
    await signOut();
    setCurrentUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (data) {
      setCurrentUser({
        id: data?.user.id ?? '',
        name: data?.user.name ?? '',
        email: data?.user.email ?? '',
        image: resolveAssetUrl(
          data?.user.image ?? null,
          data?.user.updatedAt ?? null,
        ),
        updatedAt: data?.user.updatedAt ?? '',
      });
    }
  }, [data]);

  return (
    <AuthContext.Provider
      value={{
        loading: isPending || loading,
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
