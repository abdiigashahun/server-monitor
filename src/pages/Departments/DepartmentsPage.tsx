import React, { useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import * as departmentsApi from '../../api/departments';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/client';
import { LoadingPanel } from '../../components/Common/Spinner';
import { EmptyState } from '../../components/Common/EmptyState';
import { ErrorState } from '../../components/Common/ErrorState';
import { Pagination } from '../../components/Common/Pagination';
import { Modal } from '../../components/Common/Modal';
import { ConfirmDialog } from '../../components/Common/ConfirmDialog';
import { formatTimestamp } from '../../utils/formatters';
import { Building2, Plus, Pencil, Trash2, Search, AlertCircle, X } from 'lucide-react';
import type { Department } from '../../types';

const controlClass =
  'px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const inputClass = `w-full ${controlClass}`;
const labelClass =
  'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1';

const PAGE_SIZE = 10;

const DepartmentFormModal: React.FC<{
  open: boolean;
  department: Department | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, department, onClose, onSaved }) => {
  const isEdit = Boolean(department);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const key = department?.id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && (lastKey !== key || !prevOpen)) {
    setLastKey(key);
    setPrevOpen(true);
    setName(department?.name ?? '');
    setFormError(null);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Department name is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (isEdit && department) {
        await departmentsApi.update(department.id, { name: trimmed });
      } else {
        await departmentsApi.create({ name: trimmed });
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? `Edit ${department?.name}` : 'Add department'}
      subtitle={
        isEdit
          ? 'Renaming updates servers that still use the previous name.'
          : 'Add a department for registration forms and filters.'
      }
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
            form="department-form"
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create department'}
          </button>
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Finance"
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
};

export const DepartmentsPage: React.FC = () => {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can('users:write');

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => departmentsApi.list(), []);
  const departments = data?.departments ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await departmentsApi.remove(deleteTarget.id);
      toast.success('Department removed', deleteTarget.name);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unexpected error while removing the department.';
      toast.error('Delete failed', message);
      // Keep the confirm dialog open so the backend message stays visible.
      throw err instanceof Error ? err : new Error(message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Departments
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Shared department catalog used when registering servers and filtering inventory.
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
            Add department
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search departments…"
            className={`${controlClass} w-full pl-9 pr-7 text-xs`}
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {filtered.length} department{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <LoadingPanel label="Loading departments…" />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments"
            message={
              search.trim()
                ? 'No departments match your search.'
                : 'Add departments so operators can assign them when registering servers.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  {canWrite && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginated.map((department) => (
                  <tr
                    key={department.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-gray-100">
                      {department.name}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(department.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(department.updatedAt)}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditing(department);
                              setFormOpen(true);
                            }}
                            title="Edit department"
                            className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(department)}
                            title="Remove department"
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

        {totalPages > 1 && (
          <div className="px-3 border-t border-gray-200 dark:border-gray-800">
            <Pagination
              pagination={{
                page: currentPage,
                limit: PAGE_SIZE,
                total: filtered.length,
                totalPages,
              }}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <DepartmentFormModal
        open={formOpen}
        department={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          toast.success(editing ? 'Department updated' : 'Department created');
          reload();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remove department"
        message={`Remove “${deleteTarget?.name ?? 'this department'}”? Departments still assigned to active servers cannot be removed.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
};
