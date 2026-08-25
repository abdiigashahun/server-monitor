import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { User, Mail, Building, Phone, Save, KeyRound } from 'lucide-react';

export const UserProfileForm: React.FC = () => {
  const { userProfile, updateUserProfile } = useMonitoring();

  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [department, setDepartment] = useState(userProfile.department);
  const [phone, setPhone] = useState(userProfile.phone);
  const [twoFactor, setTwoFactor] = useState(userProfile.twoFactorEnabled);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name,
      email,
      department,
      phone,
      twoFactorEnabled: twoFactor,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 space-y-4 shadow-sm text-xs text-gray-800 dark:text-slate-200 transition-colors"
    >
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-slate-100">
            User Settings & Administrator Profile
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-mono text-[10px] font-bold border border-blue-200 dark:border-blue-800/60">
          {userProfile.role}
        </span>
      </div>

      <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-sm border border-gray-200 dark:border-slate-800">
        <img
          src={userProfile.avatarUrl}
          alt={userProfile.name}
          className="w-12 h-12 rounded-full border border-gray-300 dark:border-slate-700 object-cover shrink-0"
        />
        <div>
          <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">{userProfile.name}</h4>
          <p className="text-gray-500 dark:text-slate-400 text-xs">{userProfile.email}</p>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-slate-400">
            <span>
              Role: <strong className="text-gray-800 dark:text-slate-200">{userProfile.role}</strong>
            </span>
            <span>•</span>
            <span>
              Last Login:{' '}
              <strong className="text-gray-800 dark:text-slate-200">
                {new Date(userProfile.lastLogin).toLocaleTimeString()}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" /> Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-sm p-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" /> Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-sm p-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" /> Government Department
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-sm p-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" /> Contact Phone Number
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-sm p-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-slate-300 font-medium">
          <input
            type="checkbox"
            checked={twoFactor}
            onChange={(e) => setTwoFactor(e.target.checked)}
            className="rounded-sm accent-blue-600 dark:accent-blue-500"
          />
          <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Enforce 2FA Authentication
        </label>

        <button
          type="submit"
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs rounded-sm flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" /> Save Profile Changes
        </button>
      </div>
    </form>
  );
};