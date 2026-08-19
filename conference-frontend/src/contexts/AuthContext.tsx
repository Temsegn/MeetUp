import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  authService,
  setAccessToken,
  refreshSession,
  getAccessToken,
  User,
} from '../services/auth/auth.service';

/**
 * Auth state for the app.
 *
 * The access token is held in memory only (see auth.service) and restored on
 * boot by exchanging the HttpOnly refresh cookie for a fresh access token.
 * Nothing sensitive is written to localStorage — the old localStorage-based
 * flow has been removed.
 */

interface AuthContextType {
  user: User | null;
  /** In-memory access token — used for the Socket.IO handshake. */
  token: string | null;
  initializing: boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signUp: (name: string, email: string, password: string, rememberMe: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  /** Re-fetch the current user (e.g. after email verification). */
  refreshUser: () => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Boot: restore the session from the refresh cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // getCurrentUser() auto-refreshes the access token on 401.
        const u = await authService.getCurrentUser();
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const u = await authService.signIn({ email, password, rememberMe });
    setUser(u);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, rememberMe: boolean) => {
    const u = await authService.signUp({ name, email, password, rememberMe });
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const signOutAll = useCallback(async () => {
    await authService.signOutAll();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authService.getCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  const resendVerification = useCallback(async () => {
    await authService.resendVerification();
    await refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: getAccessToken(),
        initializing,
        signIn,
        signUp,
        signOut,
        signOutAll,
        refreshUser,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export { setAccessToken, refreshSession };
