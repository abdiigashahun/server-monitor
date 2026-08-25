import React from 'react';
import { useMonitoring } from '../../context/MonitoringContext';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export const NotificationToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useMonitoring();

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
              toast.type === 'critical'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/50'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/50'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50'
                : 'bg-slate-900/90 border-slate-700/60 text-slate-100 shadow-slate-950/50'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'critical' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-400" />}
            </div>

            <div className="flex-1 pr-4">
              <h4 className="font-semibold text-sm leading-tight">{toast.title}</h4>
              <p className="text-xs opacity-90 mt-1 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
