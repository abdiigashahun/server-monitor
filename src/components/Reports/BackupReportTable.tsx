// src/components/Reports/BackupReportTable.tsx
import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { UserRole } from '../../types';
import { getBackupBadgeClass, formatBytes } from '../../utils/formatters';
import { Database, CheckCircle, AlertTriangle, Search, Filter, RefreshCw, Play, Edit, Trash2 } from 'lucide-react';

interface BackupReportTableProps {
  userRole?: UserRole;
}

export const BackupReportTable: React.FC<BackupReportTableProps> = ({ userRole = 'Admin' }) => {
  const monitoring = useMonitoring() as ReturnType<typeof useMonitoring> & {
    triggerBackup?: (serverId: string) => Promise<void>;
    deleteServer?: (serverId: string) => void;
    editServer?: (serverId: string) => void;
  };
  
  const { servers } = monitoring;
  const { triggerBackup, deleteServer, editServer } = monitoring;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Success' | 'Failed' | 'In Progress'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backingUpId, setBackingUpId] = useState<string | null>(null);

  // Role permissions
  const isAdmin = userRole === 'Admin';
  const isOperator = userRole === 'Operator';
  const canRunBackup = isAdmin || isOperator;

  const getStatus = (s: any) => s.backupStatus || 'Success';
  const getLocation = (s: any) => s.backupLocation || s.backupTarget || `/mnt/backups/${s.name}`;
  const getLastBackup = (s: any) => s.lastBackupTime || s.lastBackup || '2026-08-06 02:00:00';
  const getBackupType = (s: any) => s.backupType || 'Full';

  const successCount = servers.filter((s) => getStatus(s) === 'Success').length;
  const failedCount = servers.filter((s) => getStatus(s) === 'Failed').length;
  const inProgressCount = servers.filter((s) => getStatus(s) === 'In Progress').length;
  const totalSize = servers.reduce((acc, s: any) => acc + (s.backupSizeGB || 245), 0);

  const filteredServers = servers.filter((server: any) => {
    const location = getLocation(server);
    const status = getStatus(server);

    const matchesSearch =
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.ipAddress.includes(searchQuery) ||
      location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleManualBackup = async (serverId: string) => {
    if (triggerBackup && canRunBackup) {
      setBackingUpId(serverId);
      await triggerBackup(serverId);
      setBackingUpId(null);
    }
  };

  const handleEdit = (serverId: string) => {
    if (isAdmin && editServer) {
      editServer(serverId);
    }
  };

  const handleDelete = (serverId: string) => {
    if (isAdmin && deleteServer) {
      deleteServer(serverId);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 shadow-sm text-xs space-y-3 transition-colors">
      {/* Header & KPI Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200">
            Automated Backup Audit Logs Table
          </h3>
        </div>

        <div className="flex items-center gap-3 text-[11px] flex-wrap">
          <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {successCount} Successful
          </span>
          {failedCount > 0 && (
            <span className="text-red-700 dark:text-red-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" /> {failedCount} Failed
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" /> {inProgressCount} In Progress
            </span>
          )}
          <span className="text-gray-500 dark:text-slate-400 font-mono font-semibold">
            Total Volume: {formatBytes(totalSize)}
          </span>
        </div>
      </div>

      {/* Action Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search server, IP, or location..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-sm text-xs text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-sm border border-gray-200 dark:border-slate-700 text-[10px]">
            <Filter className="w-3 h-3 text-gray-400 ml-1.5 mr-0.5" />
            {(['ALL', 'Success', 'Failed', 'In Progress'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            title="Refresh Audit Table"
            className="p-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-sm text-gray-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto" id="report-print-container">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <th className="p-2.5">Server Name</th>
              <th className="p-2.5">IP Address</th>
              <th className="p-2.5">Type</th>
              <th className="p-2.5">Backup Type</th>
              <th className="p-2.5">Last Backup Time</th>
              <th className="p-2.5">Size</th>
              <th className="p-2.5">Backup Target / Storage</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {filteredServers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500 dark:text-slate-400">
                  No backup logs matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredServers.map((server: any) => {
                const status = getStatus(server);
                const location = getLocation(server);
                const lastBackupTime = getLastBackup(server);
                const backupType = getBackupType(server);

                return (
                  <tr key={server.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-gray-900 dark:text-slate-100">{server.name}</td>
                    <td className="p-2.5 font-mono text-gray-500 dark:text-slate-400">{server.ipAddress}</td>
                    <td className="p-2.5 text-gray-700 dark:text-slate-300">{server.type}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-[10px] font-mono font-semibold">
                        {backupType}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-gray-700 dark:text-slate-300">{lastBackupTime}</td>
                    <td className="p-2.5 font-mono text-gray-900 dark:text-slate-100 font-bold">
                      {formatBytes(server.backupSizeGB || 245)}
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-gray-500 dark:text-slate-400 max-w-[180px] truncate" title={location}>
                      {location}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[10px] font-bold inline-block ${getBackupBadgeClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Run Backup Button */}
                        {triggerBackup && (
                          <button
                            disabled={status === 'In Progress' || backingUpId === server.id || !canRunBackup}
                            onClick={() => handleManualBackup(server.id)}
                            title={!canRunBackup ? 'Viewer role cannot trigger backups' : 'Trigger Manual Backup'}
                            className={`px-2 py-1 text-[11px] font-medium rounded-sm border transition-colors inline-flex items-center gap-1 ${
                              status === 'In Progress' || backingUpId === server.id || !canRunBackup
                                ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 border-gray-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                                : 'bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 cursor-pointer'
                            }`}
                          >
                            <Play className={`w-3 h-3 ${backingUpId === server.id ? 'animate-spin' : ''}`} />
                            {backingUpId === server.id ? 'Running...' : 'Run'}
                          </button>
                        )}

                        {/* EDIT BUTTON */}
                        <button
                          disabled={!isAdmin}
                          onClick={() => handleEdit(server.id)}
                          title={!isAdmin ? 'Admin privileges required to edit' : 'Edit Server Configuration'}
                          className={`p-1 rounded-sm border transition-colors ${
                            !isAdmin
                              ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 border-gray-200 dark:border-slate-700 cursor-not-allowed opacity-40'
                              : 'bg-gray-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-600 hover:text-amber-600 border-gray-200 dark:border-slate-700 cursor-pointer'
                          }`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* DELETE BUTTON */}
                        <button
                          disabled={!isAdmin}
                          onClick={() => handleDelete(server.id)}
                          title={!isAdmin ? 'Admin privileges required to delete' : 'Delete Server Record'}
                          className={`p-1 rounded-sm border transition-colors ${
                            !isAdmin
                              ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 border-gray-200 dark:border-slate-700 cursor-not-allowed opacity-40'
                              : 'bg-gray-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-600 hover:text-red-600 border-gray-200 dark:border-slate-700 cursor-pointer'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};