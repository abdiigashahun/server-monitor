import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import * as serversApi from '../../api/servers';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { navigate } from '../../router';
import { ApiError } from '../../api/client';
import { Badge } from '../Common/Badge';
import { LoadingPanel } from '../Common/Spinner';
import { EmptyState } from '../Common/EmptyState';
import { ErrorState } from '../Common/ErrorState';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import { VerificationBadge } from '../Servers/VerificationBadge';
import { ServerForm } from '../Servers/ServerForm';
import { AgentTokenModal } from '../Servers/AgentTokenModal';
import { criticalityVariant } from '../../utils/formatters';
import {
  Plus,
  Search,
  Server as ServerIcon,
  Pencil,
  Trash2,
  KeyRound,
  Layers,
  RotateCcw,
} from 'lucide-react';
import type { Server, ServerListFilters, Criticality, ServerOS, VerificationStatus } from '../../types';

const controlClass =
  'px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

export const ServerInventoryView: React.FC = () => {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can('servers:write');

  const [search, setSearch] = useState('');
  const [locationText, setLocationText] = useState('');
  const [departmentText, setDepartmentText] = useState('');
  const [filters, setFilters] = useState<ServerListFilters>({});

  useEffect(() => {
    const t = window.setTimeout(
      () =>
        setFilters((f) => ({
          ...f,
          name: search.trim() || undefined,
          location: locationText.trim() || undefined,
          department: departmentText.trim() || undefined,
        })),
      300,
    );
    return () => window.clearTimeout(t);
  }, [search, locationText, departmentText]);

  const { data, loading, error, reload } = useApi(
    () => serversApi.list(filters),
    [JSON.stringify(filters)],
  );
  const servers = data?.servers ?? [];

  // Candidate parent groups for the "children of" filter (single-level grouping).
  const { data: rootsData } = useApi(() => serversApi.list({ rootsOnly: true }), []);
  const groupOptions = (rootsData?.servers ?? []).filter((s) => s.childCount > 0);

  // Form + modals state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [tokenModal, setTokenModal] = useState<{ token: string; name: string; ctx: 'create' | 'rotate' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null);
  const [rotateTarget, setRotateTarget] = useState<Server | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (server: Server) => {
    setEditing(server);
    setFormOpen(true);
  };

  const handleSaved = (saved: Server, agentToken?: string | null) => {
    setFormOpen(false);
    toast.success(editing ? 'Server updated' : 'Server created', saved.name);
    setEditing(null);
    reload();
    if (agentToken) {
      setTokenModal({ token: agentToken, name: saved.name, ctx: 'create' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await serversApi.remove(deleteTarget.id);
      toast.success('Server removed', deleteTarget.name);
      reload();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleteTarget(null);
    }
  };

  const confirmRotate = async () => {
    if (!rotateTarget) return;
    try {
      const { agentToken } = await serversApi.rotateToken(rotateTarget.id);
      setTokenModal({ token: agentToken, name: rotateTarget.name, ctx: 'rotate' });
      reload();
    } catch (err) {
      toast.error('Rotation failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setRotateTarget(null);
    }
  };

  const setFilter = <K extends keyof ServerListFilters>(key: K, value: ServerListFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ServerIcon className="w-5 h-5 text-blue-600" />
            Server Inventory
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {data ? `${servers.length} server${servers.length === 1 ? '' : 's'}` : 'Registered infrastructure'}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add server
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className={`${controlClass} w-full pl-9`}
          />
        </div>
        <input
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          placeholder="Location…"
          className={controlClass}
        />
        <input
          value={departmentText}
          onChange={(e) => setDepartmentText(e.target.value)}
          placeholder="Department…"
          className={controlClass}
        />
        <select
          className={controlClass}
          value={filters.criticality ?? ''}
          onChange={(e) => setFilter('criticality', (e.target.value || undefined) as Criticality)}
        >
          <option value="">All criticality</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select
          className={controlClass}
          value={filters.os ?? ''}
          onChange={(e) => setFilter('os', (e.target.value || undefined) as ServerOS)}
        >
          <option value="">All OS</option>
          <option value="LINUX">Linux</option>
          <option value="WINDOWS">Windows</option>
        </select>
        <select
          className={controlClass}
          value={filters.verificationStatus ?? ''}
          onChange={(e) =>
            setFilter('verificationStatus', (e.target.value || undefined) as VerificationStatus)
          }
        >
          <option value="">All verification</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending</option>
          <option value="NOT_REQUIRED">No agent</option>
        </select>
        <select
          className={controlClass}
          value={filters.expectsAgent === undefined ? '' : filters.expectsAgent ? 'yes' : 'no'}
          onChange={(e) => {
            const v = e.target.value;
            setFilters((f) => ({ ...f, expectsAgent: v === '' ? undefined : v === 'yes' }));
          }}
        >
          <option value="">All agents</option>
          <option value="yes">Expects agent</option>
          <option value="no">No agent</option>
        </select>
        {groupOptions.length > 0 && (
          <select
            className={controlClass}
            value={filters.parentServerId ?? ''}
            onChange={(e) => {
              const v = e.target.value || undefined;
              setFilters((f) => ({
                ...f,
                parentServerId: v,
                rootsOnly: v ? undefined : f.rootsOnly,
              }));
            }}
          >
            <option value="">All groups</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                Children of {g.name}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 px-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.rootsOnly ?? false}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                rootsOnly: e.target.checked || undefined,
                parentServerId: e.target.checked ? undefined : f.parentServerId,
              }))
            }
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          Top-level only
        </label>
      </div>

      {/* Body */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <LoadingPanel label="Loading servers…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : servers.length === 0 ? (
          <EmptyState
            icon={ServerIcon}
            title="No servers found"
            message={
              Object.values(filters).some((v) => v !== undefined && v !== '')
                ? 'No servers match the current filters.'
                : 'Add your first server to start monitoring.'
            }
            action={
              canWrite ? (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add server
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 font-semibold">Server</th>
                  <th className="px-4 py-3 font-semibold">Type / OS</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Criticality</th>
                  <th className="px-4 py-3 font-semibold">Verification</th>
                  {canWrite && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {servers.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate('servers', s.id)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        {s.name}
                        {s.isGroup && (
                          <Badge variant="purple" title="Grouping container">
                            <Layers className="w-3 h-3" />
                            Group · {s.childCount}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {s.ipOrHostname}
                        {s.parent && (
                          <span className="ml-2 text-gray-400 dark:text-gray-500">
                            ↳ in {s.parent.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <div>{s.type}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{s.os}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <div>{s.department}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{s.location}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={criticalityVariant(s.criticality)}>{s.criticality}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <VerificationBadge status={s.verificationStatus} />
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            title="Edit"
                            className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {s.expectsAgent && (
                            <button
                              onClick={() => setRotateTarget(s)}
                              title="Rotate agent token"
                              className="p-1.5 rounded text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(s)}
                            title="Remove"
                            className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ServerForm
        open={formOpen}
        server={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <AgentTokenModal
        open={tokenModal !== null}
        token={tokenModal?.token ?? null}
        serverName={tokenModal?.name}
        context={tokenModal?.ctx ?? 'create'}
        onClose={() => setTokenModal(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove server"
        message={`Remove "${deleteTarget?.name}" from the inventory? This is a soft delete and can be restored by an administrator.`}
        confirmLabel="Remove"
        danger
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={rotateTarget !== null}
        title="Rotate agent token"
        message={`Issue a new agent token for "${rotateTarget?.name}"? The current token will stop working immediately and the new one is shown only once.`}
        confirmLabel="Rotate token"
        onConfirm={confirmRotate}
        onClose={() => setRotateTarget(null)}
      />
    </div>
  );
};
