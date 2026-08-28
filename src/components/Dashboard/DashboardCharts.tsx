import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { RefreshCw, Cpu, Database, ArrowRight, type LucideIcon } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import * as serversApi from '../../api/servers';
import { useTheme } from '../../context/ThemeContext';
import { navigate } from '../../router';
import { LoadingPanel } from '../Common/Spinner';
import { ErrorState } from '../Common/ErrorState';
import { EmptyState } from '../Common/EmptyState';
import { formatPercent } from '../../utils/formatters';
import type { ServerHealth, ServerBackups } from '../../types';

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
              {slices.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0 text-gray-600 dark:text-gray-300">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {s.value}
                  </span>
                </li>
              ))}
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

export const EstateHealthTrend: React.FC<{
  serverIds: string[];
  note?: string;
  refreshSignal?: number;
}> = ({ serverIds, note, refreshSignal = 0 }) => {
  const { theme } = useTheme();
  const grid = theme === 'dark' ? '#1F2937' : '#E5E7EB';
  const axis = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tooltipBg = theme === 'dark' ? '#111827' : '#FFFFFF';

  const idsKey = serverIds.join(',');
  const { data, loading, error, reload } = useApi(
    () =>
      serverIds.length === 0
        ? Promise.resolve([] as (ServerHealth | null)[])
        : Promise.all(serverIds.map((id) => serversApi.health(id, '7d').catch(() => null))),
    [idsKey, refreshSignal],
    { refreshMs: ESTATE_REFRESH_MS },
  );

  const points = useMemo(() => aggregateTrend(data ?? []), [data]);

  return (
    <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          Estate health trend
          <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500">· 7 days</span>
        </h3>
        {note && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{note}</p>}
      </div>
      <div className="p-5">
        {loading ? (
          <LoadingPanel label="Averaging estate telemetry…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : points.length === 0 ? (
          <EmptyState
            icon={Cpu}
            title="No telemetry yet"
            message="No reporting servers have submitted health samples in the last 7 days."
          />
        ) : (
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
                <Line type="monotone" dataKey="cpu" name="Avg CPU" stroke="#2563EB" dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="mem" name="Avg Memory" stroke="#7C3AED" dot={false} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="disk" name="Avg Disk" stroke="#D97706" dot={false} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Estate backup summary — one bucket per server by worst state
// ---------------------------------------------------------------------------
interface BackupTally {
  ok: number;
  stale: number;
  failed: number;
  noData: number;
}

function tallyBackups(results: (ServerBackups | null)[]): BackupTally {
  const t: BackupTally = { ok: 0, stale: 0, failed: 0, noData: 0 };
  for (const b of results) {
    if (!b) continue;
    if (!b.latest) t.noData++;
    else if (b.latest.status === 'FAILED') t.failed++;
    else if (b.staleness?.isStale) t.stale++;
    else t.ok++;
  }
  return t;
}

export const EstateBackupSummary: React.FC<{
  serverIds: string[];
  note?: string;
  refreshSignal?: number;
}> = ({ serverIds, note, refreshSignal = 0 }) => {
  const idsKey = serverIds.join(',');
  const { data, loading, error, reload } = useApi(
    () =>
      serverIds.length === 0
        ? Promise.resolve([] as (ServerBackups | null)[])
        : Promise.all(serverIds.map((id) => serversApi.backups(id, '7d').catch(() => null))),
    [idsKey, refreshSignal],
    { refreshMs: ESTATE_REFRESH_MS },
  );

  const tally = useMemo(() => tallyBackups(data ?? []), [data]);
  const slices: DonutSlice[] = [
    { name: 'Fresh', value: tally.ok, color: '#16A34A' },
    { name: 'Stale', value: tally.stale, color: '#D97706' },
    { name: 'Failed', value: tally.failed, color: '#DC2626' },
    { name: 'No data', value: tally.noData, color: '#9CA3AF' },
  ];

  if (loading) {
    return (
      <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Backup status
          </h3>
        </div>
        <div className="p-5">
          <LoadingPanel label="Checking backups…" />
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Backup status
          </h3>
        </div>
        <div className="p-5">
          <ErrorState error={error} onRetry={reload} />
        </div>
      </section>
    );
  }

  return (
    <DonutCard
      title="Backup status"
      icon={Database}
      slices={slices}
      centerLabel="servers"
      emptyMessage="No servers with an agent to check backups for."
      footnote={note}
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
