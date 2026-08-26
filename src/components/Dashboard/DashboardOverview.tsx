import React, { useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import * as serversApi from '../../api/servers';
import * as alertsApi from '../../api/alerts';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../router';
import { Badge } from '../Common/Badge';
import { LoadingPanel } from '../Common/Spinner';
import { ErrorState } from '../Common/ErrorState';
import { EmptyState } from '../Common/EmptyState';
import {
  Server as ServerIcon,
  ShieldCheck,
  Clock,
  BellRing,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  alertSeverityVariant,
  formatTimestamp,
  titleCase,
} from '../../utils/formatters';
import {
  DonutCard,
  EstateHealthTrend,
  EstateBackupSummary,
  LiveIndicator,
  type DonutSlice,
} from './DashboardCharts';
import type { Server, AlertType } from '../../types';

// The dashboard silently re-fetches its core cards/alerts on this cadence.
const CORE_REFRESH_MS = 30_000;
// Cap on how many servers the estate fan-out charts request health/backups for.
const ESTATE_CAP = 60;

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

const TONE: Record<NonNullable<StatCardProps['tone']>, { icon: string; chip: string }> = {
  default: { icon: 'text-blue-600 dark:text-blue-400', chip: 'bg-blue-50 dark:bg-blue-950/50' },
  success: { icon: 'text-green-600 dark:text-green-400', chip: 'bg-green-50 dark:bg-green-950/50' },
  warning: { icon: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-50 dark:bg-amber-950/50' },
  danger: { icon: 'text-red-600 dark:text-red-400', chip: 'bg-red-50 dark:bg-red-950/50' },
};

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, tone = 'default', onClick }) => {
  const t = TONE[tone];
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-4 transition-all ${
        onClick
          ? 'hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md cursor-pointer'
          : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {label}
        </span>
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${t.chip}`}>
          <Icon className={`w-4 h-4 ${t.icon}`} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </button>
  );
};

function summarize(servers: Server[]) {
  const s = {
    total: servers.length,
    verified: 0,
    pending: 0,
    notRequired: 0,
    groups: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const srv of servers) {
    if (srv.verificationStatus === 'VERIFIED') s.verified++;
    else if (srv.verificationStatus === 'PENDING') s.pending++;
    else s.notRequired++;
    if (srv.isGroup) s.groups++;
    if (srv.criticality === 'HIGH') s.high++;
    else if (srv.criticality === 'MEDIUM') s.medium++;
    else s.low++;
  }
  return s;
}

const ALERT_TYPE_COLOR: Record<AlertType, string> = {
  CPU: '#2563EB',
  MEMORY: '#7C3AED',
  DISK: '#D97706',
  BACKUP: '#0891B2',
  DOWN: '#DC2626',
};

export const DashboardOverview: React.FC = () => {
  const { user, can } = useAuth();
  const canServers = can('servers:read');
  const canAlerts = can('alerts:read');

  // Bumped by the manual "Refresh" button to force the estate fan-out charts to reload.
  const [refreshSignal, setRefreshSignal] = useState(0);

  const serversQuery = useApi(
    () => (canServers ? serversApi.list({}) : Promise.resolve(null)),
    [canServers],
    { refreshMs: CORE_REFRESH_MS },
  );
  const openAlertsQuery = useApi(
    () => (canAlerts ? alertsApi.list({ status: 'OPEN', limit: 100 }) : Promise.resolve(null)),
    [canAlerts],
    { refreshMs: CORE_REFRESH_MS },
  );
  const criticalQuery = useApi(
    () => (canAlerts ? alertsApi.list({ status: 'OPEN', severity: 'CRITICAL', limit: 1 }) : Promise.resolve(null)),
    [canAlerts],
    { refreshMs: CORE_REFRESH_MS },
  );

  const servers = serversQuery.data?.servers ?? [];
  const stats = useMemo(() => summarize(servers), [servers]);

  const openAlertsAll = openAlertsQuery.data?.alerts ?? [];
  const recentOpen = openAlertsAll.slice(0, 5);
  const openTotal = openAlertsQuery.data?.pagination.total ?? 0;
  const criticalTotal = criticalQuery.data?.pagination.total ?? 0;

  // Only non-group servers that run an agent actually report health/backups.
  const reporting = useMemo(() => servers.filter((s) => !s.isGroup && s.expectsAgent), [servers]);
  const reportingIds = useMemo(() => reporting.slice(0, ESTATE_CAP).map((s) => s.id), [reporting]);
  const estateNote =
    reporting.length === 0
      ? undefined
      : reporting.length > ESTATE_CAP
        ? `Across the first ${ESTATE_CAP} of ${reporting.length} reporting servers.`
        : `Across ${reporting.length} reporting server${reporting.length === 1 ? '' : 's'}.`;

  const criticalitySlices: DonutSlice[] = [
    { name: 'High', value: stats.high, color: '#DC2626' },
    { name: 'Medium', value: stats.medium, color: '#D97706' },
    { name: 'Low', value: stats.low, color: '#6B7280' },
  ];
  const verificationSlices: DonutSlice[] = [
    { name: 'Verified', value: stats.verified, color: '#16A34A' },
    { name: 'Pending', value: stats.pending, color: '#D97706' },
    { name: 'No agent', value: stats.notRequired, color: '#9CA3AF' },
  ];
  const alertsByType = useMemo<DonutSlice[]>(() => {
    const counts: Partial<Record<AlertType, number>> = {};
    for (const a of openAlertsAll) counts[a.type] = (counts[a.type] ?? 0) + 1;
    return (['CPU', 'MEMORY', 'DISK', 'BACKUP', 'DOWN'] as AlertType[]).map((t) => ({
      name: titleCase(t),
      value: counts[t] ?? 0,
      color: ALERT_TYPE_COLOR[t],
    }));
  }, [openAlertsAll]);
  const alertsFootnote =
    openTotal > openAlertsAll.length ? `Showing ${openAlertsAll.length} of ${openTotal} open alerts.` : undefined;

  const lastUpdated =
    Math.max(
      serversQuery.lastUpdated ?? 0,
      openAlertsQuery.lastUpdated ?? 0,
      criticalQuery.lastUpdated ?? 0,
    ) || null;
  const refreshing = serversQuery.refreshing || openAlertsQuery.refreshing || criticalQuery.refreshing;

  const refreshAll = () => {
    serversQuery.reload();
    openAlertsQuery.reload();
    criticalQuery.reload();
    setRefreshSignal((n) => n + 1);
  };

  const serversReady = canServers && !serversQuery.loading && !serversQuery.error;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Welcome back to {user ? ` ${user.name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Live status of the monitored estate.
          </p>
        </div>
        <LiveIndicator lastUpdated={lastUpdated} refreshing={refreshing} onRefresh={refreshAll} />
      </div>

      {/* Server + alert stat cards */}
      {canServers && serversQuery.loading ? (
        <LoadingPanel label="Loading overview…" />
      ) : canServers && serversQuery.error ? (
        <ErrorState error={serversQuery.error} onRetry={serversQuery.reload} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {canServers && (
            <>
              <StatCard
                icon={ServerIcon}
                label="Servers"
                value={stats.total}
                onClick={() => navigate('servers')}
              />
              <StatCard icon={ShieldCheck} label="Verified" value={stats.verified} tone="success" />
              <StatCard icon={Clock} label="Pending" value={stats.pending} tone="warning" />
            </>
          )}
          {canAlerts && (
            <>
              <StatCard
                icon={BellRing}
                label="Open alerts"
                value={openAlertsQuery.loading ? '—' : openTotal}
                tone={openTotal > 0 ? 'warning' : 'success'}
                onClick={() => navigate('alerts')}
              />
              <StatCard
                icon={AlertTriangle}
                label="Critical"
                value={criticalQuery.loading ? '—' : criticalTotal}
                tone={criticalTotal > 0 ? 'danger' : 'success'}
                onClick={() => navigate('alerts')}
              />
            </>
          )}
        </div>
      )}

      {/* Composition & alert-mix donuts */}
      {(serversReady || canAlerts) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {serversReady && (
            <>
              <DonutCard
                title="Criticality mix"
                icon={ServerIcon}
                slices={criticalitySlices}
                centerLabel="servers"
                emptyMessage="No servers in the inventory yet."
              />
              <DonutCard
                title="Agent verification"
                icon={ShieldCheck}
                slices={verificationSlices}
                centerLabel="servers"
                emptyMessage="No servers in the inventory yet."
                footnote={`${stats.groups} grouping container${stats.groups === 1 ? '' : 's'}.`}
              />
            </>
          )}
          {canAlerts && !openAlertsQuery.loading && !openAlertsQuery.error && (
            <DonutCard
              title="Open alerts by type"
              icon={BellRing}
              slices={alertsByType}
              centerLabel="open"
              emptyMessage="No open alerts right now."
              footnote={alertsFootnote}
            />
          )}
        </div>
      )}

      {/* Estate health trend (averaged across reporting servers) */}
      {serversReady && <EstateHealthTrend serverIds={reportingIds} note={estateNote} refreshSignal={refreshSignal} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Estate backup status */}
        {serversReady && (
          <EstateBackupSummary serverIds={reportingIds} note={estateNote} refreshSignal={refreshSignal} />
        )}

        {/* Recent open alerts */}
        {canAlerts && (
          <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-blue-600" />
                Recent open alerts
              </h3>
              <button
                onClick={() => navigate('alerts')}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                All alerts <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-2">
              {openAlertsQuery.loading ? (
                <LoadingPanel label="Loading alerts…" />
              ) : openAlertsQuery.error ? (
                <ErrorState error={openAlertsQuery.error} onRetry={openAlertsQuery.reload} />
              ) : recentOpen.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="All clear" message="No open alerts right now." />
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentOpen.map((a) => (
                    <li
                      key={a.id}
                      onClick={() => a.serverId && navigate('servers', a.serverId)}
                      className={`px-3 py-2.5 flex items-center justify-between gap-3 rounded-md ${
                        a.serverId ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={alertSeverityVariant(a.severity)}>{a.severity}</Badge>
                          <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{a.message}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {a.server?.name ?? 'Unknown server'} · {titleCase(a.type)} · {formatTimestamp(a.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>

      {!canServers && !canAlerts && (
        <EmptyState
          icon={ServerIcon}
          title="Nothing to show yet"
          message="Your account doesn't have access to servers or alerts. Contact an administrator."
        />
      )}
    </div>
  );
};
