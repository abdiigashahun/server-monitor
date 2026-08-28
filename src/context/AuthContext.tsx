import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { AuthUser, PermissionKey } from '../types';
import * as authApi from '../api/auth';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../api/tokenStore';
import { setUnauthorizedHandler } from '../api/client';

type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  /** True only when the user's permission map explicitly grants the key. */
  can: (permission: PermissionKey | string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  // If we already hold tokens, we must verify them before showing the app.
  const [status, setStatus] = useState<AuthStatus>(() =>
    getAccessToken() || getRefreshToken() ? 'booting' : 'unauthenticated',
  );

  // When the API client gives up (refresh failed / no refresh token), drop to login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Boot-time hydration: validate the stored session against /auth/me.
  useEffect(() => {
    let cancelled = false;
    if (status !== 'booting') return;
    authApi
      .me()
      .then(({ user: me }) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        clearTokens();
        setUser(null);
        setStatus('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    const payload = await authApi.login(email, password);
    setTokens(payload.accessToken, payload.refreshToken, rememberMe);
    setUser(payload.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      // Best-effort server-side revocation; never block logout on it.
      try {
        await authApi.logout(refresh);
      } catch {
        /* ignore */
      }
    }
    clearTokens();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const can = useCallback(
    (permission: PermissionKey | string): boolean =>
      Boolean(user && user.permissions && user.permissions[permission] === true),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isAuthenticated: status === 'authenticated',
        login,
        logout,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
