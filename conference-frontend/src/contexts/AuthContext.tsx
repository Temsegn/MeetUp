import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor?: string;
  token: string; // JWT — needed for socket handshake
}

const TOKEN_KEY = 'conference_token';
const LEGACY_TOKEN_KEY = 'meetspace_token';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

interface AuthContextType {
  user: User | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function readStoredToken(): string | null {
  const current = localStorage.getItem(TOKEN_KEY);
  if (current) return current;
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacy) {
    localStorage.setItem(TOKEN_KEY, legacy);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacy;
  }
  return null;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredToken();
    if (!stored) { setLoading(false); return; }

    apiFetch<Omit<User, 'token'>>('/auth/me', {
      headers: { Authorization: `Bearer ${stored}`, 'Content-Type': 'application/json' },
    })
      .then(u => setUser({ ...u, token: stored }))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const { token, user: u } = await apiFetch<{ token: string; user: Omit<User, 'token'> }>(
      '/auth/signin',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setUser({ ...u, token });
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { token, user: u } = await apiFetch<{ token: string; user: Omit<User, 'token'> }>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify({ name, email, password }) },
    );
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setUser({ ...u, token });
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token: user?.token ?? null, signIn, signUp, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
