import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import * as serversApi from '../../api/servers';
import * as backupsApi from '../../api/backups';
import * as auditApi from '../../api/audit';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/client';
import { Spinner } from '../../components/Common/Spinner';
import { ReportPreviewModal } from '../../components/Reports/ReportPreviewModal';
import { FileText, Download, HeartPulse, DatabaseBackup, ScrollText } from 'lucide-react';
import type { ReportKind, ReportRange, ReportFormat, Server, BackupLog, AuditLog } from '../../types';

import { generateAndDownloadExcel } from '../../utils/excelExporter';

const RANGES: ReportRange[] = ['daily', 'weekly', 'monthly'];

const ALL_KINDS: { key: ReportKind; label: string; icon: React.ElementType; description: string; adminOnly?: boolean }[] = [
  { key: 'health', label: 'Server Health', icon: HeartPulse, description: 'CPU, memory, disk and availability samples.' },
  { key: 'backups', label: 'Backups', icon: DatabaseBackup, description: 'Backup runs, sizes and staleness.' },
  { key: 'audit', label: 'Audit Logs', icon: ScrollText, description: 'User sessions, authentication events, and administrative mutations.', adminOnly: true },
];

const controlClass =
  'w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const labelClass =
  'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1';

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const { user, can } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || can('audit:read');

  const kinds = ALL_KINDS.filter((k) => !k.adminOnly || isAdmin);

  const [kind, setKind] = useState<ReportKind>('health');
  const [range, setRange] = useState<ReportRange>('weekly');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [serverId, setServerId] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBackups, setPreviewBackups] = useState<BackupLog[]>([]);
  const [previewAuditLogs, setPreviewAuditLogs] = useState<AuditLog[]>([]);

  // Optional server scope.
  const { data: serverData, error: serverError } = useApi(() => serversApi.list({}), []);
  const servers = serverData?.servers ?? [];
  const selectedServer = servers.find((s) => s.id === serverId);

  const handleOpenPreview = async () => {
    setLoadingPreview(true);
    try {
      if (kind === 'backups') {
        const res = await backupsApi.list({ limit: 100 }).catch(() => ({ backups: [] }));
        setPreviewBackups(res.backups ?? []);
      } else if (kind === 'audit') {
        const res = await auditApi.list({ limit: 100 }).catch(() => ({ auditLogs: [] }));
        setPreviewAuditLogs(res.auditLogs ?? []);
      }
      setPreviewOpen(true);
    } catch (err) {
      toast.error('Failed to load report data', err instanceof ApiError ? err.message : 'Error fetching report items.');
      setPreviewOpen(true);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExportExcelDirect = async () => {
    setLoadingPreview(true);
    try {
      let backups: BackupLog[] = [];
      let auditLogs: AuditLog[] = [];
      if (kind === 'backups') {
        const res = await backupsApi.list({ limit: 100 }).catch(() => ({ backups: [] }));
        backups = res.backups ?? [];
      } else if (kind === 'audit') {
        const res = await auditApi.list({ limit: 100 }).catch(() => ({ auditLogs: [] }));
        auditLogs = res.auditLogs ?? [];
      }

      const scopeServers = serverId ? servers.filter((s) => s.id === serverId) : servers;
      const filename = generateAndDownloadExcel({
        kind,
        range,
        serverScopeName: selectedServer?.name,
        authorName: user?.name || user?.email || 'System Administrator',
        rawServers: scopeServers,
        rawBackups: backups,
        rawAuditLogs: auditLogs,
      });

      toast.success('Excel Report Generated', `Downloaded ${filename}`);
    } catch (err) {
      toast.error('Excel Export Failed', 'Could not generate Excel spreadsheet.');
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Reports & Documentation
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Preview, customize executive notes and entries, and download health, backup{isAdmin ? ', and audit' : ''} reports as PDF or Excel.
        </p>
      </div>

      {/* Report kind */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-3' : ''} gap-3`}>
        {kinds.map(({ key, label, icon: Icon, description, adminOnly }) => {
          const active = kind === key;
          return (
            <button
              key={key}
              onClick={() => setKind(key)}
              className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                active
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-blue-500'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                  {label}
                </div>
                {adminOnly && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Admin
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
            </button>
          );
        })}
      </div>

      {/* Options */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Range</label>
            <select className={controlClass} value={range} onChange={(e) => setRange(e.target.value as ReportRange)}>
              {RANGES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Format</label>
            <select className={controlClass} value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)}>
              <option value="pdf">PDF</option>
              <option value="excel">Excel (.xlsx / .csv)</option>
            </select>
          </div>
        </div>

        {!serverError && (
          <div>
            <label className={labelClass}>Server (optional)</label>
            <select className={controlClass} value={serverId} onChange={(e) => setServerId(e.target.value)}>
              <option value="">All servers</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.ipOrHostname})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {kind === 'audit'
                ? 'Leave as “All servers” for estate-wide audit events, or filter by a specific server.'
                : 'Leave as “All servers” for an estate-wide report, or scope it to one server.'}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleOpenPreview}
            disabled={loadingPreview}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-all cursor-pointer shadow-md hover:shadow-lg"
          >
            {loadingPreview ? (
              <Spinner size={16} className="text-white" />
            ) : (
              <FileText className="w-4.5 h-4.5" />
            )}
            {loadingPreview ? 'Preparing Report…' : 'Generate & Customize Formal Report'}
          </button>

          <button
            onClick={handleExportExcelDirect}
            disabled={loadingPreview}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-sm font-semibold disabled:opacity-60 transition-all cursor-pointer shadow-xs"
          >
            {loadingPreview ? (
              <Spinner size={14} className="text-emerald-700 dark:text-emerald-300" />
            ) : (
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            {loadingPreview ? 'Generating Excel…' : 'Export to Excel Spreadsheet (.xlsx)'}
          </button>
        </div>

        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Click <strong>"Generate & Customize Formal Report"</strong> to preview, edit executive narrative notes and metrics live, choose visual templates, and export as a formal styled PDF or formatted Excel document.
        </p>
      </div>

      {/* Report Preview Modal */}
      <ReportPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        kind={kind}
        range={range}
        format={format}
        serverScopeName={selectedServer?.name}
        authorName={user?.name || user?.email || 'System Administrator'}
        rawServers={serverId ? servers.filter((s) => s.id === serverId) : servers}
        rawBackups={previewBackups}
        rawAuditLogs={previewAuditLogs}
      />
    </div>
  );
};
