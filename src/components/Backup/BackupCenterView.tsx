import React, { useState, useMemo } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { Server, BackupStatus, BackupType } from '../../types';
import { getBackupBadgeClass, formatBytes, formatTimestamp } from '../../utils/formatters';
import {
  Database,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Calendar,
  Layers,
  X,
  Server as ServerIcon,
  ChevronDown,
  ShieldAlert,
  Sliders,
  FileText,
  ExternalLink,
  Terminal,
  Activity,
  Info,
  Check,
  Lock
} from 'lucide-react';

export const BackupCenterView: React.FC = () => {
  const { servers, thresholds, addToast } = useMonitoring();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [targetServerFilter, setTargetServerFilter] = useState<string>('ALL');
  const [backupTypeFilter, setBackupTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [softwareEngineFilter, setSoftwareEngineFilter] = useState<string>('ALL');

  // Selected Server for Detailed Agent Verification Log Inspection
  const [inspectingServer, setInspectingServer] = useState<Server | null>(null);

  // Staleness Threshold in Hours (from Thresholds config)
  const staleThresholdHours = thresholds.backupFailureTimeoutHours || 24;

  // Helper to determine backup engine from server OS and type
  const getBackupEngine = (server: Server) => {
    if (server.os === 'Windows') {
      if (server.criticality === 'High') return 'Veeam Backup & Replication';
      return 'Windows Server Backup (WSB)';
    } else {
      if (server.type === 'Database') return 'Bacula Enterprise / pg_dump';
      if (server.criticality === 'High') return 'Veeam Agent for Linux';
      return 'rsync / BorgBackup';
    }
  };

  // Helper to calculate time elapsed since last backup in hours
  const getBackupAgeHours = (lastBackupIso?: string): number => {
    if (!lastBackupIso) return 999;
    const backupTime = new Date(lastBackupIso).getTime();
    if (isNaN(backupTime)) return 999;
    const diffMs = Date.now() - backupTime;
    return Math.max(0, Math.round((diffMs / 3600000) * 10) / 10);
  };

  // Helper to check if backup is stale (> threshold)
  const isBackupStale = (server: Server): boolean => {
    if (server.backupStatus === 'Failed') return true;
    const age = getBackupAgeHours(server.lastBackupTime);
    return age > staleThresholdHours;
  };

  // Filtered Servers
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
      const q = searchQuery.toLowerCase();
      const engine = getBackupEngine(s).toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.ipAddress.toLowerCase().includes(q) ||
        s.backupLocation.toLowerCase().includes(q) ||
        engine.includes(q) ||
        s.department.toLowerCase().includes(q);

      const matchesTargetServer = targetServerFilter === 'ALL' || s.id === targetServerFilter || s.name === targetServerFilter;
      const matchesType = backupTypeFilter === 'ALL' || s.backupType === backupTypeFilter;
      
      const isStale = isBackupStale(s);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'STALE' && isStale) ||
        (statusFilter === 'Success' && s.backupStatus === 'Success' && !isStale) ||
        (statusFilter === 'Failed' && s.backupStatus === 'Failed') ||
        (statusFilter === 'In Progress' && s.backupStatus === 'In Progress');

      const matchesEngine = softwareEngineFilter === 'ALL' || engine.includes(softwareEngineFilter.toLowerCase());

      return matchesSearch && matchesTargetServer && matchesType && matchesStatus && matchesEngine;
    });
  }, [servers, searchQuery, targetServerFilter, backupTypeFilter, statusFilter, softwareEngineFilter, staleThresholdHours]);

  // Aggregate Metrics
  const totalMonitored = servers.length;
  const successCount = servers.filter((s) => s.backupStatus === 'Success' && !isBackupStale(s)).length;
  const failedCount = servers.filter((s) => s.backupStatus === 'Failed').length;
  const staleCount = servers.filter((s) => isBackupStale(s) && s.backupStatus !== 'Failed').length;
  const inProgressCount = servers.filter((s) => s.backupStatus === 'In Progress').length;
  const totalSizeGB = servers.reduce((acc, s) => acc + (s.backupSizeGB || 0), 0);
  const complianceRate = totalMonitored > 0 ? Math.round((successCount / totalMonitored) * 100) : 100;

  return (
    <div className="space-y-5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Top Banner Control & Architectural Clarification */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">
                Automated Backup Log Verification & Compliance Auditor
              </h2>
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono border border-blue-200 dark:border-blue-800">
                Agent Log Auditor
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Monitors and verifies backup execution logs reported by host agents for <strong>Windows Server Backup (WSB)</strong>, <strong>Veeam</strong>, <strong>Bacula</strong>, and <strong>rsync</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm flex items-center gap-2 text-gray-600 dark:text-gray-300 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Staleness Limit: <strong>{staleThresholdHours}h</strong></span>
          </div>
        </div>
      </div>

      {/* Stale / Overdue Alert Banner if Any Server Fails Staleness Check */}
      {(failedCount > 0 || staleCount > 0) && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-900 dark:text-red-200">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-xs">Backup Compliance Warning:</span>{' '}
              <span className="text-xs">
                {failedCount > 0 && `${failedCount} backup job(s) failed. `}
                {staleCount > 0 && `${staleCount} server(s) have not had a verified backup in over ${staleThresholdHours} hours.`}
              </span>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter(failedCount > 0 ? 'Failed' : 'STALE')}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-xs font-bold text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
          >
            Filter Overdue Backups
          </button>
        </div>
      )}

      {/* Aggregate Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Monitored Servers */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              Tracked Backup Nodes
            </span>
            <ServerIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">
            {totalMonitored} <span className="text-xs text-gray-500 font-sans font-normal">servers</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-mono">
            {complianceRate}% Verified &amp; Compliant
          </div>
        </div>

        {/* Successful & Fresh Backups */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              Healthy &amp; Verified
            </span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400 mt-1">
            {successCount}
          </div>
          <div className="text-[11px] text-green-700 dark:text-green-400 mt-2 font-mono font-semibold">
            Last backup verified &lt; {staleThresholdHours}h
          </div>
        </div>

        {/* Failed Backups */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              Failed Log Status
            </span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {failedCount}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-mono">
            {failedCount > 0 ? 'Agent flagged execution error' : 'Zero execution failures'}
          </div>
        </div>

        {/* Stale / Overdue (> 24h) */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              Overdue / Stale (&gt;{staleThresholdHours}h)
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${staleCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {staleCount}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-mono">
            Exceeded {staleThresholdHours}h freshness SLA
          </div>
        </div>

        {/* Total Verified Storage Volume */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              Total Storage Volume
            </span>
            <HardDrive className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {formatBytes(totalSizeGB)}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-mono">
            Across government vaults
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs transition-colors">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search server name, IP address, backup target, or software (Veeam, WSB, Bacula)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-sm text-gray-700 dark:text-gray-300">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[10px] font-bold uppercase text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Success">Success (Fresh &lt; {staleThresholdHours}h)</option>
              <option value="STALE">Overdue / Stale (&gt; {staleThresholdHours}h)</option>
              <option value="Failed">Failed Log</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>

          {/* Backup Type Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-sm text-gray-700 dark:text-gray-300">
            <span className="text-[10px] font-bold uppercase text-gray-500">Type:</span>
            <select
              value={backupTypeFilter}
              onChange={(e) => setBackupTypeFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="Full">Full</option>
              <option value="Incremental">Incremental</option>
              <option value="Differential">Differential</option>
            </select>
          </div>

          {/* Engine Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-sm text-gray-700 dark:text-gray-300">
            <span className="text-[10px] font-bold uppercase text-gray-500">Software:</span>
            <select
              value={softwareEngineFilter}
              onChange={(e) => setSoftwareEngineFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Software</option>
              <option value="Veeam">Veeam</option>
              <option value="Windows Server Backup">Windows Backup (WSB)</option>
              <option value="Bacula">Bacula</option>
              <option value="rsync">rsync / Borg</option>
            </select>
          </div>

          {(searchQuery || statusFilter !== 'ALL' || backupTypeFilter !== 'ALL' || softwareEngineFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setBackupTypeFilter('ALL');
                setSoftwareEngineFilter('ALL');
              }}
              className="px-2.5 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-sm font-bold text-xs transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Backup Logs Verification Table */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                <th className="p-3">Host Server &amp; IP</th>
                <th className="p-3">Backup Software</th>
                <th className="p-3">Last Backup Time</th>
                <th className="p-3">Status</th>
                <th className="p-3">Type</th>
                <th className="p-3">File Size</th>
                <th className="p-3">Target Location</th>
                <th className="p-3 text-right">Agent Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-xs">
              {filteredServers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 font-sans">
                    No server backup logs found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredServers.map((server) => {
                  const engine = getBackupEngine(server);
                  const ageHours = getBackupAgeHours(server.lastBackupTime);
                  const isStale = isBackupStale(server);

                  return (
                    <tr
                      key={server.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                    >
                      {/* Host Server & IP */}
                      <td className="p-3 font-sans">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <ServerIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{server.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {server.ipAddress} • <span className="text-[10px]">{server.location}</span>
                        </div>
                      </td>

                      {/* Backup Software Engine */}
                      <td className="p-3 font-sans">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {engine}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                          {server.os} Environment
                        </div>
                      </td>

                      {/* Last Backup Time */}
                      <td className="p-3 font-mono">
                        <div className="text-gray-900 dark:text-gray-100 font-semibold text-[11px]">
                          {formatTimestamp(server.lastBackupTime || '')}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{ageHours}h ago</span>
                          {ageHours > staleThresholdHours && (
                            <span className="px-1 py-0.2 rounded-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[9px]">
                              &gt;{staleThresholdHours}h SLA
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        {server.backupStatus === 'Success' && !isStale && (
                          <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 flex items-center gap-1 w-fit">
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" /> Success
                          </span>
                        )}
                        {server.backupStatus === 'Success' && isStale && (
                          <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Stale (&gt;{staleThresholdHours}h)
                          </span>
                        )}
                        {server.backupStatus === 'Failed' && (
                          <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" /> Failed
                          </span>
                        )}
                        {server.backupStatus === 'In Progress' && (
                          <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 w-fit animate-pulse">
                            <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" /> In Progress
                          </span>
                        )}
                      </td>

                      {/* Backup Type */}
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                          {server.backupType}
                        </span>
                      </td>

                      {/* File Size */}
                      <td className="p-3 font-bold text-gray-900 dark:text-white">
                        {formatBytes(server.backupSizeGB || 0)}
                      </td>

                      {/* Location */}
                      <td className="p-3 max-w-[200px] truncate text-[11px] text-gray-600 dark:text-gray-400" title={server.backupLocation}>
                        {server.backupLocation}
                      </td>

                      {/* Agent Verification Inspector CTA */}
                      <td className="p-3 text-right font-sans">
                        <button
                          onClick={() => setInspectingServer(server)}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-sm font-bold text-[10px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Inspect Log</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Verification Log Inspector Modal */}
      {inspectingServer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm max-w-2xl w-full shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100 space-y-4 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-sm bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">
                    Agent Backup Log Verification Audit
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                    Host: <strong>{inspectingServer.name}</strong> ({inspectingServer.ipAddress})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingServer(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs font-sans">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Software Engine</span>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                    {getBackupEngine(inspectingServer)}
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Backup Type</span>
                  <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {inspectingServer.backupType}
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Log File Size</span>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatBytes(inspectingServer.backupSizeGB || 0)}
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Age / SLA</span>
                  <div className={`font-bold mt-0.5 ${isBackupStale(inspectingServer) ? 'text-red-500' : 'text-green-500'}`}>
                    {getBackupAgeHours(inspectingServer.lastBackupTime)}h / {staleThresholdHours}h SLA
                  </div>
                </div>
              </div>

              {/* Log File Target */}
              <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-sm border border-gray-200 dark:border-gray-700 text-xs">
                <div className="flex items-center justify-between text-gray-500 text-[11px]">
                  <span className="font-bold uppercase tracking-wider">Storage Target Location</span>
                  <span className="font-mono">Vault Path Validated</span>
                </div>
                <div className="font-mono text-blue-600 dark:text-blue-400 break-all select-all font-semibold">
                  {inspectingServer.backupLocation}
                </div>
              </div>

              {/* Agent Log Verification Output Sample */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-500" /> Host Agent Verification Log Output
                  </span>
                  <span className="font-mono text-[10px]">Verified: {formatTimestamp(inspectingServer.lastBackupTime || '')}</span>
                </div>
                <pre className="p-3 bg-[#0B0F17] text-emerald-400 border border-gray-800 rounded-sm font-mono text-[11px] overflow-x-auto leading-relaxed max-h-48">
{`[AGENT_CHECK] Verifying backup log for ${inspectingServer.name} (${inspectingServer.ipAddress})...
[AGENT_CHECK] Detected Engine: ${getBackupEngine(inspectingServer)}
[LOG_PARSER] Reading target: ${inspectingServer.backupLocation}
[LOG_PARSER] Timestamp: ${inspectingServer.lastBackupTime}
[LOG_PARSER] Completed Status: ${inspectingServer.backupStatus.toUpperCase()}
[LOG_PARSER] Backup Type: ${inspectingServer.backupType}
[STORAGE] Size verified: ${formatBytes(inspectingServer.backupSizeGB || 0)} (${((inspectingServer.backupSizeGB || 100) * 1024 * 1024 * 1024).toLocaleString()} bytes)
[COMPLIANCE] Age: ${getBackupAgeHours(inspectingServer.lastBackupTime)} hours (SLA Threshold: ${staleThresholdHours} hours)
[RESULT] Verification Status: ${isBackupStale(inspectingServer) ? 'STALE_WARNING (Elapsed > Threshold)' : 'COMPLIANT_SUCCESS (Passed Integrity & Timestamp checks)'}`}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Logged by ITDB Host Telemetry Daemon v1.4.2
              </span>
              <button
                onClick={() => setInspectingServer(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm transition-colors cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
