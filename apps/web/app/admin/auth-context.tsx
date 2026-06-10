'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminApi, AuthUser, tokenStore } from '@/lib/admin-api';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from localStorage, then verify the token is still valid against /auth/me.
    const cached = tokenStore.getUser();
    if (!cached) {
      setLoading(false);
      return;
    }
    setUser(cached);
    adminApi
      .me()
      .then((fresh) => setUser(fresh))
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await adminApi.login(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    adminApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
