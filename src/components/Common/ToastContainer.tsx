import React from 'react';
import { useToast } from '../../context/ToastContext';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

// Renders the transient action-feedback toasts from ToastContext. This is local
// UX only — it does not fake any backend data.

const TOAST_CHROME: Record<string, string> = {
  critical:
    'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/90 dark:border-rose-500/40 dark:text-rose-100',
  warning:
    'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/90 dark:border-amber-500/40 dark:text-amber-100',
  success:
    'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-500/40 dark:text-emerald-100',
  info:
    'bg-white border-slate-200 text-slate-800 dark:bg-slate-900/90 dark:border-slate-700/60 dark:text-slate-100',
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 relative overflow-hidden ${
              TOAST_CHROME[toast.type] ?? TOAST_CHROME.info
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'critical' && <AlertCircle className="w-5 h-5 text-rose-500" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-500" />}
            </div>

            <div className="flex-1 pr-4">
              <h4 className="font-semibold text-sm leading-tight">{toast.title}</h4>
              {toast.message && (
                <p className="text-xs opacity-90 mt-1 leading-relaxed">{toast.message}</p>
              )}
            </div>

            <button
              onClick={() => dismiss(toast.id)}
              className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
