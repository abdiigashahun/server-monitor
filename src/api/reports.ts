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

function extensionFor(format: ReportFormat): string {
  return format === 'excel' ? 'xlsx' : 'pdf';
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
// Health defaults to PDF, backups to Excel on the backend, but we always pass an
// explicit `format`. Returns the filename used.
export async function download(kind: ReportKind, params: ReportParams): Promise<string> {
  const res = await rawFetch(`/reports/${kind}`, { query: { ...params } });
  const blob = await res.blob();
  const filename =
    parseFilename(res.headers.get('Content-Disposition')) ||
    `${kind}-report-${params.range}.${extensionFor(params.format)}`;
  triggerDownload(blob, filename);
  return filename;
}
