import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMonitoring } from '../../context/MonitoringContext';
import { UserRole, RolePermissions, UserAccount } from '../../types';
import { DEFAULT_ROLE_PERMISSIONS as ROLE_PERMISSIONS } from '../../utils/constants';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Key,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  UserCheck,
  Building,
  Mail,
  Phone,
  Clock,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  LogIn,
  Sliders,
  X
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const {
    user: currentUser,
    accounts,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleAccountStatus,
    switchUserAccount,
  } = useAuth();

  const { addToast } = useMonitoring();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [resettingAccount, setResettingAccount] = useState<UserAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<UserAccount | null>(null);

  // Create Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Operator');
  const [newRoleTitle, setNewRoleTitle] = useState('NOC Operations Specialist');
  const [newDepartment, setNewDepartment] = useState('National Data Center Operations Group');
  const [newPhone, setNewPhone] = useState('+251 91 234 5678');
  const [newPassword, setNewPassword] = useState('operator123');
  const [showPassword, setShowPassword] = useState(false);
  const [new2FA, setNew2FA] = useState(true);
  const [customPermissions, setCustomPermissions] = useState<RolePermissions>(ROLE_PERMISSIONS['Operator']);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset Password State
  const [newResetPassword, setNewResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Security Gate: Check if user is Admin
  const isAdmin = currentUser?.role === 'Admin';

  // Handle role change in create form (updates defaults)
  const handleRoleChangeInForm = (selectedRole: UserRole) => {
    setNewRole(selectedRole);
    if (selectedRole === 'Admin') {
      setNewRoleTitle('Senior Infrastructure Controller');
      setNewPassword('admin123');
      setCustomPermissions(ROLE_PERMISSIONS['Admin']);
    } else if (selectedRole === 'Operator') {
      setNewRoleTitle('NOC Operations Specialist');
      setNewPassword('operator123');
      setCustomPermissions(ROLE_PERMISSIONS['Operator']);
    } else {
      setNewRoleTitle('Federal Security & Audit Specialist');
      setNewPassword('user123');
      setCustomPermissions(ROLE_PERMISSIONS['User']);
    }
  };

  // Auto-generate username from name
  const handleNameChangeInForm = (val: string) => {
    setNewName(val);
    if (!newUsername || newUsername.startsWith(newName.toLowerCase().slice(0, 3))) {
      const generated = val.trim().toLowerCase().replace(/\s+/g, '.');
      setNewUsername(generated);
      if (!newEmail || newEmail.includes('@itdb.gov.et')) {
        setNewEmail(generated ? `${generated}@itdb.gov.et` : '');
      }
    }
  };

  // Generate random secure password helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
  };

  const handleGenerateResetPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewResetPassword(pass);
    setShowResetPassword(true);
  };

  // Submit Create Account
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError('Please enter the officer name.');
      return;
    }
    if (!newUsername.trim()) {
      setFormError('Please enter a username.');
      return;
    }
    if (!newPassword.trim()) {
      setFormError('Please enter or generate a temporary password.');
      return;
    }

    setIsSubmitting(true);
    const res = await createAccount({
      name: newName,
      username: newUsername,
      email: newEmail || `${newUsername}@itdb.gov.et`,
      role: newRole,
      roleTitle: newRoleTitle,
      department: newDepartment,
      phone: newPhone,
      password: newPassword,
      twoFactorEnabled: new2FA,
      customPermissions: customPermissions,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.message || 'Failed to create account.');
      return;
    }

    addToast(
      'Account Created',
      `Successfully created ${newRole} account for ${newName} (@${newUsername}).`,
      'success'
    );

    // Reset & close
    setIsCreateModalOpen(false);
    setNewName('');
    setNewUsername('');
    setNewEmail('');
    handleRoleChangeInForm('Operator');
  };

  // Submit Edit Account
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    await updateAccount(editingAccount.id, {
      name: editingAccount.user.name,
      username: editingAccount.username,
      email: editingAccount.user.email,
      role: editingAccount.user.role,
      roleTitle: editingAccount.user.roleTitle,
      department: editingAccount.user.department,
      phone: editingAccount.user.phone,
      twoFactorEnabled: editingAccount.user.twoFactorEnabled,
      permissions: editingAccount.user.permissions,
    });

    addToast('Account Updated', `Account properties updated for ${editingAccount.user.name}.`, 'success');
    setEditingAccount(null);
  };

  // Submit Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingAccount || !newResetPassword.trim()) return;

    await updateAccount(resettingAccount.id, {
      password: newResetPassword.trim(),
    });

    addToast('Password Reset', `Password reset successfully for ${resettingAccount.user.name}.`, 'success');
    setResettingAccount(null);
    setNewResetPassword('');
  };

  // Confirm Delete Account
  const handleDeleteConfirm = async () => {
    if (!deletingAccount) return;

    const res = await deleteAccount(deletingAccount.id);
    if (res.success) {
      addToast('Account Removed', `Account for ${deletingAccount.user.name} has been revoked.`, 'warning');
      setDeletingAccount(null);
    } else {
      alert(res.message || 'Failed to delete account.');
    }
  };

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        acc.user.name.toLowerCase().includes(q) ||
        acc.username.toLowerCase().includes(q) ||
        acc.user.email.toLowerCase().includes(q) ||
        acc.user.department.toLowerCase().includes(q) ||
        acc.user.roleTitle.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || acc.user.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'Active' && acc.user.accountStatus !== 'Suspended') ||
        (statusFilter === 'Suspended' && acc.user.accountStatus === 'Suspended');

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [accounts, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const totalUsers = accounts.length;
  const operatorCount = accounts.filter((a) => a.user.role === 'Operator').length;
  const standardUserCount = accounts.filter((a) => a.user.role === 'User').length;
  const adminCount = accounts.filter((a) => a.user.role === 'Admin').length;
  const twoFactorRate = Math.round(
    (accounts.filter((a) => a.user.twoFactorEnabled).length / (totalUsers || 1)) * 100
  );

  // If non-admin user accesses this page
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-[#1A1A1A] dark:text-[#F9FAFB]">
        <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-red-200 dark:border-red-900/60 rounded-lg p-6 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              Access Restricted • ISO 27001 Tier 4
            </span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
              Administrator Security Clearance Required
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              The <strong>User & Operator Account Administration</strong> hub is exclusively restricted to{' '}
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">Super Admin</span> accounts.
              Your current logged-in role is <span className="font-bold text-amber-600">[{currentUser?.role}]</span>.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-center">
            <a
              href="#/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-sm transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              Return to Operations Dashboard <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                User & Operator Account Administration
              </h2>
              <span className="px-2 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                Admin Exclusive Page
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Create, configure, and manage Operator and User credentials, role assignments, and security permissions
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            handleRoleChangeInForm('Operator');
            setIsCreateModalOpen(true);
          }}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Operator / User Account</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Accounts */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
              Total Accounts
            </span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">
            {totalUsers} <span className="text-xs font-sans text-gray-500 font-normal">Registered</span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-mono">
            {accounts.filter((a) => a.user.accountStatus !== 'Suspended').length} Active • {accounts.filter((a) => a.user.accountStatus === 'Suspended').length} Suspended
          </div>
        </div>

        {/* Operators */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
              NOC Operators
            </span>
            <span className="p-1 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
              OPR
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {operatorCount} <span className="text-xs font-sans text-gray-500 font-normal">Accounts</span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            Telemetry & Alert Ack Access
          </div>
        </div>

        {/* Standard Users */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
              Auditor / Users
            </span>
            <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
              USR
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {standardUserCount} <span className="text-xs font-sans text-gray-500 font-normal">Accounts</span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            Read-Only Telemetry & Audit
          </div>
        </div>

        {/* Super Admins */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
              Administrators
            </span>
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {adminCount} <span className="text-xs font-sans text-gray-500 font-normal">Admins</span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            Full Portal Control & Root
          </div>
        </div>

        {/* 2FA Rate */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
              2FA Security
            </span>
            <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400 mt-1">
            {twoFactorRate}% <span className="text-xs font-sans text-gray-500 font-normal">Enrolled</span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            MFA Mandatory Protocol
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by officer name, username, email, department..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm pl-9 pr-3 py-1.5 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="Operator">Operators Only</option>
            <option value="User">Users / Auditors Only</option>
            <option value="Admin">Admins Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Accounts</option>
            <option value="Suspended">Suspended Accounts</option>
          </select>

          {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
              title="Reset filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden">
        <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
              System Registered Accounts ({filteredAccounts.length})
            </h3>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
            Click "Quick Switch" to simulate or test any user profile
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="p-3">User & Officer ID</th>
                <th className="p-3">Role & Title</th>
                <th className="p-3">Department</th>
                <th className="p-3">Contact & Email</th>
                <th className="p-3 text-center">2FA</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Demo Password</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No user accounts match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const isCurrent = currentUser?.id === acc.user.id || currentUser?.username === acc.username;
                  const isSuspended = acc.user.accountStatus === 'Suspended';

                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${isCurrent ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                    >
                      {/* User & Avatar */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={acc.user.avatarUrl}
                            alt={acc.user.name}
                            className="w-8 h-8 rounded-sm object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <span>{acc.user.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[9px] font-bold uppercase border border-blue-200 dark:border-blue-800">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                              @{acc.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Title */}
                      <td className="p-3">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-sm font-bold text-[10px] uppercase border ${acc.user.role === 'Admin'
                                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : acc.user.role === 'Operator'
                                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              }`}
                          >
                            {acc.user.role}
                          </span>
                          <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                            {acc.user.roleTitle}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="p-3 text-gray-600 dark:text-gray-300">
                        {acc.user.department}
                      </td>

                      {/* Contact */}
                      <td className="p-3 font-mono text-[11px]">
                        <div className="text-gray-900 dark:text-gray-200">{acc.user.email}</div>
                        <div className="text-gray-500 dark:text-gray-400">{acc.user.phone}</div>
                      </td>

                      {/* 2FA */}
                      <td className="p-3 text-center">
                        {acc.user.twoFactorEnabled ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-[10px]">
                            <ShieldCheck className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-[10px]">
                            <ShieldAlert className="w-3.5 h-3.5" /> Off
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleAccountStatus(acc.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${isSuspended
                              ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 hover:bg-red-200'
                              : 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800 hover:bg-green-200'
                            }`}
                          title="Click to toggle account status (Active / Suspended)"
                        >
                          {isSuspended ? 'Suspended' : 'Active'}
                        </button>
                      </td>

                      {/* Demo Password */}
                      <td className="p-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-semibold">
                          {acc.passwordHash}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Switch Button */}
                          <button
                            onClick={() => switchUserAccount(acc.id)}
                            className="px-2 py-1 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                            title="Switch active login to this account for testing"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Switch</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => setEditingAccount(acc)}
                            className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password Button */}
                          <button
                            onClick={() => {
                              setResettingAccount(acc);
                              setNewResetPassword('');
                            }}
                            className="p-1 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors"
                            title="Reset User Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => setDeletingAccount(acc)}
                            className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors"
                            title="Revoke / Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150 text-xs">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                    Create Operator or User Account
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Provision new access credentials and assign system operational scopes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Role Selection Tabs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  1. Select Account Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChangeInForm('Operator')}
                    className={`p-3 rounded border text-left transition-all cursor-pointer ${newRole === 'Operator'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500 font-bold'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">👁️ Operator</span>
                      <span className="text-[10px] font-mono">Tier-2 NOC</span>
                    </div>
                    <p className="text-[10px] mt-1 font-normal opacity-80">
                      Monitor servers & DCs, acknowledge and resolve active system alerts
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChangeInForm('User')}
                    className={`p-3 rounded border text-left transition-all cursor-pointer ${newRole === 'User'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500 font-bold'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">📋 User / Auditor</span>
                      <span className="text-[10px] font-mono">View Only</span>
                    </div>
                    <p className="text-[10px] mt-1 font-normal opacity-80">
                      Read-only telemetry, reports export, compliance and oversight
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChangeInForm('Admin')}
                    className={`p-3 rounded border text-left transition-all cursor-pointer ${newRole === 'Admin'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500 font-bold'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">🛡️ Administrator</span>
                      <span className="text-[10px] font-mono">Super Admin</span>
                    </div>
                    <p className="text-[10px] mt-1 font-normal opacity-80">
                      Full infrastructure control, add/delete servers, manage users & DR drills
                    </p>
                  </button>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Full Officer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => handleNameChangeInForm(e.target.value)}
                    placeholder="e.g. Hanna Tadesse"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Username / Login Handle *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                    placeholder="e.g. hanna.t"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. hanna.t@itdb.gov.et"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Direct Phone Number
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+251 91 234 5678"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Department / Agency
                  </label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="e.g. National Data Center Operations"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Official Job Title
                  </label>
                  <input
                    type="text"
                    value={newRoleTitle}
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    placeholder="e.g. Tier-2 NOC Operations Specialist"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-800 dark:text-gray-200">
                    Temporary Security Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Generate Strong Key
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter or generate temporary password"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 pr-10 text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 2FA & Permissions Preview */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={new2FA}
                    onChange={(e) => setNew2FA(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold">Enforce Two-Factor Authentication (2FA) for this account</span>
                </label>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded border border-gray-200 dark:border-gray-700 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                  Granted Capabilities for [{newRole}]:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-1.5">
                    {customPermissions.canAckAlerts ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span>Acknowledge Alerts</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {customPermissions.canResolveAlerts ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span>Resolve Active Incidents</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {customPermissions.canAddServer ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span>Add / Remove Servers</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {customPermissions.canTriggerFailover ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span>Trigger DR Failovers</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {customPermissions.canViewAuditLogs ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span>View Audit Logs</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {customPermissions.canExportReports ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span>Export PDF & CSV Reports</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Creating...' : `Create ${newRole} Account`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150 text-xs">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                  Edit User Account: {editingAccount.user.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingAccount(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Full Officer Name
                </label>
                <input
                  type="text"
                  required
                  value={editingAccount.user.name}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      user: { ...editingAccount.user, name: e.target.value },
                    })
                  }
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    System Role
                  </label>
                  <select
                    value={editingAccount.user.role}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setEditingAccount({
                        ...editingAccount,
                        user: {
                          ...editingAccount.user,
                          role: r,
                          permissions: ROLE_PERMISSIONS[r],
                        },
                      });
                    }}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs font-semibold text-gray-900 dark:text-gray-100"
                  >
                    <option value="Operator">Operator</option>
                    <option value="User">User / Auditor</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editingAccount.user.email}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        user: { ...editingAccount.user, email: e.target.value },
                      })
                    }
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs font-mono text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Department
                </label>
                <input
                  type="text"
                  value={editingAccount.user.department}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      user: { ...editingAccount.user, department: e.target.value },
                    })
                  }
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Role Title
                </label>
                <input
                  type="text"
                  value={editingAccount.user.roleTitle}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      user: { ...editingAccount.user, roleTitle: e.target.value },
                    })
                  }
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingAccount.user.twoFactorEnabled}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        user: { ...editingAccount.user, twoFactorEnabled: e.target.checked },
                      })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Two-Factor Authentication (2FA) Active</span>
                </label>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150 text-xs">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                  Reset Password: {resettingAccount.user.name}
                </h3>
              </div>
              <button
                onClick={() => setResettingAccount(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Set a new password for <strong>{resettingAccount.user.name}</strong> (@{resettingAccount.username}).
                The user can use this immediately to log in.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">
                    New Security Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateResetPassword}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Key
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 pr-10 text-xs font-mono text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingAccount(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newResetPassword.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded cursor-pointer shadow-sm"
                >
                  Confirm Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150 text-xs">
            <div className="p-4 bg-red-50 dark:bg-red-950/80 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h3 className="font-bold text-sm text-red-700 dark:text-red-300 uppercase tracking-wider">
                  Revoke User Account
                </h3>
              </div>
              <button
                onClick={() => setDeletingAccount(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                Are you sure you want to permanently revoke credentials for{' '}
                <strong>{deletingAccount.user.name}</strong> (@{deletingAccount.username})?
              </p>
              <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                This will terminate any active sessions and remove the officer from national monitoring access.
              </p>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingAccount(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded cursor-pointer shadow-sm"
                >
                  Permanently Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
