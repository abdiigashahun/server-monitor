import React from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { getBackupBadgeClass, formatBytes } from '../../utils/formatters';
import { Database, CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react';

export const BackupReportTable: React.FC = () => {
  const { servers } = useMonitoring();

  const successCount = servers.filter((s) => s.backupStatus === 'Success').length;
  const failedCount = servers.filter((s) => s.backupStatus === 'Failed').length;
  const totalSize = servers.reduce((acc, s) => acc + s.backupSizeGB, 0);

  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm text-xs space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-200">Automated Backup Audit Logs Table</h3>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-green-700 dark:text-green-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> {successCount} Successful
          </span>
          {failedCount > 0 && (
            <span className="text-red-700 dark:text-red-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" /> {failedCount} Failed
            </span>
          )}
          <span className="text-gray-500 dark:text-gray-400 font-mono font-semibold">Total Volume: {formatBytes(totalSize)}</span>
        </div>
      </div>

      <div className="overflow-x-auto" id="report-print-container">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">
              <th className="p-2.5">Server Name</th>
              <th className="p-2.5">IP Address</th>
              <th className="p-2.5">Type</th>
              <th className="p-2.5">Backup Type</th>
              <th className="p-2.5">Last Backup Time</th>
              <th className="p-2.5">Size</th>
              <th className="p-2.5">Backup Target / Storage</th>
              <th className="p-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {servers.map((server) => (
              <tr key={server.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="p-2.5 font-mono font-bold text-gray-900 dark:text-gray-100">{server.name}</td>
                <td className="p-2.5 font-mono text-gray-500 dark:text-gray-400">{server.ipAddress}</td>
                <td className="p-2.5 text-gray-700 dark:text-gray-300">{server.type}</td>
                <td className="p-2.5">
                  <span className="px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-mono font-semibold">
                    {server.backupType}
                  </span>
                </td>
                <td className="p-2.5 font-mono text-gray-700 dark:text-gray-300">{server.lastBackupTime}</td>
                <td className="p-2.5 font-mono text-gray-900 dark:text-gray-100 font-bold">{formatBytes(server.backupSizeGB)}</td>
                <td className="p-2.5 font-mono text-[11px] text-gray-500 dark:text-gray-400 max-w-[180px] truncate">
                  {server.backupLocation}
                </td>
                <td className="p-2.5">
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${getBackupBadgeClass(server.backupStatus)}`}>
                    {server.backupStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
