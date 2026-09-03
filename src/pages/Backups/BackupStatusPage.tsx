import React, { useState, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import * as backupsApi from '../../api/backups';
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
  formatTimestamp,
  titleCase,
  criticalityVariant,
  backupStatusVariant,
} from '../../utils/formatters';
import {
  Database,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RotateCw,
  FileText,
  Server as ServerIcon,
  RefreshCw,
  X,
} from 'lucide-react';
import type { BackupLog, BackupStatus, Range, BackupType, ServerBackups } from '../../types';

const controlClass =
  'px-3 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

const PAGE_SIZE = 20;

function statusBadgeInfo(status: BackupStatus): {
  label: string;
  variant: BadgeVariant;
  icon: React.ElementType;
} {
  switch (status) {
    case 'SUCCESS':
      return { label: 'Success', variant: 'success', icon: CheckCircle2 };
    case 'FAILED':
      return { label: 'Failed', variant: 'danger', icon: XCircle };
    case 'IN_PROGRESS':
      return { label: 'In Progress', variant: 'info', icon: RotateCw };
  }
}

export const BackupStatusPage: React.FC = () => {
  const { user, can } = useAuth();
  const canReadServers = can('servers:read');
  const isOperator = user?.role === 'OPERATOR';

  const [range, setRange] = useState<Range>('7d');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BackupStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | BackupType>('ALL');
  const [page, setPage] = useState(1);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [historyTarget, setHistoryTarget] = useState<BackupLog | null>(null);

  const listQuery = useApi(
    () =>
      canReadServers
        ? backupsApi.list({
            range,
            page,
            limit: PAGE_SIZE,
            status: statusFilter === 'ALL' ? undefined : statusFilter,
          })
        : Promise.resolve(null),
    [canReadServers, range, page, statusFilter, refreshSignal],
    { refreshMs: 60_000 },
  );

  const historyQuery = useApi(
    () =>
      historyTarget?.serverId
        ? serversApi.backups(historyTarget.serverId, range).catch(() => null)
        : Promise.resolve(null),
    [historyTarget?.serverId, range],
  );

  const data = listQuery.data;
  const backups = data?.backups ?? [];
  const summary = data?.summary ?? { total: 0, success: 0, failed: 0, inProgress: 0 };
  const pagination = data?.pagination;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return backups.filter((b) => {
      if (typeFilter !== 'ALL' && b.backupType !== typeFilter) return false;
      if (!q) return true;
      const name = b.server?.name?.toLowerCase() ?? '';
      const ip = b.server?.ipOrHostname?.toLowerCase() ?? '';
      const loc = b.location?.toLowerCase() ?? '';
      const dept = b.server?.department?.toLowerCase() ?? '';
      return name.includes(q) || ip.includes(q) || loc.includes(q) || dept.includes(q);
    });
  }, [backups, search, typeFilter]);

  const handleRefresh = () => {
    setRefreshSignal((n) => n + 1);
    listQuery.reload();
  };

  const setStatus = (s: 'ALL' | BackupStatus) => {
    setStatusFilter(s);
    setPage(1);
  };

  if (!canReadServers) {
    return (
      <EmptyState
        icon={Database}
        title="No access"
        message="Your account cannot read servers or backups."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Backup Status
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isOperator
              ? 'Backup runs across your assigned servers.'
              : 'Estate backup runs from GET /backups.'}
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
          <LiveIndicator
            lastUpdated={listQuery.lastUpdated}
            refreshing={listQuery.refreshing}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => setStatus('ALL')}
          className={`text-left rounded-lg p-2.5 border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
              : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              All runs
            </span>
            <ServerIcon className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{summary.total}</div>
        </button>
        <button
          onClick={() => setStatus('SUCCESS')}
          className={`text-left rounded-lg p-2.5 border transition-all cursor-pointer ${
            statusFilter === 'SUCCESS'
              ? 'bg-green-50/80 dark:bg-green-950/40 border-green-500 ring-1 ring-green-500'
              : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
              Success
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">{summary.success}</div>
        </button>
        <button
          onClick={() => setStatus('FAILED')}
          className={`text-left rounded-lg p-2.5 border transition-all cursor-pointer ${
            statusFilter === 'FAILED'
              ? 'bg-red-50/80 dark:bg-red-950/40 border-red-500 ring-1 ring-red-500'
              : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Failed
            </span>
            <XCircle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">{summary.failed}</div>
        </button>
        <button
          onClick={() => setStatus('IN_PROGRESS')}
          className={`text-left rounded-lg p-2.5 border transition-all cursor-pointer ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
              : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              In progress
            </span>
            <RotateCw className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">{summary.inProgress}</div>
        </button>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search server, IP, department, path…"
            className={`${controlClass} w-full pl-8 pr-7`}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <select
          className={controlClass}
          value={typeFilter}
          onChange={(e) => setTypeFilter((e.target.value || 'ALL') as 'ALL' | BackupType)}
        >
          <option value="ALL">All types</option>
          <option value="FULL">Full</option>
          <option value="INCREMENTAL">Incremental</option>
        </select>
        <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden text-xs">
          {(['7d', '30d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                setPage(1);
              }}
              className={`px-3 py-1.5 font-semibold cursor-pointer ${
                range === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${listQuery.refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        {listQuery.loading ? (
          <LoadingPanel label="Loading backups…" />
        ) : listQuery.error ? (
          <ErrorState error={listQuery.error} onRetry={listQuery.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No backup runs"
            message="No backup logs match the current filters in this range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="px-4 py-3 font-semibold">Server</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Started</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((b) => {
                  const badge = statusBadgeInfo(b.status);
                  const Icon = badge.icon;
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {b.server?.name ?? 'Unknown server'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {b.server?.ipOrHostname ?? b.serverId}
                          {b.server?.department ? ` · ${b.server.department}` : ''}
                        </div>
                        {b.server?.criticality && (
                          <div className="mt-1">
                            <Badge variant={criticalityVariant(b.server.criticality)}>
                              {b.server.criticality}
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={badge.variant}>
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300">
                        {titleCase(b.backupType)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-700 dark:text-gray-300">
                        {formatBytes(b.sizeBytes)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-400 max-w-[220px] truncate">
                        {b.location || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {formatTimestamp(b.startedAt)}
                        </div>
                        <div className="font-mono text-[11px] text-gray-400">
                          {formatDateTime(b.startedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setHistoryTarget(b)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                          >
                            History
                          </button>
                          {b.serverId && (
                            <button
                              onClick={() => navigate('servers', b.serverId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Server
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="px-3 border-t border-gray-200 dark:border-gray-800">
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal
        open={historyTarget !== null}
        onClose={() => setHistoryTarget(null)}
        title="Backup history"
        subtitle={
          historyTarget
            ? `${historyTarget.server?.name ?? historyTarget.serverId} · ${range}`
            : undefined
        }
        size="lg"
      >
        {historyQuery.loading ? (
          <LoadingPanel label="Loading history…" />
        ) : historyQuery.error ? (
          <ErrorState error={historyQuery.error} onRetry={historyQuery.reload} />
        ) : (
          <BackupHistoryList backups={historyQuery.data} />
        )}
      </Modal>
    </div>
  );
};

const BackupHistoryList: React.FC<{ backups: ServerBackups | null | undefined }> = ({ backups }) => {
  const history = backups?.history ?? [];
  if (history.length === 0) {
    return (
      <EmptyState icon={Database} title="No history" message="No backup samples for this server in range." />
    );
  }
  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto">
      {backups?.staleness && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Stale after {backups.staleness.staleAfterHours}h ·{' '}
          {backups.staleness.isStale ? (
            <span className="text-amber-600 font-semibold">Currently stale</span>
          ) : (
            <span className="text-green-600 font-semibold">Fresh</span>
          )}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-800">
            <th className="py-2 font-semibold">Status</th>
            <th className="py-2 font-semibold">Type</th>
            <th className="py-2 font-semibold">Size</th>
            <th className="py-2 font-semibold">Started</th>
            <th className="py-2 font-semibold">Completed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {history.map((h) => (
            <tr key={h.id}>
              <td className="py-2">
                <Badge variant={backupStatusVariant(h.status)}>{titleCase(h.status)}</Badge>
              </td>
              <td className="py-2">{titleCase(h.backupType)}</td>
              <td className="py-2 font-mono">{formatBytes(h.sizeBytes)}</td>
              <td className="py-2 text-xs">{formatDateTime(h.startedAt)}</td>
              <td className="py-2 text-xs">{formatDateTime(h.completedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
