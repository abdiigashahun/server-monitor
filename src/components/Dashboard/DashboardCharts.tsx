import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  RefreshCw,
  Cpu,
  Database,
  ArrowRight,
  MemoryStick,
  HardDrive,
  Activity,
  ExternalLink,
  Clock,
  Power,
  Network,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Server as ServerIcon,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import * as serversApi from '../../api/servers';
import { useTheme } from '../../context/ThemeContext';
import { navigate } from '../../router';
import { LoadingPanel } from '../Common/Spinner';
import { ErrorState } from '../Common/ErrorState';
import { EmptyState } from '../Common/EmptyState';
import { Badge } from '../Common/Badge';
import {
  formatPercent,
  formatDuration,
  formatDateTime,
  formatTimestamp,
  networkStatusVariant,
} from '../../utils/formatters';
import type { ServerHealth, ServerBackups, Server, NetworkStatus, DashboardTrendPoint, DashboardBackupTallies, Range } from '../../types';

// Fan-out charts poll less often than the core cards — a multi-day trend barely
// moves in 30s and each refresh costs one request per server.
const ESTATE_REFRESH_MS = 120_000;

// ---------------------------------------------------------------------------
// Live status indicator (pulsing dot + "updated Ns ago" + manual refresh)
// ---------------------------------------------------------------------------
function agoLabel(ts: number | null): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export const LiveIndicator: React.FC<{
  lastUpdated: number | null;
  refreshing: boolean;
  onRefresh: () => void;
}> = ({ lastUpdated, refreshing, onRefresh }) => {
  // Re-render every 5s so the relative label stays current between refreshes.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full bg-green-400 ${
              refreshing ? 'animate-ping opacity-75' : 'opacity-0'
            }`}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        Updated {agoLabel(lastUpdated)}
      </span>
      <button
        onClick={onRefresh}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Reusable donut card
// ---------------------------------------------------------------------------
export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export const DonutCard: React.FC<{
  title: string;
  icon?: LucideIcon;
  slices: DonutSlice[];
  centerLabel?: string;
  emptyMessage?: string;
  footnote?: string;
  action?: React.ReactNode;
}> = ({ title, icon: Icon, slices, centerLabel, emptyMessage, footnote, action }) => {
  const { theme } = useTheme();
  const tooltipBg = theme === 'dark' ? '#111827' : '#FFFFFF';
  const grid = theme === 'dark' ? '#1F2937' : '#E5E7EB';
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const visible = slices.filter((s) => s.value > 0);

  return (
    <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-blue-600" />}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-5">
        {total === 0 ? (
          <EmptyState
            icon={Icon ?? Database}
            title="Nothing to chart"
            message={emptyMessage ?? 'No data available yet.'}
          />
        ) : (
          <div className="flex items-center gap-5">
            <div className="relative w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visible}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={62}
                    paddingAngle={visible.length > 1 ? 2 : 0}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {visible.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${grid}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(val: any) => {
                      const num = Number(val) || 0;
                      const pct = total > 0 ? ((num / total) * 100).toFixed(1) : '0';
                      return [`${num} (${pct}%)`, ''];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</span>
                {centerLabel && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {centerLabel}
                  </span>
                )}
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 min-w-0">
              {slices.map((s) => {
                const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                return (
                  <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0 text-gray-600 dark:text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-xs flex items-center gap-1.5">
                      <span>{s.value}</span>
                      <span className="text-gray-400 dark:text-gray-500 font-normal">({pct}%)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {footnote && total > 0 && (
          <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">{footnote}</p>
        )}
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Estate health trend — averages CPU/Mem/Disk across reporting servers by hour
// ---------------------------------------------------------------------------
function formatAxisTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit' });
  } catch {
    return iso;
  }
}

function hourKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

interface TrendPoint {
  t: string;
  cpu: number | null;
  mem: number | null;
  disk: number | null;
}

function aggregateTrend(results: (ServerHealth | null)[]): TrendPoint[] {
  interface Acc {
    cpu: number; cpuN: number; mem: number; memN: number; disk: number; diskN: number;
  }
  const buckets = new Map<string, Acc>();
  for (const h of results) {
    if (!h) continue;
    for (const s of h.history ?? []) {
      const k = hourKey(s.recordedAt);
      if (!k) continue;
      const a = buckets.get(k) ?? { cpu: 0, cpuN: 0, mem: 0, memN: 0, disk: 0, diskN: 0 };
      if (Number.isFinite(s.cpuUsage)) { a.cpu += s.cpuUsage; a.cpuN++; }
      if (Number.isFinite(s.memoryUsage)) { a.mem += s.memoryUsage; a.memN++; }
      if (Number.isFinite(s.diskUsage)) { a.disk += s.diskUsage; a.diskN++; }
      buckets.set(k, a);
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, a]) => ({
      t: formatAxisTime(k),
      cpu: a.cpuN ? a.cpu / a.cpuN : null,
      mem: a.memN ? a.mem / a.memN : null,
      disk: a.diskN ? a.disk / a.diskN : null,
    }));
}

function formatTrendDate(date: string): string {
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return date;
  }
}

export const EstateHealthTrend: React.FC<{
  servers?: Server[];
  /** Daily estate averages from GET /dashboard (used when no server is selected). */
  estateTrends?: DashboardTrendPoint[];
  note?: string;
  range?: Range;
  refreshSignal?: number;
}> = ({ servers = [], estateTrends = [], note, range = '7d', refreshSignal = 0 }) => {
  const { theme } = useTheme();
  const [viewStyle, setViewStyle] = useState<'cards' | 'combined'>('cards');
  const [selectedServerId, setSelectedServerId] = useState<string>('');

  const grid = theme === 'dark' ? '#1F2937' : '#E5E7EB';
  const axis = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tooltipBg = theme === 'dark' ? '#111827' : '#FFFFFF';

  const reportingServers = useMemo(
    () => servers.filter((s) => !s.isGroup && s.expectsAgent),
    [servers],
  );

  // Per-server drill-down still uses /servers/{id}/health.
  const { data: selectedHealth, loading, error, reload } = useApi(
    () =>
      selectedServerId
        ? serversApi.health(selectedServerId, range).catch(() => null)
        : Promise.resolve(null),
    [selectedServerId, range, refreshSignal],
    { refreshMs: ESTATE_REFRESH_MS },
  );

  const selectedServer = useMemo(() => {
    if (!selectedServerId) return null;
    return servers.find((s) => s.id === selectedServerId) || null;
  }, [selectedServerId, servers]);

  const points = useMemo(() => {
    if (selectedServerId) {
      const realPoints = aggregateTrend(selectedHealth ? [selectedHealth] : []);
      if (realPoints.length > 0) {
        return realPoints.map((p) => ({
          t: p.t,
          cpu: p.cpu !== null ? Math.round(p.cpu * 10) / 10 : 0,
          mem: p.mem !== null ? Math.round(p.mem * 10) / 10 : 0,
          disk: p.disk !== null ? Math.round(p.disk * 10) / 10 : 0,
        }));
      }
      if (selectedHealth?.latest) {
        const lat = selectedHealth.latest;
        return [
          {
            t: lat.recordedAt ? formatAxisTime(lat.recordedAt) : 'Current',
            cpu: Number.isFinite(lat.cpuUsage) ? Math.round(lat.cpuUsage * 10) / 10 : 0,
            mem: Number.isFinite(lat.memoryUsage) ? Math.round(lat.memoryUsage * 10) / 10 : 0,
            disk: Number.isFinite(lat.diskUsage) ? Math.round(lat.diskUsage * 10) / 10 : 0,
          },
        ];
      }
      return [];
    }

    return estateTrends.map((p) => ({
      t: formatTrendDate(p.date),
      cpu: p.avgCpu !== null ? Math.round(p.avgCpu * 10) / 10 : 0,
      mem: p.avgMemory !== null ? Math.round(p.avgMemory * 10) / 10 : 0,
      disk: p.avgDisk !== null ? Math.round(p.avgDisk * 10) / 10 : 0,
    }));
  }, [selectedServerId, selectedHealth, estateTrends]);

  const latestCpu = selectedHealth?.latest?.cpuUsage ?? null;
  const latestMem = selectedHealth?.latest?.memoryUsage ?? null;
  const latestDisk = selectedHealth?.latest?.diskUsage ?? null;

  const avgCpu = useMemo(() => {
    if (points.length === 0) return latestCpu ?? 0;
    return points.reduce((sum, p) => sum + p.cpu, 0) / points.length;
  }, [points, latestCpu]);

  const avgMem = useMemo(() => {
    if (points.length === 0) return latestMem ?? 0;
    return points.reduce((sum, p) => sum + p.mem, 0) / points.length;
  }, [points, latestMem]);

  const avgDisk = useMemo(() => {
    if (points.length === 0) return latestDisk ?? 0;
    return points.reduce((sum, p) => sum + p.disk, 0) / points.length;
  }, [points, latestDisk]);

  const rangeLabel = range === '30d' ? '30 days' : '7 days';
  const showLoading = Boolean(selectedServerId) && loading;

  return (
    <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Header with Server Dropdown & View Mode Switcher */}
      <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/20">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            {selectedServer ? `${selectedServer.name} Health Trend` : 'Estate Health Trend'}
            <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">· {rangeLabel}</span>
          </h3>
          {selectedServer ? (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Host: <span className="font-mono">{selectedServer.ipOrHostname}</span> · {selectedServer.department} ({selectedServer.location})
            </p>
          ) : (
            note && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{note}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Server Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <ServerIcon className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs max-w-[220px] sm:max-w-xs truncate"
            >
              <option value="">
                All Servers (Estate Average{reportingServers.length > 0 ? ` · ${reportingServers.length}` : ''})
              </option>
              {reportingServers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.ipOrHostname})
                </option>
              ))}
            </select>
          </div>

          {/* View Switcher: 3 Cards vs Combined Chart */}
          <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewStyle('cards')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                viewStyle === 'cards'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              3 Trend Cards
            </button>
            <button
              type="button"
              onClick={() => setViewStyle('combined')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                viewStyle === 'combined'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Combined Graph
            </button>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Selected Server Context Banner (when individual server is selected) */}
        {selectedServer && (
          <div className="mb-4 p-3 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
                <ServerIcon className="w-4 h-4 text-blue-600" />
                <span>{selectedServer.name}</span>
              </div>
              <span className="font-mono text-gray-600 dark:text-gray-300">({selectedServer.ipOrHostname})</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {selectedServer.os}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {selectedServer.type}
              </span>
              {selectedHealth?.latest && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedHealth.latest.networkStatus === 'UP'
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedHealth.latest.networkStatus === 'UP' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  {selectedHealth.latest.networkStatus}
                </span>
              )}
              {selectedHealth?.latest?.uptimeSeconds ? (
                <span className="text-gray-500 dark:text-gray-400 font-mono">
                  Uptime: {formatDuration(selectedHealth.latest.uptimeSeconds)}
                </span>
              ) : null}
              {selectedHealth?.latest?.recordedAt && (
                <span className="text-[11px] text-gray-400">
                  (Reported {formatTimestamp(selectedHealth.latest.recordedAt)})
                </span>
              )}
            </div>

            <button
              onClick={() => navigate('servers', selectedServer.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <span>View Server Details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showLoading ? (
          <LoadingPanel label={selectedServer ? `Loading metrics for ${selectedServer.name}…` : 'Averaging estate telemetry…'} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : points.length === 0 ? (
          <EmptyState
            icon={Cpu}
            title="No telemetry yet"
            message={
              selectedServer
                ? 'No health samples for this server in the selected range.'
                : 'No estate health samples yet. Charts will appear once agents report in.'
            }
          />
        ) : viewStyle === 'cards' ? (
          /* 3 Area Trend Cards matching standard dashboard card theme */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: CPU LOAD TREND */}
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-sm flex flex-col justify-between transition-all hover:border-gray-300 dark:hover:border-gray-700">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                      CPU LOAD TREND
                    </h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                      Y: Usage (%) · X: Time
                    </p>
                  </div>

                  {selectedServerId ? (
                    <div className="flex items-center gap-2.5 text-right shrink-0">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Live
                        </div>
                        <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                          {latestCpu !== null ? `${Math.round(latestCpu)}%` : '—'}
                        </div>
                      </div>
                      <div className="border-l border-gray-200 dark:border-gray-800 pl-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          7d Avg
                        </div>
                        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 tabular-nums">
                          {Math.round(avgCpu)}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Estate Avg
                      </div>
                      <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                        {Math.round(avgCpu)}%
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-48 w-full -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={points} margin={{ top: 8, right: 12, left: 6, bottom: 12 }}>
                      <defs>
                        <linearGradient id="estate-cpu-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={theme === 'dark' ? 0.45 : 0.25} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                      <XAxis
                        dataKey="t"
                        tick={{ fontSize: 9, fill: axis }}
                        stroke={grid}
                        minTickGap={16}
                        tickLine={false}
                        label={{
                          value: 'Time',
                          position: 'insideBottom',
                          offset: -6,
                          fontSize: 10,
                          fill: axis,
                          fontWeight: 600,
                        }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={{ fontSize: 9, fill: axis }}
                        stroke={grid}
                        tickLine={false}
                        label={{
                          value: 'Usage (%)',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 12,
                          fontSize: 10,
                          fill: axis,
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          border: `1px solid ${grid}`,
                          borderRadius: 8,
                          fontSize: 12,
                          color: theme === 'dark' ? '#F8FAFC' : '#111827',
                        }}
                        formatter={(val: any) => [`${val}%`, selectedServer ? `${selectedServer.name} CPU` : 'CPU Load']}
                        labelStyle={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280', fontWeight: 600 }}
                      />
                      <Area type="monotone" dataKey="cpu" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#estate-cpu-gradient)" connectNulls isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Card 2: MEMORY ALLOCATION */}
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-sm flex flex-col justify-between transition-all hover:border-gray-300 dark:hover:border-gray-700">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                      <MemoryStick className="w-3.5 h-3.5 text-cyan-600" />
                      MEMORY ALLOCATION
                    </h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                      Y: Allocation (%) · X: Time
                    </p>
                  </div>

                  {selectedServerId ? (
                    <div className="flex items-center gap-2.5 text-right shrink-0">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Live
                        </div>
                        <div className="text-base font-extrabold text-cyan-600 dark:text-cyan-400 tabular-nums">
                          {latestMem !== null ? `${Math.round(latestMem)}%` : '—'}
                        </div>
                      </div>
                      <div className="border-l border-gray-200 dark:border-gray-800 pl-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          7d Avg
                        </div>
                        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 tabular-nums">
                          {Math.round(avgMem)}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Estate Avg
                      </div>
                      <div className="text-base font-extrabold text-cyan-600 dark:text-cyan-400 tabular-nums">
                        {Math.round(avgMem)}%
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-48 w-full -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={points} margin={{ top: 8, right: 12, left: 6, bottom: 12 }}>
                      <defs>
                        <linearGradient id="estate-mem-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={theme === 'dark' ? 0.45 : 0.25} />
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                      <XAxis
                        dataKey="t"
                        tick={{ fontSize: 9, fill: axis }}
                        stroke={grid}
                        minTickGap={16}
                        tickLine={false}
                        label={{
                          value: 'Time',
                          position: 'insideBottom',
                          offset: -6,
                          fontSize: 10,
                          fill: axis,
                          fontWeight: 600,
                        }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={{ fontSize: 9, fill: axis }}
                        stroke={grid}
                        tickLine={false}
                        label={{
                          value: 'Allocation (%)',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 12,
                          fontSize: 10,
                          fill: axis,
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          border: `1px solid ${grid}`,
                          borderRadius: 8,
                          fontSize: 12,
                          color: theme === 'dark' ? '#F8FAFC' : '#111827',
                        }}
                        formatter={(val: any) => [`${val}%`, selectedServer ? `${selectedServer.name} Memory` : 'Memory Allocation']}
                        labelStyle={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280', fontWeight: 600 }}
                      />
                      <Area type="monotone" dataKey="mem" stroke="#06B6D4" strokeWidth={2.5} fillOpacity={1} fill="url(#estate-mem-gradient)" connectNulls isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Card 3: DISK SPACE USAGE */}
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-sm flex flex-col justify-between transition-all hover:border-gray-300 dark:hover:border-gray-700">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                      DISK SPACE USAGE
                    </h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                      Y: Space Used (%) · X: Time
                    </p>
                  </div>

                  {selectedServerId ? (
                    <div className="flex items-center gap-2.5 text-right shrink-0">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Live
                        </div>
                        <div className="text-base font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">
                          {latestDisk !== null ? `${Math.round(latestDisk)}%` : '—'}
                        </div>
                      </div>
                      <div className="border-l border-gray-200 dark:border-gray-800 pl-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          7d Avg
                        </div>
                        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 tabular-nums">
                          {Math.round(avgDisk)}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Estate Avg
                      </div>
                      <div className="text-base font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">
                        {Math.round(avgDisk)}%
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-48 w-full -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={points} margin={{ top: 8, right: 12, left: 6, bottom: 12 }}>
                      <defs>
                        <linearGradient id="estate-disk-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={theme === 'dark' ? 0.45 : 0.25} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                      <XAxis
                        dataKey="t"
                        tick={{ fontSize: 9, fill: axis }}
                        stroke={grid}
                        minTickGap={16}
                        tickLine={false}
                        label={{
                          value: 'Time',
                          position: 'insideBottom',
                          offset: -6,
                          fontSize: 10,
                          fill: axis,
                          fontWeight: 600,
                        }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={{ fontSize: 9, fill: axis }}
                        stroke={grid}
                        tickLine={false}
                        label={{
                          value: 'Space Used (%)',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 12,
                          fontSize: 10,
                          fill: axis,
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          border: `1px solid ${grid}`,
                          borderRadius: 8,
                          fontSize: 12,
                          color: theme === 'dark' ? '#F8FAFC' : '#111827',
                        }}
                        formatter={(val: any) => [`${val}%`, selectedServer ? `${selectedServer.name} Disk` : 'Disk Usage']}
                        labelStyle={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280', fontWeight: 600 }}
                      />
                      <Area type="monotone" dataKey="disk" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#estate-disk-gradient)" connectNulls isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 16, left: 4, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 11, fill: axis }}
                  stroke={grid}
                  minTickGap={24}
                  label={{ value: 'Time', position: 'insideBottom', offset: -6, fontSize: 11, fill: axis, fontWeight: 600 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: axis }}
                  stroke={grid}
                  unit="%"
                  label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: axis, fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${grid}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="cpu" name={selectedServer ? `${selectedServer.name} CPU` : 'Avg CPU'} stroke="#2563EB" dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="mem" name={selectedServer ? `${selectedServer.name} Memory` : 'Avg Memory'} stroke="#06B6D4" dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="disk" name={selectedServer ? `${selectedServer.name} Disk` : 'Avg Disk'} stroke="#8B5CF6" dot={false} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Estate backup summary — tallies from GET /dashboard.backupTallies
// ---------------------------------------------------------------------------
export const EstateBackupSummary: React.FC<{
  tallies: DashboardBackupTallies;
  note?: string;
}> = ({ tallies, note }) => {
  const slices: DonutSlice[] = [
    { name: 'Success', value: tallies.success, color: '#16A34A' },
    { name: 'Failed', value: tallies.failed, color: '#DC2626' },
    { name: 'In progress', value: tallies.inProgress, color: '#2563EB' },
  ];

  return (
    <DonutCard
      title="Backup status"
      icon={Database}
      slices={slices}
      centerLabel="runs"
      emptyMessage="No backup runs in this range."
      footnote={note ?? `${tallies.total} backup run${tallies.total === 1 ? '' : 's'} in range.`}
      action={
        <button
          onClick={() => navigate('backups')}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </button>
      }
    />
  );
};

// ---------------------------------------------------------------------------
// Real-time Server Health Monitoring (CPU, Memory, Disk, Uptime, Boot, Network)
// ---------------------------------------------------------------------------
export interface ResourceUtilizationChartsProps {
  servers: Server[];
  refreshSignal?: number;
}

export interface ServerMetricData {
  server: Server;
  cpu: number;
  memory: number;
  disk: number;
  uptimeSeconds: number;
  lastBootAt: string;
  networkStatus: NetworkStatus;
  recordedAt: string;
}

interface MetricSummary {
  avg: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  peak: { server: Server; value: number } | null;
  min: { server: Server; value: number } | null;
}

function computeMetricSummary(
  items: { server: Server; value: number }[],
  warningThreshold: number,
  criticalThreshold: number,
): MetricSummary {
  if (items.length === 0) {
    return {
      avg: 0,
      healthyCount: 0,
      warningCount: 0,
      criticalCount: 0,
      peak: null,
      min: null,
    };
  }

  let sum = 0;
  let healthyCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let peak: { server: Server; value: number } = items[0];
  let min: { server: Server; value: number } = items[0];

  for (const item of items) {
    sum += item.value;
    if (item.value >= criticalThreshold) criticalCount++;
    else if (item.value >= warningThreshold) warningCount++;
    else healthyCount++;

    if (item.value > peak.value) peak = item;
    if (item.value < min.value) min = item;
  }

  return {
    avg: sum / items.length,
    healthyCount,
    warningCount,
    criticalCount,
    peak,
    min,
  };
}

// Color-coded status standards:
// Green = Normal / UP (< 70% or Healthy)
// Yellow/Amber = Warning / Degraded (70-89% or Elevated)
// Red = Critical / Down (≥ 90% or Critical)
export function getStatusColor(value: number, warn = 70, crit = 90): string {
  if (value >= crit) return '#DC2626'; // Red
  if (value >= warn) return '#D97706'; // Yellow / Amber
  return '#16A34A'; // Green
}

export function getStatusInfo(
  value: number,
  warn = 70,
  crit = 90,
): { label: 'Normal' | 'Warning' | 'Critical'; variant: 'success' | 'warning' | 'danger'; color: string } {
  if (value >= crit) return { label: 'Critical', variant: 'danger', color: '#DC2626' };
  if (value >= warn) return { label: 'Warning', variant: 'warning', color: '#D97706' };
  return { label: 'Normal', variant: 'success', color: '#16A34A' };
}

// Helper to aggregate hourly time series points for CPU, Memory, Disk
function aggregateTrendSeries(
  healthList: (ServerHealth | null)[],
  scopedMetrics: ServerMetricData[],
): { t: string; cpu: number; mem: number; disk: number }[] {
  const buckets = new Map<string, { cpu: number; cpuN: number; mem: number; memN: number; disk: number; diskN: number }>();

  for (const h of healthList) {
    if (!h) continue;
    for (const s of h.history ?? []) {
      const k = hourKey(s.recordedAt);
      if (!k) continue;
      const a = buckets.get(k) ?? { cpu: 0, cpuN: 0, mem: 0, memN: 0, disk: 0, diskN: 0 };
      if (Number.isFinite(s.cpuUsage)) { a.cpu += s.cpuUsage; a.cpuN++; }
      if (Number.isFinite(s.memoryUsage)) { a.mem += s.memoryUsage; a.memN++; }
      if (Number.isFinite(s.diskUsage)) { a.disk += s.diskUsage; a.diskN++; }
      buckets.set(k, a);
    }
  }

  const sorted = [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, a]) => {
      const d = new Date(k);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return {
        t: timeStr,
        cpu: a.cpuN ? Math.round((a.cpu / a.cpuN) * 10) / 10 : 0,
        mem: a.memN ? Math.round((a.mem / a.memN) * 10) / 10 : 0,
        disk: a.diskN ? Math.round((a.disk / a.diskN) * 10) / 10 : 0,
      };
    });

  if (sorted.length >= 3) {
    return sorted.slice(-14);
  }

  // Prefer real history only — never invent a waveform from a single snapshot.
  return sorted;
}

// ---------------------------------------------------------------------------
// Card 1, 2, 3: Area Trend Graph Cards matching user mockup
// ---------------------------------------------------------------------------
interface ResourceTrendAreaCardProps {
  title: string;
  dataKey: 'cpu' | 'mem' | 'disk';
  avgValue: number;
  gradientId: string;
  strokeColor: string;
  points: { t: string; cpu: number; mem: number; disk: number }[];
  selectedServer?: Server | null;
  peakServer?: { server: Server; value: number } | null;
}

const ResourceTrendAreaCard: React.FC<ResourceTrendAreaCardProps> = ({
  title,
  dataKey,
  avgValue,
  gradientId,
  strokeColor,
  points,
  selectedServer,
  peakServer,
}) => {
  const avgFormatted = Math.round(avgValue);

  return (
    <div className="bg-[#0B1120] dark:bg-[#0B1120] border border-[#1E293B] rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all hover:border-[#334155]">
      <div>
        {/* Header matching screenshot */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-100">
              {title}
            </h4>
            {peakServer && !selectedServer && (
              <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">
                Peak: <button onClick={() => navigate('servers', peakServer.server.id)} className="font-semibold text-blue-400 hover:underline cursor-pointer">{peakServer.server.name} ({peakServer.value.toFixed(0)}%)</button>
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              Avg
            </div>
            <div
              className="text-base font-extrabold tabular-nums"
              style={{ color: strokeColor }}
            >
              {avgFormatted}%
            </div>
          </div>
        </div>

        {/* Recharts Area Chart matching screenshot */}
        <div className="h-44 w-full -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fontSize: 10, fill: '#64748B' }}
                stroke="#1E293B"
                minTickGap={24}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 10, fill: '#64748B' }}
                stroke="#1E293B"
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#F8FAFC',
                }}
                formatter={(val: any) => [`${val}%`, title]}
                labelStyle={{ color: '#94A3B8', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={strokeColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                connectNulls
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Donut / Pie Gauge Card Option
// ---------------------------------------------------------------------------
interface ResourceGaugeCardProps {
  title: string;
  icon: React.ElementType;
  metricKey: string;
  summary: MetricSummary;
  viewMode: 'usage' | 'distribution';
  isSingleServer: boolean;
  selectedServer?: Server | null;
  freeColor: string;
  tooltipBg: string;
  gridColor: string;
  warningThreshold?: number;
  criticalThreshold?: number;
}

const ResourceGaugeCard: React.FC<ResourceGaugeCardProps> = ({
  title,
  icon: Icon,
  summary,
  viewMode,
  isSingleServer,
  selectedServer,
  freeColor,
  tooltipBg,
  gridColor,
  warningThreshold = 70,
  criticalThreshold = 90,
}) => {
  const isUsageMode = viewMode === 'usage' || isSingleServer;
  const avg = Math.round(summary.avg * 10) / 10;
  const free = Math.max(0, Math.round((100 - avg) * 10) / 10);

  const status = getStatusInfo(avg, warningThreshold, criticalThreshold);

  const usageSlices: DonutSlice[] = [
    { name: 'Used', value: avg, color: status.color },
    { name: 'Available', value: free, color: freeColor },
  ];

  const distributionSlices: DonutSlice[] = [
    { name: `Normal (<${warningThreshold}%)`, value: summary.healthyCount, color: '#16A34A' },
    { name: `Warning (${warningThreshold}-${criticalThreshold - 1}%)`, value: summary.warningCount, color: '#D97706' },
    { name: `Critical (≥${criticalThreshold}%)`, value: summary.criticalCount, color: '#DC2626' },
  ];

  const currentSlices = isUsageMode ? usageSlices : distributionSlices;
  const totalCount = summary.healthyCount + summary.warningCount + summary.criticalCount;

  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className="p-1.5 rounded-md"
              style={{ backgroundColor: `${status.color}18`, color: status.color }}
            >
              <Icon className="w-4 h-4" />
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</span>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {/* Chart + Legend */}
        <div className="flex items-center gap-4 my-2">
          {/* Pie Chart */}
          <div className="relative w-28 h-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentSlices.filter((s) => s.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={36}
                  outerRadius={52}
                  paddingAngle={currentSlices.filter((s) => s.value > 0).length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={true}
                >
                  {currentSlices
                    .filter((s) => s.value > 0)
                    .map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${gridColor}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(val: any) => [isUsageMode ? `${val}%` : `${val} servers`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {isUsageMode ? `${avg}%` : totalCount}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {isUsageMode ? 'Used' : 'Servers'}
              </span>
            </div>
          </div>

          {/* Slices details */}
          <ul className="flex-1 space-y-1.5 min-w-0 text-xs">
            {currentSlices.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 min-w-0 text-gray-600 dark:text-gray-300">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                  {isUsageMode ? `${s.value}%` : `${s.value} (${totalCount > 0 ? Math.round((s.value / totalCount) * 100) : 0}%)`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between gap-2">
        {isSingleServer && selectedServer ? (
          <button
            onClick={() => navigate('servers', selectedServer.id)}
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
          >
            Server details <ExternalLink className="w-3 h-3" />
          </button>
        ) : summary.peak ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-gray-400 dark:text-gray-500">Peak load:</span>
            <button
              onClick={() => navigate('servers', summary.peak!.server.id)}
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px] cursor-pointer"
              title={`${summary.peak.server.name} (${summary.peak.value.toFixed(1)}%)`}
            >
              {summary.peak.server.name} ({summary.peak.value.toFixed(1)}%)
            </button>
          </div>
        ) : (
          <span>No load anomalies</span>
        )}
      </div>
    </div>
  );
};

export const ResourceUtilizationCharts: React.FC<ResourceUtilizationChartsProps> = ({
  servers,
  refreshSignal = 0,
}) => {
  const { theme } = useTheme();
  const [chartMode, setChartMode] = useState<'trend' | 'gauge'>('trend');
  const [viewMode, setViewMode] = useState<'usage' | 'distribution'>('usage');
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [showTable, setShowTable] = useState<boolean>(true);
  const [tableSearch, setTableSearch] = useState<string>('');

  const grid = theme === 'dark' ? '#1F2937' : '#E5E7EB';
  const tooltipBg = theme === 'dark' ? '#111827' : '#FFFFFF';
  const freeColor = theme === 'dark' ? '#1F2937' : '#E5E7EB';

  const reportingServers = useMemo(() => servers.filter((s) => !s.isGroup && s.expectsAgent), [servers]);
  const idsKey = reportingServers.map((s) => s.id).join(',');

  const { data, loading, error, reload } = useApi(
    () =>
      reportingServers.length === 0
        ? Promise.resolve([] as (ServerHealth | null)[])
        : Promise.all(reportingServers.map((s) => serversApi.health(s.id, '7d').catch(() => null))),
    [idsKey, refreshSignal],
    { refreshMs: ESTATE_REFRESH_MS },
  );

  const serverMap = useMemo(() => {
    const map = new Map<string, Server>();
    for (const s of reportingServers) map.set(s.id, s);
    return map;
  }, [reportingServers]);

  const activeMetrics = useMemo<ServerMetricData[]>(() => {
    if (!data) return [];
    const list: ServerMetricData[] = [];

    for (const h of data) {
      if (!h || !h.latest) continue;
      const srv = serverMap.get(h.serverId);
      if (!srv) continue;
      list.push({
        server: srv,
        cpu: Math.max(0, Math.min(100, h.latest.cpuUsage ?? 0)),
        memory: Math.max(0, Math.min(100, h.latest.memoryUsage ?? 0)),
        disk: Math.max(0, Math.min(100, h.latest.diskUsage ?? 0)),
        uptimeSeconds: h.latest.uptimeSeconds ?? 0,
        lastBootAt: h.latest.lastBootAt,
        networkStatus: h.latest.networkStatus ?? 'UP',
        recordedAt: h.latest.recordedAt,
      });
    }
    return list;
  }, [data, serverMap]);

  const scopedMetrics = useMemo(() => {
    if (!selectedServerId) return activeMetrics;
    return activeMetrics.filter((m) => m.server.id === selectedServerId);
  }, [activeMetrics, selectedServerId]);

  const filteredMetrics = useMemo(() => {
    if (!tableSearch.trim()) return scopedMetrics;
    const q = tableSearch.toLowerCase().trim();
    return scopedMetrics.filter(
      (m) =>
        m.server.name.toLowerCase().includes(q) ||
        m.server.ipOrHostname.toLowerCase().includes(q) ||
        m.server.os.toLowerCase().includes(q) ||
        m.networkStatus.toLowerCase().includes(q),
    );
  }, [scopedMetrics, tableSearch]);

  const selectedServer = useMemo(
    () => (selectedServerId ? serverMap.get(selectedServerId) : null),
    [selectedServerId, serverMap],
  );

  // Time series points for the Area charts (matching user screenshot)
  const trendPoints = useMemo(() => {
    return aggregateTrendSeries(data ?? [], scopedMetrics);
  }, [data, scopedMetrics]);

  // Summaries for CPU, Memory, Disk
  const cpuSummary = useMemo(
    () =>
      computeMetricSummary(
        scopedMetrics.map((m) => ({ server: m.server, value: m.cpu })),
        70,
        90,
      ),
    [scopedMetrics],
  );

  const memSummary = useMemo(
    () =>
      computeMetricSummary(
        scopedMetrics.map((m) => ({ server: m.server, value: m.memory })),
        70,
        90,
      ),
    [scopedMetrics],
  );

  const diskSummary = useMemo(
    () =>
      computeMetricSummary(
        scopedMetrics.map((m) => ({ server: m.server, value: m.disk })),
        75,
        90,
      ),
    [scopedMetrics],
  );

  // Telemetry Aggregates (Uptime, Last Boot, Network Status)
  const avgUptimeSeconds = useMemo(() => {
    if (scopedMetrics.length === 0) return 0;
    const sum = scopedMetrics.reduce((acc, m) => acc + m.uptimeSeconds, 0);
    return sum / scopedMetrics.length;
  }, [scopedMetrics]);

  const latestBootTimestamp = useMemo(() => {
    if (scopedMetrics.length === 0) return null;
    let latest = scopedMetrics[0].lastBootAt;
    for (const m of scopedMetrics) {
      if (m.lastBootAt && (!latest || new Date(m.lastBootAt).getTime() > new Date(latest).getTime())) {
        latest = m.lastBootAt;
      }
    }
    return latest;
  }, [scopedMetrics]);

  const networkCounts = useMemo(() => {
    let up = 0;
    let degraded = 0;
    let down = 0;
    for (const m of scopedMetrics) {
      if (m.networkStatus === 'UP') up++;
      else if (m.networkStatus === 'DEGRADED') degraded++;
      else if (m.networkStatus === 'DOWN') down++;
    }
    return { up, degraded, down };
  }, [scopedMetrics]);

  const criticalIssuesCount = useMemo(() => {
    return scopedMetrics.filter(
      (m) => m.cpu >= 90 || m.memory >= 90 || m.disk >= 90 || m.networkStatus === 'DOWN',
    ).length;
  }, [scopedMetrics]);

  if (loading) {
    return (
      <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            B. Real-time Server Health Monitoring
          </h3>
        </div>
        <div className="p-6">
          <LoadingPanel label="Loading real-time resource telemetry…" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            B. Real-time Server Health Monitoring
          </h3>
        </div>
        <div className="p-6">
          <ErrorState error={error} onRetry={reload} />
        </div>
      </section>
    );
  }

  if (reportingServers.length === 0 || activeMetrics.length === 0) {
    return (
      <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            B. Real-time Server Health Monitoring
          </h3>
        </div>
        <div className="p-6">
          <EmptyState
            icon={Activity}
            title="No telemetry available"
            message="No reporting servers have submitted real-time resource samples yet."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden space-y-0">
      {/* Section Header with Controls and Color Legend */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/20">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-blue-600" />
            B. Real-time Server Health Monitoring
            <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
              {selectedServer ? `· ${selectedServer.name}` : `· ${activeMetrics.length} reporting servers`}
            </span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time CPU, RAM, Disk, Uptime, Boot time, and Network health.
          </p>
        </div>

        {/* Controls: Chart Style Toggle, Color Legend, Server Scope */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Chart Style Switcher (Trend Graph vs Donut Gauge) */}
          <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartMode('trend')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                chartMode === 'trend'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Trend Graphs
            </button>
            <button
              type="button"
              onClick={() => setChartMode('gauge')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                chartMode === 'gauge'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Donut Gauges
            </button>
          </div>

          {/* Color Status Legend */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium text-green-700 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Normal (&lt;70%)
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Warning (70-89%)
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Critical (≥90%)
            </span>
          </div>

          {/* Server Scope Picker */}
          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Estate Average ({activeMetrics.length} servers)</option>
            {reportingServers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.ipOrHostname})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* 3 Dedicated Resource Cards matching user screenshot */}
        {chartMode === 'trend' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: CPU LOAD TREND */}
            <ResourceTrendAreaCard
              title="CPU LOAD TREND"
              dataKey="cpu"
              avgValue={cpuSummary.avg}
              gradientId="cpu-load-gradient"
              strokeColor="#3B82F6"
              points={trendPoints}
              selectedServer={selectedServer}
              peakServer={cpuSummary.peak}
            />

            {/* Card 2: MEMORY ALLOCATION */}
            <ResourceTrendAreaCard
              title="MEMORY ALLOCATION"
              dataKey="mem"
              avgValue={memSummary.avg}
              gradientId="mem-alloc-gradient"
              strokeColor="#06B6D4"
              points={trendPoints}
              selectedServer={selectedServer}
              peakServer={memSummary.peak}
            />

            {/* Card 3: DISK SPACE USAGE */}
            <ResourceTrendAreaCard
              title="DISK SPACE USAGE"
              dataKey="disk"
              avgValue={diskSummary.avg}
              gradientId="disk-space-gradient"
              strokeColor="#8B5CF6"
              points={trendPoints}
              selectedServer={selectedServer}
              peakServer={diskSummary.peak}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CPU Donut Gauge */}
            <ResourceGaugeCard
              title="CPU Usage (%)"
              icon={Cpu}
              metricKey="cpu"
              summary={cpuSummary}
              viewMode={viewMode}
              isSingleServer={Boolean(selectedServerId)}
              selectedServer={selectedServer}
              freeColor={freeColor}
              tooltipBg={tooltipBg}
              gridColor={grid}
              warningThreshold={70}
              criticalThreshold={90}
            />

            {/* Memory Donut Gauge */}
            <ResourceGaugeCard
              title="Memory (RAM) Usage (%)"
              icon={MemoryStick}
              metricKey="memory"
              summary={memSummary}
              viewMode={viewMode}
              isSingleServer={Boolean(selectedServerId)}
              selectedServer={selectedServer}
              freeColor={freeColor}
              tooltipBg={tooltipBg}
              gridColor={grid}
              warningThreshold={70}
              criticalThreshold={90}
            />

            {/* Disk Donut Gauge */}
            <ResourceGaugeCard
              title="Disk Usage (%)"
              icon={HardDrive}
              metricKey="disk"
              summary={diskSummary}
              viewMode={viewMode}
              isSingleServer={Boolean(selectedServerId)}
              selectedServer={selectedServer}
              freeColor={freeColor}
              tooltipBg={tooltipBg}
              gridColor={grid}
              warningThreshold={75}
              criticalThreshold={90}
            />
          </div>
        )}

        {/* Top Telemetry Stat Cards: Uptime, Last Boot, Network Status, Critical State */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Uptime Card */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Uptime
              </span>
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatDuration(avgUptimeSeconds)}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {selectedServer ? 'Server uptime' : 'Estate average'}
            </p>
          </div>

          {/* Last Boot Card */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-indigo-600" />
                Last Boot
              </span>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
              {latestBootTimestamp ? formatDateTime(latestBootTimestamp) : '—'}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {latestBootTimestamp ? formatTimestamp(latestBootTimestamp) : 'No boot record'}
            </p>
          </div>

          {/* Network Status Card */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-emerald-600" />
                Network Status
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  networkCounts.down > 0
                    ? 'bg-red-500'
                    : networkCounts.degraded > 0
                    ? 'bg-amber-500'
                    : 'bg-green-500'
                }`}
              />
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-gray-100 flex-wrap">
              {selectedServer ? (
                <Badge variant={networkStatusVariant(scopedMetrics[0]?.networkStatus ?? 'UP')}>
                  {scopedMetrics[0]?.networkStatus ?? 'UP'}
                </Badge>
              ) : (
                <>
                  <span className="text-green-600 dark:text-green-400 font-bold">{networkCounts.up} UP</span>
                  {networkCounts.degraded > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">· {networkCounts.degraded} DEG</span>
                  )}
                  {networkCounts.down > 0 && (
                    <span className="text-red-600 dark:text-red-400">· {networkCounts.down} DOWN</span>
                  )}
                </>
              )}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {networkCounts.down === 0 && networkCounts.degraded === 0
                ? 'All nodes online'
                : `${networkCounts.down + networkCounts.degraded} issue(s) detected`}
            </p>
          </div>

          {/* Health Overview Card */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Load Health
              </span>
              <Badge variant={criticalIssuesCount > 0 ? 'danger' : 'success'}>
                {criticalIssuesCount > 0 ? 'Action Needed' : 'Healthy'}
              </Badge>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {criticalIssuesCount === 0 ? '100%' : `${scopedMetrics.length - criticalIssuesCount}/${scopedMetrics.length}`}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {criticalIssuesCount === 0
                ? 'All parameters within limits'
                : `${criticalIssuesCount} server(s) in critical range`}
            </p>
          </div>
        </div>

        {/* Live Server Health Telemetry Table */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/40 dark:bg-gray-800/20">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <ServerIcon className="w-3.5 h-3.5 text-blue-600" />
              Live Server Telemetry Breakdown ({filteredMetrics.length} of {scopedMetrics.length})
            </h4>

            <div className="flex items-center gap-3">
              {showTable && scopedMetrics.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Filter servers…"
                    className="pl-8 pr-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowTable(!showTable)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {showTable ? (
                  <>
                    Hide Table <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Show Table <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {showTable && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-100/60 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                    <th className="py-2.5 px-4 font-semibold">Server</th>
                    <th className="py-2.5 px-3 font-semibold">CPU (%)</th>
                    <th className="py-2.5 px-3 font-semibold">Memory RAM (%)</th>
                    <th className="py-2.5 px-3 font-semibold">Disk (%)</th>
                    <th className="py-2.5 px-3 font-semibold">Uptime</th>
                    <th className="py-2.5 px-3 font-semibold">Last Boot</th>
                    <th className="py-2.5 px-3 font-semibold">Network</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-400 text-xs">
                        No servers matched &quot;{tableSearch}&quot;
                      </td>
                    </tr>
                  ) : (
                    filteredMetrics.map((m) => {
                      const cpuStatus = getStatusInfo(m.cpu, 70, 90);
                      const memStatus = getStatusInfo(m.memory, 70, 90);
                      const diskStatus = getStatusInfo(m.disk, 75, 90);

                      return (
                        <tr
                          key={m.server.id}
                          className="hover:bg-white dark:hover:bg-gray-800/60 transition-colors"
                        >
                          {/* Server Name & IP */}
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-gray-100">
                                  {m.server.name}
                                </div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {m.server.ipOrHostname} · {m.server.os}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* CPU Usage (%) */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(m.cpu, 100)}%`,
                                    backgroundColor: cpuStatus.color,
                                  }}
                                />
                              </div>
                              <span
                                className="font-bold tabular-nums"
                                style={{ color: cpuStatus.color }}
                              >
                                {m.cpu.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Memory (RAM) (%) */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(m.memory, 100)}%`,
                                    backgroundColor: memStatus.color,
                                  }}
                                />
                              </div>
                              <span
                                className="font-bold tabular-nums"
                                style={{ color: memStatus.color }}
                              >
                                {m.memory.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Disk (%) */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(m.disk, 100)}%`,
                                    backgroundColor: diskStatus.color,
                                  }}
                                />
                              </div>
                              <span
                                className="font-bold tabular-nums"
                                style={{ color: diskStatus.color }}
                              >
                                {m.disk.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Uptime */}
                          <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-medium tabular-nums">
                            {formatDuration(m.uptimeSeconds)}
                          </td>

                          {/* Last Boot */}
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400 text-[11px]">
                            {m.lastBootAt ? formatDateTime(m.lastBootAt) : '—'}
                          </td>

                          {/* Network Status */}
                          <td className="py-3 px-3">
                            <Badge variant={networkStatusVariant(m.networkStatus)}>
                              {m.networkStatus}
                            </Badge>
                          </td>

                          {/* Action Link */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => navigate('servers', m.server.id)}
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              Details <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
