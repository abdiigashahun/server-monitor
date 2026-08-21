import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { useAuth } from '../../context/AuthContext';
import { formatTimestamp } from '../../utils/formatters';
import { AuditLog, UserSession, UserRole, AuditChangeType } from '../../types';
import {
  Shield,
  Activity,
  Compass,
  FileDiff,
  Users,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Laptop,
  Globe,
  Radio,
  ArrowRight,
  Eye,
  X,
  RefreshCw,
  Sliders,
  Server,
  BellRing,
  Lock,
  LogOut,
  ChevronRight,
  Database
} from 'lucide-react';

export const UserActivityTracker: React.FC = () => {
  const { auditLogs, addAuditLog } = useMonitoring();
  const { user, activeSessions, terminateSession } = useAuth();

  const [activeTab, setActiveTab] = useState<'WHO_GETS_WHERE' | 'DO_WHAT_CHANGES' | 'ACTIVE_SESSIONS'>('WHO_GETS_WHERE');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [changeTypeFilter, setChangeTypeFilter] = useState<'ALL' | AuditChangeType>('ALL');
  const [selectedDiffLog, setSelectedDiffLog] = useState<AuditLog | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Filter logs for "Who gets where" (Page visits)
  const navigationLogs = auditLogs.filter((log) => {
    const isNav = log.changeType === 'PAGE_VISIT' || log.action.toLowerCase().includes('navigate') || log.action.toLowerCase().includes('view');
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.targetRoute && log.targetRoute.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.ipAddress.includes(searchQuery);
    const matchesRole = roleFilter === 'ALL' || log.role === roleFilter;
    return (isNav || changeTypeFilter === 'PAGE_VISIT') && matchesSearch && matchesRole;
  });

  // Filter logs for "Do what changes" (System mutations & actions)
  const changeLogs = auditLogs.filter((log) => {
    const isChange = log.changeType !== 'PAGE_VISIT';
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);
    const matchesRole = roleFilter === 'ALL' || log.role === roleFilter;
    const matchesType = changeTypeFilter === 'ALL' || log.changeType === changeTypeFilter;
    return isChange && matchesSearch && matchesRole && matchesType;
  });

  // Export helper
  const handleExport = (format: 'CSV' | 'JSON') => {
    const dataToExport = activeTab === 'WHO_GETS_WHERE' ? navigationLogs : changeLogs;
    let content = '';
    let mimeType = '';
    let filename = '';

    if (format === 'JSON') {
      content = JSON.stringify(dataToExport, null, 2);
      mimeType = 'application/json';
      filename = `itdb_audit_tracker_${activeTab.toLowerCase()}_${Date.now()}.json`;
    } else {
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Target Route', 'IP Address', 'Status', 'Details'];
      const rows = dataToExport.map((l) => [
        `"${l.timestamp}"`,
        `"${l.user}"`,
        `"${l.role}"`,
        `"${l.action}"`,
        `"${l.resource}"`,
        `"${l.targetRoute || ''}"`,
        `"${l.ipAddress}"`,
        `"${l.status}"`,
        `"${l.details.replace(/"/g, '""')}"`,
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      mimeType = 'text/csv';
      filename = `itdb_audit_tracker_${activeTab.toLowerCase()}_${Date.now()}.csv`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setExportNotice(`Exported ${dataToExport.length} tracking records as ${format}`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const getRoleBadge = (role: string) => {
    if (role === 'Admin' || role.includes('Admin')) {
      return 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    if (role === 'Operator') {
      return 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  };

  const getChangeTypeIcon = (type?: AuditChangeType) => {
    switch (type) {
      case 'PAGE_VISIT':
        return <Compass className="w-3.5 h-3.5 text-blue-500" />;
      case 'CREATE':
        return <Server className="w-3.5 h-3.5 text-emerald-500" />;
      case 'UPDATE':
        return <Sliders className="w-3.5 h-3.5 text-amber-500" />;
      case 'DELETE':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'ALERT_ACTION':
        return <BellRing className="w-3.5 h-3.5 text-indigo-500" />;
      case 'SECURITY':
      case 'AUTH':
        return <Lock className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors duration-200">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">
                Admin Activity & Change Tracking Center
              </h2>
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase border border-blue-200 dark:border-blue-800">
                Live Audit Stream
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Comprehensive telemetry tracking <strong>who navigates where</strong> and <strong>what system changes</strong> were made across Admin, Operator, and Auditor roles.
            </p>
          </div>
        </div>

        {/* Quick KPI Stat Pills */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-sm text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Page Visits</div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
              {auditLogs.filter((l) => l.changeType === 'PAGE_VISIT' || l.action.toLowerCase().includes('navigate')).length} logged
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-sm text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">System Changes</div>
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
              {auditLogs.filter((l) => l.changeType !== 'PAGE_VISIT').length} changes
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-sm text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Active Sessions</div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {activeSessions.filter((s) => s.status === 'Active').length} online
            </div>
          </div>
        </div>
      </div>

      {/* Export feedback toast */}
      {exportNotice && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 px-4 py-2.5 rounded-sm flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tab Controls & Filter Bar */}
      <div className="space-y-3">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-4 sm:space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('WHO_GETS_WHERE')}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'WHO_GETS_WHERE'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Navigation Tracker ("Who Gets Where")</span>
            <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-mono">
              {navigationLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('DO_WHAT_CHANGES')}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'DO_WHAT_CHANGES'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <FileDiff className="w-4 h-4" />
            <span>Change & Mutation History ("Do What Changes")</span>
            <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full text-[10px] font-mono">
              {changeLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ACTIVE_SESSIONS')}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ACTIVE_SESSIONS'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Active Connected Sessions</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-mono">
              {activeSessions.length}
            </span>
          </button>
        </div>

        {/* Filter Controls Bar (Visible on Tracker Tabs) */}
        {activeTab !== 'ACTIVE_SESSIONS' && (
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-3 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit trail by user, page, action, IP..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm pl-9 pr-3 py-1.5 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                Role:
              </span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="Admin">Super Admin</option>
                <option value="Operator">Operator</option>
                <option value="User">User / Auditor</option>
              </select>
            </div>

            {/* Change Type Filter (For Changes Tab) */}
            {activeTab === 'DO_WHAT_CHANGES' && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  Change Type:
                </span>
                <select
                  value={changeTypeFilter}
                  onChange={(e) => setChangeTypeFilter(e.target.value as any)}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm px-2.5 py-1.5 text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="CREATE">CREATE (New Servers)</option>
                  <option value="UPDATE">UPDATE (Thresholds & Configs)</option>
                  <option value="DELETE">DELETE (Removals)</option>
                  <option value="ALERT_ACTION">Alert Actions (Ack / Resolve)</option>
                  <option value="SECURITY">Security & API Tokens</option>
                  <option value="AUTH">Authentication Events</option>
                </select>
              </div>
            )}

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('CSV')}
                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Export current view to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleExport('JSON')}
                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Export current view to JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: WHO GETS WHERE (PAGE NAVIGATION LOGS) */}
      {activeTab === 'WHO_GETS_WHERE' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  User Journey & Route Navigation Stream
                </span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                Real-time route access telemetry
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/40 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-2.5">Access Timestamp</th>
                    <th className="px-4 py-2.5">User Profile</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Page / Module Accessed</th>
                    <th className="px-4 py-2.5">Target Hash Route</th>
                    <th className="px-4 py-2.5">Origin IP Address</th>
                    <th className="px-4 py-2.5">Device / Agent</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono">
                  {navigationLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 font-sans font-bold text-gray-900 dark:text-gray-100">
                        {log.user}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase border ${getRoleBadge(log.role)}`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-sans font-semibold text-blue-600 dark:text-blue-400">
                        {log.resource}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                          {log.targetRoute || '#/dashboard'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                        {log.ipAddress}
                      </td>
                      <td className="px-4 py-2.5 font-sans text-gray-500 dark:text-gray-400 text-[11px]">
                        {log.deviceInfo || 'Standard Web Browser'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Granted
                        </span>
                      </td>
                    </tr>
                  ))}
                  {navigationLogs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 font-sans">
                        No navigation logs found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DO WHAT CHANGES (SYSTEM MUTATION & DIFF HISTORY) */}
      {activeTab === 'DO_WHAT_CHANGES' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDiff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  System Configuration & Mutation Changelog
                </span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                Click "Inspect Diff" on any entry to review before/after state
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/40 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Action Executed</th>
                    <th className="px-4 py-2.5">Target Resource</th>
                    <th className="px-4 py-2.5">Change Details</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {changeLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-gray-100">
                        {log.user}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase border ${getRoleBadge(log.role)}`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {getChangeTypeIcon(log.changeType)}
                          <span className="font-mono text-[10px] font-bold text-gray-700 dark:text-gray-300">
                            {log.changeType || 'ACTION'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-blue-600 dark:text-blue-400">
                        {log.action}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">
                        {log.resource}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 max-w-sm truncate">
                        {log.details}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase ${
                            log.status === 'Success'
                              ? 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                              : log.status === 'Warning'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => setSelectedDiffLog(log)}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-700 dark:text-gray-200 rounded text-[11px] font-semibold flex items-center gap-1 ml-auto transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Diff</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {changeLogs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500 font-sans">
                        No system changes found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE SESSIONS */}
      {activeTab === 'ACTIVE_SESSIONS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  Live User Sessions & Online Presence
                </span>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                Admin has authority to terminate compromised or idle sessions
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.map((sess) => {
                const isCurrent = user?.username === sess.username;
                const isTerminated = sess.status === 'Terminated';

                return (
                  <div
                    key={sess.sessionId}
                    className={`border rounded-lg p-4 space-y-3 transition-all ${
                      isTerminated
                        ? 'bg-red-950/20 border-red-900/50 opacity-60'
                        : isCurrent
                        ? 'bg-blue-950/20 border-blue-600/60 shadow-sm'
                        : 'bg-white dark:bg-[#0E1522] border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isTerminated
                              ? 'bg-red-500'
                              : sess.status === 'Active'
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span className="font-bold text-xs text-gray-900 dark:text-white">
                          {sess.name}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase border ${getRoleBadge(sess.role)}`}>
                        {sess.role}
                      </span>
                    </div>

                    {/* Meta details */}
                    <div className="space-y-1.5 text-[11px] font-mono text-gray-600 dark:text-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Current Page:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[170px]">
                          {sess.currentPage}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">IP Address:</span>
                        <span>{sess.ipAddress}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Login Time:</span>
                        <span>{formatTimestamp(sess.loginTime)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Last Active:</span>
                        <span className="text-emerald-500 font-bold">{sess.lastActive}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Session ID:</span>
                        <span className="text-gray-500 text-[10px]">{sess.sessionId}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      {isCurrent ? (
                        <span className="text-[10px] text-blue-500 font-bold font-mono">
                          ★ Your Current Session
                        </span>
                      ) : isTerminated ? (
                        <span className="text-[10px] text-red-500 font-bold font-mono">
                          Session Revoked
                        </span>
                      ) : (
                        <button
                          onClick={() => terminateSession(sess.sessionId)}
                          className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Revoke Access</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* INSPECT DIFF / CHANGE DETAILS MODAL */}
      {selectedDiffLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-6 space-y-4 text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <FileDiff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Inspection: {selectedDiffLog.action}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono">
                    Target: {selectedDiffLog.resource} | {formatTimestamp(selectedDiffLog.timestamp)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDiffLog(null)}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Author Information */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-md border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Author</span>
                <p className="font-bold text-gray-900 dark:text-white">{selectedDiffLog.user}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Role</span>
                <p className="font-bold text-blue-600 dark:text-blue-400">{selectedDiffLog.role}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Origin IP</span>
                <p className="font-mono text-gray-700 dark:text-gray-300">{selectedDiffLog.ipAddress}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Category</span>
                <p className="font-mono text-amber-500">{selectedDiffLog.changeType || 'ACTION'}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Change Summary</span>
              <p className="text-xs bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200">
                {selectedDiffLog.details}
              </p>
            </div>

            {/* Before vs After State Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Previous State */}
              <div className="space-y-1">
                <span className="text-[10px] text-red-600 dark:text-red-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <span>(-) Previous State / Old Values</span>
                </span>
                <pre className="bg-red-950/20 border border-red-900/40 rounded p-3 text-[11px] font-mono text-red-300 overflow-x-auto max-h-48">
                  {selectedDiffLog.previousState
                    ? JSON.stringify(selectedDiffLog.previousState, null, 2)
                    : '// No previous state recorded'}
                </pre>
              </div>

              {/* New State */}
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <span>(+) New Applied State / Current Values</span>
                </span>
                <pre className="bg-emerald-950/20 border border-emerald-900/40 rounded p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
                  {selectedDiffLog.newState
                    ? JSON.stringify(selectedDiffLog.newState, null, 2)
                    : JSON.stringify({ status: selectedDiffLog.status, resource: selectedDiffLog.resource }, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setSelectedDiffLog(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
