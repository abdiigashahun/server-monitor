import React, { useState, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import * as alertsApi from '../../api/alerts';
import * as serversApi from '../../api/servers';
import * as auditApi from '../../api/audit';
import * as usersApi from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { navigate } from '../../router';
import { ApiError } from '../../api/client';
import { Badge, type BadgeVariant } from '../../components/Common/Badge';
import { LoadingPanel } from '../../components/Common/Spinner';
import { EmptyState } from '../../components/Common/EmptyState';
import { ErrorState } from '../../components/Common/ErrorState';
import { Pagination } from '../../components/Common/Pagination';
import { Modal } from '../../components/Common/Modal';
import {
  alertSeverityVariant,
  alertStatusVariant,
  formatDateTime,
  formatDuration,
  formatTimestamp,
  titleCase,
  criticalityVariant,
} from '../../utils/formatters';
import {
  filterServersForUser,
  filterAlertsForUser,
} from '../../api/operatorAssignments';
import {
  BellRing,
  Check,
  CheckCheck,
  ExternalLink,
  Filter,
  X,
  Server as ServerIcon,
  Clock,
  Activity,
  AlertTriangle,
  Flame,
  Shield,
  Search,
  User,
  ShieldAlert,
  ScrollText,
} from 'lucide-react';
import type {
  Alert,
  AlertListFilters,
  AlertStatus,
  AlertSeverity,
  AlertType,
  Role,
  User as UserType,
  AuditLog,
} from '../../types';

const controlClass =
  'px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

const DEFAULT_LIMIT = 10;

interface ActorProfile {
  name: string;
  email: string;
  role: Role;
  timestamp?: string;
}

function roleBadgeVariant(role: Role): BadgeVariant {
  if (role === 'ADMIN') return 'purple';
  if (role === 'OPERATOR') return 'info';
  return 'neutral';
}

function resolveUserRole(
  userId?: string | null,
  userEmail?: string | null,
  userName?: string | null,
  users?: UserType[],
): Role {
  if (userId && users) {
    const found = users.find((u) => u.id === userId);
    if (found) return found.role;
  }
  if (userEmail && users) {
    const found = users.find((u) => u.email.toLowerCase() === userEmail.toLowerCase());
    if (found) return found.role;
  }
  if (userName && users) {
    const found = users.find((u) => u.name.toLowerCase() === userName.toLowerCase());
    if (found) return found.role;
  }
  if (userEmail?.toLowerCase().includes('admin') || userName?.toLowerCase().includes('admin')) {
    return 'ADMIN';
  }
  return 'OPERATOR';
}

function extractAlertId(log: AuditLog): string | null {
  if (log.targetId && log.targetId.trim()) return log.targetId.trim();
  const meta = log.metadata as Record<string, unknown> | undefined;
  if (!meta) return null;
  if (meta.alertId && typeof meta.alertId === 'string') return meta.alertId.trim();
  if (meta.id && typeof meta.id === 'string' && (log.targetType === 'alert' || log.action.includes('alert'))) {
    return meta.id.trim();
  }
  if (typeof meta.path === 'string') {
    const match = meta.path.match(/\/alerts\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  return null;
}

interface AlertsPageProps {
  /** When set (deep-link from a server), the list is scoped to this server. */
  serverId?: string;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ serverId }) => {
  const { user: currentUser, can } = useAuth();
  const toast = useToast();
  const canWrite = can('alerts:write');

  const [filters, setFilters] = useState<AlertListFilters>({
    page: 1,
    limit: DEFAULT_LIMIT,
    serverId,
  });
  const [selected, setSelected] = useState<Alert | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localActors, setLocalActors] = useState<
    Record<string, { ackUser?: ActorProfile; resUser?: ActorProfile }>
  >({});

  // Keep the serverId filter in sync with the route (deep-link from a server).
  const [lastServerId, setLastServerId] = useState(serverId);
  if (serverId !== lastServerId) {
    setLastServerId(serverId);
    setFilters((f) => ({ ...f, serverId, page: 1 }));
  }

  // Load servers for dropdown filter
  const { data: serversData } = useApi(() => serversApi.list({}), []);
  const rawServerList = serversData?.servers ?? [];
  const serverList = useMemo(
    () => filterServersForUser(rawServerList, currentUser),
    [rawServerList, currentUser],
  );

  // Load users to resolve user roles (Admin vs Operator)
  const { data: usersData } = useApi(() => usersApi.list({}), []);
  const usersList = usersData?.users ?? [];

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
  const rawAlerts = data?.alerts ?? [];
  const alerts = useMemo(
    () => filterAlertsForUser(rawAlerts, serverList, currentUser),
    [rawAlerts, serverList, currentUser],
  );
  const pagination = data?.pagination;

  // Load audit trail from backend to find who resolved & acknowledged alerts
  const { data: auditData } = useApi(
    () => auditApi.list({ limit: 100 }).catch(() => null),
    [],
  );
  const allAuditLogs = auditData?.auditLogs ?? [];

  // If a modal is open for a selected alert, also fetch audit logs specifically for it
  const { data: modalAuditData } = useApi(
    () => (selected ? auditApi.list({ targetType: 'alert', limit: 100 }).catch(() => null) : Promise.resolve(null)),
    [selected?.id],
  );

  const combinedAuditLogs = useMemo(() => {
    const list = [...allAuditLogs];
    if (modalAuditData?.auditLogs) {
      for (const log of modalAuditData.auditLogs) {
        if (!list.some((existing) => existing.id === log.id)) {
          list.push(log);
        }
      }
    }
    return list;
  }, [allAuditLogs, modalAuditData]);

  // Build an actor attribution lookup map for each alert from audit logs
  const auditActorMap = useMemo(() => {
    const map = new Map<string, { ack?: ActorProfile; res?: ActorProfile; events: AuditLog[] }>();

    for (const log of combinedAuditLogs) {
      const alertId = extractAlertId(log);
      if (!alertId) continue;

      if (!map.has(alertId)) {
        map.set(alertId, { events: [] });
      }
      const entry = map.get(alertId)!;
      if (!entry.events.some((e) => e.id === log.id)) {
        entry.events.push(log);
      }

      const role = resolveUserRole(log.userId, log.user?.email, log.user?.name, usersList);
      const profile: ActorProfile = {
        name: log.user?.name || (role === 'ADMIN' ? 'System Administrator' : 'Operator'),
        email: log.user?.email || '',
        role: role,
        timestamp: log.createdAt,
      };

      const actionLower = (log.action || '').toLowerCase();
      const meta = (log.metadata as Record<string, unknown>) || {};
      const metaStatus = String(meta.status || meta.newStatus || '').toUpperCase();
      const metaAction = String(meta.action || '').toUpperCase();

      const isAck =
        actionLower === 'alerts:acknowledge' ||
        actionLower.includes('ack') ||
        metaStatus === 'ACKNOWLEDGED' ||
        metaAction === 'ACKNOWLEDGE';

      const isRes =
        actionLower === 'alerts:resolve' ||
        actionLower.includes('resolve') ||
        metaStatus === 'RESOLVED' ||
        metaAction === 'RESOLVE';

      if (isAck) {
        entry.ack = profile;
      }
      if (isRes) {
        entry.res = profile;
      }
      if (!isAck && !isRes && (actionLower.includes('alert') || log.targetType === 'alert')) {
        if (metaStatus === 'ACKNOWLEDGED') entry.ack = profile;
        else if (metaStatus === 'RESOLVED') entry.res = profile;
        else if (!entry.res) entry.res = profile;
      }
    }

    return map;
  }, [combinedAuditLogs, usersList]);

  const setFilter = <K extends keyof AlertListFilters>(key: K, value: AlertListFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));

  const clearServer = () => {
    setFilters((f) => ({ ...f, serverId: undefined, page: 1 }));
    navigate('alerts');
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: DEFAULT_LIMIT });
    navigate('alerts');
  };

  const setPage = (page: number) => setFilters((f) => ({ ...f, page }));

  const act = async (id: string, status: Extract<AlertStatus, 'ACKNOWLEDGED' | 'RESOLVED'>) => {
    setBusyId(id);
    try {
      await alertsApi.updateStatus(id, status);
      toast.success(status === 'RESOLVED' ? 'Alert resolved' : 'Alert acknowledged');

      if (currentUser) {
        setLocalActors((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            ...(status === 'ACKNOWLEDGED'
              ? {
                  ackUser: {
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role,
                    timestamp: new Date().toISOString(),
                  },
                }
              : {}),
            ...(status === 'RESOLVED'
              ? {
                  resUser: {
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role,
                    timestamp: new Date().toISOString(),
                  },
                }
              : {}),
          },
        }));
      }

      if (selected && selected.id === id) {
        setSelected((prev) =>
          prev
            ? {
                ...prev,
                status,
                resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : prev.resolvedAt,
              }
            : null,
        );
      }
      reload();
    } catch (err) {
      toast.error('Update failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  const hasActiveFilters =
    filters.status !== undefined ||
    filters.severity !== undefined ||
    filters.type !== undefined ||
    filters.serverId !== undefined ||
    filters.from !== undefined ||
    filters.to !== undefined;

  // Selected alert actor resolution (without falsely falling back to the current viewing user)
  const selectedActors = useMemo(() => {
    if (!selected) return { ack: null, res: null, events: [] };

    const local = localActors[selected.id];
    const auditInfo = auditActorMap.get(selected.id);

    let ack: ActorProfile | null = local?.ackUser || auditInfo?.ack || null;
    let res: ActorProfile | null = local?.resUser || auditInfo?.res || null;

    // Check payload fields if backend returns actor directly
    const rawAlert = selected as unknown as Record<string, unknown>;
    if (!ack && rawAlert.acknowledgedByUser) {
      const u = rawAlert.acknowledgedByUser as Record<string, unknown>;
      ack = {
        name: String(u.name || 'Operator'),
        email: String(u.email || ''),
        role: (u.role as Role) || resolveUserRole(null, String(u.email || ''), String(u.name || ''), usersList),
        timestamp: String(rawAlert.acknowledgedAt || selected.createdAt),
      };
    } else if (!ack && rawAlert.acknowledgedBy && typeof rawAlert.acknowledgedBy === 'string') {
      const role = resolveUserRole(null, null, rawAlert.acknowledgedBy, usersList);
      ack = {
        name: rawAlert.acknowledgedBy,
        email: '',
        role: role,
        timestamp: String(rawAlert.acknowledgedAt || selected.createdAt),
      };
    }

    if (!res && rawAlert.resolvedByUser) {
      const u = rawAlert.resolvedByUser as Record<string, unknown>;
      res = {
        name: String(u.name || 'Operator'),
        email: String(u.email || ''),
        role: (u.role as Role) || resolveUserRole(null, String(u.email || ''), String(u.name || ''), usersList),
        timestamp: selected.resolvedAt || undefined,
      };
    } else if (!res && rawAlert.resolvedBy && typeof rawAlert.resolvedBy === 'string') {
      const role = resolveUserRole(null, null, rawAlert.resolvedBy, usersList);
      res = {
        name: rawAlert.resolvedBy,
        email: '',
        role: role,
        timestamp: selected.resolvedAt || undefined,
      };
    }

    // Check events relating to this alert to pick up user details if any event touched it
    if (!res && selected.status === 'RESOLVED' && auditInfo?.events && auditInfo.events.length > 0) {
      const lastEvent = auditInfo.events[0];
      if (lastEvent && lastEvent.user) {
        const role = resolveUserRole(lastEvent.userId, lastEvent.user.email, lastEvent.user.name, usersList);
        res = {
          name: lastEvent.user.name,
          email: lastEvent.user.email || '',
          role: role,
          timestamp: selected.resolvedAt || lastEvent.createdAt,
        };
      }
    }

    return {
      ack,
      res,
      events: auditInfo?.events || [],
    };
  }, [selected, localActors, auditActorMap, usersList]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-blue-600" />
            Alerts
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Threshold breaches and availability events raised by the monitoring backend.
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Total alerts: <strong>{pagination?.total ?? alerts.length}</strong>
        </div>
      </div>

      {/* Filters Card */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          Filter:
        </div>

        {/* Server filter dropdown */}
        <select
          className={`${controlClass} text-xs`}
          value={filters.serverId ?? ''}
          onChange={(e) => setFilter('serverId', e.target.value || undefined)}
        >
          <option value="">All Servers</option>
          {serverList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.ipOrHostname})
            </option>
          ))}
        </select>

        {/* Status dropdown */}
        <select
          className={`${controlClass} text-xs`}
          value={filters.status ?? ''}
          onChange={(e) => setFilter('status', (e.target.value || undefined) as AlertStatus)}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        {/* Severity dropdown */}
        <select
          className={`${controlClass} text-xs`}
          value={filters.severity ?? ''}
          onChange={(e) => setFilter('severity', (e.target.value || undefined) as AlertSeverity)}
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
        </select>

        {/* Type dropdown */}
        <select
          className={`${controlClass} text-xs`}
          value={filters.type ?? ''}
          onChange={(e) => setFilter('type', (e.target.value || undefined) as AlertType)}
        >
          <option value="">All Types</option>
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
            className={`${controlClass} text-xs py-1.5`}
            value={filters.from ? filters.from.slice(0, 10) : ''}
            onChange={(e) => setFilter('from', e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          To
          <input
            type="date"
            className={`${controlClass} text-xs py-1.5`}
            value={filters.to ? filters.to.slice(0, 10) : ''}
            onChange={(e) => setFilter('to', e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined)}
          />
        </label>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-auto"
          >
            <X className="w-3.5 h-3.5" />
            Reset filters
          </button>
        )}

        {filters.serverId && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Server: {serverName ?? 'selected'}
            <button
              onClick={clearServer}
              title="Clear server filter"
              className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {/* Body Table */}
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
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="px-4 py-3 font-semibold">Severity</th>
                  <th className="px-4 py-3 font-semibold">Alert Message & Type</th>
                  <th className="px-4 py-3 font-semibold">Server</th>
                  <th className="px-4 py-3 font-semibold">Status & Actor</th>
                  <th className="px-4 py-3 font-semibold">Raised</th>
                  <th className="px-4 py-3 font-semibold">Resolved By</th>
                  {canWrite && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {alerts.map((a) => {
                  const auditInfo = auditActorMap.get(a.id);
                  const local = localActors[a.id];
                  const ackActor = local?.ackUser || auditInfo?.ack;
                  const resActor = local?.resUser || auditInfo?.res;

                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <Badge variant={alertSeverityVariant(a.severity)}>
                          {a.severity === 'CRITICAL' ? (
                            <Flame className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {a.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-gray-900 dark:text-gray-100 font-medium">{a.message}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          Type: {titleCase(a.type)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300">
                        {a.server ? (
                          <>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{a.server.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {a.server.ipOrHostname} • {a.server.department || 'General'}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Status & Acknowledged Actor */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={alertStatusVariant(a.status)}>{titleCase(a.status)}</Badge>
                          {a.status === 'ACKNOWLEDGED' && ackActor && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5 flex-wrap">
                              <span>by <strong>{ackActor.name}</strong></span>
                              <Badge variant={roleBadgeVariant(ackActor.role)} className="text-[9px] px-1 py-0 font-bold uppercase">
                                {ackActor.role}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Raised Time */}
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{formatTimestamp(a.createdAt)}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{formatDateTime(a.createdAt)}</div>
                      </td>

                      {/* Resolved By Actor & Time */}
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                        {a.resolvedAt ? (
                          <div>
                            <div className="font-medium text-green-600 dark:text-green-400">
                              {formatTimestamp(a.resolvedAt)}
                            </div>
                            {resActor ? (
                              <div className="text-[11px] text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span>by <strong>{resActor.name}</strong></span>
                                <Badge variant={roleBadgeVariant(resActor.role)} className="text-[9px] px-1 py-0 font-bold uppercase">
                                  {resActor.role}
                                </Badge>
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-400 font-mono">{formatDateTime(a.resolvedAt)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      {canWrite && (
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {a.status === 'OPEN' && (
                              <button
                                onClick={() => act(a.id, 'ACKNOWLEDGED')}
                                disabled={busyId === a.id}
                                title="Acknowledge"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 transition-colors cursor-pointer"
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
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50 transition-colors cursor-pointer"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Resolve
                              </button>
                            )}
                            {a.status === 'RESOLVED' && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-semibold px-2 py-1">
                                Resolved
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination: 10 items per page */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-3 border-t border-gray-200 dark:border-gray-800">
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Rich Detail Modal with Real Operator / Admin Attribution */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Alert Overview"
        subtitle={selected ? `Alert ID: ${selected.id}` : undefined}
        size="lg"
        footer={
          selected && (
            <div className="flex items-center justify-between w-full">
              {selected.server ? (
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
              ) : <div />}

              <div className="flex items-center gap-2">
                {canWrite && selected.status === 'OPEN' && (
                  <button
                    onClick={() => act(selected.id, 'ACKNOWLEDGED')}
                    disabled={busyId === selected.id}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}
                {canWrite && selected.status !== 'RESOLVED' && (
                  <button
                    onClick={() => act(selected.id, 'RESOLVED')}
                    disabled={busyId === selected.id}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Resolve Alert
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Severity & Status Banner */}
            <div
              className={`p-4 rounded-lg border flex items-start justify-between gap-3 ${
                selected.severity === 'CRITICAL'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={alertSeverityVariant(selected.severity)}>
                    {selected.severity}
                  </Badge>
                  <Badge variant="neutral">{titleCase(selected.type)} Alert</Badge>
                  <Badge variant={alertStatusVariant(selected.status)}>
                    {titleCase(selected.status)}
                  </Badge>
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white pt-1">
                  {selected.message}
                </p>
              </div>
            </div>

            {/* Target Server Card */}
            {selected.server && (
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <ServerIcon className="w-3.5 h-3.5 text-blue-600" />
                  Affected Infrastructure Host
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block">Server Name</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {selected.server.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">IP / Hostname</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">
                      {selected.server.ipOrHostname}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Department</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {selected.server.department || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Criticality</span>
                    <span className="mt-0.5 block">
                      <Badge variant={criticalityVariant(selected.server.criticality)}>
                        {selected.server.criticality}
                      </Badge>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Operator / Admin Attribution Cards: Who Acknowledged & Who Resolved */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Acknowledged By Card */}
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-500" />
                    Acknowledged By
                  </span>
                  {selectedActors.ack && (
                    <Badge variant={roleBadgeVariant(selectedActors.ack.role)}>
                      {selectedActors.ack.role}
                    </Badge>
                  )}
                </div>

                {selected.status === 'OPEN' ? (
                  <div className="text-xs text-gray-400 italic py-1">
                    Not yet acknowledged — alert is pending review.
                  </div>
                ) : selectedActors.ack ? (
                  <div className="flex items-start gap-2.5 pt-0.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        selectedActors.ack.role === 'ADMIN'
                          ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {selectedActors.ack.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <span>{selectedActors.ack.name}</span>
                        <span className="text-[10px] font-normal text-gray-400">
                          ({selectedActors.ack.role === 'ADMIN' ? 'Administrator' : 'Operator'})
                        </span>
                      </div>
                      {selectedActors.ack.email && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                          {selectedActors.ack.email}
                        </div>
                      )}
                      {selectedActors.ack.timestamp && (
                        <div className="text-[10px] text-gray-400 font-mono">
                          {formatDateTime(selectedActors.ack.timestamp)} ({formatTimestamp(selectedActors.ack.timestamp)})
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-1">
                    Directly resolved without prior acknowledge
                  </div>
                )}
              </div>

              {/* Resolved By Card */}
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                    Resolved By
                  </span>
                  {selectedActors.res && (
                    <Badge variant={roleBadgeVariant(selectedActors.res.role)}>
                      {selectedActors.res.role}
                    </Badge>
                  )}
                </div>

                {selected.status !== 'RESOLVED' ? (
                  <div className="text-xs text-gray-400 italic py-1">
                    Pending resolution — incident is currently active.
                  </div>
                ) : selectedActors.res ? (
                  <div className="flex items-start gap-2.5 pt-0.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        selectedActors.res.role === 'ADMIN'
                          ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                          : 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300'
                      }`}
                    >
                      {selectedActors.res.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <span>{selectedActors.res.name}</span>
                        <span className="text-[10px] font-normal text-gray-400">
                          ({selectedActors.res.role === 'ADMIN' ? 'Administrator' : 'Operator'})
                        </span>
                      </div>
                      {selectedActors.res.email && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                          {selectedActors.res.email}
                        </div>
                      )}
                      <div className="text-[10px] text-green-600 dark:text-green-400 font-mono">
                        {selected.resolvedAt ? formatDateTime(selected.resolvedAt) : ''}
                        {selected.resolvedAt ? ` (${formatTimestamp(selected.resolvedAt)})` : ''}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-1">
                    Resolved by Operator/Admin (Audit log pending)
                  </div>
                )}
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Alert Lifecycle & Timeline
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-gray-400">Raised At</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                    {formatDateTime(selected.createdAt)}
                  </dd>
                  <span className="text-[11px] text-gray-500">
                    ({formatTimestamp(selected.createdAt)})
                  </span>
                </div>
                <div>
                  <dt className="text-gray-400">Current Status</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                    {titleCase(selected.status)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Resolved At</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                    {selected.resolvedAt ? formatDateTime(selected.resolvedAt) : 'Pending resolution'}
                  </dd>
                  {selected.resolvedAt && (
                    <span className="text-[11px] text-green-600 dark:text-green-400">
                      Resolved {formatTimestamp(selected.resolvedAt)}
                    </span>
                  )}
                </div>
              </dl>
            </div>

            {/* Audit Trail List if events exist */}
            {selectedActors.events.length > 0 && (
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5 text-blue-600" />
                  Audit Activity Trail ({selectedActors.events.length})
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedActors.events.map((evt) => {
                    const evtRole = resolveUserRole(evt.userId, evt.user?.email, evt.user?.name, usersList);
                    return (
                      <div
                        key={evt.id}
                        className="flex items-center justify-between text-xs p-2 rounded bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral">{evt.action}</Badge>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {evt.user?.name || (evtRole === 'ADMIN' ? 'Administrator' : 'Operator')}
                          </span>
                          <Badge variant={roleBadgeVariant(evtRole)} className="text-[9px] px-1 py-0 font-bold uppercase">
                            {evtRole}
                          </Badge>
                          {evt.user?.email && (
                            <span className="text-[11px] text-gray-400 font-mono">({evt.user.email})</span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {formatDateTime(evt.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Threshold reference */}
            {selected.thresholdId && (
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Triggered by threshold ID: {selected.thresholdId}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
