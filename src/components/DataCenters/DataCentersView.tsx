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
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  Info,
  Flame,
  BatteryCharging
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
  const isOperator = user?.role === 'Operator';

  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [inspectingDc, setInspectingDc] = useState<DataCenter | null>(null);
  const [pingingDcId, setPingingDcId] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Helper to get live servers for a given DC facility
  const getDcServerList = (dc: DataCenter) => {
    return servers.filter((s) => {
      const loc = (s.location || '').toLowerCase();
      const city = (dc.city || '').toLowerCase();
      const name = (dc.name || '').toLowerCase();
      const id = (dc.id || '').toLowerCase();
      const code = (dc.code || '').toLowerCase();
      return loc.includes(city) || loc.includes(name) || loc.includes(id) || loc.includes(code);
    });
  };

  // Helper to compute live dynamic metrics for a DC
  const getDcLiveStats = (dc: DataCenter) => {
    const dcServerList = getDcServerList(dc);
    const serverCount = dcServerList.length;
    const rackCount = serverCount > 0 ? Math.ceil(serverCount / 4) : 0;
    const powerUsageKw = serverCount > 0 ? Math.round(serverCount * 2.5 * 10) / 10 : 0;
    const powerPct = dc.totalCapacityKw > 0 ? Math.round((powerUsageKw / dc.totalCapacityKw) * 100) : 0;
    const hasCritical = dcServerList.some((s) => s.healthStatus === 'Critical');
    const hasWarning = dcServerList.some((s) => s.healthStatus === 'Warning');
    const status: 'Healthy' | 'Warning' | 'Maintenance' =
      dc.status === 'Maintenance' ? 'Maintenance' : (hasCritical || hasWarning ? 'Warning' : 'Healthy');

    return {
      serverList: dcServerList,
      serverCount,
      rackCount,
      powerUsageKw,
      powerPct,
      status,
    };
  };

  // Aggregate Metrics based on live backend data
  const totalDcs = dataCenters.length;
  const dcsWithLiveServers = dataCenters.filter((d) => getDcServerList(d).length > 0).length;
  const healthyCount = dataCenters.filter((d) => getDcLiveStats(d).status === 'Healthy').length;
  const warningCount = dataCenters.filter((d) => getDcLiveStats(d).status === 'Warning').length;
  const maintCount = dataCenters.filter((d) => d.status === 'Maintenance').length;
  const totalPowerUsed = Math.round(servers.length * 2.5 * 10) / 10;
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

  const handlePingDc = async (dcId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
  const dcServers = inspectingDc ? getDcServerList(inspectingDc) : [];

  return (
    <div className="space-y-5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
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
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1 rounded-sm text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>

            <button
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1 rounded-sm text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'GRID'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Facility Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards Grid</span>
            </button>
          </div>

          <button
            onClick={handleTestAllMesh}
            disabled={isTestingAll}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-sm flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Radio className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin' : ''}`} />
            {isTestingAll ? 'Pinging All Mesh...' : 'Ping 10 Gateways'}
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

      {/* 1. SINGLE UNIFIED DATA CENTERS & REPLICATION TABLE */}
      {viewMode === 'TABLE' && (
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden transition-colors">
          <div className="p-3.5 bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-950/30 dark:to-transparent border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
                  Unified Data Center & Replication Infrastructure Matrix ({filteredDcs.length} Facilities)
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Select any facility row to inspect full telemetry, rack specifications, thermal status, and connected servers
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 shrink-0">
              Unified Matrix
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="p-3">Data Center</th>
                  <th className="p-3">Location & Tier</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Power Draw</th>
                  <th className="p-3 text-center">PUE</th>
                  <th className="p-3">Thermal & Cooling</th>
                  <th className="p-3">Replication Target Link</th>
                  <th className="p-3">WAN Latency</th>
                  <th className="p-3">Servers & Racks</th>
                  <th className="p-3">Subnet</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                {filteredDcs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-400 font-sans">
                      No Data Centers found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredDcs.map((dc) => {
                    const stats = getDcLiveStats(dc);
                    const isSelected = selectedDataCenter === dc.id;
                    const targetName =
                      dc.id === 'DC-05'
                        ? 'DC-01 (Addis Ababa)'
                        : dc.id === 'DC-10'
                        ? 'DC-03 (Hawassa)'
                        : 'DC-05 (Adama DR-1)';

                    return (
                      <tr
                        key={dc.id}
                        onClick={() => setInspectingDc(dc)}
                        className={`group cursor-pointer hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-all ${
                          isSelected ? 'bg-blue-50/40 dark:bg-blue-950/30 ring-1 ring-blue-500/50' : ''
                        }`}
                      >
                        {/* DC Code & Name */}
                        <td className="p-3 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-sm border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {dc.id}
                            </span>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                <span>{dc.name}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                                Code: {dc.code}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* City & Tier */}
                        <td className="p-3 font-sans">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{dc.city}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded-xs bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono text-[9px] font-bold">
                              {dc.tier}
                            </span>
                            <span>• {dc.region}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                              stats.status === 'Healthy'
                                ? 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                                : stats.status === 'Warning'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {stats.status}
                          </span>
                        </td>

                        {/* Power Load Bar */}
                        <td className="p-3">
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-gray-600 dark:text-gray-300 font-bold">
                                {stats.powerUsageKw} kW
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {stats.powerPct}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  stats.powerPct > 80 ? 'bg-red-500' : stats.powerPct > 65 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.max(stats.powerPct, 2)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* PUE Efficiency */}
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                            {dc.pue}
                          </span>
                        </td>

                        {/* Thermal & Cooling */}
                        <td className="p-3 font-sans">
                          <div className="flex items-center gap-1 text-gray-800 dark:text-gray-200 font-mono font-bold">
                            <Thermometer className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>{dc.temperatureC}°C</span>
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            Cooling: <span className="font-semibold">{dc.coolingStatus}</span>
                          </div>
                        </td>

                        {/* Replication Target Link (Merged) */}
                        <td className="p-3 font-sans">
                          <div className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[140px]">
                            {targetName}
                          </div>
                          <div className="text-[10px] text-green-600 dark:text-green-400 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Sync 100G
                          </div>
                        </td>

                        {/* Latency */}
                        <td className="p-3">
                          <div className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                            <Wifi className="w-3.5 h-3.5" />
                            <span>{dc.networkLatencyMs} ms</span>
                          </div>
                        </td>

                        {/* Servers & Racks */}
                        <td className="p-3 font-sans text-[11px]">
                          <span className="font-bold text-gray-900 dark:text-white">{stats.serverCount}</span> Servers •{' '}
                          <span className="text-gray-500 dark:text-gray-400">{stats.rackCount} Racks</span>
                        </td>

                        {/* Subnet */}
                        <td className="p-3 text-gray-600 dark:text-gray-400 font-mono text-[11px]">
                          {dc.ipSubnet}
                        </td>

                        {/* Details CTA */}
                        <td className="p-3 text-right font-sans">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingDc(dc);
                            }}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 group-hover:bg-blue-600 group-hover:text-white text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-sm font-bold text-[10px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. FACILITY CARDS GRID VIEW */}
      {viewMode === 'GRID' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDcs.map((dc) => {
            const stats = getDcLiveStats(dc);
            const isPinging = pingingDcId === dc.id;

            return (
              <div
                key={dc.id}
                onClick={() => setInspectingDc(dc)}
                className={`bg-white dark:bg-[#111827] border rounded-sm p-4 shadow-sm flex flex-col justify-between space-y-3.5 transition-all relative overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-md ${
                  stats.status === 'Healthy'
                    ? 'border-gray-200 dark:border-gray-800 border-t-4 border-t-green-500'
                    : stats.status === 'Warning'
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
                        stats.status === 'Healthy'
                          ? 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                          : stats.status === 'Warning'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {stats.status}
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
                      {stats.powerUsageKw} / {dc.totalCapacityKw} kW ({stats.powerPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stats.powerPct > 80 ? 'bg-red-500' : stats.powerPct > 65 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.max(stats.powerPct, 2)}%` }}
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
                    {stats.serverCount} Servers • {stats.rackCount} Racks
                  </span>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={(e) => handlePingDc(dc.id, e)}
                    disabled={isPinging}
                    className="px-2 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-sm font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Ping DC Gateway"
                  >
                    <Wifi className={`w-3 h-3 ${isPinging ? 'animate-ping' : ''}`} />
                    {isPinging ? 'Pinging...' : 'Ping Test'}
                  </button>

                  {isAdmin ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerDcFailoverSim(dc.id);
                      }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectingDc(dc);
                    }}
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
      )}

      {/* INSPECT DATA CENTER MODAL (Deep Telemetry) */}
      {inspectingDc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150 text-xs">
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                      {inspectingDc.id} — {inspectingDc.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inspectingDc.status === 'Healthy'
                          ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                          : inspectingDc.status === 'Warning'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {inspectingDc.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                    {inspectingDc.city} • {inspectingDc.region} • {inspectingDc.tier} • Subnet: {inspectingDc.ipSubnet}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingDc(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Power */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">
                    <span>Power Draw</span>
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-base font-bold font-mono text-gray-900 dark:text-white mt-1">
                    {inspectingDc.currentPowerUsageKw} / {inspectingDc.totalCapacityKw} kW
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    Load: {Math.round((inspectingDc.currentPowerUsageKw / inspectingDc.totalCapacityKw) * 100)}% Capacity
                  </div>
                </div>

                {/* Cooling */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">
                    <span>HVAC Thermal</span>
                    <Thermometer className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="text-base font-bold font-mono text-gray-900 dark:text-white mt-1">
                    {inspectingDc.temperatureC}°C
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    Status: <span className="font-semibold text-green-600 dark:text-green-400">{inspectingDc.coolingStatus}</span>
                  </div>
                </div>

                {/* Generators */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">
                    <span>Backup Gen</span>
                    <BatteryCharging className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <div className="text-base font-bold font-mono text-green-600 dark:text-green-400 mt-1 truncate">
                    {inspectingDc.backupGeneratorStatus}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    N+1 Diesel Turbines
                  </div>
                </div>

                {/* Efficiency PUE */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">
                    <span>Efficiency PUE</span>
                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                    {inspectingDc.pue}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    WAN Latency: {inspectingDc.networkLatencyMs} ms
                  </div>
                </div>
              </div>

              {/* Security & Subnet Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded border border-gray-200 dark:border-gray-700 text-[11px]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">
                    Security Classification
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1 mt-0.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600" /> {inspectingDc.securityZone}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">
                    Network Subnet & Bandwidth
                  </span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200 mt-0.5 block">
                    {inspectingDc.ipSubnet} • {inspectingDc.bandwidthGbps} Gbps
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">
                    Physical Racks & Servers
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block">
                    {inspectingDc.rackCount} High-Density Racks ({inspectingDc.serverCount} Nodes)
                  </span>
                </div>
              </div>

              {/* Maintenance Toggle & DR Controls (Role Protected) */}
              <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-amber-500" /> Facility Operational Maintenance Mode
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Maintenance mode reroutes live cluster workloads and database writes to designated hot standby DR nodes.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePingDc(inspectingDc.id)}
                    disabled={pingingDcId === inspectingDc.id}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    {pingingDcId === inspectingDc.id ? 'Pinging...' : 'Ping DC Gateway'}
                  </button>

                  {isAdmin ? (
                    <button
                      onClick={() => toggleDcMaintenance(inspectingDc.id)}
                      className={`px-3.5 py-1.5 rounded font-bold text-xs transition-colors cursor-pointer shadow-xs ${
                        inspectingDc.status === 'Maintenance'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {inspectingDc.status === 'Maintenance' ? 'Restore Operational Mode' : 'Set to Maintenance Mode'}
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center gap-1 border border-gray-200 dark:border-gray-700">
                      <Lock className="w-3.5 h-3.5 text-amber-500" /> Admin Access Required
                    </span>
                  )}
                </div>
              </div>

              {/* Monitored Servers Assigned to this Facility */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Monitored Servers Assigned ({dcServers.length})
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono">Real-time Telemetry Nodes</span>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">
                        <th className="p-2.5">Server Name</th>
                        <th className="p-2.5">IP Address</th>
                        <th className="p-2.5">OS / Type</th>
                        <th className="p-2.5">CPU / Disk</th>
                        <th className="p-2.5">Health</th>
                        <th className="p-2.5 text-right">Ping</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                      {dcServers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-gray-400 font-sans">
                            No dedicated servers mapped to this DC in demo inventory. (Servers are allocated dynamically via Server Inventory).
                          </td>
                        </tr>
                      ) : (
                        dcServers.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="p-2.5 font-bold text-gray-900 dark:text-white">{s.name}</td>
                            <td className="p-2.5 text-gray-500 dark:text-gray-400">{s.ipAddress}</td>
                            <td className="p-2.5 text-gray-700 dark:text-gray-300 font-sans">
                              {s.os} • {s.type}
                            </td>
                            <td className="p-2.5">
                              CPU: <span className="font-bold">{s.cpuUsage}%</span> • Disk: <span className="font-bold">{s.diskUsage}%</span>
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                  s.healthStatus === 'Operational'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {s.healthStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-sans">
                              <button
                                onClick={() => runPingTest(s.id)}
                                className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded cursor-pointer shadow-xs"
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

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                Facility ID: {inspectingDc.id} • Mesh Protocol Active
              </span>
              <button
                onClick={() => setInspectingDc(null)}
                className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded cursor-pointer transition-colors"
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
