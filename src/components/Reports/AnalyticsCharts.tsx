import React from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Activity, Database, HardDrive } from 'lucide-react';

export const AnalyticsCharts: React.FC = () => {
  const { telemetry, backupTrends, servers } = useMonitoring();

  // Top resource consumers (servers with highest CPU or RAM)
  const topConsumers = [...servers]
    .sort((a, b) => b.cpuUsage + b.memoryUsage - (a.cpuUsage + a.memoryUsage))
    .slice(0, 5);

  return (
    <div className="space-y-4 text-xs text-gray-800 dark:text-slate-200 transition-colors">
      {/* 2x2 or 2x1 Responsive Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPU & Memory Telemetry Chart */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 shadow-sm flex flex-col transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200">
                CPU & RAM Telemetry Trend (%)
              </h3>
            </div>
            <span className="text-[10px] text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-sm border border-red-200 dark:border-red-800/60 font-semibold">
              Limit: 85%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cpuHighGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-800" />
                <XAxis dataKey="time" className="text-gray-500 dark:text-slate-400" stroke="currentColor" fontSize={11} />
                <YAxis className="text-gray-500 dark:text-slate-400" stroke="currentColor" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #ffffff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: 'var(--tooltip-text, #111827)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="cpuAverage"
                  name="Average CPU %"
                  stroke="#2563eb"
                  fillOpacity={1}
                  fill="url(#cpuGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cpuHighCritical"
                  name="Peak Critical CPU %"
                  stroke="#dc2626"
                  fillOpacity={1}
                  fill="url(#cpuHighGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Backup Success / Failure Trends */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 shadow-sm flex flex-col transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-600 dark:text-green-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200">
                Backup Compliance Trend (7 Days)
              </h3>
            </div>
            <span className="text-[10px] text-green-700 dark:text-green-400 font-mono bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-sm border border-green-200 dark:border-green-800/60 font-semibold">
              Volume: ~13.6 TB
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={backupTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-800" />
                <XAxis dataKey="date" className="text-gray-500 dark:text-slate-400" stroke="currentColor" fontSize={11} />
                <YAxis className="text-gray-500 dark:text-slate-400" stroke="currentColor" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #ffffff)',
                    borderColor: 'var(--tooltip-border, #e5e7eb)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: 'var(--tooltip-text, #111827)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="successful" name="Successful Backups" fill="#16a34a" radius={[2, 2, 0, 0]} />
                <Bar dataKey="failed" name="Failed Backups" fill="#dc2626" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Resource Consumer Servers Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 shadow-sm text-xs transition-colors">
        <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Highest Resource Consumer Servers (Live Telemetry)
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="p-2">Server Name</th>
                <th className="p-2">IP Address</th>
                <th className="p-2">Department</th>
                <th className="p-2">CPU Utilization</th>
                <th className="p-2">Memory Utilization</th>
                <th className="p-2">Disk Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {topConsumers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-2 font-mono font-bold text-gray-900 dark:text-slate-100">{s.name}</td>
                  <td className="p-2 font-mono text-gray-500 dark:text-slate-400">{s.ipAddress}</td>
                  <td className="p-2 text-gray-700 dark:text-slate-300">{s.department}</td>

                  {/* CPU */}
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden border border-gray-200 dark:border-slate-700">
                        <div
                          className={`h-full ${
                            s.cpuUsage > 85 ? 'bg-red-600' : s.cpuUsage > 70 ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${s.cpuUsage}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-gray-800 dark:text-slate-200">{s.cpuUsage}%</span>
                    </div>
                  </td>

                  {/* RAM */}
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden border border-gray-200 dark:border-slate-700">
                        <div
                          className={`h-full ${
                            s.memoryUsage > 85 ? 'bg-red-600' : s.memoryUsage > 70 ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${s.memoryUsage}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-gray-800 dark:text-slate-200">{s.memoryUsage}%</span>
                    </div>
                  </td>

                  {/* Disk */}
                  <td className="p-2">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-sm text-[10px] ${
                        s.diskUsage > 85
                          ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60'
                          : 'text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-800'
                      }`}
                    >
                      {s.diskUsage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};