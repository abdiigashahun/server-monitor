import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import * as usersApi from '../../api/users';
import type { UserListFilters } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/client';
import { isValidEmail } from '../../utils/validation';
import { Badge, BadgeVariant } from '../../components/Common/Badge';
import { LoadingPanel } from '../../components/Common/Spinner';
import { EmptyState } from '../../components/Common/EmptyState';
import { ErrorState } from '../../components/Common/ErrorState';
import { Pagination } from '../../components/Common/Pagination';
import { Modal } from '../../components/Common/Modal';
import { ConfirmDialog } from '../../components/Common/ConfirmDialog';
import { formatTimestamp, formatDateTime } from '../../utils/formatters';
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { User, Role, CreateUserInput, UpdateUserInput } from '../../types';

const ROLES: Role[] = ['ADMIN', 'OPERATOR', 'VIEWER'];

const controlClass =
  'px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const inputClass = `w-full ${controlClass}`;
const labelClass =
  'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1';

const PAGE_SIZE = 10;

function roleVariant(role: Role): BadgeVariant {
  switch (role) {
    case 'ADMIN':
      return 'purple';
    case 'OPERATOR':
      return 'info';
    case 'VIEWER':
      return 'neutral';
  }
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let out = '';
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  for (let i = 0; i < values.length; i++) out += chars[values[i] % chars.length];
  return out;
}

// ---------------------------------------------------------------------------
interface FormState {
  name: string;
  email: string;
  role: Role;
  password: string;
}

const UserFormModal: React.FC<{
  open: boolean;
  user: User | null;
  onClose: () => void;
  onCreated: (email: string, password: string) => void;
  onUpdated: () => void;
}> = ({ open, user, onClose, onCreated, onUpdated }) => {
  const isEdit = Boolean(user);
  const [form, setForm] = useState<FormState>({ name: '', email: '', role: 'VIEWER', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const key = user?.id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && (lastKey !== key || !prevOpen)) {
    setLastKey(key);
    setPrevOpen(true);
    setForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'VIEWER',
      password: '',
    });
    setFormError(null);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!isValidEmail(form.email)) return 'Enter a valid email address.';
    if (!isEdit && form.password.length < 8) return 'Password must be at least 8 characters.';
    if (isEdit && form.password && form.password.length < 8)
      return 'Password must be at least 8 characters.';
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
      if (isEdit && user) {
        const payload: UpdateUserInput = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        };
        await usersApi.update(user.id, payload);
        onUpdated();
      } else {
        const payload: CreateUserInput = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          password: form.password,
        };
        await usersApi.create(payload);
        onCreated(form.email.trim(), form.password);
      }
    } catch (err2) {
      setFormError(err2 instanceof ApiError ? err2.message : 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? `Edit ${user?.name}` : 'Add user'}
      subtitle={isEdit ? 'Update account details and role.' : 'Create a new account.'}
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
            form="user-form"
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}

        <div>
          <label className={labelClass}>Name</label>
          <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            className={inputClass}
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="user@itdb.gov.et"
          />
        </div>
        <div>
          <label className={labelClass}>Role</label>
          <select className={inputClass} value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Permissions are derived from the role by the backend.
          </p>
        </div>
        <div>
          <label className={labelClass}>{isEdit ? 'New password (optional)' : 'Password'}</label>
          <div className="flex gap-2">
            <input
              className={inputClass}
              type="text"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep current' : 'At least 8 characters'}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => set('password', generatePassword())}
              className="shrink-0 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Generate
            </button>
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            There is no email delivery — you'll need to share the password with the user manually.
          </p>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
const CredentialModal: React.FC<{
  open: boolean;
  email: string;
  password: string;
  onClose: () => void;
}> = ({ open, email, password, onClose }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="User created"
      subtitle={email}
      size="md"
      footer={
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
        >
          Done
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            Share these credentials with the user securely — the password won't be shown again. The
            user can change it after signing in.
          </p>
        </div>
        <div className="rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm font-mono space-y-1">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Email: </span>
            <span className="text-gray-900 dark:text-gray-100">{email}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Password: </span>
            <span className="text-gray-900 dark:text-gray-100 break-all">{password}</span>
          </div>
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy credentials'}
        </button>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
export const UsersPage: React.FC = () => {
  const { user: currentUser, can } = useAuth();
  const toast = useToast();
  const canWrite = can('users:write');

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<UserListFilters>({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(
      () => {
        setFilters((f) => ({ ...f, name: search.trim() || undefined }));
        setCurrentPage(1);
      },
      250,
    );
    return () => window.clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useApi(
    () => usersApi.list(filters),
    [JSON.stringify(filters)],
  );
  const users = data?.users ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);

  const totalUsers = users.length;
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, currentPage]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await usersApi.remove(deleteTarget.id);
      toast.success('User removed', deleteTarget.name);
      reload();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleteTarget(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilters({});
    setCurrentPage(1);
  };

  const hasActiveFilters = search.trim() !== '' || filters.role !== undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-600" />
            Users
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Accounts, access privileges, and RBAC roles.
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
            Add user
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
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
        <select
          className={`${controlClass} text-xs`}
          value={filters.role ?? ''}
          onChange={(e) => {
            setFilters((f) => ({ ...f, role: (e.target.value || undefined) as Role }));
            setCurrentPage(1);
          }}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0) + r.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-auto"
          >
            <X className="w-3.5 h-3.5" />
            Reset filters
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <LoadingPanel label="Loading users…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users" message="No users match the current filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Active Permissions</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  {canWrite && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const activePerms = Object.entries(u.permissions || {})
                    .filter(([, val]) => Boolean(val))
                    .map(([key]) => key);

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                              {u.name}
                              {isSelf && <span className="text-[10px] text-blue-500 font-normal">(you)</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {activePerms.length > 0 ? (
                            activePerms.slice(0, 3).map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono"
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                          {activePerms.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 font-mono">
                              +{activePerms.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {u.createdAt ? formatTimestamp(u.createdAt) : '—'}
                      </td>
                      {canWrite && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditing(u);
                                setFormOpen(true);
                              }}
                              title="Edit user"
                              className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              disabled={isSelf}
                              title={isSelf ? 'You cannot remove your own account' : 'Remove'}
                              className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination: 10 items max per page */}
        {users.length > PAGE_SIZE && (
          <div className="px-3 border-t border-gray-200 dark:border-gray-800">
            <Pagination
              pagination={{
                page: currentPage,
                limit: PAGE_SIZE,
                total: totalUsers,
                totalPages: totalPages,
              }}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      <UserFormModal
        open={formOpen}
        user={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onUpdated={() => {
          setFormOpen(false);
          setEditing(null);
          toast.success('User updated');
          reload();
        }}
        onCreated={(email, password) => {
          setFormOpen(false);
          setEditing(null);
          setCredential({ email, password });
          reload();
        }}
      />

      <CredentialModal
        open={credential !== null}
        email={credential?.email ?? ''}
        password={credential?.password ?? ''}
        onClose={() => setCredential(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove user"
        message={`Remove ${deleteTarget?.name} (${deleteTarget?.email})? They will lose access immediately.`}
        confirmLabel="Remove"
        danger
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
