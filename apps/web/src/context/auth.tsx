'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { User, AuthResponse } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, profileType: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      api.get<User>('/api/users/me')
        .then(setUser)
        .catch(() => Cookies.remove('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string): Promise<User> {
    const res = await api.post<AuthResponse>('/api/auth/login', { email, password });
    Cookies.set('token', res.access_token, { expires: 7 });
    const me = await api.get<User>('/api/users/me');
    setUser(me);
    return me;
  }

  async function register(email: string, password: string, profileType: string) {
    const res = await api.post<AuthResponse>('/api/auth/register', {
      email,
      password,
      profileType,
    });
    Cookies.set('token', res.access_token, { expires: 7 });
    const me = await api.get<User>('/api/users/me');
    setUser(me);
  }

  function logout() {
    Cookies.remove('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
