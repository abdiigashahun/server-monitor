import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { DataCenter, DataCenterStatus } from '../../types';
import {
  Building2,
  Server,
  Zap,
  Activity,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Wifi,
  Thermometer,
  Droplets,
  Shield,
  Layers,
  ArrowRightLeft,
  Wrench,
  ExternalLink,
  X,
  Radio,
  Clock,
  Check,
  Lock,
} from 'lucide-react';

export const DataCentersView: React.FC = () => {
  const {
    dataCenters,
    servers,
    toggleDcMaintenance,
    runDcHealthTest,
    triggerDcFailoverSim,
    runPingTest,
    selectedDataCenter,
    setSelectedDataCenter,
  } = useMonitoring();

  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [inspectingDc, setInspectingDc] = useState<DataCenter | null>(null);
  const [pingingDcId, setPingingDcId] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Aggregate Metrics
  const totalDcs = dataCenters.length;
  const healthyCount = dataCenters.filter((d) => d.status === 'Healthy').length;
  const warningCount = dataCenters.filter((d) => d.status === 'Warning').length;
  const maintCount = dataCenters.filter((d) => d.status === 'Maintenance').length;
  const totalPowerUsed = dataCenters.reduce((acc, d) => acc + d.currentPowerUsageKw, 0);
  const totalPowerCap = dataCenters.reduce((acc, d) => acc + d.totalCapacityKw, 0);
  const avgPue = (dataCenters.reduce((acc, d) => acc + d.pue, 0) / totalDcs).toFixed(2);
  const avgLatency = (dataCenters.reduce((acc, d) => acc + d.networkLatencyMs, 0) / totalDcs).toFixed(1);

  // Filtered DCs
  const filteredDcs = dataCenters.filter((dc) => {
    const matchesSearch =
      dc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dc.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dc.ipSubnet.includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || dc.status === statusFilter;
    const matchesTier = tierFilter === 'ALL' || dc.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const handlePingDc = async (dcId: string) => {
    setPingingDcId(dcId);
    await runDcHealthTest(dcId);
    setPingingDcId(null);
  };

  const handleTestAllMesh = async () => {
    setIsTestingAll(true);
    for (const dc of dataCenters) {
      await runDcHealthTest(dc.id);
    }
    setIsTestingAll(false);
  };

  // Get servers for inspected DC
  const dcServers = inspectingDc
    ? servers.filter((s) => s.location.includes(inspectingDc.name) || s.location.includes(inspectingDc.id) || s.location.includes(inspectingDc.code))
    : [];

  return (
    <div className="space-y-6 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Top Banner Control */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                10-Data Center Unified Control Hub
              </h2>
              <span className="px-2 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                10 Active Facilities
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Live power telemetry, environmental thermal matrix, inter-DC replication mesh, and disaster recovery controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTestAllMesh}
            disabled={isTestingAll}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-sm flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Radio className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin' : ''}`} />
            {isTestingAll ? 'Pinging All Mesh...' : 'Ping All 10 DC Gateways'}
          </button>
        </div>
      </div>

      {/* Aggregate Multi-DC Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Total Data Centers */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              Total Facilities
            </span>
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">
            {totalDcs} <span className="text-xs text-gray-500 font-sans font-normal">DCs</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-mono flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400 font-bold">{healthyCount} Healthy</span> •{' '}
            <span className="text-amber-600 dark:text-amber-400 font-bold">{warningCount + maintCount} Attention</span>
          </div>
        </div>

        {/* Total Power Load */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              Total Power Load
            </span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {totalPowerUsed.toLocaleString()} <span className="text-xs text-gray-500 font-sans font-normal">kW</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-mono">
            Cap: {totalPowerCap.toLocaleString()} kW ({((totalPowerUsed / totalPowerCap) * 100).toFixed(1)}% Load)
          </div>
        </div>

        {/* Aggregate PUE */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              Avg Efficiency (PUE)
            </span>
            <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400 mt-1">
            {avgPue} <span className="text-xs font-sans font-normal text-green-700 dark:text-green-300">PUE</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-mono">
            Target: &lt; 1.35 (Green DC Standard)
          </div>
        </div>

        {/* Inter-DC Latency */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              WAN Mesh Latency
            </span>
            <Wifi className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {avgLatency} <span className="text-xs text-gray-500 font-sans font-normal">ms</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-mono">
            High-Speed Gov Dark Fiber Link
          </div>
        </div>

        {/* Disaster Recovery Status */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              DR Hot Failover
            </span>
            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400 mt-1">
            2 Sites <span className="text-xs text-gray-500 font-sans font-normal">Ready</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-mono">
            Adama (DR-1) & Arba Minch (DR-2)
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3.5 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs transition-colors">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by DC name, code (ADD-01), city, subnet (10.200.x)..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm pl-9 pr-3 py-1.5 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Healthy">Healthy (Optimal)</option>
            <option value="Warning">Warning State</option>
            <option value="Maintenance">Maintenance Mode</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Tiers</option>
            <option value="Tier IV">Tier IV Mission Critical</option>
            <option value="Tier III">Tier III Enterprise</option>
          </select>

          {(searchQuery || statusFilter !== 'ALL' || tierFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setTierFilter('ALL');
              }}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
              title="Reset filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 10 Data Center Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredDcs.map((dc) => {
          const powerPct = Math.round((dc.currentPowerUsageKw / dc.totalCapacityKw) * 100);
          const isPinging = pingingDcId === dc.id;

          return (
            <div
              key={dc.id}
              className={`bg-white dark:bg-[#111827] border rounded-sm p-4 shadow-sm flex flex-col justify-between space-y-3.5 transition-all relative overflow-hidden ${
                dc.status === 'Healthy'
                  ? 'border-gray-200 dark:border-gray-800 border-t-4 border-t-green-500'
                  : dc.status === 'Warning'
                  ? 'border-gray-200 dark:border-gray-800 border-t-4 border-t-amber-500'
                  : 'border-gray-200 dark:border-gray-800 border-t-4 border-t-blue-500 opacity-90'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-sm border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400">
                      {dc.id}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {dc.code}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold">
                      {dc.tier}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                      dc.status === 'Healthy'
                        ? 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                        : dc.status === 'Warning'
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {dc.status}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-gray-900 dark:text-white mt-2 flex items-center justify-between">
                  <span>{dc.name}</span>
                  <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400 font-sans">
                    {dc.city}
                  </span>
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {dc.primaryRole}
                </p>
              </div>

              {/* Power Utilization Bar */}
              <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-600 dark:text-gray-300 font-semibold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Facility Power Draw
                  </span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {dc.currentPowerUsageKw} / {dc.totalCapacityKw} kW ({powerPct}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      powerPct > 80 ? 'bg-red-500' : powerPct > 65 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${powerPct}%` }}
                  />
                </div>
              </div>

              {/* Facility Telemetry Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 rounded-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                    <Thermometer className="w-3 h-3 text-red-500" /> Temp
                  </div>
                  <div className="font-mono font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                    {dc.temperatureC}°C
                  </div>
                </div>

                <div className="p-2 rounded-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                    <Activity className="w-3 h-3 text-green-500" /> PUE
                  </div>
                  <div className="font-mono font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                    {dc.pue}
                  </div>
                </div>

                <div className="p-2 rounded-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                    <Wifi className="w-3 h-3 text-blue-500" /> Latency
                  </div>
                  <div className="font-mono font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                    {dc.networkLatencyMs} ms
                  </div>
                </div>
              </div>

              {/* Subnet & Infrastructure Info */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                <span>Subnet: {dc.ipSubnet}</span>
                <span className="font-sans font-semibold text-gray-700 dark:text-gray-300">
                  {dc.serverCount} Servers • {dc.rackCount} Racks
                </span>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => handlePingDc(dc.id)}
                  disabled={isPinging}
                  className="px-2 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-sm font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Ping DC Gateway"
                >
                  <Wifi className={`w-3 h-3 ${isPinging ? 'animate-ping' : ''}`} />
                  {isPinging ? 'Pinging...' : 'Ping Test'}
                </button>

                {isAdmin ? (
                  <button
                    onClick={() => triggerDcFailoverSim(dc.id)}
                    className="px-2 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-sm font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Run Disaster Recovery Failover simulation"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    DR Drill
                  </button>
                ) : (
                  <span
                    className="px-2 py-1.5 bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800 rounded-sm font-semibold text-[10px] flex items-center justify-center gap-1 cursor-not-allowed opacity-60"
                    title="DR drills restricted to Super Admin"
                  >
                    <Lock className="w-3 h-3 text-amber-500" />
                    Admin
                  </span>
                )}

                <button
                  onClick={() => setInspectingDc(dc)}
                  className="px-2 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-sm font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  Inspect
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inter-DC Replication & Latency Mesh Matrix */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm space-y-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
              10-Data Center Inter-Facility High-Speed Sync Mesh
            </h3>
          </div>
          <span className="text-[10px] font-mono text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Replication Link Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                <th className="p-2.5">Origin DC</th>
                <th className="p-2.5">Role / Region</th>
                <th className="p-2.5">Primary Target Link</th>
                <th className="p-2.5">Link Protocol</th>
                <th className="p-2.5">WAN Latency</th>
                <th className="p-2.5">Replication State</th>
                <th className="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
              {dataCenters.map((dc) => {
                const targetName =
                  dc.id === 'DC-05'
                    ? 'DC-01 (Addis Ababa Central)'
                    : dc.id === 'DC-10'
                    ? 'DC-03 (Hawassa Industrial)'
                    : 'DC-05 (Adama DR-1 Standby)';

                return (
                  <tr key={dc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="p-2.5 font-bold text-gray-900 dark:text-white">
                      {dc.id} - {dc.name}
                    </td>
                    <td className="p-2.5 font-sans text-gray-600 dark:text-gray-300">{dc.region}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400">{targetName}</td>
                    <td className="p-2.5 text-gray-500 dark:text-gray-400">IPsec / BGP Mesh (100G)</td>
                    <td className="p-2.5 text-gray-800 dark:text-gray-200 font-bold">{dc.networkLatencyMs} ms</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-sm bg-green-50 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-[10px] font-bold">
                        Synchronized
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-sans">
                      <button
                        onClick={() => triggerDcFailoverSim(dc.id)}
                        className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Drill Test
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Data Center Modal */}
      {inspectingDc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150 text-xs">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                    {inspectingDc.id} — {inspectingDc.name}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                    {inspectingDc.city} • {inspectingDc.region} • {inspectingDc.tier} Facility
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingDc(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Power Draw</span>
                  <div className="text-base font-bold font-mono text-gray-900 dark:text-white mt-1">
                    {inspectingDc.currentPowerUsageKw} / {inspectingDc.totalCapacityKw} kW
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Cooling & Temp</span>
                  <div className="text-base font-bold font-mono text-gray-900 dark:text-white mt-1">
                    {inspectingDc.temperatureC}°C ({inspectingDc.coolingStatus})
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Generators</span>
                  <div className="text-base font-bold font-mono text-green-600 dark:text-green-400 mt-1">
                    {inspectingDc.backupGeneratorStatus}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Security Zone</span>
                  <div className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                    {inspectingDc.securityZone}
                  </div>
                </div>
              </div>

              {/* Maintenance toggle & actions */}
              <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white">Facility Operational Mode</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Switching to Maintenance mode temporarily routes failover workloads to secondary DR sites.
                  </p>
                </div>

                {isAdmin ? (
                  <button
                    onClick={() => toggleDcMaintenance(inspectingDc.id)}
                    className={`px-3 py-1.5 rounded-sm font-bold text-xs transition-colors cursor-pointer ${
                      inspectingDc.status === 'Maintenance'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {inspectingDc.status === 'Maintenance' ? 'Restore to Operational' : 'Set to Maintenance Mode'}
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-500" /> Admin Role Required
                  </span>
                )}
              </div>

              {/* Servers in this DC */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Monitored Servers in this Facility ({dcServers.length})
                </h4>

                <div className="border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">
                        <th className="p-2">Server Name</th>
                        <th className="p-2">IP Address</th>
                        <th className="p-2">OS</th>
                        <th className="p-2">Health</th>
                        <th className="p-2 text-right">Ping</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                      {dcServers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400 font-sans">
                            No standalone servers assigned yet. Use Server Inventory to add servers to this DC.
                          </td>
                        </tr>
                      ) : (
                        dcServers.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="p-2 font-bold text-gray-900 dark:text-white">{s.name}</td>
                            <td className="p-2 text-gray-500 dark:text-gray-400">{s.ipAddress}</td>
                            <td className="p-2 text-gray-700 dark:text-gray-300">{s.os}</td>
                            <td className="p-2">
                              <span className="text-green-600 dark:text-green-400 font-bold">{s.healthStatus}</span>
                            </td>
                            <td className="p-2 text-right font-sans">
                              <button
                                onClick={() => runPingTest(s.id)}
                                className="px-2 py-0.5 bg-blue-600 text-white font-bold text-[10px] rounded-sm cursor-pointer"
                              >
                                Ping
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setInspectingDc(null)}
                className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-sm cursor-pointer transition-colors"
              >
                Close Facility Overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
