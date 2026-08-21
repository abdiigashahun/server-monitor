import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { RecentActivityFeed } from '../Activity/RecentActivityFeed';
import { getHealthBadgeClass, getSeverityBadgeClass } from '../../utils/formatters';
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
} from 'recharts';
import {
  Server,
  Activity,
  ShieldAlert,
  Database,
  Terminal,
  Key,
  CheckCircle2,
  AlertTriangle,
  Play,
  Building2,
  Zap,
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const {
    servers,
    alerts,
    telemetry,
    runPingTest,
    generateAgentToken,
    acknowledgeAlert,
    dataCenters,
    selectedDataCenter,
    setSelectedDataCenter,
  } = useMonitoring();

  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [activeTokenModalServer, setActiveTokenModalServer] = useState<string | null>(null);

  const totalServers = 120;
  const linuxCount = 70;
  const windowsCount = 50;

  const visibleAlerts = alerts.filter((a) => {
    if (!isAdmin && (
      a.title.includes('Issue Resolved') ||
      a.title.includes('Operator Action') ||
      a.title.includes('Resolved by Operator') ||
      a.description.includes('Operator')
    )) {
      return false;
    }
    return true;
  });

  const activeAlerts = visibleAlerts.filter((a) => a.status === 'Active');
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'Critical');

  const healthyServersCount = servers.filter((s) => s.healthStatus === 'Operational').length;
  const warningServersCount = servers.filter((s) => s.healthStatus === 'Warning').length;
  const criticalServersCount = servers.filter((s) => s.healthStatus === 'Critical').length;

  return (
    <div className="space-y-6 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Top Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              96<span className="text-sm text-green-600 dark:text-green-400">%</span>
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

        {/* Live Activity Feed Widget in Top Row */}
        <div className="lg:col-span-1 h-44">
          <RecentActivityFeed />
        </div>
      </div>

      {/* 10 Data Center Infrastructure Status Strip */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm space-y-2.5 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              10 Data Centers Multi-Site Telemetry Strip
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
            Click any DC to filter portal view
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 font-mono text-[10px]">
          {dataCenters.map((dc) => {
            const isSelected = selectedDataCenter === dc.id;

            return (
              <button
                key={dc.id}
                onClick={() => setSelectedDataCenter(isSelected ? 'ALL' : dc.id)}
                className={`p-2 rounded-sm border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-600 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500'
                    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-700 dark:text-gray-300'
                }`}
                title={`${dc.name} (${dc.city}) - Click to filter`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{dc.code}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dc.status === 'Healthy'
                        ? 'bg-green-500'
                        : dc.status === 'Warning'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                  />
                </div>
                <div className="text-[9px] font-sans truncate text-gray-500 dark:text-gray-400">{dc.city}</div>
                <div className="text-[10px] font-bold text-gray-900 dark:text-white">{dc.currentPowerUsageKw}kW</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle Section: Real-time Performance Telemetry */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Real-Time Telemetry & Active Alert Stream
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CPU Usage Chart */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">CPU Load Trend</span>
              <span className="text-[10px] text-red-600 dark:text-red-400 font-mono font-bold">85% Limit</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetry} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '11px', color: '#f3f4f6' }} />
                  <Area type="monotone" dataKey="cpuAverage" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="cpuHighCritical" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Usage Chart */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Memory Allocation</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">Avg 68%</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetry} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '11px', color: '#f3f4f6' }} />
                  <Area type="monotone" dataKey="memoryAverage" stroke="#0284c7" fill="#0284c7" fillOpacity={0.2} />
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
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs"
                >

                  <div>
                    <div className="font-bold text-gray-900 dark:text-white font-mono">{alert.serverName}</div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-1">{alert.title}</div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-sm shadow-sm transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Ack
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Server Status Table */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm flex flex-col overflow-hidden transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-200">
              Live Server Inventory Stream
            </h3>
            {selectedDataCenter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">
                Filtered: {selectedDataCenter}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono font-bold">INTERVAL: 60s HEARTBEAT</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-2.5">Server Name</th>
                <th className="px-4 py-2.5">IP Address</th>
                <th className="px-4 py-2.5">Facility / Location</th>
                <th className="px-4 py-2.5">OS</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Health Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono">
              {(selectedDataCenter === 'ALL'
                ? servers
                : servers.filter(
                    (s) =>
                      s.location.includes(selectedDataCenter) ||
                      (dataCenters.find((d) => d.id === selectedDataCenter)?.name &&
                        s.location.includes(dataCenters.find((d) => d.id === selectedDataCenter)!.name))
                  )
              ).map((server) => (
                <tr key={server.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{server.name}</td>
                  <td className="px-4 text-gray-600 dark:text-gray-300">{server.ipAddress}</td>
                  <td className="px-4 text-gray-600 dark:text-gray-300 font-sans">
                    <span className="px-1.5 py-0.5 rounded-xs bg-gray-100 dark:bg-gray-800 text-[10px] font-mono text-blue-600 dark:text-blue-400">
                      {server.location}
                    </span>
                  </td>
                  <td className="px-4">
                    <span className="px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                      {server.os}
                    </span>
                  </td>
                  <td className="px-4 text-gray-700 dark:text-gray-300 font-sans">{server.department}</td>
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
                        className="px-2.5 py-1 text-[10px] font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-sm transition-colors uppercase cursor-pointer"
                      >
                        Token
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Token Popup Modal */}
      {activeTokenModalServer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-6 max-w-sm w-full space-y-4 shadow-xl text-gray-900 dark:text-gray-100 animate-in fade-in zoom-in duration-150">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Bearer Agent Token
            </h4>
            <div className="p-3 bg-gray-900 text-blue-400 rounded-sm font-mono text-xs font-bold break-all border border-gray-800">
              {activeTokenModalServer}
            </div>
            <button
              onClick={() => setActiveTokenModalServer(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
