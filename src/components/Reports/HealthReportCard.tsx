import React from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

export const HealthReportCard: React.FC = () => {
  const { servers, alerts } = useMonitoring();

  const totalServers = servers.length;
  const operationalCount = servers.filter((s) => s.healthStatus === 'Operational').length;
  const warningCount = servers.filter((s) => s.healthStatus === 'Warning').length;
  const criticalCount = servers.filter((s) => s.healthStatus === 'Critical').length;

  const linuxCount = servers.filter((s) => s.os === 'Linux').length;
  const windowsCount = servers.filter((s) => s.os === 'Windows').length;

  const activeAlertsCount = alerts.filter((a) => a.status === 'Active').length;

  const healthyPercentage = totalServers > 0 ? ((operationalCount / totalServers) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
      {/* Total Monitored */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">
            Monitored Servers
          </span>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-slate-100 mt-1">
            {totalServers}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 font-mono">
            {linuxCount} Linux • {windowsCount} Windows
          </div>
        </div>
        <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* Operational Healthy */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">
            Operational
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {operationalCount}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">
            {healthyPercentage}% Healthy
          </div>
        </div>
        <div className="p-2.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* Warning State */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">
            Warning State
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {warningCount}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-semibold">
            Requires Maintenance
          </div>
        </div>
        <div className="p-2.5 rounded-sm bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Critical State */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm p-4 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">
            Critical State
          </span>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
            {criticalCount}
          </div>
          <div className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-semibold">
            {activeAlertsCount} Unresolved Alerts
          </div>
        </div>
        <div className="p-2.5 rounded-sm bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60">
          <XCircle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};