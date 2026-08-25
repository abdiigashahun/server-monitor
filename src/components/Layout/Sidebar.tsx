// src/components/Layout/Sidebar.tsx
import React from 'react';
import {
  LayoutDashboard,
  Server,
  Database,
  BellRing,
  BarChart3,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';
import { ITDBLogo } from '../Common/ITDBLogo';
import { UserRole, ROLE_PERMISSIONS } from '../../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole }) => {
  const { alerts } = useMonitoring();
  const activeAlertsCount = alerts.filter((a) => a.status === 'Active').length;

  const allowedTabs = ROLE_PERMISSIONS[userRole] || [];

  const coreModules = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'inventory', label: 'Server Inventory', icon: Server },
    { id: 'backup', label: 'Backup Center', icon: Database },
    {
      id: 'alerts-logs',
      label: 'Alerts & Logs',
      icon: BellRing,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
    },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  ].filter((item) => allowedTabs.includes(item.id));

  const adminModules = [
    { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ].filter((item) => allowedTabs.includes(item.id));

  return (
    <aside className="w-64 bg-[#111827] dark:bg-[#0B0F17] text-white flex flex-col border-r border-gray-800 shrink-0 min-h-screen">
      <div className="p-5 border-b border-gray-800">
        <ITDBLogo size="md" showSubtext={true} />
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {coreModules.length > 0 && (
          <>
            <div className="px-4 mb-2 text-[10px] uppercase text-gray-500 font-bold tracking-widest">
              Core Modules
            </div>
            {coreModules.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-6 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-[#2D2D2D] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {adminModules.length > 0 && (
          <>
            <div className="px-4 mt-6 mb-2 text-[10px] uppercase text-gray-500 font-bold tracking-widest">
              Administration
            </div>
            {adminModules.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-6 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-[#2D2D2D] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* User Status Tag */}
      <div className="p-4 mt-auto border-t border-[#2D2D2D] bg-[#0A0A0A]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {userRole.substring(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold truncate text-white">Gov System Controller</p>
            <p className="text-[10px] text-emerald-400 font-medium truncate">Role: {userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};