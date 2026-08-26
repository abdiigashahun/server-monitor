import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Server,
  Database,
  BellRing,
  BarChart3,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { ITDBLogo } from '../Common/ITDBLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { alerts } = useMonitoring();
  const { user, logout } = useAuth();
  const activeAlertsCount = alerts.filter((a) => a.status === 'Active').length;

  const coreModules = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    {
      id: 'datacenters',
      label: 'Data Centers (10)',
      icon: Building2,
      badge: '10 DCs',
      badgeColor: 'bg-blue-900 text-blue-300',
    },
    { id: 'inventory', label: 'Server Inventory', icon: Server },
    { id: 'backup', label: 'Backup Center', icon: Database },
    {
      id: 'alerts-logs',
      label: 'Alerts & Logs',
      icon: BellRing,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
      badgeColor: 'bg-red-100 text-red-700',
    },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  ];

  const adminModules = [
    {
      id: 'activity',
      label: 'User Activity & Changes',
      icon: Shield,
      badge: 'Who/What',
      badgeColor: 'bg-emerald-900 text-emerald-300',
    },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#111827] dark:bg-[#0B0F17] text-white flex flex-col border-r border-gray-800 dark:border-gray-800/80 shrink-0 min-h-screen transition-colors duration-200">
      {/* Brand Header with ITDB Logo */}
      <div className="p-5 border-b border-gray-800 dark:border-gray-800/80">
        <ITDBLogo size="md" showSubtext={true} />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4 overflow-y-auto">
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
              className={`w-full flex items-center justify-between px-6 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-[#1E293B] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${item.badgeColor || 'bg-red-100 text-red-700'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

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
              className={`w-full flex items-center justify-between px-6 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-[#1E293B] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer System Info & Profile */}
      <div className="p-3.5 mt-auto border-t border-gray-800/80 bg-[#0B0F17] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'}
            alt={user?.name || 'User'}
            className="w-8 h-8 rounded-sm object-cover border border-gray-700 shrink-0"
          />
          <div className="overflow-hidden text-left">
            <p className="text-xs font-semibold truncate text-white">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-gray-400 font-mono truncate">{user?.role || 'Admin'} • {user?.email || 'admin@itdb.gov.et'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out / Lock Portal"
          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors cursor-pointer shrink-0 ml-1"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

