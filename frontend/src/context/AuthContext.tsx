import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ROUTES } from '../lib/constants';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/v1/profile', { skipRedirect: true });
      if (res.success && res.data) {
        const userData = res.data.user || (res.data.username ? res.data : null);
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<User>('/api/v1/login', { email, password });
    if (res.success) {
      await refreshUser();
    }
    return { success: res.success, message: res.message };
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await api.get('/api/v1/logout');
    } catch {
      // proceed even if logout API fails
    }
    setUser(null);
    navigate(ROUTES.HOME);
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
