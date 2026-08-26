import React from 'react';
import { Alert } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatTimestamp, getSeverityBadgeClass } from '../../utils/formatters';
import { AlertTriangle, ShieldAlert, CheckCircle2, Check, Clock, Server, Lock } from 'lucide-react';

interface AlertCardProps {
  alert: Alert;
  onAcknowledgeClick: (alert: Alert) => void;
  onResolveClick: (alertId: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledgeClick,
  onResolveClick,
}) => {
  const { user, hasPermission } = useAuth();
  const canHandleAlerts = user?.role === 'Admin' || user?.role === 'Operator' || hasPermission('canAckAlerts');

  return (
    <div
      className={`p-4 rounded-sm border transition-all shadow-sm ${
        alert.status === 'Active'
          ? alert.severity === 'Critical'
            ? 'bg-white dark:bg-[#111827] border-l-4 border-l-red-600 border-gray-200 dark:border-gray-800'
            : 'bg-white dark:bg-[#111827] border-l-4 border-l-amber-500 border-gray-200 dark:border-gray-800'
          : alert.status === 'Acknowledged'
          ? 'bg-white dark:bg-[#111827] border-l-4 border-l-blue-500 border-gray-200 dark:border-gray-800'
          : 'bg-gray-50 dark:bg-gray-800/40 border-l-4 border-l-gray-400 dark:border-l-gray-600 border-gray-200 dark:border-gray-800 opacity-85'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {alert.severity === 'Critical' ? (
              <span className="p-2 rounded-sm bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 block border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-5 h-5" />
              </span>
            ) : alert.severity === 'Warning' ? (
              <span className="p-2 rounded-sm bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 block border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-5 h-5" />
              </span>
            ) : (
              <span className="p-2 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 block border border-blue-200 dark:border-blue-800">
                <ShieldAlert className="w-5 h-5" />
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${getSeverityBadgeClass(alert.severity)}`}>
                {alert.severity}
              </span>

              <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                {alert.serverName}
              </span>

              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                ({alert.ipAddress})
              </span>
            </div>

            <h3 className="font-bold text-sm text-gray-900 dark:text-white mt-1.5">{alert.title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{alert.description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div>
                Recorded Metric: <span className="font-mono font-bold text-red-600 dark:text-red-400">{alert.value}</span>
              </div>
              <div>
                Configured Limit: <span className="font-mono text-gray-800 dark:text-gray-200 font-semibold">{alert.threshold}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                {formatTimestamp(alert.timestamp)}
              </div>
            </div>

            {alert.acknowledgedBy && (
              <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-sm inline-block">
                Acknowledged by <strong>{alert.acknowledgedBy}</strong> at {formatTimestamp(alert.acknowledgedAt || '')}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex sm:flex-col items-end gap-2 shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
          {/* Admin Action: ONLY Acknowledge */}
          {user?.role === 'Admin' && (
            <>
              {alert.status === 'Active' && (
                <button
                  onClick={() => onAcknowledgeClick(alert)}
                  className="px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-sm transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Acknowledge
                </button>
              )}
              {alert.status === 'Acknowledged' && (
                <span className="px-2.5 py-1 rounded-sm text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Acknowledged
                </span>
              )}
            </>
          )}

          {/* Operator Action: ONLY Resolve */}
          {user?.role === 'Operator' && (
            <>
              {alert.status !== 'Resolved' && (
                <button
                  onClick={() => onResolveClick(alert.id)}
                  className="px-3 py-1.5 text-xs font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/60 hover:bg-green-100 dark:hover:bg-green-900/60 border border-green-200 dark:border-green-800 rounded-sm transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve Alert
                </button>
              )}
            </>
          )}

          {/* Read-Only Viewer Status */}
          {user?.role !== 'Admin' && user?.role !== 'Operator' && alert.status !== 'Resolved' && (
            <span className="px-2.5 py-1 rounded-sm text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-500" /> Status: {alert.status}
            </span>
          )}

          {/* Cleared / Resolved State */}
          {alert.status === 'Resolved' && (
            <span className="px-2.5 py-1 rounded-sm text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

