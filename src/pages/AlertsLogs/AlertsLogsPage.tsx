import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { AlertsList } from '../../components/Alerts/AlertsList';
import { UserActivityTracker } from '../../components/Activity/UserActivityTracker';
import { formatTimestamp } from '../../utils/formatters';
import { BellRing, ShieldCheck, Terminal, Search, Filter, ShieldAlert, CheckCircle2, FileText } from 'lucide-react';

export const AlertsLogsPage: React.FC = () => {
  const { systemLogs } = useMonitoring();
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'SYSTEM_LOGS' | 'AUDIT_TRAIL'>('ALERTS');

  const [logSearch, setLogSearch] = useState('');
  const [logLevel, setLogLevel] = useState('ALL');

  const filteredSystemLogs = systemLogs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.component.toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.serverName && log.serverName.toLowerCase().includes(logSearch.toLowerCase()));
    const matchesLevel = logLevel === 'ALL' || log.level === logLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Tab Switcher Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-6">
        <button
          onClick={() => setActiveTab('ALERTS')}
          className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'ALERTS'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <BellRing className="w-4 h-4" />
          Active Alerts & Breaches
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM_LOGS')}
          className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'SYSTEM_LOGS'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Real-Time Log Stream
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_TRAIL')}
          className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'AUDIT_TRAIL'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Audit Trail & Change Tracking (ISO 27001)
        </button>
      </div>

      {/* Tab 1: Alerts List */}
      {activeTab === 'ALERTS' && <AlertsList />}

      {/* Tab 2: System Execution Logs */}
      {activeTab === 'SYSTEM_LOGS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search system log stream or component..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm pl-9 pr-3 py-1.5 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">Log Level:</span>
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Levels</option>
                <option value="ERROR">ERROR</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
                <option value="DEBUG">DEBUG</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden font-mono text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold border-b border-gray-200 dark:border-gray-800 font-sans">
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Level</th>
                    <th className="px-4 py-2.5">Component</th>
                    <th className="px-4 py-2.5">Associated Server</th>
                    <th className="px-4 py-2.5">Log Message / Event Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSystemLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold ${
                            log.level === 'ERROR'
                              ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                              : log.level === 'WARN'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                              : log.level === 'INFO'
                              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-gray-800 dark:text-gray-200">{log.component}</td>
                      <td className="px-4 py-2.5 text-blue-600 dark:text-blue-400">{log.serverName || 'System Gateway'}</td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Full User Activity & Change Tracker */}
      {activeTab === 'AUDIT_TRAIL' && <UserActivityTracker />}
    </div>
  );
};
