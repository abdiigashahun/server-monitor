// src/components/Backup/BackupCenterView.tsx
import React from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { UserRole } from '../../types';
import { Database, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BackupCenterViewProps {
  userRole?: UserRole;
}

// Explicit Interface to fix TS2349 union mismatch
interface BackupLogItem {
  name: string;
  ip: string;
  type: string;
  backupType: string;
  time: string;
  size: string;
  target: string;
  status: 'Success' | 'Failed' | 'In Progress';
}

export const BackupCenterView: React.FC<BackupCenterViewProps> = ({ userRole = 'Viewer' }) => {
  const { servers } = useMonitoring();

  // Explicitly typed mock dataset
  const mockBackupLogs: BackupLogItem[] = [
    { name: 'gov-portal-prod-01', ip: '192.168.1.101', type: 'Web', backupType: 'Full', time: '2026-08-06 02:00:00', size: '245.8 GB', target: '/mnt/backups/gov-portal-01', status: 'Success' },
    { name: 'fin-db-cluster-node2', ip: '192.168.1.133', type: 'Database', backupType: 'Incremental', time: '2026-08-05 01:00:00', size: '812.4 GB', target: 's3://gov-finance-backups/...', status: 'Failed' },
    { name: 'tax-app-win-01', ip: '192.168.1.132', type: 'Application', backupType: 'Incremental', time: '2026-08-06 03:30:00', size: '120.5 GB', target: 'D:\\Backups\\TaxApp', status: 'Success' },
    { name: 'health-records-file01', ip: '192.168.2.45', type: 'File', backupType: 'Full', time: '2026-08-06 00:15:00', size: '1.81 TB', target: '\\\\nas01\\health\\backups', status: 'Success' },
    { name: 'ethio-dns-core-01', ip: '10.0.0.53', type: 'DNS', backupType: 'Incremental', time: '2026-08-06 04:00:00', size: '12.2 GB', target: '/var/backups/dns', status: 'Success' },
    { name: 'mail-gov-relay-02', ip: '192.168.1.200', type: 'Mail', backupType: 'Incremental', time: '2026-08-06 02:45:00', size: '410.0 GB', target: '/backup/mail/relay02', status: 'Success' },
    { name: 'edu-portal-win-02', ip: '192.168.3.12', type: 'Web', backupType: 'Full', time: '2026-08-06 01:30:00', size: '320.0 GB', target: 'E:\\EduPortal\\Backups', status: 'Success' },
    { name: 'police-cad-db-01', ip: '192.168.4.99', type: 'Database', backupType: 'Full', time: '2026-08-04 12:00:00', size: '1.21 TB', target: '/opt/police_cad/backups', status: 'Failed' },
  ];

  // Map server context data with type assertion
  const backupLogs: BackupLogItem[] = servers && servers.length > 0
    ? servers.map((s) => ({
        name: s.name,
        ip: s.ipAddress,
        type: s.type,
        backupType: (s as any).backupType || 'Full',
        time: (s as any).lastBackup || '2026-08-06 02:00:00',
        size: `${(s as any).backupSizeGB || '245.8'} GB`,
        target: (s as any).backupTarget || `/mnt/backups/${s.name}`,
        status: ((s as any).backupStatus || 'Success') as 'Success' | 'Failed' | 'In Progress',
      }))
    : mockBackupLogs;

  const successfulCount = backupLogs.filter((b) => b.status === 'Success').length;
  const failedCount = backupLogs.filter((b) => b.status === 'Failed').length;

  return (
    <div className="space-y-4 font-sans text-[#E5E7EB] bg-[#0B0F19] p-2 rounded-md">
      {/* Top Banner */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-md p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1E293B] border border-[#334155] rounded-md text-[#38BDF8]">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Automated Backup Center
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Monitor backup logs, verify last backup time, backup size, and backup failure thresholds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="text-right">
            <div className="text-xs font-bold text-[#10B981] font-mono">
              {successfulCount} / {backupLogs.length} Compliant
            </div>
            <div className="text-[10px] text-[#6B7280] font-mono">
              {((successfulCount / backupLogs.length) * 100).toFixed(1)}% Success Rate
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-md p-4 shadow-md space-y-3">
        {/* Table Header Bar */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Automated Backup Audit Logs Table
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1 text-[#10B981] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {successfulCount} Successful
            </span>
            <span className="flex items-center gap-1 text-[#EF4444] font-bold">
              <AlertTriangle className="w-3.5 h-3.5" /> {failedCount} Failed
            </span>
            <span className="text-[#9CA3AF]">
              Total Volume: <strong className="text-white">4.89 TB</strong>
            </span>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1F2937] text-[#6B7280] uppercase text-[10px] font-bold tracking-wider">
                <th className="py-2.5 px-2">Server Name</th>
                <th className="py-2.5 px-2">IP Address</th>
                <th className="py-2.5 px-2">Type</th>
                <th className="py-2.5 px-2">Backup Type</th>
                <th className="py-2.5 px-2">Last Backup Time</th>
                <th className="py-2.5 px-2">Size</th>
                <th className="py-2.5 px-2">Backup Target / Storage</th>
                <th className="py-2.5 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]">
              {backupLogs.map((log, index) => (
                <tr key={index} className="hover:bg-[#1E293B]/40 transition-colors">
                  <td className="py-3 px-2 font-bold font-mono text-white">{log.name}</td>
                  <td className="py-3 px-2 font-mono text-[#9CA3AF]">{log.ip}</td>
                  <td className="py-3 px-2 text-[#D1D5DB]">{log.type}</td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#1E293B] border border-[#334155] text-[#9CA3AF] font-mono text-[10px]">
                      {log.backupType}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono text-[#D1D5DB]">{log.time}</td>
                  <td className="py-3 px-2 font-bold font-mono text-white">{log.size}</td>
                  <td className="py-3 px-2 font-mono text-[#9CA3AF] max-w-[200px] truncate" title={log.target}>
                    {log.target}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'Success'
                          ? 'bg-[#064E3B] text-[#34D399] border border-[#059669]'
                          : 'bg-[#7F1D1D] text-[#FCA5A5] border border-[#DC2626]'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BackupCenterView;