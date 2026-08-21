import React from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { Activity, Server, AlertTriangle, ShieldCheck, User } from 'lucide-react';
import { formatTimestamp } from '../../utils/formatters';

export const RecentActivityFeed: React.FC = () => {
  const { activities } = useMonitoring();

  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm p-4 flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">Recent Activity</h3>
        </div>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {activities.map((item) => (
          <div
            key={item.id}
            className={`pl-3 py-1.5 border-l-2 transition-colors ${
              item.type === 'ALERT'
                ? 'border-red-500'
                : item.type === 'BACKUP'
                ? 'border-blue-500'
                : item.type === 'USER'
                ? 'border-indigo-500'
                : 'border-green-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
              <p className="text-[9px] font-mono text-gray-400 dark:text-gray-500 shrink-0">
                {formatTimestamp(item.timestamp)}
              </p>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">{item.description}</p>
            {item.serverName && (
              <span className="inline-block text-[9px] font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded-xs mt-0.5">
                {item.serverName}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
