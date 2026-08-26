import React, { useState, useMemo } from 'react';
import { Modal } from '../Common/Modal';
import { useApi } from '../../hooks/useApi';
import * as serversApi from '../../api/servers';
import { isValidIpOrHostname } from '../../utils/validation';
import { ApiError } from '../../api/client';
import { AlertCircle } from 'lucide-react';
import type {
  Server,
  ServerOS,
  Criticality,
  CreateServerInput,
} from '../../types';

interface ServerFormProps {
  open: boolean;
  server?: Server | null;
  /** Pre-selected parent (when adding a child from a group's detail view). */
  defaultParentId?: string | null;
  onClose: () => void;
  onSaved: (server: Server, agentToken?: string | null) => void;
}

interface FormState {
  name: string;
  ipOrHostname: string;
  type: string;
  os: ServerOS;
  location: string;
  department: string;
  criticality: Criticality;
  owner: string;
  parentServerId: string;
  expectsAgent: boolean;
}

const TYPE_SUGGESTIONS = [
  'Database',
  'Web',
  'Application',
  'Cache',
  'Storage',
  'Load Balancer',
  'DNS',
  'Mail',
  'Virtualization',
  'Group',
];

const inputClass =
  'w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
const labelClass =
  'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1';

function initialState(server?: Server | null, defaultParentId?: string | null): FormState {
  return {
    name: server?.name ?? '',
    ipOrHostname: server?.ipOrHostname ?? '',
    type: server?.type ?? '',
    os: server?.os ?? 'LINUX',
    location: server?.location ?? '',
    department: server?.department ?? '',
    criticality: server?.criticality ?? 'MEDIUM',
    owner: server?.owner ?? '',
    parentServerId: server?.parentServerId ?? defaultParentId ?? '',
    expectsAgent: server?.expectsAgent ?? true,
  };
}

export const ServerForm: React.FC<ServerFormProps> = ({
  open,
  server,
  defaultParentId,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(server);
  const [form, setForm] = useState<FormState>(() => initialState(server, defaultParentId));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Reset local state whenever the form opens or the target server changes.
  const stateKey = server?.id ?? 'new';
  const [lastKey, setLastKey] = useState(stateKey);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && (lastKey !== stateKey || !prevOpen)) {
    setLastKey(stateKey);
    setPrevOpen(true);
    setForm(initialState(server, defaultParentId));
    setFormError(null);
    setTouched(false);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Single-level grouping: only root servers (no parent of their own) can be parents.
  const { data: parentData } = useApi(
    () => (open ? serversApi.list({ rootsOnly: true }) : Promise.resolve(null)),
    [open],
  );
  const parentOptions = useMemo(
    () => (parentData?.servers ?? []).filter((s) => s.id !== server?.id),
    [parentData, server?.id],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const ipInvalid = touched && form.ipOrHostname.trim() !== '' && !isValidIpOrHostname(form.ipOrHostname);

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.ipOrHostname.trim()) return 'IP or hostname is required.';
    if (!isValidIpOrHostname(form.ipOrHostname)) return 'Enter a valid IP address or hostname.';
    if (!form.type.trim()) return 'Type is required.';
    if (!form.location.trim()) return 'Location is required.';
    if (!form.department.trim()) return 'Department is required.';
    if (!form.owner.trim()) return 'Owner is required.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSubmitting(true);
    setFormError(null);

    const payload: CreateServerInput = {
      name: form.name.trim(),
      ipOrHostname: form.ipOrHostname.trim(),
      type: form.type.trim(),
      os: form.os,
      location: form.location.trim(),
      department: form.department.trim(),
      criticality: form.criticality,
      owner: form.owner.trim(),
      parentServerId: form.parentServerId || null,
      expectsAgent: form.expectsAgent,
    };

    try {
      if (isEdit && server) {
        const { server: updated } = await serversApi.update(server.id, payload);
        onSaved(updated, null);
      } else {
        const { server: created, agentToken } = await serversApi.create(payload);
        onSaved(created, agentToken);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? `Edit ${server?.name}` : 'Add server'}
      subtitle={isEdit ? 'Update server metadata' : 'Register a new server in the inventory'}
      size="lg"
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
            form="server-form"
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create server'}
          </button>
        </>
      }
    >
      <form id="server-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Primary DB Node"
            />
          </div>
          <div>
            <label className={labelClass}>IP or hostname</label>
            <input
              className={`${inputClass} ${ipInvalid ? 'border-red-400 dark:border-red-600 focus:ring-red-500' : ''}`}
              value={form.ipOrHostname}
              onChange={(e) => set('ipOrHostname', e.target.value)}
              placeholder="10.0.0.5 or db.itdb.gov.et"
            />
            {ipInvalid && (
              <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                Not a valid IPv4/IPv6 address or hostname.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Type</label>
            <input
              className={inputClass}
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              placeholder="Database"
              list="server-types"
            />
            <datalist id="server-types">
              {TYPE_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Operating system</label>
            <select
              className={inputClass}
              value={form.os}
              onChange={(e) => set('os', e.target.value as ServerOS)}
            >
              <option value="LINUX">Linux</option>
              <option value="WINDOWS">Windows</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Location</label>
            <input
              className={inputClass}
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Addis Central DC"
            />
          </div>
          <div>
            <label className={labelClass}>Department</label>
            <input
              className={inputClass}
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
              placeholder="Infrastructure"
            />
          </div>

          <div>
            <label className={labelClass}>Criticality</label>
            <select
              className={inputClass}
              value={form.criticality}
              onChange={(e) => set('criticality', e.target.value as Criticality)}
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Owner</label>
            <input
              className={inputClass}
              value={form.owner}
              onChange={(e) => set('owner', e.target.value)}
              placeholder="Team or person responsible"
            />
          </div>

          <div>
            <label className={labelClass}>Parent group (optional)</label>
            <select
              className={inputClass}
              value={form.parentServerId}
              onChange={(e) => set('parentServerId', e.target.value)}
            >
              <option value="">— None (top level) —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.ipOrHostname})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Grouping is single-level: only top-level servers can be parents.
            </p>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={form.expectsAgent}
                onChange={(e) => set('expectsAgent', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Expects a monitoring agent
              </span>
            </label>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Turn off "expects a monitoring agent" for pure grouping containers that don't run an agent
          themselves — they'll be marked "No agent" instead of "Pending".
        </p>
      </form>
    </Modal>
  );
};
