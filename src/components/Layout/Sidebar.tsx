import React from 'react';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import * as alertsApi from '../../api/alerts';
import { ITDBLogo } from '../Common/ITDBLogo';
import { NAV_ITEMS } from '../../navigation';
import { navigate } from '../../router';

interface SidebarProps {
  activeTab: string;
  open: boolean;
  onClose: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, open, onClose }) => {
  const { user, logout, can } = useAuth();

  const canReadAlerts = can('alerts:read');
  const { data: alertData } = useApi(
    () => (canReadAlerts ? alertsApi.list({ status: 'OPEN', limit: 1 }) : Promise.resolve(null)),
    [canReadAlerts],
  );
  const openAlerts = alertData?.pagination.total ?? 0;

  const visible = NAV_ITEMS.filter((item) => !item.permission || can(item.permission));
  const core = visible.filter((i) => i.section === 'core');
  const admin = visible.filter((i) => i.section === 'admin');

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const badge = item.id === 'alerts' && openAlerts > 0 ? openAlerts : undefined;
    return (
      <button
        key={item.id}
        onClick={() => {
          navigate(item.id);
          onClose();
        }}
        className={`w-full flex items-center justify-between px-6 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#1E293B] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4" />
          <span>{item.label}</span>
        </div>
        {badge !== undefined && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-red-100 text-red-700">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Backdrop — only below lg, when the drawer is open. */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] dark:bg-[#0B0F17] text-white flex flex-col border-r border-gray-800 dark:border-gray-800/80 transform transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-gray-800 dark:border-gray-800/80 flex items-center justify-between">
          <ITDBLogo size="md" showSubtext={true} />
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 mb-2 text-[10px] uppercase text-gray-500 font-bold tracking-widest">
            Core Modules
          </div>
          {core.map(renderItem)}

          {admin.length > 0 && (
            <>
              <div className="px-4 mt-6 mb-2 text-[10px] uppercase text-gray-500 font-bold tracking-widest">
                Administration
              </div>
              {admin.map(renderItem)}
            </>
          )}
        </nav>

        <div className="p-3.5 mt-auto border-t border-gray-800/80 bg-[#0B0F17] flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-sm bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user ? initials(user.name) : '—'}
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-xs font-semibold truncate text-white">{user?.name}</p>
              <p className="text-[10px] text-gray-400 font-mono truncate">
                {user?.role} • {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            title="Sign out"
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors cursor-pointer shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
