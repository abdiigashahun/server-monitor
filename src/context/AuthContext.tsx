import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, UserRole, RolePermissions, UserSession } from '../types';
import { DEMO_ACCOUNTS, ROLE_PERMISSIONS, INITIAL_SESSIONS } from '../utils/mockData';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  activeSessions: UserSession[];
  login: (
    name: string,
    role: UserRole,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  terminateSession: (sessionId: string) => void;
  hasPermission: (permissionKey: keyof RolePermissions) => boolean;
  updateUser: (data: Partial<AuthUser>) => void;
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    // Initial entry requires filling login form
    return null;
  });

  const [activeSessions, setActiveSessions] = useState<UserSession[]>(INITIAL_SESSIONS);
  const [authAuditLogs, setAuthAuditLogs] = useState<AuthContextType['authAuditLogs']>([]);

  const isAuthenticated = user !== null;

  // Sync to storage
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
    name: string,
    role: UserRole,
    password: string,
    rememberMe = false
  ): Promise<{ success: boolean; message?: string }> => {
    // Artificial small delay to simulate secure biometric / TLS cryptographic handshake
    await new Promise((resolve) => setTimeout(resolve, 500));

    const trimmedName = name.trim();
    const trimmedPass = password.trim();

    if (!trimmedName) {
      return { success: false, message: 'Please enter your name or officer ID.' };
    }

    if (!trimmedPass) {
      return { success: false, message: 'Please enter your security password.' };
    }

    // Expected passwords based on role
    const expectedPass = role === 'Admin' ? 'admin123' : role === 'Operator' ? 'operator123' : 'user123';
    const fallbackMatches =
      trimmedPass === expectedPass ||
      trimmedPass === `${role.toLowerCase()}` ||
      trimmedPass === 'admin123' ||
      DEMO_ACCOUNTS.some((a) => a.passwordHash === trimmedPass && a.user.role === role);

    if (!fallbackMatches) {
      logAuthEvent(
        'Login Failed',
        'POST /api/v1/auth/login',
        `Incorrect password provided for officer "${trimmedName}" requesting role [${role}]. Access Denied.`,
        'Denied',
        trimmedName,
        role
      );
      return {
        success: false,
        message: `Invalid password for role ${role}. (Use default: ${expectedPass})`,
      };
    }

    // Match base avatar and preset or create custom officer user
    const matchedAccount = DEMO_ACCOUNTS.find((acc) => acc.user.role === role);
    const updatedUser: AuthUser = {
      id: matchedAccount ? matchedAccount.user.id : `usr-${Date.now().toString(36)}`,
      name: trimmedName,
      username: trimmedName.toLowerCase().replace(/\s+/g, '.'),
      email: matchedAccount ? matchedAccount.user.email : `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@itdb.gov.et`,
      role,
      roleTitle: matchedAccount ? matchedAccount.user.roleTitle : role === 'Admin' ? 'Lead Systems Architect & Super Admin' : role === 'Operator' ? 'Senior NOC Operations Specialist' : 'External Security Auditor & Analyst',
      department: matchedAccount ? matchedAccount.user.department : 'Federal IT Infrastructure & NOC',
      phone: matchedAccount ? matchedAccount.user.phone : '+251 11 551 7000',
      avatarUrl: matchedAccount ? matchedAccount.user.avatarUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      twoFactorEnabled: true,
      lastLogin: new Date().toISOString(),
      permissions: ROLE_PERMISSIONS[role],
      ipAddress: '10.200.4.15',
    };

    setUser(updatedUser);

    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }

    // Add / update active session
    const newSession: UserSession = {
      sessionId: `sess-${Date.now().toString(36)}`,
      userId: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      ipAddress: updatedUser.ipAddress || '10.200.4.15',
      userAgent: navigator.userAgent,
      loginTime: new Date().toISOString(),
      lastActive: 'Just now',
      currentPage: 'Dashboard Overview (#/dashboard)',
      status: 'Active',
    };

    setActiveSessions((prev) => [
      newSession,
      ...prev.filter((s) => s.userId !== updatedUser.id),
    ]);

    logAuthEvent(
      'Login Success',
      'POST /api/v1/auth/login',
      `Authenticated officer "${updatedUser.name}" as [${updatedUser.role}]. Portal session active.`,
      'Success',
      updatedUser.name,
      updatedUser.role
    );

    return { success: true };
  };

  const logout = () => {
    if (user) {
      logAuthEvent(
        'User Logout',
        'POST /api/v1/auth/logout',
        `Session terminated by user ${user.name} (${user.role}).`,
        'Success',
        user.name,
        user.role
      );

      // Remove from active sessions
      setActiveSessions((prev) => prev.filter((s) => s.userId !== user.id));
    }

    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const switchRole = (newRole: UserRole) => {
    const targetAccount = DEMO_ACCOUNTS.find((acc) => acc.user.role === newRole);
    if (!targetAccount) return;

    const previousRole = user?.role || 'None';
    const updatedUser: AuthUser = {
      ...targetAccount.user,
      lastLogin: new Date().toISOString(),
    };

    setUser(updatedUser);

    logAuthEvent(
      'Role Switch (Demo)',
      'System Role Management',
      `Switched active role profile from [${previousRole}] to [${newRole}].`,
      'Warning',
      updatedUser.name,
      updatedUser.role
    );
  };

  const terminateSession = (sessionId: string) => {
    const target = activeSessions.find((s) => s.sessionId === sessionId);
    if (!target) return;

    setActiveSessions((prev) =>
      prev.map((s) => (s.sessionId === sessionId ? { ...s, status: 'Terminated' } : s))
    );

    logAuthEvent(
      'Force Terminate Session',
      `Session ID #${sessionId}`,
      `Admin terminated active session for user ${target.name} (${target.ipAddress})`,
      'Warning',
      user?.name || 'Admin',
      'Admin'
    );
  };

  const hasPermission = (permissionKey: keyof RolePermissions): boolean => {
    if (!user) return false;
    return Boolean(user.permissions[permissionKey]);
  };

  const updateUser = (data: Partial<AuthUser>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        activeSessions,
        login,
        logout,
        switchRole,
        terminateSession,
        hasPermission,
        updateUser,
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
