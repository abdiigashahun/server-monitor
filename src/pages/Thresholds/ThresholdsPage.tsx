import React, { useState, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import * as thresholdsApi from '../../api/thresholds';
import * as serversApi from '../../api/servers';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/client';
import { Badge } from '../../components/Common/Badge';
import { LoadingPanel } from '../../components/Common/Spinner';
import { EmptyState } from '../../components/Common/EmptyState';
import { ErrorState } from '../../components/Common/ErrorState';
import { Modal } from '../../components/Common/Modal';
import { ConfirmDialog } from '../../components/Common/ConfirmDialog';
import { titleCase } from '../../utils/formatters';
import { SlidersHorizontal, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import type {
  Threshold,
  ThresholdMetric,
  ThresholdScope,
  CreateThresholdInput,
} from '../../types';

const METRICS: ThresholdMetric[] = ['CPU', 'MEMORY', 'DISK', 'BACKUP_AGE_HOURS'];

const inputClass =
  'w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const labelClass =
  'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1';

function unitFor(metric: ThresholdMetric): string {
  return metric === 'BACKUP_AGE_HOURS' ? 'h' : '%';
}

function formatValue(metric: ThresholdMetric, value: number): string {
  return `${value}${unitFor(metric)}`;
}

// ---------------------------------------------------------------------------
interface FormState {
  metric: ThresholdMetric;
  scope: ThresholdScope;
  serverId: string;
  warningValue: string;
  criticalValue: string;
}

function initialForm(t?: Threshold | null): FormState {
  return {
    metric: t?.metric ?? 'CPU',
    scope: t?.scope ?? 'GLOBAL',
    serverId: t?.serverId ?? '',
    warningValue: t ? String(t.warningValue) : '',
    criticalValue: t ? String(t.criticalValue) : '',
  };
}

const ThresholdFormModal: React.FC<{
  open: boolean;
  threshold: Threshold | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, threshold, onClose, onSaved }) => {
  const isEdit = Boolean(threshold);
  const [form, setForm] = useState<FormState>(() => initialForm(threshold));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form whenever the modal opens or its target changes.
  const key = threshold?.id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && (lastKey !== key || !prevOpen)) {
    setLastKey(key);
    setPrevOpen(true);
    setForm(initialForm(threshold));
    setFormError(null);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Servers list for SERVER-scoped thresholds (only load while open + creating).
  const { data: serverData } = useApi(
    () => (open && !isEdit ? serversApi.list({}) : Promise.resolve(null)),
    [open, isEdit],
  );
  const servers = serverData?.servers ?? [];

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isPercent = form.metric !== 'BACKUP_AGE_HOURS';

  const validate = (): string | null => {
    const warn = Number(form.warningValue);
    const crit = Number(form.criticalValue);
    if (form.warningValue === '' || !Number.isFinite(warn)) return 'Warning value is required.';
    if (form.criticalValue === '' || !Number.isFinite(crit)) return 'Critical value is required.';
    if (warn < 0 || crit < 0) return 'Values must be positive.';
    if (isPercent && (warn > 100 || crit > 100)) return 'Percentage values cannot exceed 100.';
    if (warn >= crit) return 'Warning value must be less than the critical value.';
    if (!isEdit && form.scope === 'SERVER' && !form.serverId) return 'Select a server for a server-scoped threshold.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (isEdit && threshold) {
        await thresholdsApi.update(threshold.id, {
          warningValue: Number(form.warningValue),
          criticalValue: Number(form.criticalValue),
        });
      } else {
        const payload: CreateThresholdInput = {
          metric: form.metric,
          scope: form.scope,
          warningValue: Number(form.warningValue),
          criticalValue: Number(form.criticalValue),
          ...(form.scope === 'SERVER' ? { serverId: form.serverId } : {}),
        };
        await thresholdsApi.create(payload);
      }
      onSaved();
    } catch (err2) {
      setFormError(err2 instanceof ApiError ? err2.message : 'Failed to save threshold.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? 'Edit threshold' : 'New threshold'}
      subtitle={isEdit ? 'Only the warning and critical values can be changed.' : 'Define when alerts are raised.'}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="threshold-form"
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create threshold'}
          </button>
        </>
      }
    >
      <form id="threshold-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Metric</label>
            <select
              className={`${inputClass} disabled:opacity-60`}
              value={form.metric}
              disabled={isEdit}
              onChange={(e) => set('metric', e.target.value as ThresholdMetric)}
            >
              {METRICS.map((m) => (
                <option key={m} value={m}>
                  {titleCase(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Scope</label>
            <select
              className={`${inputClass} disabled:opacity-60`}
              value={form.scope}
              disabled={isEdit}
              onChange={(e) => set('scope', e.target.value as ThresholdScope)}
            >
              <option value="GLOBAL">Global (all servers)</option>
              <option value="SERVER">Specific server</option>
            </select>
          </div>
        </div>

        {!isEdit && form.scope === 'SERVER' && (
          <div>
            <label className={labelClass}>Server</label>
            <select
              className={inputClass}
              value={form.serverId}
              onChange={(e) => set('serverId', e.target.value)}
            >
              <option value="">— Select a server —</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.ipOrHostname})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Warning ({unitFor(form.metric)})</label>
            <input
              type="number"
              className={inputClass}
              value={form.warningValue}
              onChange={(e) => set('warningValue', e.target.value)}
              min={0}
              max={isPercent ? 100 : undefined}
              step="any"
              placeholder={isPercent ? '75' : '24'}
            />
          </div>
          <div>
            <label className={labelClass}>Critical ({unitFor(form.metric)})</label>
            <input
              type="number"
              className={inputClass}
              value={form.criticalValue}
              onChange={(e) => set('criticalValue', e.target.value)}
              min={0}
              max={isPercent ? 100 : undefined}
              step="any"
              placeholder={isPercent ? '90' : '48'}
            />
          </div>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          The warning value must be lower than the critical value.
          {form.metric === 'BACKUP_AGE_HOURS'
            ? ' Values are backup age in hours.'
            : ' Values are a percentage (0–100).'}
        </p>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
export const ThresholdsPage: React.FC = () => {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can('thresholds:write');

  const { data, loading, error, reload } = useApi(() => thresholdsApi.list(), []);
  const thresholds = data?.thresholds ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Threshold | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Threshold | null>(null);

  const sorted = useMemo(
    () =>
      [...thresholds].sort(
        (a, b) => a.metric.localeCompare(b.metric) || a.scope.localeCompare(b.scope),
      ),
    [thresholds],
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await thresholdsApi.remove(deleteTarget.id);
      toast.success('Threshold deleted');
      reload();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            Alert Thresholds
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Rules that decide when the backend raises warning and critical alerts.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add threshold
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <LoadingPanel label="Loading thresholds…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="No thresholds"
            message="No alert thresholds are configured yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 font-semibold">Metric</th>
                  <th className="px-4 py-3 font-semibold">Scope</th>
                  <th className="px-4 py-3 font-semibold">Warning</th>
                  <th className="px-4 py-3 font-semibold">Critical</th>
                  {canWrite && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sorted.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {titleCase(t.metric)}
                    </td>
                    <td className="px-4 py-3">
                      {t.scope === 'GLOBAL' ? (
                        <Badge variant="info">Global</Badge>
                      ) : (
                        <div>
                          <Badge variant="neutral">Server</Badge>
                          {t.server && (
                            <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                              {t.server.name}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-semibold">
                      {formatValue(t.metric, t.warningValue)}
                    </td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400 font-semibold">
                      {formatValue(t.metric, t.criticalValue)}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditing(t);
                              setFormOpen(true);
                            }}
                            title="Edit"
                            className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            title="Delete"
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

      <ThresholdFormModal
        open={formOpen}
        threshold={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          toast.success('Threshold saved');
          reload();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete threshold"
        message={
          deleteTarget
            ? `Delete the ${titleCase(deleteTarget.metric)} ${deleteTarget.scope === 'GLOBAL' ? 'global' : 'server'} threshold? Alerts will no longer be raised from this rule.`
            : ''
        }
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
