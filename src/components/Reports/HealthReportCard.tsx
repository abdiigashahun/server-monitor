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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
      {/* Total Monitored */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Monitored Servers</span>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">{totalServers}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-mono">
            {linuxCount} Linux • {windowsCount} Windows
          </div>
        </div>
        <div className="p-2.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* Operational Healthy */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Operational</span>
          <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400 mt-1">{operationalCount}</div>
          <div className="text-[11px] text-green-700 dark:text-green-400 mt-1 font-semibold">
            {((operationalCount / totalServers) * 100).toFixed(1)}% Healthy
          </div>
        </div>
        <div className="p-2.5 rounded-sm bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* Warning State */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Warning State</span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{warningCount}</div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-semibold">
            Requires Maintenance
          </div>
        </div>
        <div className="p-2.5 rounded-sm bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Critical State */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm p-4 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Critical State</span>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">{criticalCount}</div>
          <div className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-semibold">
            {activeAlertsCount} Unresolved Alerts
          </div>
        </div>
        <div className="p-2.5 rounded-sm bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
          <XCircle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
