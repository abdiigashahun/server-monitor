import React, { useState } from 'react';
import { Modal } from '../Common/Modal';
import { Copy, Check, KeyRound, AlertTriangle } from 'lucide-react';

interface AgentTokenModalProps {
  open: boolean;
  token: string | null;
  serverName?: string;
  context: 'create' | 'rotate';
  onClose: () => void;
}

// One-time reveal of an agent token. The backend returns the raw token only once
// (on create or rotate); it cannot be retrieved again, so we warn accordingly.
export const AgentTokenModal: React.FC<AgentTokenModalProps> = ({
  open,
  token,
  serverName,
  context,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={context === 'create' ? 'Server created — agent token' : 'New agent token'}
      subtitle={serverName}
      size="md"
      footer={
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
        >
          I've stored it securely
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            Copy this token now — it will <strong>not be shown again</strong>. Configure it on the
            server's monitoring agent so it can report health. If lost, rotate the token to issue a
            new one.
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Agent token
          </label>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono text-xs text-gray-800 dark:text-gray-100 break-all">
              <KeyRound className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="break-all">{token}</span>
            </div>
            <button
              onClick={copy}
              className="px-3 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
