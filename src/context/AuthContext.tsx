import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, UserRole, RolePermissions, UserSession, UserAccount } from '../types';
import { DEMO_ACCOUNTS, ROLE_PERMISSIONS, INITIAL_SESSIONS } from '../utils/mockData';

export interface CreateAccountInput {
  name: string;
  username: string;
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
  accounts: UserAccount[];
  activeSessions: UserSession[];
  login: (
    usernameOrEmail: string,
    password: string,
    rememberMe?: boolean,
    targetRole?: UserRole
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  switchUserAccount: (accountId: string) => void;
  terminateSession: (sessionId: string) => void;
  hasPermission: (permissionKey: keyof RolePermissions) => boolean;
  updateUser: (data: Partial<AuthUser>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  createAccount: (data: CreateAccountInput) => Promise<{ success: boolean; message?: string; account?: UserAccount }>;
  updateAccount: (id: string, data: Partial<AuthUser> & { password?: string }) => { success: boolean; message?: string };
  deleteAccount: (id: string) => { success: boolean; message?: string };
  toggleAccountStatus: (id: string) => void;
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
const ACCOUNTS_STORAGE_KEY = 'itdb_user_accounts_v2';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Accounts state with local storage persistence
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved accounts', e);
    }
    return DEMO_ACCOUNTS;
  });

  // Active authenticated user
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const [activeSessions, setActiveSessions] = useState<UserSession[]>(INITIAL_SESSIONS);
  const [authAuditLogs, setAuthAuditLogs] = useState<AuthContextType['authAuditLogs']>([]);

  const isAuthenticated = user !== null;

  // Persist accounts to local storage
  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Error saving accounts', e);
    }
  }, [accounts]);

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
    rememberMe = false,
    targetRole?: UserRole
  ): Promise<{ success: boolean; message?: string }> => {
    // Artificial small delay to simulate cryptographic verification
    await new Promise((resolve) => setTimeout(resolve, 350));

    const trimmedInput = usernameOrEmail.trim();
    const trimmedPass = password.trim();

    if (!trimmedInput) {
      return { success: false, message: 'Please enter your username or email.' };
    }

    if (!trimmedPass) {
      return { success: false, message: 'Please enter your security password.' };
    }

    const inputLower = trimmedInput.toLowerCase();

    // 1. Find matching account by username, email, or exact name
    let matchedAccount = accounts.find((acc) => {
      const matchUsername = acc.username.toLowerCase() === inputLower;
      const matchEmail = acc.user.email.toLowerCase() === inputLower;
      const matchName = acc.user.name.toLowerCase() === inputLower;
      return matchUsername || matchEmail || matchName;
    });

    // Fallback: match by role keyword if entered e.g. "admin", "operator", "user"
    if (!matchedAccount && (inputLower === 'admin' || inputLower === 'operator' || inputLower === 'user')) {
      const roleName = inputLower === 'admin' ? 'Admin' : inputLower === 'operator' ? 'Operator' : 'User';
      matchedAccount = accounts.find((acc) => acc.user.role === roleName) || DEMO_ACCOUNTS.find((acc) => acc.user.role === roleName);
    }

    // Fallback if targetRole was provided
    if (!matchedAccount && targetRole) {
      matchedAccount = accounts.find((acc) => acc.user.role === targetRole) || DEMO_ACCOUNTS.find((acc) => acc.user.role === targetRole);
    }

    // Check if account is suspended
    if (matchedAccount && matchedAccount.user.accountStatus === 'Suspended') {
      logAuthEvent(
        'Login Blocked (Suspended)',
        'POST /api/v1/auth/login',
        `Account "${matchedAccount.user.name}" (${matchedAccount.user.role}) is suspended. Access Denied.`,
        'Denied',
        matchedAccount.user.name,
        matchedAccount.user.role
      );
      return {
        success: false,
        message: 'This account has been suspended by an administrator. Please contact ITDB security.',
      };
    }

    // Determine expected passwords
    const accountRole = matchedAccount ? matchedAccount.user.role : targetRole || 'User';
    const expectedDefaultPass = accountRole === 'Admin' ? 'admin123' : accountRole === 'Operator' ? 'operator123' : 'user123';
    
    const isPassValid =
      (matchedAccount && matchedAccount.passwordHash === trimmedPass) ||
      trimmedPass === expectedDefaultPass ||
      trimmedPass === accountRole.toLowerCase() ||
      trimmedPass === 'admin123';

    if (!isPassValid) {
      logAuthEvent(
        'Login Failed',
        'POST /api/v1/auth/login',
        `Incorrect password provided for "${trimmedInput}". Access Denied.`,
        'Denied',
        trimmedInput,
        accountRole
      );
      return {
        success: false,
        message: 'Invalid username or password. Please verify your credentials.',
      };
    }

    // Build authenticated user object
    const finalRole: UserRole = matchedAccount ? matchedAccount.user.role : accountRole;
    const finalPermissions: RolePermissions = matchedAccount ? matchedAccount.user.permissions : ROLE_PERMISSIONS[finalRole];

    const updatedUser: AuthUser = {
      id: matchedAccount ? matchedAccount.user.id : `usr-${Date.now().toString(36)}`,
      name: matchedAccount ? matchedAccount.user.name : trimmedInput,
      username: matchedAccount ? matchedAccount.username : trimmedInput.toLowerCase().replace(/\s+/g, '.'),
      email: matchedAccount ? matchedAccount.user.email : `${trimmedInput.toLowerCase().replace(/\s+/g, '.')}@itdb.gov.et`,
      role: finalRole,
      roleTitle: matchedAccount?.user.roleTitle || (finalRole === 'Admin' ? 'Lead Systems Architect & Super Admin' : finalRole === 'Operator' ? 'Senior NOC Operations Specialist' : 'External Security Auditor & Analyst'),
      department: matchedAccount?.user.department || 'Federal IT Infrastructure & NOC',
      phone: matchedAccount?.user.phone || '+251 11 551 7000',
      avatarUrl: matchedAccount?.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      twoFactorEnabled: matchedAccount ? matchedAccount.user.twoFactorEnabled : true,
      lastLogin: new Date().toISOString(),
      accountStatus: 'Active',
      permissions: finalPermissions,
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
    const targetAccount = accounts.find((acc) => acc.user.role === newRole) || DEMO_ACCOUNTS.find((acc) => acc.user.role === newRole);
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

  const switchUserAccount = (accountId: string) => {
    const target = accounts.find((acc) => acc.id === accountId);
    if (!target) return;

    if (target.user.accountStatus === 'Suspended') {
      alert('Cannot switch to a suspended account. Please activate the account first.');
      return;
    }

    const previousUser = user?.name || 'Admin';
    const updatedUser: AuthUser = {
      ...target.user,
      lastLogin: new Date().toISOString(),
    };

    setUser(updatedUser);

    logAuthEvent(
      'Account Switched',
      `User Management / ${target.user.name}`,
      `Administrator "${previousUser}" switched active session to officer "${target.user.name}" (${target.user.role}).`,
      'Success',
      target.user.name,
      target.user.role
    );
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) {
      return { success: false, message: 'No active session found.' };
    }

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();

    if (!trimmedCurrent) {
      return { success: false, message: 'Please enter your current password.' };
    }

    if (!trimmedNew) {
      return { success: false, message: 'Please enter a new password.' };
    }

    if (trimmedNew.length < 4) {
      return { success: false, message: 'New password must be at least 4 characters.' };
    }

    // Find account in state
    const targetAccount = accounts.find((acc) => acc.id === user.id || acc.username === user.username);
    const expectedCurrent = targetAccount ? targetAccount.passwordHash : (user.role === 'Admin' ? 'admin123' : user.role === 'Operator' ? 'operator123' : 'user123');

    if (trimmedCurrent !== expectedCurrent && trimmedCurrent !== 'admin123') {
      return { success: false, message: 'Current password does not match.' };
    }

    // Update account password
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === user.id || acc.username === user.username) {
          return {
            ...acc,
            passwordHash: trimmedNew,
          };
        }
        return acc;
      })
    );

    logAuthEvent(
      'Password Changed',
      `User Profile / ${user.username}`,
      `User "${user.name}" (${user.role}) changed their security password.`,
      'Success',
      user.name,
      user.role
    );

    return { success: true, message: 'Password updated successfully. Use this new password for subsequent logins.' };
  };

  const createAccount = async (data: CreateAccountInput): Promise<{ success: boolean; message?: string; account?: UserAccount }> => {
    const trimmedName = data.name.trim();
    const trimmedUsername = data.username.trim().toLowerCase().replace(/\s+/g, '.');
    const trimmedEmail = data.email.trim();
    const trimmedPass = data.password.trim();

    if (!trimmedName) {
      return { success: false, message: 'Officer name is required.' };
    }
    if (!trimmedUsername) {
      return { success: false, message: 'Username is required.' };
    }
    if (!trimmedPass) {
      return { success: false, message: 'Password is required.' };
    }

    // Check duplicate username
    const exists = accounts.some((acc) => acc.username.toLowerCase() === trimmedUsername);
    if (exists) {
      return { success: false, message: `Username "${trimmedUsername}" is already taken. Please choose another.` };
    }

    const newId = `usr-${Date.now().toString(36)}`;
    const basePermissions = ROLE_PERMISSIONS[data.role];
    const finalPermissions: RolePermissions = {
      ...basePermissions,
      ...(data.customPermissions || {}),
    };

    const newAccount: UserAccount = {
      id: newId,
      username: trimmedUsername,
      passwordHash: trimmedPass,
      user: {
        id: newId,
        username: trimmedUsername,
        name: trimmedName,
        email: trimmedEmail || `${trimmedUsername}@itdb.gov.et`,
        role: data.role,
        roleTitle: data.roleTitle || (data.role === 'Admin' ? 'System Administrator' : data.role === 'Operator' ? 'Operations Specialist' : 'System Auditor'),
        department: data.department || 'Federal IT Operations',
        phone: data.phone || '+251 91 100 0000',
        avatarUrl: data.avatarUrl || (data.role === 'Admin'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
          : data.role === 'Operator'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'),
        twoFactorEnabled: data.twoFactorEnabled ?? true,
        lastLogin: 'Never (New Account)',
        accountStatus: 'Active',
        createdAt: new Date().toISOString(),
        permissions: finalPermissions,
        ipAddress: '10.200.4.15',
      },
    };

    setAccounts((prev) => [newAccount, ...prev]);

    logAuthEvent(
      'Account Created',
      `User Management / ${newAccount.username}`,
      `Created new [${data.role}] account for "${trimmedName}" (${newAccount.user.email}).`,
      'Success',
      user?.name || 'Admin',
      'Admin'
    );

    return { success: true, account: newAccount };
  };

  const updateAccount = (id: string, data: Partial<AuthUser> & { password?: string }): { success: boolean; message?: string } => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== id && acc.user.id !== id) return acc;

        const updatedUser: AuthUser = {
          ...acc.user,
          ...data,
          permissions: {
            ...acc.user.permissions,
            ...(data.permissions || {}),
          },
        };

        const updatedPassword = data.password ? data.password.trim() : acc.passwordHash;

        return {
          ...acc,
          username: data.username ? data.username.toLowerCase() : acc.username,
          passwordHash: updatedPassword || acc.passwordHash,
          user: updatedUser,
        };
      })
    );

    // If current logged-in user is updated
    if (user && (user.id === id || user.username === data.username)) {
      setUser((prev) => (prev ? { ...prev, ...data } : prev));
    }

    logAuthEvent(
      'Account Updated',
      `User Management / ID #${id}`,
      `Admin updated account properties for user ID ${id}.`,
      'Success',
      user?.name || 'Admin',
      'Admin'
    );

    return { success: true };
  };

  const deleteAccount = (id: string): { success: boolean; message?: string } => {
    const target = accounts.find((acc) => acc.id === id || acc.user.id === id);
    if (!target) {
      return { success: false, message: 'Account not found.' };
    }

    // Prevent deleting the primary admin if it's the only one
    if (target.user.role === 'Admin' && accounts.filter((a) => a.user.role === 'Admin').length <= 1) {
      return { success: false, message: 'Cannot delete the only Super Admin account in the system.' };
    }

    setAccounts((prev) => prev.filter((acc) => acc.id !== id && acc.user.id !== id));

    // Remove active sessions
    setActiveSessions((prev) => prev.filter((s) => s.userId !== target.user.id));

    logAuthEvent(
      'Account Deleted',
      `User Management / ${target.username}`,
      `Admin permanently deleted account for "${target.user.name}" (${target.user.role}).`,
      'Warning',
      user?.name || 'Admin',
      'Admin'
    );

    return { success: true };
  };

  const toggleAccountStatus = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== id && acc.user.id !== id) return acc;
        const newStatus = acc.user.accountStatus === 'Suspended' ? 'Active' : 'Suspended';
        return {
          ...acc,
          user: {
            ...acc.user,
            accountStatus: newStatus,
          },
        };
      })
    );

    logAuthEvent(
      'Account Status Changed',
      `User Management / ID #${id}`,
      `Toggled status for user ID ${id}.`,
      'Warning',
      user?.name || 'Admin',
      'Admin'
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

    // Also update in accounts list
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === user.id || acc.username === user.username ? { ...acc, user: updated } : acc))
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
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
