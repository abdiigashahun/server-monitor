import React, { useState } from 'react';
import { HealthReportCard } from '../../components/Reports/HealthReportCard';
import { AnalyticsCharts } from '../../components/Reports/AnalyticsCharts';
import { BackupReportTable } from '../../components/Reports/BackupReportTable';
import { ExportReportModal } from '../../components/Reports/ExportReportModal';
import { BarChart3, Download, Calendar, RefreshCw } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d'>('7d');

  return (
    <div className="space-y-6 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Top Banner Control */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Reports & Analytics Portal</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              Daily/Weekly Health Reports, Backup History Audits, and Telemetry Performance Analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Historical Range Picker */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-0.5 text-gray-600 dark:text-gray-300">
            <button
              onClick={() => setDateRange('24h')}
              className={`px-3 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                dateRange === '24h' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-bold shadow-2xs' : 'hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setDateRange('7d')}
              className={`px-3 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                dateRange === '7d' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-bold shadow-2xs' : 'hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                dateRange === '30d' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-bold shadow-2xs' : 'hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Health Overview Summary Cards */}
      <HealthReportCard />

      {/* Analytics Telemetry Charts */}
      <AnalyticsCharts />

      {/* Backup Audit Table */}
      <BackupReportTable />

      {/* Export Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
