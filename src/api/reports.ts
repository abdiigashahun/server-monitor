import { rawFetch } from './client';
import type { ReportKind, ReportRange, ReportFormat } from '../types';

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

// Fetches the report as a binary blob and triggers a browser download.
// Health, backups, and audit all stream from GET /reports/{kind}.
export async function download(kind: ReportKind, params: ReportParams): Promise<string> {
  const res = await rawFetch(`/reports/${kind}`, { query: { ...params } });
  const blob = await res.blob();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename =
    parseFilename(res.headers.get('Content-Disposition')) ||
    `${kind}-report-${params.range}-${timestamp}.${params.format === 'excel' ? 'xlsx' : 'pdf'}`;
  triggerDownload(blob, filename);
  return filename;
}
