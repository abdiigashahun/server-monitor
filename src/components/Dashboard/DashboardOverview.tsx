import React, { useState, useMemo, useEffect } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { RecentActivityFeed } from '../Activity/RecentActivityFeed';
import { getHealthBadgeClass } from '../../utils/formatters';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Server,
  Activity,
  ShieldAlert,
  Key,
  Copy,
  Check,
  X,
  HardDrive,
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const {
    servers = [],
    alerts = [],
    telemetry = [],
    runPingTest,
    acknowledgeAlert,
  } = useMonitoring();

  const [activeTokenModalServer, setActiveTokenModalServer] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Dynamic server statistics
  const totalServers = servers.length;
  const linuxCount = useMemo(
    () => servers.filter((s) => s.os?.toLowerCase().includes('linux')).length,
    [servers]
  );
  const windowsCount = useMemo(
    () => servers.filter((s) => s.os?.toLowerCase().includes('windows')).length,
    [servers]
  );

  // Alert and Health status filters
  const activeAlerts = useMemo(
    () => alerts.filter((a) => a.status === 'Active'),
    [alerts]
  );
  const criticalAlerts = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'Critical'),
    [activeAlerts]
  );

  const healthyServersCount = useMemo(
    () => servers.filter((s) => s.healthStatus === 'Operational').length,
    [servers]
  );
  const warningServersCount = useMemo(
    () => servers.filter((s) => s.healthStatus === 'Warning').length,
    [servers]
  );
  const criticalServersCount = useMemo(
    () => servers.filter((s) => s.healthStatus === 'Critical').length,
    [servers]
  );

  // Calculate dynamic uptime percentage
  const uptimePercentage = useMemo(() => {
    if (totalServers === 0) return 100;
    return Math.round((healthyServersCount / totalServers) * 100);
  }, [healthyServersCount, totalServers]);

  // Dynamic real-time averages computed directly from current connected servers
  const dynamicCpuAvg = useMemo(() => {
    if (!servers.length) return 0;
    return Math.round(servers.reduce((acc, s) => acc + (s.cpuUsage || 0), 0) / servers.length);
  }, [servers]);

  const dynamicMemAvg = useMemo(() => {
    if (!servers.length) return 0;
    return Math.round(servers.reduce((acc, s) => acc + (s.memoryUsage || 0), 0) / servers.length);
  }, [servers]);

  const diskAverage = useMemo(() => {
    if (!servers.length) return 0;
    return Math.round(servers.reduce((acc, s) => acc + (s.diskUsage || 0), 0) / servers.length);
  }, [servers]);

  // Format telemetry history for charts; fallback to dynamic server averages if telemetry array is empty
  const chartData = useMemo(() => {
    if (telemetry && telemetry.length > 0) {
      return telemetry.map((item: any, idx: number) => ({
        time: item.time || item.timestamp || `T-${telemetry.length - idx}m`,
        cpu: item.cpuAverage ?? item.cpuUsage ?? dynamicCpuAvg,
        memory: item.memoryAverage ?? item.memoryUsage ?? dynamicMemAvg,
        disk: item.diskAverage ?? item.diskUsage ?? diskAverage,
      }));
    }
    // Fallback live point
    return [
      { time: 'Now', cpu: dynamicCpuAvg, memory: dynamicMemAvg, disk: diskAverage }
    ];
  }, [telemetry, dynamicCpuAvg, dynamicMemAvg, diskAverage]);

  // Handle Token Copying
  const handleCopyToken = async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTokenModalServer(null);
    };
    if (activeTokenModalServer) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTokenModalServer]);

  return (
    <div className="space-y-6 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Top Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Servers Monitored */}
        <div className="bg-white dark:bg-[#111827] p-4 border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm flex flex-col justify-between">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total Monitored</p>
          <p className="text-2xl font-mono mt-1 text-[#1A1A1A] dark:text-white font-bold">
            {totalServers} <span className="text-xs text-blue-600 dark:text-blue-400 font-sans font-normal">nodes</span>
          </p>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 font-mono">
            <span>{linuxCount} Linux</span>
            <span>{windowsCount} Windows</span>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-[#111827] p-4 border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm flex flex-col justify-between">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Health Uptime</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-2xl font-mono text-[#1A1A1A] dark:text-white font-bold">
              {uptimePercentage}<span className="text-sm text-green-600 dark:text-green-400">%</span>
            </p>
            <div className="text-[10px] space-y-0.5 font-mono text-gray-600 dark:text-gray-400 text-right">
              <span className="text-green-600 dark:text-green-400 font-bold">{healthyServersCount} Healthy</span> •{' '}
              <span className="text-amber-600 dark:text-amber-400 font-bold">{warningServersCount} Warn</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
            {criticalServersCount > 0 ? (
              <span className="text-red-600 dark:text-red-400 font-bold">{criticalServersCount} Critical attention needed</span>
            ) : (
              <span className="text-green-600 dark:text-green-400 font-bold">0 Critical nodes</span>
            )}
          </div>
        </div>

        {/* Disk Utilization Metric */}
        <div className="bg-white dark:bg-[#111827] p-4 border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm flex flex-col justify-between">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Disk Utilization</span>
            <HardDrive className="w-3.5 h-3.5 text-purple-500" />
          </p>
          <p className="text-2xl font-mono mt-1 text-purple-600 dark:text-purple-400 font-bold">
            {diskAverage}<span className="text-sm text-gray-400">%</span>
          </p>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-400 font-mono flex justify-between">
            <span>Capacity: Dynamic</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">Avg: {diskAverage}%</span>
          </div>
        </div>

        {/* Backup Health */}
        <div className="bg-white dark:bg-[#111827] p-4 border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm flex flex-col justify-between">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Backup Compliance</p>
          <p className="text-2xl font-mono mt-1 text-green-600 dark:text-green-400 font-bold">
            98.5<span className="text-sm text-gray-400">%</span>
          </p>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
            24h failures: <span className="text-red-600 dark:text-red-400 font-bold">2</span>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white dark:bg-[#111827] p-4 border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm flex flex-col justify-between">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Active Alerts</p>
          <p className="text-2xl font-mono mt-1 text-amber-600 dark:text-amber-400 font-bold">
            {activeAlerts.length}
          </p>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
            {criticalAlerts.length} Critical breaches
          </div>
        </div>

        {/* Live Activity Feed Widget */}
        <div className="lg:col-span-1 h-44">
          <RecentActivityFeed />
        </div>
      </div>

      {/* Middle Section: Real-time Performance Telemetry */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Real-Time Telemetry & Active Alert Stream
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU Usage Chart */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">CPU Load Trend</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">Avg {dynamicCpuAvg}%</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '11px', color: '#f3f4f6' }} />
                  <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Usage Chart */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Memory Allocation</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">Avg {dynamicMemAvg}%</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '11px', color: '#f3f4f6' }} />
                  <Area type="monotone" dataKey="memory" stroke="#0284c7" fill="#0284c7" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Disk Utilization Chart */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Disk Space Usage</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold">Avg {diskAverage}%</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '11px', color: '#f3f4f6' }} />
                  <Area type="monotone" dataKey="disk" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Alerts Panel */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Pending Alerts
              </span>
              
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded uppercase border border-amber-200 dark:border-amber-800">
                {activeAlerts.length} Active
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-40 pr-1">
              {activeAlerts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-mono text-[11px] py-6">
                  No pending active alerts.
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2.5 rounded-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-slate-100 font-mono">{alert.serverName}</div>
                      <div className="text-[11px] text-gray-600 dark:text-slate-300 line-clamp-1">{alert.title}</div>
                    </div>
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-sm shadow-sm transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Ack
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Server Status Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-slate-300 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Live Server Inventory Stream
          </h3>
          <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono font-bold">INTERVAL: 60s HEARTBEAT</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50 text-[10px] text-gray-500 dark:text-slate-400 uppercase font-bold border-b border-gray-200 dark:border-slate-800">
                <th className="px-4 py-2.5">Server Name</th>
                <th className="px-4 py-2.5">IP Address</th>
                <th className="px-4 py-2.5">OS</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Criticality</th>
                <th className="px-4 py-2.5">Health Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono">
              {servers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400 font-sans">
                    No servers registered in the system.
                  </td>
                </tr>
              ) : (
                servers.map((server) => (
                  <tr key={server.id} className="border-b border-gray-100 dark:border-slate-800/60 hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-slate-100">{server.name}</td>
                    <td className="px-4 text-gray-600 dark:text-slate-400">{server.ipAddress}</td>
                    <td className="px-4">
                      <span className="px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-[10px] font-bold">
                        {server.os}
                      </span>
                    </td>
                    <td className="px-4 text-gray-700 dark:text-slate-300 font-sans">{server.department}</td>
                    <td className="px-4">
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                          server.criticality === 'High'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        {server.criticality}
                      </span>
                    </td>
                    <td className="px-4">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase ${getHealthBadgeClass(server.healthStatus)}`}>
                        {server.healthStatus}
                      </span>
                    </td>
                    <td className="px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => runPingTest(server.id)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors uppercase cursor-pointer"
                        >
                          Ping
                        </button>
                        <button
                          onClick={() => setActiveTokenModalServer(server.agentToken)}
                          className="px-2.5 py-1 text-[10px] font-bold border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-sm transition-colors uppercase cursor-pointer"
                        >
                          Token
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Token Popup Modal */}
      {activeTokenModalServer && (
        <div
          onClick={() => setActiveTokenModalServer(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-6 max-w-sm w-full space-y-4 shadow-xl relative"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Bearer Agent Token
              </h4>
              <button
                onClick={() => setActiveTokenModalServer(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-gray-900 dark:bg-slate-950 text-blue-400 rounded-sm font-mono text-xs font-bold break-all border border-gray-800 dark:border-slate-800 flex items-center justify-between gap-2">
              <span>{activeTokenModalServer}</span>
              <button
                onClick={() => handleCopyToken(activeTokenModalServer)}
                className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Copy Token"
              >
                {copiedToken ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>

            <button
              onClick={() => setActiveTokenModalServer(null)}
              className="w-full py-2 bg-gray-900 dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-500 text-white rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};