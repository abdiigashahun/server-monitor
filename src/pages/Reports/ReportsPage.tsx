import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import * as reportsApi from '../../api/reports';
import * as serversApi from '../../api/servers';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/client';
import { Spinner } from '../../components/Common/Spinner';
import { FileText, Download, HeartPulse, DatabaseBackup, CheckCircle2 } from 'lucide-react';
import type { ReportKind, ReportRange, ReportFormat } from '../../types';

const RANGES: ReportRange[] = ['daily', 'weekly', 'monthly'];

const KINDS: { key: ReportKind; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'health', label: 'Server Health', icon: HeartPulse, description: 'CPU, memory, disk and availability samples.' },
  { key: 'backups', label: 'Backups', icon: DatabaseBackup, description: 'Backup runs, sizes and staleness.' },
];

const controlClass =
  'w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
const labelClass =
  'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1';

export const ReportsPage: React.FC = () => {
  const toast = useToast();

  const [kind, setKind] = useState<ReportKind>('health');
  const [range, setRange] = useState<ReportRange>('weekly');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [serverId, setServerId] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);

  // Optional server scope. If the user can't read servers, we silently omit the picker.
  const { data: serverData, error: serverError } = useApi(() => serversApi.list({}), []);
  const servers = serverData?.servers ?? [];

  const handleDownload = async () => {
    setDownloading(true);
    setLastFile(null);
    try {
      const filename = await reportsApi.download(kind, {
        range,
        format,
        serverId: serverId || undefined,
      });
      setLastFile(filename);
      toast.success('Report downloaded', filename);
    } catch (err) {
      toast.error('Report failed', err instanceof ApiError ? err.message : 'Could not generate the report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Reports
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Generate and download health and backup reports as PDF or Excel.
        </p>
      </div>

      {/* Report kind */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {KINDS.map(({ key, label, icon: Icon, description }) => {
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
              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                {label}
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
              <option value="excel">Excel (.xlsx)</option>
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
              Leave as “All servers” for an estate-wide report, or scope it to one server.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors cursor-pointer"
          >
            {downloading ? (
              <Spinner size={16} className="text-white" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading ? 'Generating…' : 'Download report'}
          </button>
          {lastFile && !downloading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              Downloaded {lastFile}
            </span>
          )}
        </div>
        {downloading && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Large reports may take a moment to compile on the server.
          </p>
        )}
      </div>
    </div>
  );
};
