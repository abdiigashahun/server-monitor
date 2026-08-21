import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMonitoring } from '../../context/MonitoringContext';
import {
  User,
  Mail,
  Shield,
  Building,
  Phone,
  Save,
  KeyRound,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  Key
} from 'lucide-react';

export const UserProfileForm: React.FC = () => {
  const { user, updateUser, changePassword } = useAuth();
  const { addToast } = useMonitoring();

  // Profile Information State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [twoFactor, setTwoFactor] = useState(user?.twoFactorEnabled ?? true);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Save profile information
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);

    updateUser({
      name,
      email,
      department,
      phone,
      twoFactorEnabled: twoFactor,
    });

    setProfileSuccessMsg('Profile information updated successfully.');
    addToast('Profile Updated', 'Your profile information has been saved.', 'success');
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please re-enter.');
      return;
    }

    setIsChangingPass(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsChangingPass(false);

    if (!result.success) {
      setPasswordError(result.message || 'Failed to update password.');
      return;
    }

    setPasswordSuccess('Your password has been changed successfully! Use your new password the next time you sign in.');
    addToast('Password Changed', 'Your security password has been updated.', 'success');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* 1. Profile Information Card */}
      <form onSubmit={handleProfileSubmit} className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">
                Officer Profile Information
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Manage your government officer credentials and communication channels
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase border ${
            user?.role === 'Admin'
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              : user?.role === 'Operator'
              ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
          }`}>
            {user?.role} Access
          </span>
        </div>

        {profileSuccessMsg && (
          <div className="p-3 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-sm border border-gray-200 dark:border-gray-700">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
            alt={user?.name || 'Officer'}
            className="w-12 h-12 rounded-sm border border-gray-300 dark:border-gray-700 object-cover shrink-0"
          />
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <span>{user?.name}</span>
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">(@{user?.username})</span>
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-xs">{user?.roleTitle}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Dept: <strong className="text-gray-800 dark:text-gray-200">{user?.department}</strong></span>
              <span>•</span>
              <span>Email: <strong className="text-gray-800 dark:text-gray-200">{user?.email}</strong></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm p-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> Official Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm p-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> Government Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm p-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> Contact Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm p-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 font-medium">
            <input
              type="checkbox"
              checked={twoFactor}
              onChange={(e) => setTwoFactor(e.target.checked)}
              className="rounded-sm accent-blue-600"
            />
            <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Enforce 2FA Authentication
          </label>

          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-sm flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Profile Details
          </button>
        </div>
      </form>

      {/* 2. CHANGE PASSWORD CARD (User & Operator Self-Service) */}
      <form onSubmit={handlePasswordSubmit} className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">
                Change Security Password
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Update the initial temporary password provided by your Administrator to your own personal secure password
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-200 dark:border-amber-800">
            Self-Service Password Reset
          </span>
        </div>

        {passwordError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Password */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm p-2 pr-9 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> New Password *
            </label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password"
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm p-2 pr-9 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> Confirm New Password *
            </label>
            <input
              type={showNewPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm p-2 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-500"
              required
            />
          </div>
        </div>

        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <span>
            💡 <strong>Security Policy:</strong> Passwords must be at least 4 characters. Changing your password immediately invalidates old admin-assigned passwords for your account.
          </span>
          <button
            type="submit"
            disabled={isChangingPass}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-sm flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer shrink-0 ml-3"
          >
            <Key className="w-4 h-4" /> {isChangingPass ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
};
