import React, { useState } from 'react';
import { ThresholdForm } from '../../components/Settings/ThresholdForm';
import { UserProfileForm } from '../../components/Settings/UserProfileForm';
import { SecuritySettings } from '../../components/Settings/SecuritySettings';
import { AgentTokenManager } from '../../components/Settings/AgentTokenManager';
import { Settings, Sliders, User, Shield, Key } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'THRESHOLDS' | 'PROFILE' | 'SECURITY' | 'TOKENS'>('THRESHOLDS');

  return (
    <div className="space-y-4 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Header Bar */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">System Settings & Portal Configuration</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Configure alert warning thresholds, agent Bearer tokens, IP network security, and user administrator profile
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveSection('THRESHOLDS')}
          className={`px-3 py-1.5 rounded-sm font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'THRESHOLDS'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Threshold Configuration
        </button>

        <button
          onClick={() => setActiveSection('PROFILE')}
          className={`px-3 py-1.5 rounded-sm font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'PROFILE'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
          }`}
        >
          <User className="w-4 h-4" />
          User Profile & Role Settings
        </button>

        <button
          onClick={() => setActiveSection('SECURITY')}
          className={`px-3 py-1.5 rounded-sm font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'SECURITY'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Security & IP Restriction
        </button>

        <button
          onClick={() => setActiveSection('TOKENS')}
          className={`px-3 py-1.5 rounded-sm font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'TOKENS'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
          }`}
        >
          <Key className="w-4 h-4" />
          Agent API Tokens
        </button>
      </div>

      {/* Render active section */}
      {activeSection === 'THRESHOLDS' && <ThresholdForm />}
      {activeSection === 'PROFILE' && <UserProfileForm />}
      {activeSection === 'SECURITY' && <SecuritySettings />}
      {activeSection === 'TOKENS' && <AgentTokenManager />}
    </div>
  );
};
