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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-sm w-full max-w-lg shadow-xl overflow-hidden text-gray-900 animate-in fade-in zoom-in duration-150">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Acknowledge Alert</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 p-3.5 rounded-sm border border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Server: <strong className="text-gray-800 font-mono">{alert.serverName}</strong></span>
              <span>Metric: <strong className="text-gray-800 font-semibold">{alert.metric}</strong></span>
            </div>
            <h4 className="font-bold text-sm text-gray-900">{alert.title}</h4>
            <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Action / Resolution Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Assigned ticket to sysadmin team, verified log rotation underway..."
              className="w-full h-24 bg-gray-50 border border-gray-200 rounded-sm p-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 rounded-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(alert.id, note);
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-sm flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" /> Confirm Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
