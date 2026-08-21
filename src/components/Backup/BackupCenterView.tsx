import React, { useState, useMemo } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { Server, BackupStatus, BackupType } from '../../types';
import { getBackupBadgeClass, formatBytes } from '../../utils/formatters';
import {
  Database,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  Play,
  RotateCcw,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Calendar,
  Layers,
  Sparkles,
  X,
  Server as ServerIcon,
  ChevronDown,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sliders,
  ArchiveRestore,
  Lock
} from 'lucide-react';

export const BackupCenterView: React.FC = () => {
  const {
    servers,
    triggerServerBackup,
    restoreServerBackup,
    editBackupSchedule,
    deleteBackupJob,
    addToast
  } = useMonitoring();

  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isOperator = user?.role === 'Operator';
  const canManageBackups = isAdmin || isOperator; // Only Admin and Operator can execute / modify backup jobs

  // Search & Filter State (Matching Image 2)
  const [searchQuery, setSearchQuery] = useState('');
  const [targetServerFilter, setTargetServerFilter] = useState<string>('ALL');
  const [backupTypeFilter, setBackupTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Interactive Modals State
  const [restoringServer, setRestoringServer] = useState<Server | null>(null);
  const [restoreScope, setRestoreScope] = useState<'Full System State' | 'Database Dump Only' | 'Configuration Files Only'>('Full System State');
  const [isRestoring, setIsRestoring] = useState(false);

  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [editJobName, setEditJobName] = useState('');
  const [editType, setEditType] = useState<BackupType>('Full');
  const [editSchedule, setEditSchedule] = useState('Daily at 02:00 AM');
  const [editLocation, setEditLocation] = useState('');
  const [editRetention, setEditRetention] = useState(30);

  const [deletingServer, setDeletingServer] = useState<Server | null>(null);
  const [runningBackupId, setRunningBackupId] = useState<string | null>(null);

  // New Backup Policy Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTargetServerId, setNewTargetServerId] = useState(servers[0]?.id || '');
  const [newJobName, setNewJobName] = useState('');
  const [newBackupType, setNewBackupType] = useState<BackupType>('Full');
  const [newSchedule, setNewSchedule] = useState('Daily at 02:00 AM');
  const [newLocation, setNewLocation] = useState('s3://gov-backups/custom');
  const [newRetention, setNewRetention] = useState(30);

  // Filtered Servers / Backup Policies
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      const q = searchQuery.toLowerCase();
      const jobName = s.backupJobName || `${s.name}-daily-backup`;
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.ipAddress.toLowerCase().includes(q) ||
        s.backupLocation.toLowerCase().includes(q) ||
        jobName.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q);

      const matchesTargetServer = targetServerFilter === 'ALL' || s.id === targetServerFilter || s.name === targetServerFilter;
      const matchesType = backupTypeFilter === 'ALL' || s.backupType === backupTypeFilter;
      const matchesStatus = statusFilter === 'ALL' || s.backupStatus === statusFilter;

      return matchesSearch && matchesTargetServer && matchesType && matchesStatus;
    });
  }, [servers, searchQuery, targetServerFilter, backupTypeFilter, statusFilter]);

  // Aggregate Metrics
  const totalBackups = servers.length;
  const successCount = servers.filter((s) => s.backupStatus === 'Success').length;
  const failedCount = servers.filter((s) => s.backupStatus === 'Failed').length;
  const inProgressCount = servers.filter((s) => s.backupStatus === 'In Progress').length;
  const totalSizeGB = servers.reduce((acc, s) => acc + s.backupSizeGB, 0);

  // Actions Handlers (Protected for Admin and Operator)
  const handleRunBackupNow = async (server: Server) => {
    if (!canManageBackups) {
      addToast('Access Denied', 'Only Admins and Operators can trigger manual backups.', 'warning');
      return;
    }
    setRunningBackupId(server.id);
    await triggerServerBackup(server.id);
    setRunningBackupId(null);
  };

  const handleOpenRestoreModal = (server: Server) => {
    if (!canManageBackups) {
      addToast('Access Denied', 'Only Admins and Operators can initiate system restorations.', 'warning');
      return;
    }
    setRestoringServer(server);
    setRestoreScope('Full System State');
  };

  const handleConfirmRestore = async () => {
    if (!restoringServer || !canManageBackups) return;
    setIsRestoring(true);
    await restoreServerBackup(restoringServer.id, restoreScope);
    setIsRestoring(false);
    setRestoringServer(null);
  };

  const handleOpenEditModal = (server: Server) => {
    if (!canManageBackups) {
      addToast('Access Denied', 'Only Admins and Operators can edit backup policies.', 'warning');
      return;
    }
    setEditingServer(server);
    setEditJobName(server.backupJobName || `${server.name}-backup-job`);
    setEditType(server.backupType);
    setEditSchedule(server.backupSchedule || 'Daily at 02:00 AM');
    setEditLocation(server.backupLocation);
    setEditRetention(server.backupRetentionDays || 30);
  };

  const handleSaveEditSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer || !canManageBackups) return;

    editBackupSchedule(editingServer.id, {
      backupJobName: editJobName,
      backupType: editType,
      backupSchedule: editSchedule,
      backupLocation: editLocation,
      backupRetentionDays: editRetention,
    });

    setEditingServer(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingServer || !canManageBackups) return;
    deleteBackupJob(deletingServer.id);
    setDeletingServer(null);
  };

  const handleCreatePolicySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetServerId || !canManageBackups) return;

    editBackupSchedule(newTargetServerId, {
      backupJobName: newJobName || `policy-${Date.now().toString(36)}`,
      backupType: newBackupType,
      backupSchedule: newSchedule,
      backupLocation: newLocation,
      backupRetentionDays: newRetention,
    });

    addToast('Backup Policy Created', `New policy created for target server.`, 'success');
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-4 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Top Banner Control */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                Automated Backup & Disaster Recovery Center
              </h2>
              <span className="px-2 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                {totalBackups} Monitored Jobs
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Automated snapshot policies, point-in-time recovery, scheduled replication, and off-site cloud vault storage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {canManageBackups ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Backup Policy</span>
            </button>
          ) : (
            <div className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-[11px] rounded-sm border border-gray-200 dark:border-gray-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Audit Access (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Total Backups</span>
            <HardDrive className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">
            {totalBackups} <span className="text-xs font-sans text-gray-500 font-normal">Policies</span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-mono">
            {formatBytes(totalSizeGB)} Total Storage
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400 mt-1">
            {Math.round((successCount / totalBackups) * 100)}%
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            {successCount} Compliant within 24h
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Failed / Delayed</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
            {failedCount} <span className="text-xs font-sans text-gray-500 font-normal">Issues</span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            {failedCount > 0 ? 'Action required immediately' : 'Zero failures detected'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">In Progress</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {inProgressCount} <span className="text-xs font-sans text-gray-500 font-normal">Active</span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            Live snapshot transfers
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR (MATCHING IMAGE 2 WITH THEME-CONSISTENT COLORS) */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm space-y-3 transition-colors">
        {/* Search Input matching Image 2 */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search backup policies by name, server, or storage target..."
            className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 rounded-sm pl-10 pr-4 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* 3 Filter Dropdown Buttons matching Image 2 */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Target Server Filter */}
          <div className="relative">
            <select
              value={targetServerFilter}
              onChange={(e) => setTargetServerFilter(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-sm pl-3.5 pr-8 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
            >
              <option value="ALL">Target Server (All)</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.ipAddress})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 2. Backup Type Filter */}
          <div className="relative">
            <select
              value={backupTypeFilter}
              onChange={(e) => setBackupTypeFilter(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-sm pl-3.5 pr-8 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
            >
              <option value="ALL">Backup Type (All)</option>
              <option value="Full">Full Backup</option>
              <option value="Incremental">Incremental</option>
              <option value="Differential">Differential</option>
              <option value="Snapshot">Snapshot</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 3. Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-sm pl-3.5 pr-8 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
            >
              <option value="ALL">Status (All)</option>
              <option value="Success">Success (Healthy)</option>
              <option value="Failed">Failed (Attention)</option>
              <option value="In Progress">In Progress (Syncing)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {(searchQuery || targetServerFilter !== 'ALL' || backupTypeFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTargetServerFilter('ALL');
                setBackupTypeFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm text-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Reset all filters"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* BACKUP POLICIES TABLE */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden transition-colors">
        <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
              Configured Backup Policies & Active Snapshot Jobs ({filteredServers.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
            Automated Retention & Cloud Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="p-3">Job / Policy Name</th>
                <th className="p-3">Target Server</th>
                <th className="p-3">Backup Type</th>
                <th className="p-3">Schedule Frequency</th>
                <th className="p-3">Last Run Time</th>
                <th className="p-3">Snapshot Size</th>
                <th className="p-3">Storage Target</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
              {filteredServers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 font-sans">
                    No backup policies match your filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredServers.map((server) => {
                  const jobName = server.backupJobName || `${server.name}-daily-backup`;
                  const schedule = server.backupSchedule || 'Daily at 02:00 AM';
                  const isRunning = runningBackupId === server.id || server.backupStatus === 'In Progress';

                  return (
                    <tr
                      key={server.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                    >
                      {/* Job / Policy Name */}
                      <td className="p-3 font-sans">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{jobName}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                          Retention: {server.backupRetentionDays || 30} Days
                        </div>
                      </td>

                      {/* Target Server */}
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                          <ServerIcon className="w-3 h-3 text-gray-400" />
                          <span>{server.name}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                          {server.ipAddress} • {server.location}
                        </div>
                      </td>

                      {/* Backup Type */}
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                          {server.backupType}
                        </span>
                      </td>

                      {/* Schedule Frequency */}
                      <td className="p-3 font-sans text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{schedule}</span>
                        </div>
                      </td>

                      {/* Last Run Time */}
                      <td className="p-3 text-gray-800 dark:text-gray-200">
                        {server.lastBackupTime}
                      </td>

                      {/* Size */}
                      <td className="p-3 font-bold text-gray-900 dark:text-white">
                        {formatBytes(server.backupSizeGB)}
                      </td>

                      {/* Storage Target */}
                      <td className="p-3 text-[11px] text-gray-600 dark:text-gray-400 max-w-[170px] truncate" title={server.backupLocation}>
                        {server.backupLocation}
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${getBackupBadgeClass(
                            server.backupStatus
                          )}`}
                        >
                          {server.backupStatus}
                        </span>
                      </td>

                      {/* 4 ACTION BUTTONS (RESTRICTED ONLY TO ADMIN & OPERATOR) */}
                      <td className="p-3 text-right pr-4 font-sans">
                        {canManageBackups ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Run Backup Now (Play Icon) */}
                            <button
                              onClick={() => handleRunBackupNow(server)}
                              disabled={isRunning}
                              className="w-7 h-7 rounded-sm bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/80 border border-gray-300 dark:border-gray-700 hover:border-blue-500 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:opacity-50"
                              title="Run backup now"
                            >
                              <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-pulse' : ''}`} />
                            </button>

                            {/* 2. Restore from this Backup (History / Counterclockwise Rotate Clock Icon) */}
                            <button
                              onClick={() => handleOpenRestoreModal(server)}
                              className="w-7 h-7 rounded-sm bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/80 border border-gray-300 dark:border-gray-700 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                              title="Restore from this backup"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* 3. Edit Schedule (Pencil Icon) */}
                            <button
                              onClick={() => handleOpenEditModal(server)}
                              className="w-7 h-7 rounded-sm bg-gray-100 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-950/80 border border-gray-300 dark:border-gray-700 hover:border-amber-500 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                              title="Edit schedule"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* 4. Delete Backup Job (Trash Icon) */}
                            <button
                              onClick={() => setDeletingServer(server)}
                              className="w-7 h-7 rounded-sm bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/80 border border-gray-300 dark:border-gray-700 hover:border-red-500 text-red-600 dark:text-red-400 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                              title="Delete backup job"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 inline-flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-500" /> Read Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESTORE FROM BACKUP MODAL */}
      {restoringServer && canManageBackups && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150 text-xs">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArchiveRestore className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                    Restore Server from Backup Snapshot
                  </h3>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                    Target: {restoringServer.name} ({restoringServer.ipAddress})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRestoringServer(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Snapshot Info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 font-semibold">Snapshot Timestamp:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{restoringServer.lastBackupTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 font-semibold">Snapshot Volume:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{formatBytes(restoringServer.backupSizeGB)} ({restoringServer.backupType})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400 font-semibold">Vault Storage URI:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 truncate max-w-[240px]">{restoringServer.backupLocation}</span>
                </div>
              </div>

              {/* Restore Scope Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  Select Recovery Scope
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setRestoreScope('Full System State')}
                    className={`p-3 rounded-sm border flex items-center justify-between cursor-pointer transition-all ${
                      restoreScope === 'Full System State'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Full System State & Image Recovery</div>
                      <p className="text-[10px] mt-0.5 opacity-80">Restores OS, application binaries, configurations, and data partitions</p>
                    </div>
                    <span className="text-xs">🛡️</span>
                  </label>

                  <label
                    onClick={() => setRestoreScope('Database Dump Only')}
                    className={`p-3 rounded-sm border flex items-center justify-between cursor-pointer transition-all ${
                      restoreScope === 'Database Dump Only'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Database Tables & Transaction Dumps</div>
                      <p className="text-[10px] mt-0.5 opacity-80">Point-in-time database restore without altering host OS filesystem</p>
                    </div>
                    <span className="text-xs">🗄️</span>
                  </label>

                  <label
                    onClick={() => setRestoreScope('Configuration Files Only')}
                    className={`p-3 rounded-sm border flex items-center justify-between cursor-pointer transition-all ${
                      restoreScope === 'Configuration Files Only'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Configuration & Network Metadata Only</div>
                      <p className="text-[10px] mt-0.5 opacity-80">Restores /etc, nginx configs, DNS zone records, and TLS certificates</p>
                    </div>
                    <span className="text-xs">⚙️</span>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-sm text-[11px]">
                ⚠️ <strong>Notice:</strong> Restoring this snapshot will re-align {restoringServer.name} to its state at {restoringServer.lastBackupTime}.
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestoringServer(null)}
                  className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleConfirmRestore}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-sm shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                  {isRestoring ? 'Restoring System...' : 'Confirm & Start Restoration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SCHEDULE MODAL */}
      {editingServer && canManageBackups && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150 text-xs">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    Edit Backup Job Schedule: {editingServer.name}
                  </h3>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                    Node: {editingServer.ipAddress} • {editingServer.location}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingServer(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSchedule} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Backup Policy / Job Identifier
                </label>
                <input
                  type="text"
                  required
                  value={editJobName}
                  onChange={(e) => setEditJobName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-mono text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Backup Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as BackupType)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
                  >
                    <option value="Full">Full Backup</option>
                    <option value="Incremental">Incremental</option>
                    <option value="Differential">Differential</option>
                    <option value="Snapshot">Snapshot</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Retention Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={editRetention}
                    onChange={(e) => setEditRetention(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-mono text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Automated Schedule Frequency
                </label>
                <select
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
                >
                  <option value="Every 6 Hours">Every 6 Hours (Continuous RPO)</option>
                  <option value="Every 12 Hours">Every 12 Hours</option>
                  <option value="Daily at 02:00 AM">Daily at 02:00 AM (Low Traffic Window)</option>
                  <option value="Daily at 04:00 AM">Daily at 04:00 AM</option>
                  <option value="Weekly on Sunday">Weekly on Sunday at 00:00 AM</option>
                  <option value="Monthly 1st at Midnight">Monthly 1st at Midnight</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Target Storage Repository (S3 / NFS / Local)
                </label>
                <input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-mono text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingServer(null)}
                  className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-sm cursor-pointer shadow-sm"
                >
                  Save Schedule Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingServer && canManageBackups && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150 text-xs">
            <div className="p-4 bg-red-50 dark:bg-red-950/80 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h3 className="font-bold text-sm text-red-700 dark:text-red-300 uppercase tracking-wider">
                  Delete Backup Job Policy
                </h3>
              </div>
              <button
                onClick={() => setDeletingServer(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                Are you sure you want to delete and disable the backup job schedule for{' '}
                <strong>{deletingServer.name}</strong> ({deletingServer.ipAddress})?
              </p>
              <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                Scheduled snapshots will be halted. Existing snapshots in storage will remain subject to retention.
              </p>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingServer(null)}
                  className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-sm cursor-pointer shadow-sm"
                >
                  Delete Backup Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW BACKUP POLICY MODAL */}
      {isCreateModalOpen && canManageBackups && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150 text-xs">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/80 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                    Create New Backup Policy
                  </h3>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 font-mono">
                    Provision automated snapshot and cloud vault mirroring
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicySubmit} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Target Server Node
                </label>
                <select
                  value={newTargetServerId}
                  onChange={(e) => setNewTargetServerId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.ipAddress}) - {s.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Policy / Job Identifier Name
                </label>
                <input
                  type="text"
                  required
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  placeholder="e.g. core-db-daily-full-vault"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-mono text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Backup Type
                  </label>
                  <select
                    value={newBackupType}
                    onChange={(e) => setNewBackupType(e.target.value as BackupType)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
                  >
                    <option value="Full">Full Backup</option>
                    <option value="Incremental">Incremental</option>
                    <option value="Differential">Differential</option>
                    <option value="Snapshot">Snapshot</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Retention Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={newRetention}
                    onChange={(e) => setNewRetention(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-mono text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Execution Schedule
                </label>
                <select
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
                >
                  <option value="Every 6 Hours">Every 6 Hours (Continuous RPO)</option>
                  <option value="Every 12 Hours">Every 12 Hours</option>
                  <option value="Daily at 02:00 AM">Daily at 02:00 AM</option>
                  <option value="Weekly on Sunday">Weekly on Sunday at Midnight</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Target Vault Location
                </label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="s3://gov-backups/vault01"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-2 text-xs font-mono text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm cursor-pointer shadow-sm"
                >
                  Create Backup Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
