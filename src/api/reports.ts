import { rawFetch, apiFetch } from './client';
import type { ReportKind, ReportRange, ReportFormat, AuditLog, Pagination } from '../types';

export interface ReportParams {
  range: ReportRange;
  format: ReportFormat;
  serverId?: string;
}

// Pull `filename="..."` (or RFC 5987 `filename*=`) out of a Content-Disposition header.
function parseFilename(disposition: string | null): string | null {
  if (!disposition) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1] ?? null;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

async function fetchAuditLogsForReport(params: ReportParams): Promise<AuditLog[]> {
  const now = Date.now();
  let msAgo = 7 * 24 * 60 * 60 * 1000;
  if (params.range === 'daily') msAgo = 24 * 60 * 60 * 1000;
  if (params.range === 'monthly') msAgo = 30 * 24 * 60 * 60 * 1000;

  const fromDate = new Date(now - msAgo);
  const fromIso = fromDate.toISOString();

  let allLogs: AuditLog[] = [];
  let page = 1;
  const limit = 100;
  let totalPages = 1;

  // Fetch paginated logs up to 500 items max
  while (page <= totalPages && page <= 5) {
    try {
      const res = await apiFetch<{ auditLogs: AuditLog[]; pagination: Pagination }>('/audit-logs', {
        query: {
          page,
          limit,
          from: fromIso,
          targetId: params.serverId || undefined,
        },
      });
      const logs = res.auditLogs || [];
      allLogs = allLogs.concat(logs);
      totalPages = res.pagination?.totalPages || 1;
      page++;
      if (logs.length < limit) break;
    } catch {
      break;
    }
  }

  // Client-side date filter safeguard
  return allLogs.filter((log) => {
    if (!log.createdAt) return true;
    const logTime = new Date(log.createdAt).getTime();
    return logTime >= fromDate.getTime();
  });
}

function generateAuditCsv(logs: AuditLog[]): Blob {
  const headers = [
    'Log ID',
    'Timestamp (UTC)',
    'Action / Event',
    'Actor Name',
    'Actor Email',
    'Actor ID',
    'Target Type',
    'Target ID',
    'IP Address',
    'HTTP Path',
    'HTTP Method',
    'Metadata Details',
  ];

  const rows = logs.map((log) => {
    const meta = (log.metadata as Record<string, unknown>) || {};
    return [
      escapeCsvField(log.id),
      escapeCsvField(log.createdAt),
      escapeCsvField(log.action),
      escapeCsvField(log.user?.name || 'System'),
      escapeCsvField(log.user?.email || ''),
      escapeCsvField(log.userId || ''),
      escapeCsvField(log.targetType || ''),
      escapeCsvField(log.targetId || ''),
      escapeCsvField(meta.ip || ''),
      escapeCsvField(meta.path || ''),
      escapeCsvField(meta.method || ''),
      escapeCsvField(Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

function generateAuditHtml(logs: AuditLog[], params: ReportParams): Blob {
  const generatedAt = new Date().toUTCString();
  const rangeTitle = params.range.charAt(0).toUpperCase() + params.range.slice(1);
  const rowsHtml = logs
    .map((log) => {
      const meta = (log.metadata as Record<string, unknown>) || {};
      const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString() : '—';
      const actor = log.user ? `${log.user.name} (${log.user.email})` : 'System';
      const target = log.targetType ? `${log.targetType.toUpperCase()}: ${log.targetId || '—'}` : '—';
      return `
        <tr>
          <td style="white-space: nowrap; font-family: monospace; font-size: 11px;">${dateStr}</td>
          <td><span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px; background: #e0e7ff; color: #3730a3;">${log.action}</span></td>
          <td><strong>${actor}</strong></td>
          <td style="font-family: monospace; font-size: 11px;">${target}</td>
          <td style="font-size: 11px; color: #64748b;">${meta.ip ? `IP: ${meta.ip} ` : ''}${meta.path ? `[${meta.method || 'REQ'}] ${meta.path}` : ''}</td>
        </tr>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Audit Logs Report - ${rangeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 24px; max-width: 1200px; margin: 0 auto; line-height: 1.5; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 22px; font-weight: bold; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; background: #f8fafc; flex: 1; }
    .stat-val { font-size: 20px; font-weight: bold; color: #2563eb; }
    .stat-lbl { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 600; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) { background: #f8fafc; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">Server Monitor — Audit Logs Report</h1>
      <div class="subtitle">Scope: ${params.serverId ? 'Server ' + params.serverId : 'All Estate'} | Period: ${rangeTitle} | Generated: ${generatedAt}</div>
    </div>
    <div class="no-print">
      <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Print / Save as PDF</button>
    </div>
  </div>
  <div class="stats">
    <div class="stat-card"><div class="stat-val">${logs.length}</div><div class="stat-lbl">Total Audit Events</div></div>
    <div class="stat-card"><div class="stat-val">${new Set(logs.map(l => l.userId).filter(Boolean)).size}</div><div class="stat-lbl">Active Actors</div></div>
    <div class="stat-card"><div class="stat-val">${logs.filter(l => l.action.startsWith('auth:')).length}</div><div class="stat-lbl">Auth Events</div></div>
    <div class="stat-card"><div class="stat-val">${logs.filter(l => !l.action.startsWith('auth:')).length}</div><div class="stat-lbl">System Mutations</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Action</th>
        <th>Actor</th>
        <th>Target Resource</th>
        <th>Context / Details</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">No audit logs recorded in this period.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
  return new Blob([html], { type: 'text/html;charset=utf-8;' });
}

// Fetches the report as a binary blob and triggers a browser download.
// Health defaults to PDF, backups to Excel on the backend, but we always pass an
// explicit `format`. Returns the filename used.
export async function download(kind: ReportKind, params: ReportParams): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (kind === 'audit') {
    try {
      const res = await rawFetch(`/reports/${kind}`, { query: { ...params } });
      if (res.ok) {
        const blob = await res.blob();
        const filename =
          parseFilename(res.headers.get('Content-Disposition')) ||
          `audit-report-${params.range}-${timestamp}.${params.format === 'excel' ? 'xlsx' : 'pdf'}`;
        triggerDownload(blob, filename);
        return filename;
      }
    } catch {
      // Backend does not support /reports/audit; fallback to client-side report compiler
    }

    const logs = await fetchAuditLogsForReport(params);
    if (params.format === 'excel') {
      const blob = generateAuditCsv(logs);
      const filename = `audit-report-${params.range}-${timestamp}.csv`;
      triggerDownload(blob, filename);
      return filename;
    } else {
      const blob = generateAuditHtml(logs, params);
      const filename = `audit-report-${params.range}-${timestamp}.html`;
      triggerDownload(blob, filename);
      return filename;
    }
  }

  const res = await rawFetch(`/reports/${kind}`, { query: { ...params } });
  const blob = await res.blob();
  const filename =
    parseFilename(res.headers.get('Content-Disposition')) ||
    `${kind}-report-${params.range}.${params.format === 'excel' ? 'xlsx' : 'pdf'}`;
  triggerDownload(blob, filename);
  return filename;
}
