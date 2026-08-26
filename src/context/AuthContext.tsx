import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, UserRole, RolePermissions, UserSession, UserAccount } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../utils/constants';
import { authApi, BackendUser } from '../services/authApi';
import { usersApi } from '../services/usersApi';
import { tokenStorage, ApiError } from '../services/apiClient';

export interface CreateAccountInput {
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  roleTitle?: string;
  department?: string;
  phone?: string;
  password: string;
  twoFactorEnabled?: boolean;
  avatarUrl?: string;
  customPermissions?: Partial<RolePermissions>;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBackendConnected: boolean;
  accounts: UserAccount[];
  activeSessions: UserSession[];
  login: (
    usernameOrEmail: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  switchUserAccount: (accountId: string) => void;
  terminateSession: (sessionId: string) => void;
  hasPermission: (permissionKey: keyof RolePermissions) => boolean;
  updateUser: (data: Partial<AuthUser>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  createAccount: (data: CreateAccountInput) => Promise<{ success: boolean; message?: string; account?: UserAccount }>;
  updateAccount: (id: string, data: Partial<AuthUser> & { password?: string }) => Promise<{ success: boolean; message?: string }>;
  deleteAccount: (id: string) => Promise<{ success: boolean; message?: string }>;
  toggleAccountStatus: (id: string) => void;
  refreshUsersList: () => Promise<void>;
  authAuditLogs: Array<{
    action: string;
    resource: string;
    details: string;
    status: 'Success' | 'Denied' | 'Warning';
    user: string;
    role: string;
    timestamp: string;
    ipAddress: string;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'itdb_auth_session';
const USERNAME_DIRECTORY_KEY = 'itdb_username_directory';

function getStoredDirectory(): Record<string, string> {
  const defaults: Record<string, string> = {
    'admin': 'admin@server-monitor.local',
    'admin@server-monitor.local': 'admin@server-monitor.local',
    'admin@itdb.gov.et': 'admin@itdb.gov.et',
    'operator': 'amy@itdb.gov.et',
    'oprator': 'amy@itdb.gov.et',
    'amy': 'amy@itdb.gov.et',
    'amy@itdb.gov.et': 'amy@itdb.gov.et',
    'viewer': 'segni@itdb.gov.et',
    'user': 'segni@itdb.gov.et',
    'segni': 'segni@itdb.gov.et',
    'segni@itdb.gov.et': 'segni@itdb.gov.et',
  };

  try {
    const saved = localStorage.getItem(USERNAME_DIRECTORY_KEY);
    if (saved) {
      return { ...defaults, ...JSON.parse(saved) };
    }
  } catch {}
  return defaults;
}

function saveToDirectory(entries: Record<string, string>) {
  try {
    const current = getStoredDirectory();
    const updated = { ...current, ...entries };
    localStorage.setItem(USERNAME_DIRECTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function mapBackendRoleToFrontend(role: string): UserRole {
  const upper = (role || '').toUpperCase();
  if (upper === 'ADMIN') return 'Admin';
  if (upper === 'OPERATOR') return 'Operator';
  return 'User';
}

export function mapFrontendRoleToBackend(role: UserRole): 'ADMIN' | 'OPERATOR' | 'VIEWER' {
  if (role === 'Admin') return 'ADMIN';
  if (role === 'Operator') return 'OPERATOR';
  return 'VIEWER';
}

export function mapBackendPermissionsToFrontend(role: UserRole, perms: Record<string, boolean> = {}): RolePermissions {
  const isAdmin = role === 'Admin';
  const isOperator = role === 'Operator';
  return {
    canAddServer: perms['servers:write'] ?? isAdmin,
    canEditServer: perms['servers:write'] ?? isAdmin,
    canDeleteServer: perms['servers:write'] ?? isAdmin,
    canAckAlerts: isAdmin, // Only Admin can acknowledge alerts
    canResolveAlerts: isOperator, // Only Operator can resolve alerts
    canEditThresholds: perms['thresholds:write'] ?? isAdmin,
    canManageTokens: isAdmin,
    canTriggerFailover: isAdmin,
    canToggleDcMaintenance: isAdmin,
    canViewAuditLogs: perms['audit:read'] ?? isAdmin,
    canManageUsers: perms['users:write'] ?? isAdmin,
    canExportReports: perms['reports:read'] ?? true,
  };
}

export function convertBackendUserToAuthUser(bUser: BackendUser): AuthUser {
  const role = mapBackendRoleToFrontend(bUser.role);
  const permissions = mapBackendPermissionsToFrontend(role, bUser.permissions || {});

  const avatarUrl =
    role === 'Admin'
      ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
      : role === 'Operator'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200';

  const roleTitle =
    role === 'Admin'
      ? 'Senior Infrastructure Controller & Super Admin'
      : role === 'Operator'
      ? 'Tier-2 NOC Systems Operator'
      : 'Federal Security & Compliance Auditor';

  const department =
    role === 'Admin'
      ? 'Federal IT Infrastructure & NOC'
      : role === 'Operator'
      ? 'National Data Center Operations Group'
      : 'Federal Police Commission / IT Oversight';

  return {
    id: bUser.id,
    username: bUser.email.split('@')[0],
    name: bUser.name,
    email: bUser.email,
    role,
    roleTitle,
    department,
    phone: '+251 11 551 7000',
    avatarUrl,
    twoFactorEnabled: true,
    lastLogin: new Date().toISOString(),
    accountStatus: 'Active',
    createdAt: bUser.createdAt,
    ipAddress: '10.200.4.15',
    permissions,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [authAuditLogs, setAuthAuditLogs] = useState<AuthContextType['authAuditLogs']>([]);

  const isAuthenticated = user !== null;

  // Initialize session and verify token with backend
  useEffect(() => {
    let isMounted = true;

    async function checkBackendSession() {
      try {
        await authApi.checkHealth();
        if (isMounted) setIsBackendConnected(true);

        const token = tokenStorage.getAccessToken();
        if (token) {
          try {
            const meRes = await authApi.getMe();
            if (isMounted && meRes?.user) {
              const authUser = convertBackendUserToAuthUser(meRes.user);
              setUser(authUser);
            }
          } catch {
            // Try refresh token
            try {
              const refRes = await authApi.refreshToken();
              if (isMounted && refRes?.user) {
                const authUser = convertBackendUserToAuthUser(refRes.user);
                setUser(authUser);
              }
            } catch {
              // Session expired
              setUser(null);
              tokenStorage.clearTokens();
            }
          }
        }
      } catch {
        if (isMounted) setIsBackendConnected(false);
      }
    }

    checkBackendSession();

    const handleSessionExpired = () => {
      setUser(null);
      tokenStorage.clearTokens();
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  // Sync users list from backend
  const refreshUsersList = async () => {
    if (!tokenStorage.getAccessToken()) return;
    try {
      const res = await usersApi.getUsers({ limit: 100 });
      if (res?.users && Array.isArray(res.users)) {
        const dirUpdates: Record<string, string> = {};
        const backendAccounts: UserAccount[] = res.users.map((bUser) => {
          const authUser = convertBackendUserToAuthUser(bUser);
          const usernameFromEmail = bUser.email.split('@')[0].toLowerCase();
          dirUpdates[usernameFromEmail] = bUser.email;
          if (bUser.name) {
            dirUpdates[bUser.name.toLowerCase().trim()] = bUser.email;
            dirUpdates[bUser.name.toLowerCase().replace(/\s+/g, '.')] = bUser.email;
          }
          return {
            id: bUser.id,
            username: usernameFromEmail,
            passwordHash: '••••••••',
            user: authUser,
          };
        });
        saveToDirectory(dirUpdates);
        setAccounts(backendAccounts);
      }
    } catch (e) {
      console.warn('Could not fetch backend users:', e);
    }
  };

  useEffect(() => {
    if (user?.role === 'Admin') {
      refreshUsersList();
    }
  }, [user?.role]);

  // Sync active user to storage
  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const logAuthEvent = (
    action: string,
    resource: string,
    details: string,
    status: 'Success' | 'Denied' | 'Warning',
    targetUser?: string,
    targetRole?: string
  ) => {
    const event = {
      action,
      resource,
      details,
      status,
      user: targetUser || user?.name || 'Guest User',
      role: targetRole || user?.role || 'Anonymous',
      timestamp: new Date().toISOString(),
      ipAddress: user?.ipAddress || '10.200.4.15',
    };
    setAuthAuditLogs((prev) => [event, ...prev]);
  };

  const login = async (
    usernameOrEmail: string,
    password: string,
    rememberMe = false
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmedInput = usernameOrEmail.trim();
    const trimmedPass = password.trim();

    if (!trimmedInput) {
      return { success: false, message: 'Please enter your username or email.' };
    }

    if (!trimmedPass) {
      return { success: false, message: 'Please enter your password.' };
    }

    const directory = getStoredDirectory();
    const lower = trimmedInput.toLowerCase();

    // Build ordered list of candidate emails to try against backend API
    const candidates: string[] = [];

    // 1. Direct match in persistent username directory (e.g. 'amy', 'segni', 'admin', 'operator')
    if (directory[lower]) {
      candidates.push(directory[lower]);
    }

    // 2. Check stored accounts in state
    const storedAccount = accounts.find(
      (a) =>
        a.username.toLowerCase() === lower ||
        a.user.name.toLowerCase() === lower ||
        a.user.email.toLowerCase().startsWith(`${lower}@`)
    );
    if (storedAccount?.user?.email) {
      candidates.push(storedAccount.user.email);
    }

    // 3. If entered input contains '@', try directly
    if (trimmedInput.includes('@')) {
      candidates.push(trimmedInput);
    } else {
      // 4. Candidate domain combinations
      candidates.push(
        `${lower}@itdb.gov.et`,
        `${lower}@server-monitor.local`,
        `${lower.replace(/\s+/g, '.')}@itdb.gov.et`,
        `${lower.replace(/\s+/g, '.')}@server-monitor.local`
      );
    }

    // Deduplicate candidates
    const uniqueCandidates = Array.from(new Set(candidates));

    let lastError = 'Authentication failed. Please verify credentials.';

    // Try candidates against live backend API
    for (const email of uniqueCandidates) {
      try {
        const authRes = await authApi.login(email, trimmedPass);
        if (authRes && authRes.user) {
          const authUser = convertBackendUserToAuthUser(authRes.user);
          setUser(authUser);
          setIsBackendConnected(true);

          // Save successful mapping
          saveToDirectory({
            [lower]: email,
            [authUser.username.toLowerCase()]: email,
            [authUser.name.toLowerCase()]: email,
          });

          const newSession: UserSession = {
            sessionId: `sess-${Date.now().toString(36)}`,
            userId: authUser.id,
            username: authUser.username,
            name: authUser.name,
            role: authUser.role,
            ipAddress: '10.200.4.15',
            userAgent: navigator.userAgent,
            loginTime: new Date().toISOString(),
            lastActive: 'Just now',
            currentPage: 'Dashboard Overview (#/dashboard)',
            status: 'Active',
          };

          setActiveSessions((prev) => [newSession, ...prev.filter((s) => s.userId !== authUser.id)]);

          logAuthEvent(
            'Backend Login Success',
            'POST /auth/login',
            `Authenticated "${authUser.name}" [${authUser.role}] via REST API.`,
            'Success',
            authUser.name,
            authUser.role
          );

          return { success: true };
        }
      } catch (apiErr: any) {
        lastError = apiErr.message || lastError;
      }
    }

    return {
      success: false,
      message: lastError,
    };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {}
    setUser(null);
    tokenStorage.clearTokens();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const switchRole = (newRole: UserRole) => {
    const targetAccount = accounts.find((acc) => acc.user.role === newRole);
    if (targetAccount) {
      setUser(targetAccount.user);
    }
  };

  const switchUserAccount = (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId || a.user.id === accountId);
    if (target) {
      setUser(target.user);
    }
  };

  const terminateSession = (sessionId: string) => {
    setActiveSessions((prev) =>
      prev.map((s) => (s.sessionId === sessionId ? { ...s, status: 'Terminated' as const } : s))
    );
  };

  const hasPermission = (permissionKey: keyof RolePermissions): boolean => {
    if (!user) return false;
    if (permissionKey === 'canResolveAlerts') {
      return user.role === 'Operator';
    }
    if (permissionKey === 'canAckAlerts') {
      return user.role === 'Admin';
    }
    if (user.role === 'Admin') return true;
    return Boolean(user.permissions && user.permissions[permissionKey]);
  };

  const updateUser = (data: Partial<AuthUser>) => {
    if (!user) return;
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  const changePassword = async (_currentPassword: string, _newPassword: string): Promise<{ success: boolean; message?: string }> => {
    return { success: true, message: 'Password update requested.' };
  };

  const createAccount = async (data: CreateAccountInput): Promise<{ success: boolean; message?: string; account?: UserAccount }> => {
    try {
      const bRole = mapFrontendRoleToBackend(data.role);
      const res = await usersApi.createUser({
        name: data.name,
        email: data.email,
        password: data.password || 'Admin123!',
        role: bRole,
      });

      if (res?.user) {
        const authUser = convertBackendUserToAuthUser(res.user);
        const resolvedUsername = data.username?.trim().toLowerCase() || res.user.email.split('@')[0].toLowerCase();
        
        // Save into persistent username directory
        const dirEntries: Record<string, string> = {
          [resolvedUsername]: res.user.email,
          [res.user.email.toLowerCase()]: res.user.email,
        };
        if (data.name) {
          dirEntries[data.name.toLowerCase().trim()] = res.user.email;
          dirEntries[data.name.toLowerCase().replace(/\s+/g, '.')] = res.user.email;
        }
        saveToDirectory(dirEntries);

        const newAccount: UserAccount = {
          id: res.user.id,
          username: resolvedUsername,
          passwordHash: data.password || 'Admin123!',
          user: authUser,
        };
        setAccounts((prev) => [newAccount, ...prev]);
        return { success: true, account: newAccount };
      }
      return { success: false, message: 'Failed to create user on backend.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to create user on backend.' };
    }
  };

  const updateAccount = async (id: string, data: Partial<AuthUser> & { password?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const updatePayload: any = {};
      if (data.name) updatePayload.name = data.name;
      if (data.email) updatePayload.email = data.email;
      if (data.password) updatePayload.password = data.password;
      if (data.role) updatePayload.role = mapFrontendRoleToBackend(data.role);

      await usersApi.updateUser(id, updatePayload);
      await refreshUsersList();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update user on backend.' };
    }
  };

  const deleteAccount = async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await usersApi.deleteUser(id);
      setAccounts((prev) => prev.filter((acc) => acc.id !== id && acc.user.id !== id));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to delete user on backend.' };
    }
  };

  const toggleAccountStatus = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id || acc.user.id === id) {
          const nextStatus = acc.user.accountStatus === 'Suspended' ? 'Active' : 'Suspended';
          return {
            ...acc,
            user: { ...acc.user, accountStatus: nextStatus },
          };
        }
        return acc;
      })
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isBackendConnected,
        accounts,
        activeSessions,
        login,
        logout,
        switchRole,
        switchUserAccount,
        terminateSession,
        hasPermission,
        updateUser,
        changePassword,
        createAccount,
        updateAccount,
        deleteAccount,
        toggleAccountStatus,
        refreshUsersList,
        authAuditLogs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
