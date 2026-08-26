import { downloadFile } from './apiClient';

export const reportsApi = {
  async downloadHealthReport(format: 'pdf' | 'excel' = 'pdf'): Promise<void> {
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    const filename = `server_health_report_${new Date().toISOString().slice(0, 10)}.${ext}`;
    await downloadFile(`/reports/health?format=${format}`, filename);
  },

  async downloadBackupsReport(format: 'pdf' | 'excel' = 'pdf'): Promise<void> {
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    const filename = `server_backups_report_${new Date().toISOString().slice(0, 10)}.${ext}`;
    await downloadFile(`/reports/backups?format=${format}`, filename);
  },
};
