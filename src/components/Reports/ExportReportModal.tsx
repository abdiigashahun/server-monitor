import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { downloadCSV, downloadExcel, printPDF } from '../../utils/exportUtils';
import { FileText, Download, FileSpreadsheet, Printer, X } from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose }) => {
  const { servers, auditLogs } = useMonitoring();

  const [reportType, setReportType] = useState<'HEALTH' | 'BACKUP' | 'AUDIT'>('HEALTH');
  const [fileFormat, setFileFormat] = useState<'PDF' | 'EXCEL' | 'CSV'>('PDF');

  if (!isOpen) return null;

  const handleExport = () => {
    if (reportType === 'HEALTH') {
      const headers = ['Server Name', 'IP Address', 'OS', 'Type', 'Department', 'CPU %', 'RAM %', 'Disk %', 'Health Status'];
      const rows = servers.map((s) => [
        s.name,
        s.ipAddress,
        s.os,
        s.type,
        s.department,
        `${s.cpuUsage}%`,
        `${s.memoryUsage}%`,
        `${s.diskUsage}%`,
        s.healthStatus,
      ]);

      if (fileFormat === 'CSV') downloadCSV('ITDB_Server_Health_Report', headers, rows);
      else if (fileFormat === 'EXCEL') downloadExcel('ITDB_Server_Health_Report', headers, rows);
      else printPDF('Daily Server Health & Resource Report', 'report-print-container');
    } else if (reportType === 'BACKUP') {
      const headers = ['Server Name', 'IP Address', 'Backup Type', 'Backup Status', 'Last Backup Time', 'Size (GB)', 'Backup Target'];
      const rows = servers.map((s) => [
        s.name,
        s.ipAddress,
        s.backupType,
        s.backupStatus,
        s.lastBackupTime,
        s.backupSizeGB,
        s.backupLocation,
      ]);

      if (fileFormat === 'CSV') downloadCSV('ITDB_Backup_History_Report', headers, rows);
      else if (fileFormat === 'EXCEL') downloadExcel('ITDB_Backup_History_Report', headers, rows);
      else printPDF('Automated Backup History Audit Report', 'report-print-container');
    } else {
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Resource', 'IP Address', 'Status', 'Details'];
      const rows = auditLogs.map((log) => [
        log.timestamp,
        log.user,
        log.role,
        log.action,
        log.resource,
        log.ipAddress,
        log.status,
        log.details,
      ]);

      if (fileFormat === 'CSV') downloadCSV('ITDB_Audit_Access_Logs', headers, rows);
      else if (fileFormat === 'EXCEL') downloadExcel('ITDB_Audit_Access_Logs', headers, rows);
      else printPDF('Security & Audit Access Logs Report', 'report-print-container');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm w-full max-w-md shadow-xl overflow-hidden text-gray-900 dark:text-gray-100 animate-in fade-in zoom-in duration-150 text-xs">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">Export Reports & Audit Logs</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-sm cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
              Select Report Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setReportType('HEALTH')}
                className={`p-2.5 rounded-sm border text-center font-bold transition-all cursor-pointer ${
                  reportType === 'HEALTH'
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Server Health
              </button>
              <button
                type="button"
                onClick={() => setReportType('BACKUP')}
                className={`p-2.5 rounded-sm border text-center font-bold transition-all cursor-pointer ${
                  reportType === 'BACKUP'
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Backup Logs
              </button>
              <button
                type="button"
                onClick={() => setReportType('AUDIT')}
                className={`p-2.5 rounded-sm border text-center font-bold transition-all cursor-pointer ${
                  reportType === 'AUDIT'
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Audit Trail
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
              Choose Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFileFormat('PDF')}
                className={`p-3 rounded-sm border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  fileFormat === 'PDF'
                    ? 'bg-red-50 dark:bg-red-950/80 border-red-600 dark:border-red-500 text-red-700 dark:text-red-300'
                    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Printer className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="font-bold">PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setFileFormat('EXCEL')}
                className={`p-3 rounded-sm border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  fileFormat === 'EXCEL'
                    ? 'bg-green-50 dark:bg-green-950/80 border-green-600 dark:border-green-500 text-green-700 dark:text-green-300'
                    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-bold">Excel (.xls)</span>
              </button>

              <button
                type="button"
                onClick={() => setFileFormat('CSV')}
                className={`p-3 rounded-sm border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  fileFormat === 'CSV'
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold">CSV Data</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold bg-gray-200 dark:bg-gray-800 rounded-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-sm flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Report
          </button>
        </div>
      </div>
    </div>
  );
};
