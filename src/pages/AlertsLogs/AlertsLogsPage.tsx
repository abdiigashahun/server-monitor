import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { AlertsList } from '../../components/Alerts/AlertsList';
import { formatTimestamp } from '../../utils/formatters';
import { BellRing, ShieldCheck, Terminal, Search, Download } from 'lucide-react';
import { UserRole } from '../../types';

interface AlertsLogsPageProps {
  userRole?: UserRole;
}

export const AlertsLogsPage: React.FC<AlertsLogsPageProps> = ({ userRole = 'Admin' }) => {
  const { auditLogs, systemLogs, addAuditLog } = useMonitoring();
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

  const filteredAuditLogs = auditLogs.filter((log) => {
    return (
      log.user.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.resource.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.ipAddress.includes(logSearch)
    );
  });

  const handleExportAuditLogs = () => {
    addAuditLog('Export Report', 'Audit Trail', 'Exported ISO 27001 compliance audit trail logs');
    // Export/Download implementation logic
  };

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
          Audit Trail (ISO 27001)
        </button>
      </div>

      {/* Tab 1: Alerts List */}
      {activeTab === 'ALERTS' && <AlertsList userRole={userRole} />}

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
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Level</th>
                    <th className="px-4 py-2.5">Component</th>
                    <th className="px-4 py-2.5">Server</th>
                    <th className="px-4 py-2.5">Log Message</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono">
                  {filteredSystemLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                            log.level === 'ERROR'
                              ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                              : log.level === 'WARN'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-blue-600 dark:text-blue-400">{log.component}</td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{log.serverName || 'System Portal'}</td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100 font-sans">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'AUDIT_TRAIL' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search audit trail by user, action, IP..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm pl-9 pr-3 py-1.5 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                Standard: <strong className="text-gray-800 dark:text-gray-200">ISO/IEC 27001 Log Standard</strong>
              </div>

              
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Action Executed</th>
                    <th className="px-4 py-2.5">Target Resource</th>
                    <th className="px-4 py-2.5">IP Address</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-gray-100">{log.user}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{log.role}</td>
                      <td className="px-4 py-2.5 font-semibold text-blue-600 dark:text-blue-400">{log.action}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">{log.resource}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400">{log.ipAddress}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                            log.status === 'Success'
                              ? 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                              : 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 max-w-xs truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};