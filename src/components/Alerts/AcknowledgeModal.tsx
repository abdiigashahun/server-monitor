import React, { useState } from 'react';
import { Alert } from '../../types';
import { ShieldAlert, X, Check } from 'lucide-react';

interface AcknowledgeModalProps {
  alert: Alert | null;
  onClose: () => void;
  onConfirm: (alertId: string, note: string) => void;
}

export const AcknowledgeModal: React.FC<AcknowledgeModalProps> = ({
  alert,
  onClose,
  onConfirm,
}) => {
  const [note, setNote] = useState('');

  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm w-full max-w-lg shadow-xl overflow-hidden text-gray-900 dark:text-gray-100 animate-in fade-in zoom-in duration-150 text-xs">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">Acknowledge Alert</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-sm cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Server: <strong className="text-gray-800 dark:text-gray-200 font-mono">{alert.serverName}</strong></span>
              <span>Metric: <strong className="text-gray-800 dark:text-gray-200 font-semibold">{alert.metric}</strong></span>
            </div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{alert.title}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{alert.description}</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
              Action / Resolution Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Assigned ticket to sysadmin team, verified log rotation underway..."
              className="w-full h-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-3 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(alert.id, note);
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-sm flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4" /> Confirm Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
