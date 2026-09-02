import React, { useState, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import * as serversApi from '../../api/servers';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../router';
import { Badge, type BadgeVariant } from '../../components/Common/Badge';
import { LoadingPanel } from '../../components/Common/Spinner';
import { EmptyState } from '../../components/Common/EmptyState';
import { ErrorState } from '../../components/Common/ErrorState';
import { Pagination } from '../../components/Common/Pagination';
import { Modal } from '../../components/Common/Modal';
import { LiveIndicator } from '../../components/Dashboard/DashboardCharts';
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatTimestamp,
  titleCase,
  criticalityVariant,
} from '../../utils/formatters';
import { filterServersForUser } from '../../api/operatorAssignments';
import {
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  RotateCw,
  FileText,
  HelpCircle,
  Server as ServerIcon,
  Layers,
  HardDrive,
  RefreshCw,
  Filter,
  X,
} from 'lucide-react';
import type {
  Server,
  ServerBackups,
  BackupLog,
  Range,
  Criticality,
  BackupType,
} from '../../types';

export type UnifiedBackupStatus = 'FRESH' | 'STALE' | 'FAILED' | 'IN_PROGRESS' | 'NO_DATA';

export interface ServerBackupRow {
  server: Server;
  backups: ServerBackups | null;
  status: UnifiedBackupStatus;
  latest: BackupLog | null;
  history: BackupLog[];
  lastSuccessAt: string | null;
  ageSeconds: number | null;
  isStale: boolean;
  staleAfterHours: number;
  sizeBytes: string | null;
  backupType: BackupType | null;
}

const controlClass =
  'px-3 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

const PAGE_SIZE = 10;

function determineBackupRow(server: Server, backups: ServerBackups | null): ServerBackupRow {
  const latest = backups?.latest ?? null;
  const staleness = backups?.staleness;
  const isStale = staleness?.isStale ?? false;
  const lastSuccessAt = staleness?.lastSuccessAt ?? null;
  const ageSeconds = staleness?.ageSeconds ?? null;
  const staleAfterHours = staleness?.staleAfterHours ?? 24;
  const history = backups?.history ?? [];

  let status: UnifiedBackupStatus = 'NO_DATA';
  if (!latest) {
    status = 'NO_DATA';
  } else if (latest.status === 'FAILED') {
    status = 'FAILED';
  } else if (latest.status === 'IN_PROGRESS') {
    status = 'IN_PROGRESS';
  } else if (isStale) {
    status = 'STALE';
  } else {
    status = 'FRESH';
  }

  return {
    server,
    backups,
    status,
    latest,
    history,
    lastSuccessAt,
    ageSeconds,
    isStale,
    staleAfterHours,
    sizeBytes: latest?.sizeBytes ?? null,
    backupType: latest?.backupType ?? null,
  };
}

function statusBadgeInfo(status: UnifiedBackupStatus): {
  label: string;
  variant: BadgeVariant;
  icon: React.ElementType;
} {
  switch (status) {
    case 'FRESH':
      return { label: 'Fresh', variant: 'success', icon: CheckCircle2 };
    case 'STALE':
      return { label: 'Stale', variant: 'warning', icon: AlertTriangle };
    case 'FAILED':
      return { label: 'Failed', variant: 'danger', icon: XCircle };
    case 'IN_PROGRESS':
      return { label: 'In Progress', variant: 'info', icon: RotateCw };
    case 'NO_DATA':
    default:
      return { label: 'No data', variant: 'neutral', icon: HelpCircle };
  }
}

export const BackupStatusPage: React.FC = () => {
  const { user, can } = useAuth();
  const canReadServers = can('servers:read');
  const isOperator = user?.role === 'OPERATOR';

  const [range, setRange] = useState<Range>('7d');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Selected server row for full backup history modal
  const [historyModalRow, setHistoryModalRow] = useState<ServerBackupRow | null>(null);

  // 1. Fetch all servers
  const serversQuery = useApi(
    () => (canReadServers ? serversApi.list({}) : Promise.resolve(null)),
    [canReadServers, refreshSignal],
    { refreshMs: 60_000 },
  );

  const rawServers = serversQuery.data?.servers ?? [];
  const servers = useMemo(() => filterServersForUser(rawServers, user), [rawServers, user]);
  const serverIdsKey = servers.map((s) => s.id).join(',');

  // Dynamic distinct departments & locations
  const distinctDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const s of servers) {
      if (s.department && s.department.trim()) set.add(s.department.trim());
    }
    return Array.from(set).sort();
  }, [servers]);

  const distinctLocations = useMemo(() => {
    const set = new Set<string>();
    for (const s of servers) {
      if (s.location && s.location.trim()) set.add(s.location.trim());
    }
    return Array.from(set).sort();
  }, [servers]);

  // 2. Fetch backups for all reporting servers
  const backupsQuery = useApi(
    () =>
      servers.length === 0
        ? Promise.resolve([] as (ServerBackups | null)[])
        : Promise.all(servers.map((s) => serversApi.backups(s.id, range).catch(() => null))),
    [serverIdsKey, range, refreshSignal],
    { refreshMs: 60_000 },
  );

  const backupMap = useMemo(() => {
    const map = new Map<string, ServerBackups | null>();
    if (backupsQuery.data) {
      servers.forEach((s, idx) => {
        map.set(s.id, backupsQuery.data![idx] ?? null);
      });
    }
    return map;
  }, [servers, backupsQuery.data]);

  // Combine servers and their backup telemetry
  const allRows = useMemo<ServerBackupRow[]>(() => {
    return servers.map((server) => {
      const backups = backupMap.get(server.id) ?? null;
      return determineBackupRow(server, backups);
    });
  }, [servers, backupMap]);

  // Tallies for summary cards
  const stats = useMemo(() => {
    let fresh = 0;
    let stale = 0;
    let failed = 0;
    let inProgress = 0;
    let noData = 0;

    for (const r of allRows) {
      if (r.status === 'FRESH') fresh++;
      else if (r.status === 'STALE') stale++;
      else if (r.status === 'FAILED') failed++;
      else if (r.status === 'IN_PROGRESS') inProgress++;
      else noData++;
    }

    return {
      total: allRows.length,
      fresh,
      stale,
      failed,
      inProgress,
      noData,
    };
  }, [allRows]);

  // Filtered rows based on search criteria
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allRows.filter((r) => {
      if (q) {
        const matchesName = r.server.name.toLowerCase().includes(q);
        const matchesIp = r.server.ipOrHostname.toLowerCase().includes(q);
        const matchesLoc = (r.server.location || '').toLowerCase().includes(q);
        const matchesBkLoc = (r.latest?.location || '').toLowerCase().includes(q);
        if (!matchesName && !matchesIp && !matchesLoc && !matchesBkLoc) return false;
      }

      if (departmentFilter && r.server.department !== departmentFilter) {
        return false;
      }

      if (locationFilter && r.server.location !== locationFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== 'ALL') {
        if (!r.backupType || r.backupType !== typeFilter) return false;
      }

      if (criticalityFilter !== 'ALL') {
        if (r.server.criticality !== criticalityFilter) return false;
      }

      return true;
    });
  }, [allRows, search, departmentFilter, locationFilter, statusFilter, typeFilter, criticalityFilter]);

  // Client-side pagination
  const totalFiltered = filteredRows.length;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const hasActiveFilters =
    search.trim() !== '' ||
    departmentFilter !== '' ||
    locationFilter !== '' ||
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    criticalityFilter !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setDepartmentFilter('');
    setLocationFilter('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setCriticalityFilter('ALL');
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    serversQuery.reload();
    backupsQuery.reload();
    setRefreshSignal((n) => n + 1);
  };

  const lastUpdated = Math.max(serversQuery.lastUpdated ?? 0, backupsQuery.lastUpdated ?? 0) || null;
  const isLoading = serversQuery.loading || (servers.length > 0 && backupsQuery.loading);
  const isRefreshing = serversQuery.refreshing || backupsQuery.refreshing;
  const isError = serversQuery.error || backupsQuery.error;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Backup Status
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isOperator
              ? `Backup telemetry and staleness tracking across your ${stats.total} assigned server${stats.total === 1 ? '' : 's'}.`
              : `Backup telemetry, staleness tracking, and snapshots across ${stats.total} monitored servers.`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('reports')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Export report
          </button>
          <LiveIndicator lastUpdated={lastUpdated} refreshing={isRefreshing} onRefresh={handleRefresh} />
        </div>
      </div>

      {/* Operator notice if 0 servers are assigned */}
      {isOperator && !isLoading && servers.length === 0 && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 text-sm text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>No Assigned Servers:</strong> You currently have 0 servers assigned to your operator account. Please contact an administrator to assign servers to you.
            </span>
          </div>
        </div>
      )}

      {/* Compact 5-Metric Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {/* All */}
        <button
          onClick={() => {
            setStatusFilter('ALL');
            setCurrentPage(1);
          }}
          className={`text-left rounded-lg p-2.5 sm:px-3 sm:py-2.5 border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
              : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              All Servers
            </span>
            <ServerIcon className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</span>
            <span className="text-[10px] text-gray-400">monitored</span>
          </div>
        </button>

        {/* Fresh */}
        <button
          onClick={() => {
            setStatusFilter('FRESH');
            setCurrentPage(1);
          }}
          className={`text-left rounded-lg p-2.5 sm:px-3 sm:py-2.5 border transition-all cursor-pointer ${
            statusFilter === 'FRESH'
              ? 'bg-green-50/80 dark:bg-green-950/40 border-green-500 ring-1 ring-green-500'
              : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
              Fresh
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-green-600 dark:text-green-400">{stats.fresh}</span>
            <span className="text-[10px] text-gray-400">up to date</span>
          </div>
        </button>

        {/* Stale */}
        <button
          onClick={() => {
            setStatusFilter('STALE');
            setCurrentPage(1);
          }}
          className={`text-left rounded-lg p-2.5 sm:px-3 sm:py-2.5 border transition-all cursor-pointer ${
            statusFilter === 'STALE'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
              : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Stale
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.stale}</span>
            <span className="text-[10px] text-gray-400">overdue</span>
          </div>
        </button>

        {/* Failed */}
        <button
          onClick={() => {
            setStatusFilter('FAILED');
            setCurrentPage(1);
          }}
          className={`text-left rounded-lg p-2.5 sm:px-3 sm:py-2.5 border transition-all cursor-pointer ${
            statusFilter === 'FAILED'
              ? 'bg-red-50/80 dark:bg-red-950/40 border-red-500 ring-1 ring-red-500'
              : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Failed
            </span>
            <XCircle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-red-600 dark:text-red-400">{stats.failed}</span>
            <span className="text-[10px] text-gray-400">run errors</span>
          </div>
        </button>

        {/* No Data / In Progress */}
        <button
          onClick={() => {
            setStatusFilter(statusFilter === 'NO_DATA' ? 'ALL' : 'NO_DATA');
            setCurrentPage(1);
          }}
          className={`text-left rounded-lg p-2.5 sm:px-3 sm:py-2.5 border transition-all cursor-pointer ${
            statusFilter === 'NO_DATA'
              ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 ring-1 ring-gray-400'
              : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              No Data
            </span>
            <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-gray-700 dark:text-gray-300">{stats.noData}</span>
            <span className="text-[10px] text-gray-400">unreported</span>
          </div>
        </button>
      </div>

      {/* Unified Compact Search & Filter Toolbar */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3 flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search server, IP, location, backup path…"
            className={`${controlClass} w-full pl-8 pr-7`}
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Department Dropdown */}
        <select
          className={controlClass}
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Departments ({distinctDepartments.length})</option>
          {distinctDepartments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {/* Location Dropdown */}
        <select
          className={controlClass}
          value={locationFilter}
          onChange={(e) => {
            setLocationFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Locations ({distinctLocations.length})</option>
          {distinctLocations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        {/* Status Dropdown */}
        <select
          className={controlClass}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">All Statuses ({stats.total})</option>
          <option value="FRESH">Fresh ({stats.fresh})</option>
          <option value="STALE">Stale ({stats.stale})</option>
          <option value="FAILED">Failed ({stats.failed})</option>
          <option value="IN_PROGRESS">In Progress ({stats.inProgress})</option>
          <option value="NO_DATA">No Data ({stats.noData})</option>
        </select>

        {/* Backup Type Dropdown */}
        <select
          className={controlClass}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">All Types</option>
          <option value="FULL">Full</option>
          <option value="INCREMENTAL">Incremental</option>
        </select>

        {/* Criticality Dropdown */}
        <select
          className={controlClass}
          value={criticalityFilter}
          onChange={(e) => {
            setCriticalityFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">All Criticality</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Range Selector */}
        <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden text-xs">
          <button
            onClick={() => setRange('7d')}
            className={`px-2.5 py-1.5 font-medium transition-colors cursor-pointer ${
              range === '7d'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setRange('30d')}
            className={`px-2.5 py-1.5 font-medium transition-colors cursor-pointer ${
              range === '30d'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            30d
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-auto"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Main Table Form Card */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Server Backups Overview
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              ({filteredRows.length} of {allRows.length})
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Window: <strong>{range === '7d' ? 'Past 7 days' : 'Past 30 days'}</strong>
          </div>
        </div>

        {isLoading ? (
          <LoadingPanel label="Fetching server backup records…" />
        ) : isError ? (
          <ErrorState error={isError} onRetry={handleRefresh} />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No backup records found"
            message={
              hasActiveFilters
                ? 'No servers match your current search or filter criteria.'
                : 'No reporting servers found in the inventory.'
            }
            action={
              hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Clear all filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="px-4 py-3 font-semibold">Server</th>
                  <th className="px-4 py-3 font-semibold">Backup Status</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Latest Size</th>
                  <th className="px-4 py-3 font-semibold">Last Run</th>
                  <th className="px-4 py-3 font-semibold">Last Success & Staleness</th>
                  <th className="px-4 py-3 font-semibold">Department & Location</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedRows.map((row) => {
                  const badge = statusBadgeInfo(row.status);
                  const Icon = badge.icon;

                  return (
                    <tr
                      key={row.server.id}
                      onClick={() => setHistoryModalRow(row)}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      {/* Server name & IP */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          {row.server.name}
                          {row.server.isGroup && (
                            <Badge variant="purple" title="Grouping container">
                              <Layers className="w-3 h-3" />
                              Group
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{row.server.ipOrHostname}</span>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-[11px] font-sans">{row.server.os}</span>
                        </div>
                      </td>

                      {/* Backup status badge */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={badge.variant}>
                            <Icon className={`w-3 h-3 ${row.status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
                            {badge.label}
                          </Badge>
                          {row.isStale && row.ageSeconds != null && (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              {formatDuration(row.ageSeconds)} stale
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        {row.backupType ? titleCase(row.backupType) : '—'}
                      </td>

                      {/* Size */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">
                        {formatBytes(row.sizeBytes)}
                      </td>

                      {/* Last Run */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {row.latest ? (
                          <div>
                            <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                              {formatTimestamp(row.latest.completedAt || row.latest.startedAt)}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {formatDateTime(row.latest.startedAt)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Never recorded</span>
                        )}
                      </td>

                      {/* Last Success & Staleness */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {row.lastSuccessAt ? (
                          <div>
                            <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                              {formatTimestamp(row.lastSuccessAt)}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              Threshold: {row.staleAfterHours}h max
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Department / Location */}
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{row.server.department || '—'}</div>
                        <div className="text-[11px] text-gray-500">{row.server.location || '—'}</div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setHistoryModalRow(row)}
                            title="View backup history log"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            History ({row.history.length})
                          </button>
                          <button
                            onClick={() => navigate('servers', row.server.id)}
                            title="View server details"
                            className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination: 10 items max per page */}
        {filteredRows.length > PAGE_SIZE && (
          <div className="px-3 border-t border-gray-200 dark:border-gray-800">
            <Pagination
              pagination={{
                page: currentPage,
                limit: PAGE_SIZE,
                total: totalFiltered,
                totalPages: totalPages,
              }}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* Backup History Modal */}
      <Modal
        open={historyModalRow !== null}
        onClose={() => setHistoryModalRow(null)}
        title={
          historyModalRow
            ? `Backup History: ${historyModalRow.server.name}`
            : 'Backup History'
        }
        subtitle={
          historyModalRow
            ? `${historyModalRow.server.ipOrHostname} • ${historyModalRow.server.department || 'General'} • ${range.toUpperCase()} Range`
            : undefined
        }
        size="lg"
        footer={
          historyModalRow ? (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => {
                  const id = historyModalRow.server.id;
                  setHistoryModalRow(null);
                  navigate('servers', id);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Go to server detail page
              </button>
              <button
                onClick={() => setHistoryModalRow(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : undefined
        }
      >
        {historyModalRow && (
          <div className="space-y-4">
            {/* Staleness alert if stale */}
            {historyModalRow.isStale && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <div>
                  <strong>Backups are stale!</strong> Last successful backup was recorded{' '}
                  {formatTimestamp(historyModalRow.lastSuccessAt)}{' '}
                  {historyModalRow.ageSeconds != null && `(${formatDuration(historyModalRow.ageSeconds)} ago)`}.
                  Configured threshold is {historyModalRow.staleAfterHours} hours.
                </div>
              </div>
            )}

            {/* Quick meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
              <div>
                <span className="text-gray-400 font-medium block">Current Status</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 mt-0.5">
                  <Badge variant={statusBadgeInfo(historyModalRow.status).variant}>
                    {statusBadgeInfo(historyModalRow.status).label}
                  </Badge>
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Latest Size</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono mt-0.5 block">
                  {formatBytes(historyModalRow.sizeBytes)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Total Snapshots</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5 block">
                  {historyModalRow.history.length} runs in {range}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Criticality</span>
                <span className="mt-0.5 block">
                  <Badge variant={criticalityVariant(historyModalRow.server.criticality)}>
                    {historyModalRow.server.criticality}
                  </Badge>
                </span>
              </div>
            </div>

            {/* History Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Backup Run Logs ({historyModalRow.history.length})
              </h4>
              {historyModalRow.history.length === 0 ? (
                <EmptyState
                  icon={HardDrive}
                  title="No backup runs"
                  message={`No backup logs have been recorded for ${historyModalRow.server.name} in the selected ${range} window.`}
                />
              ) : (
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-md">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold">Size</th>
                        <th className="px-3 py-2 font-semibold">Started</th>
                        <th className="px-3 py-2 font-semibold">Completed</th>
                        <th className="px-3 py-2 font-semibold">Storage Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {historyModalRow.history
                        .slice()
                        .reverse()
                        .map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-2">
                              <Badge
                                variant={
                                  b.status === 'SUCCESS'
                                    ? 'success'
                                    : b.status === 'FAILED'
                                      ? 'danger'
                                      : 'info'
                                }
                              >
                                {titleCase(b.status)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                              {titleCase(b.backupType)}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                              {formatBytes(b.sizeBytes)}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              {formatDateTime(b.startedAt)}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              {formatDateTime(b.completedAt)}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={b.location}>
                              {b.location || '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
