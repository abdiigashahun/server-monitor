import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import * as alertsApi from '../../api/alerts';
import * as serversApi from '../../api/servers';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { navigate } from '../../router';
import { ApiError } from '../../api/client';
import { Badge } from '../../components/Common/Badge';
import { LoadingPanel } from '../../components/Common/Spinner';
import { EmptyState } from '../../components/Common/EmptyState';
import { ErrorState } from '../../components/Common/ErrorState';
import { Pagination } from '../../components/Common/Pagination';
import { Modal } from '../../components/Common/Modal';
import {
  alertSeverityVariant,
  alertStatusVariant,
  formatDateTime,
  formatTimestamp,
  titleCase,
} from '../../utils/formatters';
import { BellRing, Check, CheckCheck, ExternalLink, Filter, X } from 'lucide-react';
import type {
  Alert,
  AlertListFilters,
  AlertStatus,
  AlertSeverity,
  AlertType,
} from '../../types';

const controlClass =
  'px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

const DEFAULT_LIMIT = 20;

interface AlertsPageProps {
  /** When set (deep-link from a server), the list is scoped to this server. */
  serverId?: string;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ serverId }) => {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can('alerts:write');

  const [filters, setFilters] = useState<AlertListFilters>({
    page: 1,
    limit: DEFAULT_LIMIT,
    serverId,
  });
  const [selected, setSelected] = useState<Alert | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Keep the serverId filter in sync with the route (deep-link from a server).
  const [lastServerId, setLastServerId] = useState(serverId);
  if (serverId !== lastServerId) {
    setLastServerId(serverId);
    setFilters((f) => ({ ...f, serverId, page: 1 }));
  }

  // Resolve the scoped server's name for the active-filter chip.
  const { data: serverData } = useApi(
    () => (filters.serverId ? serversApi.get(filters.serverId) : Promise.resolve(null)),
    [filters.serverId],
  );
  const serverName = serverData?.server?.name;

  const { data, loading, error, reload } = useApi(
    () => alertsApi.list(filters),
    [JSON.stringify(filters)],
  );
  const alerts = data?.alerts ?? [];
  const pagination = data?.pagination;

  const setFilter = <K extends keyof AlertListFilters>(key: K, value: AlertListFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));

  const clearServer = () => {
    setFilters((f) => ({ ...f, serverId: undefined, page: 1 }));
    navigate('alerts');
  };

  const setPage = (page: number) => setFilters((f) => ({ ...f, page }));

  const act = async (id: string, status: Extract<AlertStatus, 'ACKNOWLEDGED' | 'RESOLVED'>) => {
    setBusyId(id);
    try {
      await alertsApi.updateStatus(id, status);
      toast.success(status === 'RESOLVED' ? 'Alert resolved' : 'Alert acknowledged');
      setSelected(null);
      reload();
    } catch (err) {
      toast.error('Update failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BellRing className="w-5 h-5 text-blue-600" />
          Alerts
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Threshold breaches and availability events raised by the monitoring backend.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          className={controlClass}
          value={filters.status ?? ''}
          onChange={(e) => setFilter('status', (e.target.value || undefined) as AlertStatus)}
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select
          className={controlClass}
          value={filters.severity ?? ''}
          onChange={(e) => setFilter('severity', (e.target.value || undefined) as AlertSeverity)}
        >
          <option value="">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
        </select>
        <select
          className={controlClass}
          value={filters.type ?? ''}
          onChange={(e) => setFilter('type', (e.target.value || undefined) as AlertType)}
        >
          <option value="">All types</option>
          <option value="CPU">CPU</option>
          <option value="MEMORY">Memory</option>
          <option value="DISK">Disk</option>
          <option value="BACKUP">Backup</option>
          <option value="DOWN">Down</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          From
          <input
            type="date"
            className={controlClass}
            value={filters.from ? filters.from.slice(0, 10) : ''}
            onChange={(e) => setFilter('from', e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          To
          <input
            type="date"
            className={controlClass}
            value={filters.to ? filters.to.slice(0, 10) : ''}
            onChange={(e) => setFilter('to', e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined)}
          />
        </label>
        {filters.serverId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Server: {serverName ?? 'selected'}
            <button
              onClick={clearServer}
              title="Clear server filter"
              className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
      </div>

      {/* Body */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <LoadingPanel label="Loading alerts…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : alerts.length === 0 ? (
          <EmptyState icon={BellRing} title="No alerts" message="No alerts match the current filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 font-semibold">Severity</th>
                  <th className="px-4 py-3 font-semibold">Alert</th>
                  <th className="px-4 py-3 font-semibold">Server</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Raised</th>
                  {canWrite && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {alerts.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Badge variant={alertSeverityVariant(a.severity)}>{a.severity}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800 dark:text-gray-200">{a.message}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{titleCase(a.type)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {a.server ? (
                        <>
                          <div className="font-medium">{a.server.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {a.server.ipOrHostname}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={alertStatusVariant(a.status)}>{titleCase(a.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatTimestamp(a.createdAt)}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {a.status === 'OPEN' && (
                            <button
                              onClick={() => act(a.id, 'ACKNOWLEDGED')}
                              disabled={busyId === a.id}
                              title="Acknowledge"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Ack
                            </button>
                          )}
                          {a.status !== 'RESOLVED' && (
                            <button
                              onClick={() => act(a.id, 'RESOLVED')}
                              disabled={busyId === a.id}
                              title="Resolve"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Resolve
                            </button>
                          )}
                          {a.status === 'RESOLVED' && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
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

      {/* Detail modal */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Alert detail"
        subtitle={selected ? titleCase(selected.type) + ' · ' + selected.severity : undefined}
        size="md"
        footer={
          selected && canWrite && selected.status !== 'RESOLVED' ? (
            <>
              {selected.status === 'OPEN' && (
                <button
                  onClick={() => act(selected.id, 'ACKNOWLEDGED')}
                  disabled={busyId === selected.id}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Acknowledge
                </button>
              )}
              <button
                onClick={() => act(selected.id, 'RESOLVED')}
                disabled={busyId === selected.id}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                Resolve
              </button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={alertSeverityVariant(selected.severity)}>{selected.severity}</Badge>
              <Badge variant={alertStatusVariant(selected.status)}>{titleCase(selected.status)}</Badge>
            </div>
            <p className="text-gray-800 dark:text-gray-200">{selected.message}</p>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Raised</dt>
                <dd className="mt-0.5 text-gray-700 dark:text-gray-300">{formatDateTime(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Resolved</dt>
                <dd className="mt-0.5 text-gray-700 dark:text-gray-300">{formatDateTime(selected.resolvedAt)}</dd>
              </div>
            </dl>
            {selected.server && (
              <button
                onClick={() => {
                  const id = selected.serverId;
                  setSelected(null);
                  navigate('servers', id);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View {selected.server.name}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
