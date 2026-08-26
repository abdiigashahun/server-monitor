import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import * as auditApi from '../../api/audit';
import { Badge } from '../../components/Common/Badge';
import { LoadingPanel } from '../../components/Common/Spinner';
import { EmptyState } from '../../components/Common/EmptyState';
import { ErrorState } from '../../components/Common/ErrorState';
import { Pagination } from '../../components/Common/Pagination';
import { Modal } from '../../components/Common/Modal';
import { formatDateTime, formatTimestamp, titleCase } from '../../utils/formatters';
import { ScrollText, Filter } from 'lucide-react';
import type { AuditLog, AuditListFilters } from '../../types';

const controlClass =
  'px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

const DEFAULT_LIMIT = 25;

export const AuditLogsPage: React.FC = () => {
  const [actionText, setActionText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [userIdText, setUserIdText] = useState('');
  const [targetIdText, setTargetIdText] = useState('');
  const [filters, setFilters] = useState<AuditListFilters>({ page: 1, limit: DEFAULT_LIMIT });
  const [selected, setSelected] = useState<AuditLog | null>(null);

  // Debounce the free-text filters.
  useEffect(() => {
    const t = window.setTimeout(
      () =>
        setFilters((f) => ({
          ...f,
          action: actionText.trim() || undefined,
          targetType: targetText.trim() || undefined,
          userId: userIdText.trim() || undefined,
          targetId: targetIdText.trim() || undefined,
          page: 1,
        })),
      300,
    );
    return () => window.clearTimeout(t);
  }, [actionText, targetText, userIdText, targetIdText]);

  const { data, loading, error, reload } = useApi(
    () => auditApi.list(filters),
    [JSON.stringify(filters)],
  );
  const logs = data?.auditLogs ?? [];
  const pagination = data?.pagination;

  const setDate = (key: 'from' | 'to', value: string, endOfDay: boolean) =>
    setFilters((f) => ({
      ...f,
      [key]: value ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z` : undefined,
      page: 1,
    }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-blue-600" />
          Audit Logs
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          A record of privileged actions taken across the system.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <input
          value={actionText}
          onChange={(e) => setActionText(e.target.value)}
          placeholder="Action…"
          className={controlClass}
        />
        <input
          value={targetText}
          onChange={(e) => setTargetText(e.target.value)}
          placeholder="Target type…"
          className={controlClass}
        />
        <input
          value={userIdText}
          onChange={(e) => setUserIdText(e.target.value)}
          placeholder="User ID…"
          className={controlClass}
        />
        <input
          value={targetIdText}
          onChange={(e) => setTargetIdText(e.target.value)}
          placeholder="Target ID…"
          className={controlClass}
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          From
          <input
            type="date"
            className={controlClass}
            value={filters.from ? filters.from.slice(0, 10) : ''}
            onChange={(e) => setDate('from', e.target.value, false)}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          To
          <input
            type="date"
            className={controlClass}
            value={filters.to ? filters.to.slice(0, 10) : ''}
            onChange={(e) => setDate('to', e.target.value, true)}
          />
        </label>
      </div>

      {/* Body */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <LoadingPanel label="Loading audit logs…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit entries" message="No activity matches the current filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      {log.user ? (
                        <>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{log.user.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{log.user.email}</div>
                        </>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{titleCase(log.action)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <div>{titleCase(log.targetType)}</div>
                      {log.targetId && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[220px]">
                          {log.targetId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatTimestamp(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-3 border-t border-gray-200 dark:border-gray-800">
            <Pagination pagination={pagination} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
          </div>
        )}
      </div>

      {/* Detail */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Audit entry"
        subtitle={selected ? titleCase(selected.action) : undefined}
        size="md"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Actor" value={selected.user ? `${selected.user.name} · ${selected.user.email}` : 'System'} />
              <Field label="Action" value={titleCase(selected.action)} />
              <Field label="Target type" value={titleCase(selected.targetType)} />
              <Field label="Target ID" value={selected.targetId || '—'} mono />
              <Field label="When" value={formatDateTime(selected.createdAt)} />
            </dl>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                Metadata
              </div>
              {selected.metadata && Object.keys(selected.metadata).length > 0 ? (
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-3 overflow-x-auto text-gray-800 dark:text-gray-200">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No additional metadata.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</dt>
    <dd className={`mt-0.5 text-gray-700 dark:text-gray-300 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
  </div>
);
