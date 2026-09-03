import React, { useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import * as serversApi from '../../api/servers';
import * as alertsApi from '../../api/alerts';
import * as dashboardApi from '../../api/dashboard';
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
import type { AlertType, Range } from '../../types';

const CORE_REFRESH_MS = 30_000;
const DASHBOARD_RANGE: Range = '7d';

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
  const isOperator = user?.role === 'OPERATOR';

  const [refreshSignal, setRefreshSignal] = useState(0);

  const dashboardQuery = useApi(
    () => (canServers ? dashboardApi.get(DASHBOARD_RANGE) : Promise.resolve(null)),
    [canServers, refreshSignal],
    { refreshMs: CORE_REFRESH_MS },
  );

  // Criticality mix + server picker still need the inventory list (backend-scoped for OPERATOR).
  const serversQuery = useApi(
    () => (canServers ? serversApi.list({}) : Promise.resolve(null)),
    [canServers, refreshSignal],
    { refreshMs: CORE_REFRESH_MS },
  );

  const openAlertsQuery = useApi(
    () => (canAlerts ? alertsApi.list({ status: 'OPEN', limit: 100 }) : Promise.resolve(null)),
    [canAlerts, refreshSignal],
    { refreshMs: CORE_REFRESH_MS },
  );

  const servers = serversQuery.data?.servers ?? [];
  const dash = dashboardQuery.data;
  const stats = dash?.stats;
  const openAlertsAll = openAlertsQuery.data?.alerts ?? [];
  const recentOpen = openAlertsAll.slice(0, 5);

  const openTotal = stats?.openAlertCount ?? openAlertsQuery.data?.pagination.total ?? openAlertsAll.length;
  const criticalTotal = stats?.criticalOpenAlertCount ?? 0;

  const criticalitySlices: DonutSlice[] = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const s of servers) {
      if (s.criticality === 'HIGH') high++;
      else if (s.criticality === 'MEDIUM') medium++;
      else low++;
    }
    return [
      { name: 'High', value: high, color: '#DC2626' },
      { name: 'Medium', value: medium, color: '#D97706' },
      { name: 'Low', value: low, color: '#6B7280' },
    ];
  }, [servers]);

  const notRequired = Math.max(
    0,
    (stats?.serverCount ?? 0) - (stats?.verifiedCount ?? 0) - (stats?.pendingCount ?? 0),
  );

  const verificationSlices: DonutSlice[] = [
    { name: 'Verified', value: stats?.verifiedCount ?? 0, color: '#16A34A' },
    { name: 'Pending', value: stats?.pendingCount ?? 0, color: '#D97706' },
    { name: 'No agent', value: notRequired, color: '#9CA3AF' },
  ];

  const alertsByType = useMemo<DonutSlice[]>(() => {
    const fromDash = dash?.alertTallies?.byType;
    return (['CPU', 'MEMORY', 'DISK', 'BACKUP', 'DOWN'] as AlertType[]).map((t) => ({
      name: titleCase(t),
      value: fromDash?.[t] ?? openAlertsAll.filter((a) => a.type === t).length,
      color: ALERT_TYPE_COLOR[t],
    }));
  }, [dash?.alertTallies?.byType, openAlertsAll]);

  const estateNote = isOperator
    ? `Across your ${stats?.serverCount ?? servers.length} assigned server${(stats?.serverCount ?? servers.length) === 1 ? '' : 's'}.`
    : stats
      ? `Across ${stats.serverCount} servers · ${stats.groupCount} group${stats.groupCount === 1 ? '' : 's'}.`
      : undefined;

  const lastUpdated =
    Math.max(
      dashboardQuery.lastUpdated ?? 0,
      serversQuery.lastUpdated ?? 0,
      openAlertsQuery.lastUpdated ?? 0,
    ) || null;
  const refreshing =
    dashboardQuery.refreshing || serversQuery.refreshing || openAlertsQuery.refreshing;

  const refreshAll = () => {
    setRefreshSignal((n) => n + 1);
    dashboardQuery.reload();
    serversQuery.reload();
    openAlertsQuery.reload();
  };

  const serversReady = canServers && !dashboardQuery.loading && !dashboardQuery.error;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Welcome back{user ? ` ${user.name.split(' ')[0]}` : ''}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isOperator
              ? `Operator scope: telemetry for your ${stats?.serverCount ?? servers.length} assigned server${(stats?.serverCount ?? servers.length) === 1 ? '' : 's'}.`
              : 'Live status of the monitored estate.'}
          </p>
        </div>
        <LiveIndicator lastUpdated={lastUpdated} refreshing={refreshing} onRefresh={refreshAll} />
      </div>

      {isOperator && serversReady && (stats?.serverCount ?? 0) === 0 && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 text-sm text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>No Assigned Servers:</strong> You currently have 0 servers assigned to your
              operator account. Contact a system administrator to assign servers to you.
            </span>
          </div>
        </div>
      )}

      {canServers && dashboardQuery.loading ? (
        <LoadingPanel label="Loading overview…" />
      ) : canServers && dashboardQuery.error ? (
        <ErrorState error={dashboardQuery.error} onRetry={dashboardQuery.reload} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {canServers && (
            <>
              <StatCard
                icon={ServerIcon}
                label="Servers"
                value={stats?.serverCount ?? 0}
                onClick={() => navigate('servers')}
              />
              <StatCard
                icon={ShieldCheck}
                label="Verified"
                value={stats?.verifiedCount ?? 0}
                tone="success"
              />
              <StatCard
                icon={Clock}
                label="Pending"
                value={stats?.pendingCount ?? 0}
                tone="warning"
              />
            </>
          )}
          {canAlerts && (
            <>
              <StatCard
                icon={BellRing}
                label="Open alerts"
                value={openTotal}
                tone={openTotal > 0 ? 'warning' : 'success'}
                onClick={() => navigate('alerts')}
              />
              <StatCard
                icon={AlertTriangle}
                label="Critical"
                value={criticalTotal}
                tone={criticalTotal > 0 ? 'danger' : 'success'}
                onClick={() => navigate('alerts')}
              />
            </>
          )}
        </div>
      )}

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
                footnote={`${stats?.groupCount ?? 0} grouping container${(stats?.groupCount ?? 0) === 1 ? '' : 's'}.`}
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
            />
          )}
        </div>
      )}

      {serversReady && (
        <EstateHealthTrend
          servers={servers}
          estateTrends={dash?.estateTrends ?? []}
          note={estateNote}
          range={DASHBOARD_RANGE}
          refreshSignal={refreshSignal}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {serversReady && dash?.backupTallies && (
          <EstateBackupSummary tallies={dash.backupTallies} note={estateNote} />
        )}

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
                          <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                            {a.message}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {a.server?.name ?? 'Unknown server'} · {titleCase(a.type)} ·{' '}
                          {formatTimestamp(a.createdAt)}
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
