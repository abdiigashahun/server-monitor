// src/components/RoleSwitcher.tsx
import React from 'react';
import { useMonitoring } from '../context/MonitoringContext';
import { UserRole } from '../types';

export const RoleSwitcher: React.FC = () => {
  const { userProfile, updateUserProfile } = useMonitoring();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    updateUserProfile({ role: newRole });
  };

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-sm border border-gray-200 dark:border-gray-700">
      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
        Role:
      </span>
      <select
        value={userProfile.role}
        onChange={handleRoleChange}
        className="bg-transparent text-xs font-bold text-blue-600 dark:text-blue-400 focus:outline-none cursor-pointer"
      >
        <option value="Admin">Admin (Full Control)</option>
        <option value="Operator">Operator (Acknowledge / Resolve)</option>
        <option value="Viewer">Viewer (Read-Only)</option>
      </select>
    </div>
  );
};