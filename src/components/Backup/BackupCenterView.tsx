import React from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { BackupReportTable } from '../Reports/BackupReportTable';
import { Database, ShieldCheck, RefreshCw, Layers } from 'lucide-react';

export const BackupCenterView: React.FC = () => {
  const { servers } = useMonitoring();

  const totalBackups = servers.length;
  const successCount = servers.filter((s) => s.backupStatus === 'Success').length;

  return (
    <div className="space-y-4 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">Automated Backup Center</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Monitor backup logs, verify last backup time, backup size, and backup failure thresholds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <div className="text-green-700 dark:text-green-400 font-bold">{successCount} / {totalBackups} Compliant</div>
            <div className="text-gray-500 dark:text-gray-400 text-[10px]">98.5% Success Rate</div>
          </div>
        </div>
      </div>

      <BackupReportTable />
    </div>
  );
};
