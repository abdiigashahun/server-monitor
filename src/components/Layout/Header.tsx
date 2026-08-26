import React from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationBell } from '../Notification/NotificationBell';
import { Play, Pause, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = () => {
  const {
    alerts,
    isLiveSimulating,
    toggleLiveSimulation,
  } = useMonitoring();
  const { theme, toggleTheme } = useTheme();

  const activeAlerts = alerts.filter((a) => a.status === 'Active');
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'Critical');

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
      </div>
    </header>
  );
};


