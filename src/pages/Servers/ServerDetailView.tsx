import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  Pencil,
  Plus,
  KeyRound,
  Layers,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Clock,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import * as serversApi from '../../api/servers';
import * as alertsApi from '../../api/alerts';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/client';
import { navigate } from '../../router';
import { Badge } from '../../components/Common/Badge';
import { LoadingPanel } from '../../components/Common/Spinner';
import { ErrorState } from '../../components/Common/ErrorState';
import { EmptyState } from '../../components/Common/EmptyState';
import { ServerForm } from '../../components/Servers/ServerForm';
import { AgentTokenModal } from '../../components/Servers/AgentTokenModal';
import { ConfirmDialog } from '../../components/Common/ConfirmDialog';
import { VerificationBadge } from '../../components/Servers/VerificationBadge';
import { isServerAssignedToUser } from '../../api/operatorAssignments';
import {
  criticalityVariant,
  alertSeverityVariant,
  alertStatusVariant,
  backupStatusVariant,
  networkStatusVariant,
  formatDateTime,
  formatTimestamp,
  formatBytes,
  formatDuration,
  formatPercent,
  titleCase,
} from '../../utils/formatters';
import type { Range, HealthLog, GroupHistoryPoint, ServerHealth, ServerBackups } from '../../types';

interface ServerDetailViewProps {
  serverId: string;
}

// --- helpers ---------------------------------------------------------------
function metricColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'bg-gray-300 dark:bg-gray-600';
  if (value >= 90) return 'bg-red-500';
  if (value >= 75) return 'bg-amber-500';
  return 'bg-green-500';
}

const MetricBar: React.FC<{ icon: React.ElementType; label: string; value: number | null | undefined }> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
        <Icon className="w-4 h-4 text-blue-600" />
        {label}
      </div>
      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatPercent(value)}</span>
    </div>
    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${metricColor(value)}`}
        style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%` }}
      />
    </div>
  </div>
);

function formatAxisTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface ChartPoint {
  t: string;
  cpu: number | null;
  mem: number | null;
  disk: number | null;
}

const MetricChart: React.FC<{ points: ChartPoint[] }> = ({ points }) => {
  const { theme } = useTheme();
  const grid = theme === 'dark' ? '#1F2937' : '#E5E7EB';
  const axis = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tooltipBg = theme === 'dark' ? '#111827' : '#FFFFFF';

  if (points.length === 0) {
    return (
      <EmptyState icon={Cpu} title="No telemetry yet" message="No health samples in this range." />
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="t" tick={{ fontSize: 11, fill: axis }} stroke={grid} minTickGap={24} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: axis }} stroke={grid} unit="%" />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${grid}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="cpu" name="CPU" stroke="#2563EB" dot={false} strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="mem" name="Memory" stroke="#7C3AED" dot={false} strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="disk" name="Disk" stroke="#D97706" dot={false} strokeWidth={2} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const RangeToggle: React.FC<{ range: Range; onChange: (r: Range) => void }> = ({ range, onChange }) => (
  <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-semibold">
    {(['7d', '30d'] as Range[]).map((r) => (
      <button
        key={r}
        onClick={() => onChange(r)}
        className={`px-3 py-1.5 transition-colors cursor-pointer ${
          range === r
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        {r === '7d' ? '7 days' : '30 days'}
      </button>
    ))}
  </div>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode; actions?: React.ReactNode; icon?: React.ElementType }> = ({
  title,
  children,
  actions,
  icon: Icon,
}) => (
  <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-blue-600" />}
        {title}
      </h3>
      {actions}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

// --- main ------------------------------------------------------------------
export const ServerDetailView: React.FC<ServerDetailViewProps> = ({ serverId }) => {
  const { user, can } = useAuth();
  const toast = useToast();
  const canWrite = can('servers:write');
  const isAdmin = user?.role === 'ADMIN';
  const canReadAlerts = can('alerts:read');
  const [range, setRange] = useState<Range>('7d');
  const [editing, setEditing] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [tokenModal, setTokenModal] = useState<
    { token: string; context: 'create' | 'rotate'; name: string } | null
  >(null);

  const serverQuery = useApi(() => serversApi.get(serverId), [serverId]);
  const healthQuery = useApi(() => serversApi.health(serverId, range), [serverId, range]);
  const backupQuery = useApi(() => serversApi.backups(serverId, range), [serverId, range]);
  const alertsQuery = useApi(
    () =>
      canReadAlerts
        ? alertsApi.list({ serverId, limit: 5, status: 'OPEN' })
        : Promise.resolve(null),
    [serverId, canReadAlerts],
  );

  const server = serverQuery.data?.server;

  if (serverQuery.loading) return <LoadingPanel label="Loading server…" />;
  if (serverQuery.error || !server)
    return <ErrorState error={serverQuery.error ?? new Error('Server not found')} onRetry={serverQuery.reload} />;

  if (user?.role === 'OPERATOR' && !isServerAssignedToUser(server, user)) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('servers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to inventory
        </button>
        <div className="p-8 bg-white dark:bg-[#111827] border border-amber-200 dark:border-amber-800/60 rounded-lg text-center space-y-3 shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Access Restricted</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            This server is not assigned to your operator account. If you need access to this server, please contact an administrator to assign it to you.
          </p>
        </div>
      </div>
    );
  }

  const health = healthQuery.data;
  const backups = backupQuery.data;
  const isGroup = server.isGroup;

  const confirmRotate = async () => {
    try {
      const { agentToken } = await serversApi.rotateToken(server.id);
      setTokenModal({ token: agentToken, context: 'rotate', name: server.name });
      serverQuery.reload();
    } catch (err) {
      toast.error('Rotation failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setRotateOpen(false);
    }
  };

  const ownPoints: ChartPoint[] = (health?.history ?? []).map((h: HealthLog) => ({
    t: formatAxisTime(h.recordedAt),
    cpu: h.cpuUsage,
    mem: h.memoryUsage,
    disk: h.diskUsage,
  }));
  const groupPoints: ChartPoint[] = (health?.groupHistory ?? []).map((g: GroupHistoryPoint) => ({
    t: formatAxisTime(g.bucketStart),
    cpu: g.cpuUsage,
    mem: g.memoryUsage,
    disk: g.diskUsage,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('servers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors cursor-pointer mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to inventory
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{server.name}</h2>
              {isGroup && (
                <Badge variant="purple">
                  <Layers className="w-3 h-3" />
                  Group · {server.childCount}
                </Badge>
              )}
              <Badge variant={criticalityVariant(server.criticality)}>{server.criticality}</Badge>
              <VerificationBadge status={server.verificationStatus} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">
              {server.ipOrHostname} · {server.type} · {server.os}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              {isGroup && isAdmin && (
                <button
                  onClick={() => setCreatingChild(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add child
                </button>
              )}
              {server.expectsAgent && (
                <button
                  onClick={() => setRotateOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  Rotate token
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <SectionCard title="Details">
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
          <Meta label="Location" value={server.location} />
          <Meta label="Department" value={server.department} />
          <Meta label="Owner" value={server.owner} />
          <Meta label="Operator" value={server.operatorEmail || '—'} />
          <Meta
            label="Parent group"
            value={
              server.parent ? (
                <button
                  onClick={() => navigate('servers', server.parent!.id)}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  {server.parent.name}
                </button>
              ) : (
                '—'
              )
            }
          />
          <Meta label="Expects agent" value={server.expectsAgent ? 'Yes' : 'No'} />
          <Meta label="Verified at" value={formatDateTime(server.verifiedAt)} />
          <Meta label="Created" value={formatDateTime(server.createdAt)} />
          <Meta label="Updated" value={formatDateTime(server.updatedAt)} />
        </dl>
      </SectionCard>

      {/* Health */}
      <SectionCard
        title={isGroup ? 'Group health' : 'Health'}
        icon={Cpu}
        actions={<RangeToggle range={range} onChange={setRange} />}
      >
        {healthQuery.loading ? (
          <LoadingPanel label="Loading telemetry…" />
        ) : healthQuery.error ? (
          <ErrorState error={healthQuery.error} onRetry={healthQuery.reload} />
        ) : isGroup ? (
          <GroupHealth health={health!} points={groupPoints} />
        ) : (
          <SingleHealth health={health!} points={ownPoints} />
        )}
      </SectionCard>

      {/* Backups */}
      <SectionCard
        title={isGroup ? 'Group backups' : 'Backups'}
        icon={Database}
        actions={<RangeToggle range={range} onChange={setRange} />}
      >
        {backupQuery.loading ? (
          <LoadingPanel label="Loading backups…" />
        ) : backupQuery.error ? (
          <ErrorState error={backupQuery.error} onRetry={backupQuery.reload} />
        ) : isGroup ? (
          <GroupBackups backups={backups!} />
        ) : (
          <SingleBackups backups={backups!} />
        )}
      </SectionCard>

      {/* Related alerts */}
      {canReadAlerts && (
        <SectionCard
          title="Open alerts"
          icon={AlertTriangle}
          actions={
            <button
              onClick={() => navigate('alerts', server.id)}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              View all
            </button>
          }
        >
          {alertsQuery.loading ? (
            <LoadingPanel label="Loading alerts…" />
          ) : alertsQuery.data && alertsQuery.data.alerts.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {alertsQuery.data.alerts.map((a) => (
                <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={alertSeverityVariant(a.severity)}>{a.severity}</Badge>
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                        {a.message}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {titleCase(a.type)} · {formatTimestamp(a.createdAt)}
                    </span>
                  </div>
                  <Badge variant={alertStatusVariant(a.status)}>{titleCase(a.status)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={AlertTriangle} title="No open alerts" message="This server has no open alerts." />
          )}
        </SectionCard>
      )}

      <ServerForm
        open={editing}
        server={server}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          serverQuery.reload();
        }}
      />

      <ServerForm
        open={creatingChild}
        server={null}
        defaultParentId={server.id}
        onClose={() => setCreatingChild(false)}
        onSaved={(created, agentToken) => {
          setCreatingChild(false);
          toast.success('Child server created', created.name);
          serverQuery.reload();
          healthQuery.reload();
          backupQuery.reload();
          if (agentToken) setTokenModal({ token: agentToken, context: 'create', name: created.name });
        }}
      />

      <AgentTokenModal
        open={tokenModal !== null}
        token={tokenModal?.token ?? null}
        serverName={tokenModal?.name}
        context={tokenModal?.context ?? 'rotate'}
        onClose={() => setTokenModal(null)}
      />

      <ConfirmDialog
        open={rotateOpen}
        title="Rotate agent token"
        message={`Issue a new agent token for "${server.name}"? The current token will stop working immediately and the new one is shown only once.`}
        confirmLabel="Rotate token"
        onConfirm={confirmRotate}
        onClose={() => setRotateOpen(false)}
      />
    </div>
  );
};

const Meta: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {label}
    </dt>
    <dd className="mt-0.5 text-gray-800 dark:text-gray-200">{value}</dd>
  </div>
);

// --- single-server health --------------------------------------------------
const SingleHealth: React.FC<{ health: ServerHealth; points: ChartPoint[] }> = ({
  health,
  points,
}) => {
  const latest = health?.latest;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricBar icon={Cpu} label="CPU" value={latest?.cpuUsage} />
        <MetricBar icon={MemoryStick} label="Memory" value={latest?.memoryUsage} />
        <MetricBar icon={HardDrive} label="Disk" value={latest?.diskUsage} />
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300">
        <span className="inline-flex items-center gap-1.5">
          <Network className="w-3.5 h-3.5" /> Network:{' '}
          {latest ? (
            <Badge variant={networkStatusVariant(latest.networkStatus)}>{latest.networkStatus}</Badge>
          ) : (
            '—'
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Uptime: {formatDuration(latest?.uptimeSeconds)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          Last sample: {latest ? formatTimestamp(latest.recordedAt) : '—'}
        </span>
      </div>
      <MetricChart points={points} />
    </div>
  );
};

// --- group health ----------------------------------------------------------
const GroupHealth: React.FC<{ health: ServerHealth; points: ChartPoint[] }> = ({
  health,
  points,
}) => {
  const summary = health?.groupSummary;
  const children = health?.children ?? [];
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Reporting" value={`${summary.reportingChildCount}/${summary.childCount}`} />
          <StatBox label="Open alerts" value={summary.openAlertCount} tone={summary.openAlertCount > 0 ? 'danger' : 'default'} />
          <StatBox label="Avg CPU" value={formatPercent(summary.cpu.avg)} />
          <StatBox
            label="Network down"
            value={summary.networkDownCount}
            tone={summary.networkDownCount > 0 ? 'danger' : 'default'}
          />
        </div>
      )}
      <MetricChart points={points} />
      {children.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-2 font-semibold">Child</th>
                <th className="px-3 py-2 font-semibold">CPU</th>
                <th className="px-3 py-2 font-semibold">Mem</th>
                <th className="px-3 py-2 font-semibold">Disk</th>
                <th className="px-3 py-2 font-semibold">Network</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {children.map((c) => (
                <tr
                  key={c.serverId}
                  onClick={() => navigate('servers', c.serverId)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{c.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{c.ipOrHostname}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatPercent(c.latest?.cpuUsage)}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatPercent(c.latest?.memoryUsage)}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatPercent(c.latest?.diskUsage)}</td>
                  <td className="px-3 py-2">
                    {c.latest ? (
                      <Badge variant={networkStatusVariant(c.latest.networkStatus)}>
                        {c.latest.networkStatus}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- single-server backups -------------------------------------------------
const SingleBackups: React.FC<{ backups: ServerBackups }> = ({
  backups,
}) => {
  const latest = backups?.latest;
  const staleness = backups?.staleness;
  const history = backups?.history ?? [];
  return (
    <div className="space-y-4">
      {staleness?.isStale && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Backups are stale — last success {formatTimestamp(staleness.lastSuccessAt)}
          {staleness.ageSeconds != null && ` (${formatDuration(staleness.ageSeconds)} ago)`} · threshold{' '}
          {staleness.staleAfterHours}h.
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-sm">
        <Meta
          label="Latest status"
          value={latest ? <Badge variant={backupStatusVariant(latest.status)}>{titleCase(latest.status)}</Badge> : '—'}
        />
        <Meta label="Type" value={latest ? titleCase(latest.backupType) : '—'} />
        <Meta label="Size" value={formatBytes(latest?.sizeBytes)} />
        <Meta label="Completed" value={latest ? formatDateTime(latest.completedAt) : '—'} />
        <Meta
          label="Last success"
          value={
            staleness?.lastSuccessAt
              ? `${formatDateTime(staleness.lastSuccessAt)}${
                  staleness.ageSeconds != null ? ` · ${formatDuration(staleness.ageSeconds)} ago` : ''
                }`
              : '—'
          }
        />
      </div>
      {history.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Size</th>
                <th className="px-3 py-2 font-semibold">Started</th>
                <th className="px-3 py-2 font-semibold">Completed</th>
                <th className="px-3 py-2 font-semibold">Storage Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {history
                .slice()
                .reverse()
                .map((b) => (
                  <tr key={b.id}>
                    <td className="px-3 py-2">
                      <Badge variant={backupStatusVariant(b.status)}>{titleCase(b.status)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{titleCase(b.backupType)}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-mono">{formatBytes(b.sizeBytes)}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDateTime(b.startedAt)}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDateTime(b.completedAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={b.location}>
                      {b.location || '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Database} title="No backups" message="No backup records in this range." />
      )}
    </div>
  );
};

// --- group backups ---------------------------------------------------------
const GroupBackups: React.FC<{ backups: ServerBackups }> = ({
  backups,
}) => {
  const summary = backups?.groupSummary;
  const children = backups?.children ?? [];
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatBox label="Children" value={summary.childCount} />
          <StatBox
            label="Stale backups"
            value={summary.staleChildCount}
            tone={summary.staleChildCount > 0 ? 'danger' : 'default'}
          />
        </div>
      )}
      {children.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-2 font-semibold">Child</th>
                <th className="px-3 py-2 font-semibold">Latest</th>
                <th className="px-3 py-2 font-semibold">Last success</th>
                <th className="px-3 py-2 font-semibold">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {children.map((c) => (
                <tr
                  key={c.serverId}
                  onClick={() => navigate('servers', c.serverId)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{c.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{c.ipOrHostname}</div>
                  </td>
                  <td className="px-3 py-2">
                    {c.latest ? (
                      <Badge variant={backupStatusVariant(c.latest.status)}>{titleCase(c.latest.status)}</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {formatTimestamp(c.staleness.lastSuccessAt)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={c.staleness.isStale ? 'danger' : 'success'}>
                      {c.staleness.isStale ? 'Stale' : 'Fresh'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Database} title="No child backups" message="This group has no child backup records." />
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: React.ReactNode; tone?: 'default' | 'danger' }> = ({
  label,
  value,
  tone = 'default',
}) => (
  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {label}
    </div>
    <div
      className={`mt-1 text-lg font-bold ${
        tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
      }`}
    >
      {value}
    </div>
  </div>
);
