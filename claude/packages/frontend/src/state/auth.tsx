import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@kilnflow/shared';
import { api, setUserIdProvider } from '../api';

interface AuthState {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  setUser: (u: User | null) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

const STORAGE_KEY = 'kilnflow.currentUserId';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Register the provider for the api wrapper exactly once.
  useEffect(() => {
    setUserIdProvider(() => {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    });
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await api.listUsers();
      setUsers(list);
      const savedId = (() => {
        try {
          return localStorage.getItem(STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      const found = savedId ? list.find((u) => u.id === savedId) ?? null : null;
      setCurrentUserState(found);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const setUser = (u: User | null) => {
    try {
      if (u) localStorage.setItem(STORAGE_KEY, u.id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    setCurrentUserState(u);
  };

  const value = useMemo<AuthState>(
    () => ({ currentUser, users, loading, setUser, refresh }),
    [currentUser, users, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
