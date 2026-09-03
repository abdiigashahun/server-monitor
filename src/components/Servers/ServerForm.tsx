import React, { useState, useMemo } from 'react';
import { Modal } from '../Common/Modal';
import { useApi } from '../../hooks/useApi';
import * as serversApi from '../../api/servers';
import { isValidIpOrHostname, isValidEmail } from '../../utils/validation';
import { ApiError } from '../../api/client';
import {
  AlertCircle,
  Server as ServerIcon,
  Layers,
  Plus,
  Trash2,
  CopyCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import * as usersApi from '../../api/users';
import { mergeDepartmentOptions } from '../../constants/departments';
import type {
  Server,
  ServerOS,
  Criticality,
  CreateServerInput,
  CreateServerGroupInput,
  CreateServerGroupMemberInput,
  CreateServerGroupAgentToken,
  User,
} from '../../types';

/** Map an optional operator email to CreateServerRequest.operatorEmail / operatorUserId. */
function resolveOperatorFields(
  emailRaw: string,
  operators: User[],
): { operatorEmail?: string | null; operatorUserId?: string | null } {
  const email = emailRaw.trim();
  if (!email) return { operatorEmail: null, operatorUserId: null };

  const match = operators.find((op) => op.email.toLowerCase() === email.toLowerCase());
  if (match) {
    return { operatorEmail: match.email, operatorUserId: match.id };
  }
  return { operatorEmail: email, operatorUserId: null };
}

function validateOptionalOperatorEmail(emailRaw: string, label: string): string | null {
  const email = emailRaw.trim();
  if (!email) return null;
  if (!isValidEmail(email)) return `${label}: enter a valid operator email, or leave it blank.`;
  return null;
}

interface ServerFormProps {
  open: boolean;
  server?: Server | null;
  /** Pre-selected parent (when adding a child from a group's detail view). */
  defaultParentId?: string | null;
  onClose: () => void;
  onSaved: (
    server: Server,
    agentToken?: string | null,
    groupTokens?: CreateServerGroupAgentToken[],
  ) => void;
}

type FormMode = 'single' | 'group';

interface SingleFormState {
  name: string;
  ipOrHostname: string;
  type: string;
  os: ServerOS;
  location: string;
  department: string;
  criticality: Criticality;
  owner: string;
  operatorEmail: string;
  parentServerId: string;
  expectsAgent: boolean;
}

interface ChildServerFormState {
  id: string; // temporary key
  name: string;
  ipOrHostname: string;
  type: string;
  os: ServerOS;
  location: string;
  department: string;
  criticality: Criticality;
  owner: string;
  operatorEmail: string;
  expectsAgent: boolean;
  expanded?: boolean;
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

const DepartmentSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ value, onChange, options }) => {
  const choices = value && !options.includes(value) ? [...options, value] : options;
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select department</option>
      {choices.map((dept) => (
        <option key={dept} value={dept}>
          {dept}
        </option>
      ))}
    </select>
  );
};

const OperatorEmailField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  operators: User[];
}> = ({ value, onChange, operators }) => {
  const matched = operators.find((op) => op.email.toLowerCase() === value.trim().toLowerCase());
  const selectValue = matched ? matched.email : value.trim() ? '__custom__' : '';
  const showCustomInput = operators.length === 0 || selectValue === '__custom__' || !matched;

  return (
    <div className="space-y-1.5">
      {operators.length > 0 && (
        <select
          className={inputClass}
          value={selectValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === '__custom__') {
              if (matched) onChange('');
              return;
            }
            onChange(next);
          }}
        >
          <option value="">No operator assigned</option>
          {operators.map((op) => (
            <option key={op.id} value={op.email}>
              {op.name} ({op.email})
            </option>
          ))}
          <option value="__custom__">Enter email…</option>
        </select>
      )}
      {showCustomInput && (
        <input
          type="email"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="operator@example.com"
          autoComplete="off"
        />
      )}
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Optional. Alerts and operator access use this email when set.
      </p>
    </div>
  );
};

function createDefaultChild(parent?: Partial<CreateServerGroupMemberInput>, index: number = 1): ChildServerFormState {
  return {
    id: `child_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: parent?.name ? `${parent.name} Node ${index}` : '',
    ipOrHostname: '',
    type: 'Application',
    os: parent?.os ?? 'LINUX',
    location: parent?.location ?? '',
    department: parent?.department ?? '',
    criticality: parent?.criticality ?? 'MEDIUM',
    owner: parent?.owner ?? '',
    operatorEmail: parent?.operatorEmail ?? '',
    expectsAgent: true,
    expanded: true,
  };
}

function initialSingleState(server?: Server | null, defaultParentId?: string | null): SingleFormState {
  return {
    name: server?.name ?? '',
    ipOrHostname: server?.ipOrHostname ?? '',
    type: server?.type ?? '',
    os: server?.os ?? 'LINUX',
    location: server?.location ?? '',
    department: server?.department ?? '',
    criticality: server?.criticality ?? 'MEDIUM',
    owner: server?.owner ?? '',
    operatorEmail: server?.operatorEmail ?? '',
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
  const [mode, setMode] = useState<FormMode>('single');

  // Single mode state
  const [singleForm, setSingleForm] = useState<SingleFormState>(() =>
    initialSingleState(server, defaultParentId),
  );

  // Group mode state
  const [parentForm, setParentForm] = useState<CreateServerGroupMemberInput>({
    name: '',
    ipOrHostname: '',
    type: 'Group',
    os: 'LINUX',
    location: '',
    department: '',
    criticality: 'HIGH',
    owner: '',
    operatorEmail: '',
    expectsAgent: false,
  });

  const [children, setChildren] = useState<ChildServerFormState[]>([createDefaultChild(undefined, 1)]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Reset state when opening or target changes
  const stateKey = server?.id ?? 'new';
  const [lastKey, setLastKey] = useState(stateKey);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open && (lastKey !== stateKey || !prevOpen)) {
    setLastKey(stateKey);
    setPrevOpen(true);
    setMode('single');
    setSingleForm(initialSingleState(server, defaultParentId));
    setParentForm({
      name: '',
      ipOrHostname: '',
      type: 'Group',
      os: 'LINUX',
      location: '',
      department: '',
      criticality: 'HIGH',
      owner: '',
      operatorEmail: '',
      expectsAgent: false,
    });
    setChildren([createDefaultChild(undefined, 1)]);
    setFormError(null);
    setTouched(false);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Single-level grouping: only root servers can be parents.
  const { data: parentData } = useApi(
    () => (open && mode === 'single' ? serversApi.list({ rootsOnly: true }) : Promise.resolve(null)),
    [open, mode],
  );
  const parentOptions = useMemo(
    () => (parentData?.servers ?? []).filter((s) => s.id !== server?.id),
    [parentData, server?.id],
  );

  // Load registered users to assign operators (only users with role OPERATOR)
  const { data: usersData } = useApi(
    () => (open ? usersApi.list().catch(() => ({ users: [] })) : Promise.resolve(null)),
    [open],
  );
  const operatorOptions = useMemo(
    () => (usersData?.users ?? []).filter((u) => u.role === 'OPERATOR'),
    [usersData],
  );

  const { data: inventoryData } = useApi(
    () => (open ? serversApi.list().catch(() => ({ servers: [] })) : Promise.resolve(null)),
    [open],
  );
  const departmentOptions = useMemo(
    () =>
      mergeDepartmentOptions(
        ...(inventoryData?.servers ?? []).map((s) => s.department),
        server?.department,
      ),
    [inventoryData, server?.department],
  );

  const setSingle = <K extends keyof SingleFormState>(key: K, value: SingleFormState[K]) =>
    setSingleForm((f) => ({ ...f, [key]: value }));

  const setParent = <K extends keyof CreateServerGroupMemberInput>(
    key: K,
    value: CreateServerGroupMemberInput[K],
  ) => setParentForm((f) => ({ ...f, [key]: value }));

  const setChild = (id: string, updates: Partial<ChildServerFormState>) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addChild = () => {
    setChildren((prev) => [...prev, createDefaultChild(parentForm, prev.length + 1)]);
  };

  const removeChild = (id: string) => {
    if (children.length <= 1) return;
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  const inheritParentToChildren = () => {
    setChildren((prev) =>
      prev.map((c) => ({
        ...c,
        location: parentForm.location || c.location,
        department: parentForm.department || c.department,
        owner: parentForm.owner || c.owner,
        operatorEmail: parentForm.operatorEmail || c.operatorEmail,
        os: parentForm.os || c.os,
        criticality: parentForm.criticality || c.criticality,
      })),
    );
  };

  // Validations
  const validateSingle = (): string | null => {
    if (!singleForm.name.trim()) return 'Server name is required.';
    if (!singleForm.ipOrHostname.trim()) return 'IP or hostname is required.';
    if (!isValidIpOrHostname(singleForm.ipOrHostname)) return 'Enter a valid IP address or hostname.';
    if (!singleForm.type.trim()) return 'Type is required.';
    if (!singleForm.location.trim()) return 'Location is required.';
    if (!singleForm.department.trim()) return 'Department is required.';
    if (!singleForm.owner.trim()) return 'Owner is required.';
    return validateOptionalOperatorEmail(singleForm.operatorEmail, 'Operators');
  };

  const validateGroup = (): string | null => {
    if (!parentForm.name.trim()) return 'Parent group name is required.';
    if (!parentForm.ipOrHostname.trim()) return 'Parent group IP or hostname is required.';
    if (!isValidIpOrHostname(parentForm.ipOrHostname))
      return 'Parent IP address or hostname is not valid.';
    if (!parentForm.type.trim()) return 'Parent group type is required.';
    if (!parentForm.location.trim()) return 'Parent location is required.';
    if (!parentForm.department.trim()) return 'Parent department is required.';
    if (!parentForm.owner.trim()) return 'Parent owner is required.';
    const parentOpErr = validateOptionalOperatorEmail(parentForm.operatorEmail ?? '', 'Parent operators');
    if (parentOpErr) return parentOpErr;

    if (children.length === 0) return 'At least one child server is required in a group.';

    const ips = new Set<string>();
    ips.add(parentForm.ipOrHostname.trim().toLowerCase());

    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      const prefix = `Child #${i + 1} (${c.name || 'Unnamed'})`;
      if (!c.name.trim()) return `${prefix}: Name is required.`;
      if (!c.ipOrHostname.trim()) return `${prefix}: IP or hostname is required.`;
      if (!isValidIpOrHostname(c.ipOrHostname))
        return `${prefix}: Enter a valid IP address or hostname.`;
      if (!c.type.trim()) return `${prefix}: Type is required.`;
      if (!c.location.trim()) return `${prefix}: Location is required.`;
      if (!c.department.trim()) return `${prefix}: Department is required.`;
      if (!c.owner.trim()) return `${prefix}: Owner is required.`;
      const childOpErr = validateOptionalOperatorEmail(c.operatorEmail, `${prefix} operators`);
      if (childOpErr) return childOpErr;

      const lowerIp = c.ipOrHostname.trim().toLowerCase();
      if (ips.has(lowerIp)) {
        return `Duplicate IP/Hostname detected: "${c.ipOrHostname}". Every server in the group must have a unique IP/hostname.`;
      }
      ips.add(lowerIp);
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (mode === 'single' || isEdit) {
      const validationError = validateSingle();
      if (validationError) {
        setFormError(validationError);
        return;
      }
      setSubmitting(true);
      setFormError(null);

      const operatorFields = resolveOperatorFields(singleForm.operatorEmail, operatorOptions);
      const payload: CreateServerInput = {
        name: singleForm.name.trim(),
        ipOrHostname: singleForm.ipOrHostname.trim(),
        type: singleForm.type.trim(),
        os: singleForm.os,
        location: singleForm.location.trim(),
        department: singleForm.department.trim(),
        criticality: singleForm.criticality,
        owner: singleForm.owner.trim(),
        parentServerId: singleForm.parentServerId || null,
        expectsAgent: singleForm.expectsAgent,
        ...(isEdit || operatorFields.operatorEmail ? operatorFields : {}),
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
    } else {
      // Group mode
      const validationError = validateGroup();
      if (validationError) {
        setFormError(validationError);
        return;
      }
      setSubmitting(true);
      setFormError(null);

      const parentOperator = resolveOperatorFields(parentForm.operatorEmail ?? '', operatorOptions);
      const groupPayload: CreateServerGroupInput = {
        parent: {
          name: parentForm.name.trim(),
          ipOrHostname: parentForm.ipOrHostname.trim(),
          type: parentForm.type.trim(),
          os: parentForm.os,
          location: parentForm.location.trim(),
          department: parentForm.department.trim(),
          criticality: parentForm.criticality,
          owner: parentForm.owner.trim(),
          ...(parentOperator.operatorEmail ? parentOperator : {}),
          expectsAgent: parentForm.expectsAgent,
        },
        children: children.map((c) => {
          const childOwner = c.owner.trim() || parentForm.owner.trim();
          const childOperatorEmail = c.operatorEmail.trim() || parentForm.operatorEmail?.trim() || '';
          const childOperator = resolveOperatorFields(childOperatorEmail, operatorOptions);
          return {
            name: c.name.trim(),
            ipOrHostname: c.ipOrHostname.trim(),
            type: c.type.trim(),
            os: c.os,
            location: c.location.trim(),
            department: c.department.trim(),
            criticality: c.criticality,
            owner: childOwner,
            ...(childOperator.operatorEmail ? childOperator : {}),
            expectsAgent: c.expectsAgent,
          };
        }),
      };

      try {
        const response = await serversApi.createGroup(groupPayload);
        onSaved(response.server, null, response.agentTokens);
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : 'Failed to create server group.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? `Edit ${server?.name}` : mode === 'group' ? 'Create Server Group' : 'Add Server'}
      subtitle={
        isEdit
          ? 'Update server metadata'
          : mode === 'group'
            ? 'Create a top-level parent and member servers in a single transaction'
            : 'Register a standalone or child server in the inventory'
      }
      size={mode === 'group' && !isEdit ? 'xl' : 'lg'}
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
            {submitting
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : mode === 'group'
                  ? `Create Group (${children.length + 1} servers)`
                  : 'Create server'}
          </button>
        </>
      }
    >
      <form id="server-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector (Only on New Creation) */}
        {!isEdit && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('single');
                setFormError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                mode === 'single'
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <ServerIcon className="w-4 h-4" />
              Single Server
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('group');
                setFormError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                mode === 'group'
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              Server Group
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                Parent + Children
              </span>
            </button>
          </div>
        )}

        {formError && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}

        {/* SINGLE SERVER FORM */}
        {(mode === 'single' || isEdit) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={singleForm.name}
                  onChange={(e) => setSingle('name', e.target.value)}
                  placeholder="e.g. Primary DB Node"
                />
              </div>
              <div>
                <label className={labelClass}>IP or hostname</label>
                <input
                  className={`${inputClass} ${
                    touched &&
                    singleForm.ipOrHostname.trim() !== '' &&
                    !isValidIpOrHostname(singleForm.ipOrHostname)
                      ? 'border-red-400 dark:border-red-600 focus:ring-red-500'
                      : ''
                  }`}
                  value={singleForm.ipOrHostname}
                  onChange={(e) => setSingle('ipOrHostname', e.target.value)}
                  placeholder="10.0.0.5 or db.internal.local"
                />
              </div>

              <div>
                <label className={labelClass}>Type</label>
                <input
                  className={inputClass}
                  value={singleForm.type}
                  onChange={(e) => setSingle('type', e.target.value)}
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
                  value={singleForm.os}
                  onChange={(e) => setSingle('os', e.target.value as ServerOS)}
                >
                  <option value="LINUX">Linux</option>
                  <option value="WINDOWS">Windows</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Location</label>
                <input
                  className={inputClass}
                  value={singleForm.location}
                  onChange={(e) => setSingle('location', e.target.value)}
                  placeholder="Addis Central DC"
                />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <DepartmentSelect
                  value={singleForm.department}
                  onChange={(value) => setSingle('department', value)}
                  options={departmentOptions}
                />
              </div>

              <div>
                <label className={labelClass}>Criticality</label>
                <select
                  className={inputClass}
                  value={singleForm.criticality}
                  onChange={(e) => setSingle('criticality', e.target.value as Criticality)}
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
                  value={singleForm.owner}
                  onChange={(e) => setSingle('owner', e.target.value)}
                  placeholder="Ops Team"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Operators <span className="normal-case tracking-normal font-medium text-gray-400">(optional)</span>
                </label>
                <OperatorEmailField
                  value={singleForm.operatorEmail}
                  onChange={(value) => setSingle('operatorEmail', value)}
                  operators={operatorOptions}
                />
              </div>

              <div>
                <label className={labelClass}>Parent Group (Optional)</label>
                <select
                  className={inputClass}
                  value={singleForm.parentServerId}
                  onChange={(e) => setSingle('parentServerId', e.target.value)}
                >
                  <option value="">— None (Standalone Server / No Parent) —</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.ipOrHostname})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Optional: Leave as &quot;None&quot; for a standalone server, or select an existing parent group.
                </p>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                  <input
                    type="checkbox"
                    checked={singleForm.expectsAgent}
                    onChange={(e) => setSingle('expectsAgent', e.target.checked)}
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
              themselves — they'll start as "No agent" instead of "Pending".
            </p>
          </div>
        )}

        {/* SERVER GROUP FORM */}
        {mode === 'group' && !isEdit && (
          <div className="space-y-6">
            {/* Section 1: Top-Level Parent Container */}
            <div className="p-4 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                    1. Parent Group Container
                  </span>
                </div>
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                  Top-level umbrella
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Group Name</label>
                  <input
                    className={inputClass}
                    value={parentForm.name}
                    onChange={(e) => setParent('name', e.target.value)}
                    placeholder="e.g. Finance Cluster"
                  />
                </div>
                <div>
                  <label className={labelClass}>Parent IP / Virtual Hostname</label>
                  <input
                    className={inputClass}
                    value={parentForm.ipOrHostname}
                    onChange={(e) => setParent('ipOrHostname', e.target.value)}
                    placeholder="e.g. finance-cluster.internal.local"
                  />
                </div>

                <div>
                  <label className={labelClass}>Type</label>
                  <input
                    className={inputClass}
                    value={parentForm.type}
                    onChange={(e) => setParent('type', e.target.value)}
                    placeholder="Group"
                    list="server-types"
                  />
                </div>
                <div>
                  <label className={labelClass}>Operating System</label>
                  <select
                    className={inputClass}
                    value={parentForm.os}
                    onChange={(e) => setParent('os', e.target.value as ServerOS)}
                  >
                    <option value="LINUX">Linux</option>
                    <option value="WINDOWS">Windows</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Location</label>
                  <input
                    className={inputClass}
                    value={parentForm.location}
                    onChange={(e) => setParent('location', e.target.value)}
                    placeholder="Addis Central DC"
                  />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <DepartmentSelect
                    value={parentForm.department}
                    onChange={(value) => setParent('department', value)}
                    options={departmentOptions}
                  />
                </div>

                <div>
                  <label className={labelClass}>Criticality</label>
                  <select
                    className={inputClass}
                    value={parentForm.criticality}
                    onChange={(e) => setParent('criticality', e.target.value as Criticality)}
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
                    value={parentForm.owner}
                    onChange={(e) => setParent('owner', e.target.value)}
                    placeholder="Ops Team"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Operators <span className="normal-case tracking-normal font-medium text-gray-400">(optional)</span>
                  </label>
                  <OperatorEmailField
                    value={parentForm.operatorEmail ?? ''}
                    onChange={(value) => setParent('operatorEmail', value)}
                    operators={operatorOptions}
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parentForm.expectsAgent}
                    onChange={(e) => setParent('expectsAgent', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    Install monitoring agent on parent itself (Default: unchecked for virtual containers)
                  </span>
                </label>
              </div>
            </div>

            {/* Section 2: Child Member Servers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ServerIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                    2. Child Servers ({children.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={inheritParentToChildren}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    title="Auto-fill Location, Dept, Owner, Operator, OS from parent"
                  >
                    <CopyCheck className="w-3.5 h-3.5" />
                    Copy Parent Meta to Children
                  </button>
                  <button
                    type="button"
                    onClick={addChild}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Child Server
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {children.map((child, idx) => (
                  <div
                    key={child.id}
                    className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {child.name || `Child Server #${idx + 1}`}
                        </span>
                        {child.ipOrHostname && (
                          <span className="text-[11px] text-gray-400 font-mono">
                            ({child.ipOrHostname})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setChild(child.id, { expanded: !child.expanded })}
                          className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {child.expanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {children.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeChild(child.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer transition-colors"
                            title="Remove child server"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {child.expanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100 dark:border-gray-800/80">
                        <div>
                          <label className={labelClass}>Child Name</label>
                          <input
                            className={inputClass}
                            value={child.name}
                            onChange={(e) => setChild(child.id, { name: e.target.value })}
                            placeholder="e.g. Finance DB Primary"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>IP or Hostname</label>
                          <input
                            className={inputClass}
                            value={child.ipOrHostname}
                            onChange={(e) => setChild(child.id, { ipOrHostname: e.target.value })}
                            placeholder="e.g. 10.0.0.12 or finance-db1"
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Type</label>
                          <input
                            className={inputClass}
                            value={child.type}
                            onChange={(e) => setChild(child.id, { type: e.target.value })}
                            placeholder="Database"
                            list="server-types"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Operating System</label>
                          <select
                            className={inputClass}
                            value={child.os}
                            onChange={(e) =>
                              setChild(child.id, { os: e.target.value as ServerOS })
                            }
                          >
                            <option value="LINUX">Linux</option>
                            <option value="WINDOWS">Windows</option>
                          </select>
                        </div>

                        <div>
                          <label className={labelClass}>Location</label>
                          <input
                            className={inputClass}
                            value={child.location}
                            onChange={(e) => setChild(child.id, { location: e.target.value })}
                            placeholder="Addis Central DC"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Department</label>
                          <DepartmentSelect
                            value={child.department}
                            onChange={(value) => setChild(child.id, { department: value })}
                            options={departmentOptions}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Criticality</label>
                          <select
                            className={inputClass}
                            value={child.criticality}
                            onChange={(e) =>
                              setChild(child.id, { criticality: e.target.value as Criticality })
                            }
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
                            value={child.owner}
                            onChange={(e) => setChild(child.id, { owner: e.target.value })}
                            placeholder="Ops Team"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className={labelClass}>
                            Operators{' '}
                            <span className="normal-case tracking-normal font-medium text-gray-400">
                              (optional)
                            </span>
                          </label>
                          <OperatorEmailField
                            value={child.operatorEmail}
                            onChange={(value) => setChild(child.id, { operatorEmail: value })}
                            operators={operatorOptions}
                          />
                        </div>

                        <div className="sm:col-span-2 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={child.expectsAgent}
                              onChange={(e) => setChild(child.id, { expectsAgent: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              Expects a monitoring agent (generates agent token)
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
