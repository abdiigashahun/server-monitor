// src/components/Layout/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationBell } from '../Notification/NotificationBell';
import { Search, Play, Pause, Sun, Moon, Shield, X, Check, Activity, LogOut, Loader2 } from 'lucide-react';
import { UserRole } from '../../types';
import { logout } from '../../services/auth';

interface HeaderProps {
  activeTab: string;
  userRole?: UserRole;
  setUserRole?: (role: UserRole) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, userRole, setUserRole, onLogout }) => {
  const { userProfile, alerts, isLiveSimulating, toggleLiveSimulation, updateUserProfile } = useMonitoring();
  const { theme, toggleTheme } = useTheme();

  const [isProfilePopoutOpen, setIsProfilePopoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const popoutRef = useRef<HTMLDivElement>(null);

  const activeAlerts = alerts.filter((a) => a.status === 'Active');
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'Critical');

  const currentRole: UserRole = userRole || userProfile?.role || 'Viewer';
  const roles: UserRole[] = ['Admin', 'Operator', 'Viewer'];

  // Handle outside clicks safely without stealing active button focus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoutRef.current && !popoutRef.current.contains(event.target as Node)) {
        setIsProfilePopoutOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'inventory':
        return 'Server Inventory';
      case 'backup':
        return 'Backup Center';
      case 'alerts-logs':
        return 'Alerts & Logs';
      case 'reports':
        return 'Reports & Analytics';
      case 'settings':
        return 'System Settings';
      case 'audit':
        return 'Audit Logs';
      default:
        return 'ITDB Server Monitor';
    }
  };

  const handleRoleSelect = (newRole: UserRole) => {
    if (setUserRole) {
      setUserRole(newRole);
    }
    updateUserProfile({ role: newRole });
    setIsProfilePopoutOpen(false);
  };

  const handleLogoutClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // 1. Stop event bubbling completely to prevent popout auto-dismiss listeners from firing premature unmounts
    e.preventDefault();
    e.stopPropagation();

    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      console.log('Sending API Logout Request...');
      
      // 2. Dispatch backend network call
      await logout();
    } catch (error) {
      console.error('Logout error occurred:', error);
    } finally {
      setIsLoggingOut(false);
      setIsProfilePopoutOpen(false);

      // 3. Clear local session/App state AFTER backend request completes
      if (onLogout) {
        onLogout();
      }
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-40 text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{getTitle()}</h1>
        <div className="hidden sm:flex space-x-2">
          {criticalAlerts.length > 0 ? (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-bold rounded uppercase border border-red-200 dark:border-red-800">
              {criticalAlerts.length} Critical
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 text-[10px] font-bold rounded uppercase border border-green-200 dark:border-green-800">
              System Operational
            </span>
          )}
          {activeAlerts.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded uppercase border border-amber-200 dark:border-amber-800">
              {activeAlerts.length} Active Alerts
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="relative hidden md:block w-56 lg:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs & servers..."
            className="w-full pl-8 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={toggleTheme}
          className="p-1.5 sm:px-3 sm:py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Bright Light'} Mode`}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span className="hidden md:inline">Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Bright Mode</span>
            </>
          )}
        </button>

        <button
          onClick={toggleLiveSimulation}
          className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
            isLiveSimulating
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Toggle live telemetry heartbeats"
        >
          {isLiveSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isLiveSimulating ? 'Live Feed' : 'Paused'}</span>
        </button>

        <NotificationBell />

        <div className="relative pl-3 border-l border-gray-200 dark:border-gray-800" ref={popoutRef}>
          <button
            type="button"
            onClick={() => setIsProfilePopoutOpen(!isProfilePopoutOpen)}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <div className="relative">
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-700 object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-gray-900" />
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-gray-900 dark:text-gray-100 leading-none">
                {userProfile.name}
              </div>
              <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5 uppercase tracking-wider">
                {currentRole}
              </div>
            </div>
          </button>

          {isProfilePopoutOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 z-50 text-gray-800 dark:text-white">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-300">
                    User Session Profile
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfilePopoutOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-[#1E293B]/60 border border-gray-200 dark:border-slate-800 rounded-xl">
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  className="w-10 h-10 rounded-xl border border-gray-300 dark:border-slate-700 object-cover shadow-sm"
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate">
                    {userProfile.name}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                    {userProfile.email || 'user@govmonitor.gov.et'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Activity className="w-3 h-3" />
                    <span>Active Session</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Active Access Role
                </label>
                <div className="space-y-1">
                  {roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleSelect(role)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                        currentRole === role
                          ? 'bg-blue-50 dark:bg-cyan-500/15 border border-blue-200 dark:border-cyan-500/30 text-blue-700 dark:text-cyan-300 font-semibold'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>Role: {role}</span>
                      {currentRole === role && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-slate-800 pt-2.5">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  disabled={isLoggingOut}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Logging Out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};