import React, { useState } from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { Sliders, Save, Mail, BellRing } from 'lucide-react';

export const ThresholdForm: React.FC = () => {
  const { thresholds, updateThresholds } = useMonitoring();

  const [diskLimit, setDiskLimit] = useState(thresholds.diskUsageLimitPct);
  const [cpuLimit, setCpuLimit] = useState(thresholds.cpuUsageLimitPct);
  const [memoryLimit, setMemoryLimit] = useState(thresholds.memoryUsageLimitPct);
  const [backupTimeout, setBackupTimeout] = useState(thresholds.backupFailureTimeoutHours);
  const [emailEnabled, setEmailEnabled] = useState(thresholds.emailAlertsEnabled);
  const [slackEnabled, setSlackEnabled] = useState(thresholds.slackAlertsEnabled);
  const [recipients, setRecipients] = useState(thresholds.alertRecipientEmails.join(', '));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipientArray = recipients
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    updateThresholds({
      diskUsageLimitPct: Number(diskLimit),
      cpuUsageLimitPct: Number(cpuLimit),
      memoryUsageLimitPct: Number(memoryLimit),
      backupFailureTimeoutHours: Number(backupTimeout),
      emailAlertsEnabled: emailEnabled,
      slackAlertsEnabled: slackEnabled,
      alertRecipientEmails: recipientArray,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 space-y-4 shadow-sm text-xs text-gray-800 dark:text-slate-200 transition-colors"
    >
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-slate-100">
            Threshold & Warning Limits Configuration
          </h3>
        </div>
        <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
          Section F - Functional Requirements
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Disk Usage Limit */}
        <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-sm border border-gray-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-gray-800 dark:text-slate-200">
              Disk Utilization Warning Limit (%)
            </label>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
              {diskLimit}%
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="98"
            value={diskLimit}
            onChange={(e) => setDiskLimit(Number(e.target.value))}
            className="w-full accent-blue-600 dark:accent-blue-500 cursor-pointer"
          />
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Default threshold: <strong className="text-gray-700 dark:text-slate-300">85%</strong>. Email & dashboard notification triggers if server disk exceeds this percentage.
          </p>
        </div>

        {/* CPU Usage Limit */}
        <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-sm border border-gray-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-gray-800 dark:text-slate-200">
              CPU Usage Warning Limit (%)
            </label>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
              {cpuLimit}%
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="98"
            value={cpuLimit}
            onChange={(e) => setCpuLimit(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Sustained high CPU threshold. Triggers critical alert when processor load stays above limit.
          </p>
        </div>

        {/* Memory Limit */}
        <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-sm border border-gray-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-gray-800 dark:text-slate-200">
              RAM Memory Limit (%)
            </label>
            <span className="font-mono font-bold text-red-600 dark:text-red-400 text-sm">
              {memoryLimit}%
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="98"
            value={memoryLimit}
            onChange={(e) => setMemoryLimit(Number(e.target.value))}
            className="w-full accent-red-600 dark:accent-red-500 cursor-pointer"
          />
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            System memory saturation warning threshold.
          </p>
        </div>

        {/* Backup Timeout */}
        <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-sm border border-gray-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-gray-800 dark:text-slate-200">
              Backup Max Delay Threshold (Hours)
            </label>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
              {backupTimeout}h
            </span>
          </div>
          <input
            type="number"
            min="1"
            max="72"
            value={backupTimeout}
            onChange={(e) => setBackupTimeout(Number(e.target.value))}
            className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-sm px-3 py-1.5 text-gray-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
          />
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Alert if server backup fails or is older than threshold (e.g. 24 hours).
          </p>
        </div>
      </div>

      {/* Notification Channel Settings */}
      <div className="pt-3 border-t border-gray-200 dark:border-slate-800 space-y-3 text-xs">
        <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-slate-200 flex items-center gap-2">
          <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Notification Dispatch Rules
        </h4>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-gray-700 dark:text-slate-300 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="rounded-sm accent-blue-600 dark:accent-blue-500"
            />
            Send Automatic Email Alerts
          </label>

          <label className="flex items-center gap-2 text-gray-700 dark:text-slate-300 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={slackEnabled}
              onChange={(e) => setSlackEnabled(e.target.checked)}
              className="rounded-sm accent-blue-600 dark:accent-blue-500"
            />
            Send Slack / Webhook Integration Alerts
          </label>
        </div>

        <div>
          <label className="block text-gray-700 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
            Alert Recipient Email Addresses (Comma Separated)
          </label>
          <input
            type="text"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="admin@gov.et, alerts@gov.et"
            className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-sm p-2 text-xs text-gray-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs rounded-sm flex items-center gap-2 shadow-sm transition-colors"
        >
          <Save className="w-4 h-4" /> Save Threshold Configuration
        </button>
      </div>
    </form>
  );
};