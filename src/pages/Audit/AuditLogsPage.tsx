import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import * as auditApi from '../../api/audit';
import * as usersApi from '../../api/users';
import { Badge, type BadgeVariant } from '../../components/Common/Badge';
import { LoadingPanel } from '../../components/Common/Spinner';
import { EmptyState } from '../../components/Common/EmptyState';
import { ErrorState } from '../../components/Common/ErrorState';
import { Pagination } from '../../components/Common/Pagination';
import { Modal } from '../../components/Common/Modal';
import { navigate } from '../../router';
import { formatDateTime, formatTimestamp, titleCase } from '../../utils/formatters';
import {
  ScrollText,
  Filter,
  User,
  Shield,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  X,
  Activity,
  Layers,
  FileCode,
  ArrowRight,
  LogIn,
  LogOut,
  RotateCw,
  AlertOctagon,
} from 'lucide-react';
import type { AuditLog, AuditListFilters } from '../../types';

const controlClass =
  'px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

const DEFAULT_LIMIT = 10;

type AuditCategory = 'ALL' | 'USER_AUTH' | 'SYSTEM_MUTATION';

function isUserAuthAction(action: string): boolean {
  return action.startsWith('auth:') || action.includes('login') || action.includes('logout') || action.includes('refresh');
}

function actionBadgeInfo(action: string): { label: string; variant: BadgeVariant; icon: React.ElementType } {
  if (action === 'auth:login') return { label: 'Login', variant: 'success', icon: LogIn };
  if (action === 'auth:login_failed') return { label: 'Login Failed', variant: 'danger', icon: AlertOctagon };
  if (action === 'auth:logout') return { label: 'Logout', variant: 'neutral', icon: LogOut };
  if (action === 'auth:refresh' || action === 'auth:refresh_failed') return { label: 'Token Refresh', variant: 'info', icon: RotateCw };
  if (action.includes('delete') || action.includes('remove')) return { label: titleCase(action), variant: 'danger', icon: Shield };
  if (action.includes('create') || action.includes('add')) return { label: titleCase(action), variant: 'success', icon: Layers };
  if (action.includes('write') || action.includes('update')) return { label: titleCase(action), variant: 'purple', icon: Activity };
  return { label: titleCase(action), variant: 'info', icon: ScrollText };
}

export const AuditLogsPage: React.FC = () => {
  const [category, setCategory] = useState<AuditCategory>('ALL');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('');
  const [filters, setFilters] = useState<AuditListFilters>({ page: 1, limit: DEFAULT_LIMIT });
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch users for the user filter dropdown
  const { data: usersData } = useApi(() => usersApi.list({}), []);
  const usersList = usersData?.users ?? [];

  // Update filters when search or dropdowns change
  useEffect(() => {
    const t = window.setTimeout(
      () =>
        setFilters((f) => ({
          ...f,
          action: actionFilter || undefined,
          targetType: targetTypeFilter || undefined,
          userId: selectedUserFilter || undefined,
          page: 1,
        })),
      200,
    );
    return () => window.clearTimeout(t);
  }, [actionFilter, targetTypeFilter, selectedUserFilter]);

  const { data, loading, error, reload } = useApi(
    () => auditApi.list(filters),
    [JSON.stringify(filters)],
  );
  const rawLogs = data?.auditLogs ?? [];
  const pagination = data?.pagination;

  // Filter logs by category (User Activity vs System Mutations) and free-text search
  const filteredLogs = useMemo(() => {
    let result = rawLogs;

    if (category === 'USER_AUTH') {
      result = result.filter((l) => isUserAuthAction(l.action));
    } else if (category === 'SYSTEM_MUTATION') {
      result = result.filter((l) => !isUserAuthAction(l.action));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) => {
        const actorMatch = (l.user?.name || '').toLowerCase().includes(q) || (l.user?.email || '').toLowerCase().includes(q);
        const actionMatch = l.action.toLowerCase().includes(q);
        const targetTypeMatch = l.targetType.toLowerCase().includes(q);
        const targetIdMatch = (l.targetId || '').toLowerCase().includes(q);
        const metaMatch = l.metadata ? JSON.stringify(l.metadata).toLowerCase().includes(q) : false;
        return actorMatch || actionMatch || targetTypeMatch || targetIdMatch || metaMatch;
      });
    }

    return result;
  }, [rawLogs, category, search]);

  const setDate = (key: 'from' | 'to', value: string, endOfDay: boolean) =>
    setFilters((f) => ({
      ...f,
      [key]: value ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z` : undefined,
      page: 1,
    }));

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setTargetTypeFilter('');
    setSelectedUserFilter('');
    setCategory('ALL');
    setFilters({ page: 1, limit: DEFAULT_LIMIT });
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    actionFilter !== '' ||
    targetTypeFilter !== '' ||
    selectedUserFilter !== '' ||
    filters.from !== undefined ||
    filters.to !== undefined ||
    category !== 'ALL';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-blue-600" />
            Audit Logs
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Immutable audit trail of user sessions, authentication events, and administrative system mutations.
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Total recorded events: <strong>{pagination?.total ?? rawLogs.length}</strong>
        </div>
      </div>

      {/* Category Tabs: All vs User Activity vs System Mutations */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
        <button
          onClick={() => setCategory('ALL')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            category === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          All Audit Logs
        </button>

        <button
          onClick={() => setCategory('USER_AUTH')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            category === 'USER_AUTH'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <User className="w-3.5 h-3.5 text-blue-400" />
          User & Auth Activity
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
            Logins / Logouts
          </span>
        </button>

        <button
          onClick={() => setCategory('SYSTEM_MUTATION')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            category === 'SYSTEM_MUTATION'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          System & Admin Mutations
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
            CRUD & Config
          </span>
        </button>
      </div>

      {/* Search & Filter Card */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-gray-100">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Filter Audit Trail
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, actor, target ID, metadata…"
              className={`${controlClass} w-full pl-9 pr-7 text-xs`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Dropdown */}
          <select
            className={`${controlClass} text-xs`}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <optgroup label="Authentication & Session">
              <option value="auth:login">auth:login</option>
              <option value="auth:login_failed">auth:login_failed</option>
              <option value="auth:logout">auth:logout</option>
              <option value="auth:refresh">auth:refresh</option>
            </optgroup>
            <optgroup label="Servers">
              <option value="servers:create">servers:create</option>
              <option value="servers:update">servers:update</option>
              <option value="servers:delete">servers:delete</option>
              <option value="servers:rotate-token">servers:rotate-token</option>
            </optgroup>
            <optgroup label="Users">
              <option value="users:create">users:create</option>
              <option value="users:update">users:update</option>
              <option value="users:delete">users:delete</option>
            </optgroup>
            <optgroup label="Thresholds & Alerts">
              <option value="thresholds:create">thresholds:create</option>
              <option value="thresholds:update">thresholds:update</option>
              <option value="thresholds:delete">thresholds:delete</option>
              <option value="alerts:acknowledge">alerts:acknowledge</option>
              <option value="alerts:resolve">alerts:resolve</option>
            </optgroup>
            <optgroup label="Reports">
              <option value="reports:download">reports:download</option>
            </optgroup>
          </select>

          {/* Target Type Dropdown */}
          <select
            className={`${controlClass} text-xs`}
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
          >
            <option value="">All Target Types</option>
            <option value="auth">auth</option>
            <option value="server">server</option>
            <option value="user">user</option>
            <option value="threshold">threshold</option>
            <option value="alert">alert</option>
            <option value="report">report</option>
          </select>

          {/* Actor User Dropdown */}
          {usersList.length > 0 && (
            <select
              className={`${controlClass} text-xs`}
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
            >
              <option value="">All Actors</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          )}

          {/* Date from */}
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            From
            <input
              type="date"
              className={`${controlClass} text-xs py-1.5`}
              value={filters.from ? filters.from.slice(0, 10) : ''}
              onChange={(e) => setDate('from', e.target.value, false)}
            />
          </label>

          {/* Date to */}
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            To
            <input
              type="date"
              className={`${controlClass} text-xs py-1.5`}
              value={filters.to ? filters.to.slice(0, 10) : ''}
              onChange={(e) => setDate('to', e.target.value, true)}
            />
          </label>
        </div>
      </div>

      {/* Body: Audit Logs Table */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <LoadingPanel label="Loading audit trail entries…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit entries"
            message={
              hasActiveFilters
                ? 'No audit records match your current filters.'
                : 'No audit logs recorded yet.'
            }
            action={
              hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Reset filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Actor / User</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">Request Context</th>
                  <th className="px-4 py-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredLogs.map((log) => {
                  const isAuth = isUserAuthAction(log.action);
                  const actionInfo = actionBadgeInfo(log.action);
                  const ActionIcon = actionInfo.icon;
                  const method = (log.metadata?.method as string) || '';
                  const path = (log.metadata?.path as string) || '';
                  const statusCode = log.metadata?.statusCode as number | undefined;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {formatTimestamp(log.createdAt)}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {formatDateTime(log.createdAt)}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <Badge variant={isAuth ? 'info' : 'purple'}>
                          {isAuth ? 'User Activity' : 'System Mutation'}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <Badge variant={actionInfo.variant}>
                          <ActionIcon className="w-3 h-3" />
                          {log.action}
                        </Badge>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {log.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate">
                                {log.user.name}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                {log.user.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-mono">
                            <Shield className="w-3 h-3 text-gray-400" />
                            System / Automated
                          </span>
                        )}
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {log.targetType}
                          </span>
                        </div>
                        {log.targetId && (
                          <div className="text-[11px] text-gray-400 font-mono truncate max-w-[160px] mt-0.5" title={log.targetId}>
                            {log.targetId}
                          </div>
                        )}
                      </td>

                      {/* Request Context */}
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {method ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded ${
                                method === 'POST'
                                  ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                                  : method === 'PATCH'
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                    : method === 'DELETE'
                                      ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                                      : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {method}
                            </span>
                            <span className="text-gray-500 truncate max-w-[130px]" title={path}>
                              {path || '—'}
                            </span>
                            {statusCode && (
                              <span
                                className={`text-[10px] px-1 rounded ${
                                  statusCode >= 200 && statusCode < 300
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {statusCode}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Details button */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelected(log)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                        >
                          Details <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination: 10 items max per page */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-3 border-t border-gray-200 dark:border-gray-800">
            <Pagination
              pagination={pagination}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </div>
        )}
      </div>

      {/* Rich Detail Modal */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Audit Event Details"
        subtitle={selected ? `${selected.action} • Log ID: ${selected.id.slice(0, 8)}…` : undefined}
        size="lg"
        footer={
          selected ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {selected.targetType === 'server' && selected.targetId && (
                  <button
                    onClick={() => {
                      const id = selected.targetId;
                      setSelected(null);
                      navigate('servers', id);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Go to Target Server
                  </button>
                )}
                {selected.targetType === 'user' && selected.targetId && (
                  <button
                    onClick={() => {
                      setSelected(null);
                      navigate('users');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Go to Users
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Header info banner */}
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Badge variant={actionBadgeInfo(selected.action).variant}>
                  {selected.action}
                </Badge>
                <Badge variant={isUserAuthAction(selected.action) ? 'info' : 'purple'}>
                  {isUserAuthAction(selected.action) ? 'User Activity' : 'System Mutation'}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {formatDateTime(selected.createdAt)} ({formatTimestamp(selected.createdAt)})
              </div>
            </div>

            {/* Grid for Actor & Target */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Actor Card */}
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Actor Profile
                </div>
                {selected.user ? (
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {selected.user.name}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 font-mono">
                      {selected.user.email}
                    </div>
                    {selected.userId && (
                      <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1 pt-1">
                        <span>ID: {selected.userId}</span>
                        <button
                          onClick={() => copyText(selected.userId!, 'actor-id')}
                          className="hover:text-blue-600 cursor-pointer"
                        >
                          {copiedId === 'actor-id' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                    System / Automated background process
                  </div>
                )}
              </div>

              {/* Target Card */}
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Target Resource
                </div>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-gray-400">Type: </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono uppercase">
                      {selected.targetType}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Target ID: </span>
                    <span className="font-mono text-gray-800 dark:text-gray-200 break-all">
                      {selected.targetId || '—'}
                    </span>
                    {selected.targetId && (
                      <button
                        onClick={() => copyText(selected.targetId!, 'target-id')}
                        className="ml-1.5 text-gray-400 hover:text-blue-600 cursor-pointer inline-flex items-center"
                      >
                        {copiedId === 'target-id' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-400">Audit Log ID: </span>
                    <span className="font-mono text-gray-500 text-[11px] break-all">{selected.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Request & Metadata Context */}
            <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-blue-600" />
                  Payload & Metadata Context
                </div>
                {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                  <button
                    onClick={() => copyText(JSON.stringify(selected.metadata, null, 2), 'meta-json')}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {copiedId === 'meta-json' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    Copy JSON
                  </button>
                )}
              </div>

              {selected.metadata && Object.keys(selected.metadata).length > 0 ? (
                <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 rounded-md p-3 max-h-60 overflow-y-auto text-gray-800 dark:text-gray-200">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No additional metadata payload.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
