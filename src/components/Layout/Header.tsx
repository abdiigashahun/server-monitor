import React, { useState, useRef, useEffect } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../Notification/NotificationBell';
import { Search, Play, Pause, Sun, Moon, LogOut, ShieldCheck, ChevronDown, UserCheck } from 'lucide-react';
import { UserRole } from '../../types';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const {
    alerts,
    isLiveSimulating,
    toggleLiveSimulation,
    dataCenters,
    selectedDataCenter,
    setSelectedDataCenter,
  } = useMonitoring();
  const { theme, toggleTheme } = useTheme();
  const { user, logout, switchRole } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeAlerts = alerts.filter((a) => a.status === 'Active');
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'Critical');

  const getRoleBadgeStyle = (role?: string) => {
    if (role === 'Admin') return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    if (role === 'Operator') return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  };

  return (
    <header className="h-16 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-40 text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Left side: Live System Status Badges */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2">
          {criticalAlerts.length > 0 ? (
            <span className="px-2.5 py-1 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[11px] font-bold rounded-sm uppercase border border-red-200 dark:border-red-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {criticalAlerts.length} Critical Issues
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 text-[11px] font-bold rounded-sm uppercase border border-green-200 dark:border-green-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              10/10 DCs Operational
            </span>
          )}
          {activeAlerts.length > 0 && (
            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[11px] font-bold rounded-sm uppercase border border-amber-200 dark:border-amber-800">
              {activeAlerts.length} Active Alerts
            </span>
          )}
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center space-x-3 sm:space-x-4">

        {/* Dark/Light Mode Theme Switcher */}
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

        {/* Live Feed Toggle */}
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

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Profile & Dropdown Menu */}
        <div className="relative pl-3 border-l border-gray-200 dark:border-gray-800" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 focus:outline-none cursor-pointer group"
            title="User Account & Role Switcher"
          >
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-sm border border-gray-300 dark:border-gray-700 object-cover ring-1 ring-blue-500/30"
            />
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-gray-900 dark:text-gray-100 leading-none group-hover:text-blue-500 transition-colors flex items-center gap-1">
                <span>{user?.name || 'Administrator'}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                {user?.role || 'Admin'}
              </div>
            </div>
          </button>

          {/* User Profile Popover Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 p-3 space-y-3 animate-fade-in text-xs">
              {/* Profile Card */}
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <img
                  src={user?.avatarUrl}
                  alt={user?.name}
                  className="w-10 h-10 rounded-md border border-gray-300 dark:border-gray-700 object-cover"
                />
                <div className="overflow-hidden">
                  <div className="font-bold text-gray-900 dark:text-white truncate">{user?.name}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                  <span className={`inline-block px-1.5 py-0.2 rounded-xs text-[9px] font-bold uppercase border mt-1 ${getRoleBadgeStyle(user?.role)}`}>
                    {user?.role} Mode
                  </span>
                </div>
              </div>

              {/* Quick Role Switcher */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                  Switch Demo Role
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Admin', 'Operator', 'User'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        switchRole(r);
                        setShowUserMenu(false);
                      }}
                      className={`py-1 px-1.5 rounded text-[11px] font-semibold border text-center transition-all cursor-pointer ${
                        user?.role === r
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign Out Action */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 font-bold rounded-md border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out / Lock Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


