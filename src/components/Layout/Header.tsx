import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import * as alertsApi from '../../api/alerts';
import { Badge } from '../Common/Badge';
import { Sun, Moon, LogOut, ChevronDown, Menu } from 'lucide-react';
import { NAV_BY_ID } from '../../navigation';
import type { Role } from '../../types';

interface HeaderProps {
  activeTab: string;
  onMenuClick: () => void;
}

function roleVariant(role?: Role) {
  if (role === 'ADMIN') return 'info' as const;
  if (role === 'OPERATOR') return 'warning' as const;
  return 'success' as const;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, can } = useAuth();

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

  const canReadAlerts = can('alerts:read');
  const { data: openData } = useApi(
    () => (canReadAlerts ? alertsApi.list({ status: 'OPEN', limit: 1 }) : Promise.resolve(null)),
    [canReadAlerts],
  );
  const { data: criticalData } = useApi(
    () =>
      canReadAlerts
        ? alertsApi.list({ status: 'OPEN', severity: 'CRITICAL', limit: 1 })
        : Promise.resolve(null),
    [canReadAlerts],
  );
  const openCount = openData?.pagination.total ?? 0;
  const criticalCount = criticalData?.pagination.total ?? 0;

  const title = NAV_BY_ID[activeTab]?.label ?? 'Dashboard';

  return (
    <header className="h-16 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-40 text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Page title + system status */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 -ml-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {canReadAlerts && (
          <div className="hidden sm:flex gap-2">
            {criticalCount > 0 ? (
              <Badge variant="danger">{criticalCount} Critical</Badge>
            ) : (
              <Badge variant="success">System Operational</Badge>
            )}
            {openCount > 0 && <Badge variant="warning">{openCount} Open Alerts</Badge>}
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:px-3 sm:py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span className="hidden md:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Light</span>
            </>
          )}
        </button>

        <div className="relative pl-3 border-l border-gray-200 dark:border-gray-800" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((s) => !s)}
            className="flex items-center space-x-2 focus:outline-none cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-sm bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.slice(0, 1).toUpperCase() ?? '—'}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-gray-900 dark:text-gray-100 leading-none group-hover:text-blue-500 transition-colors flex items-center gap-1">
                <span>{user?.name}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                {user?.role}
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 p-3 space-y-3 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
                  {user?.name?.slice(0, 1).toUpperCase() ?? '—'}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-gray-900 dark:text-white truncate">{user?.name}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </div>
                  <span className="mt-1 inline-block">
                    <Badge variant={roleVariant(user?.role)}>{user?.role}</Badge>
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  void logout();
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 font-bold rounded-md border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
