import React, { useState } from 'react';
import { Modal } from '../Common/Modal';
import { Copy, Check, KeyRound, AlertTriangle, Layers, Server as ServerIcon } from 'lucide-react';
import type { CreateServerGroupAgentToken } from '../../types';

interface AgentTokenModalProps {
  open: boolean;
  token?: string | null;
  tokens?: CreateServerGroupAgentToken[];
  serverName?: string;
  context: 'create' | 'rotate' | 'group-create';
  onClose: () => void;
}

// One-time reveal of agent token(s). The backend returns raw token(s) only once
// (on create, group create, or rotate); it cannot be retrieved again, so we warn accordingly.
export const AgentTokenModal: React.FC<AgentTokenModalProps> = ({
  open,
  token,
  tokens,
  serverName,
  context,
  onClose,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const copySingle = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const copyAll = async () => {
    if (!tokens || tokens.length === 0) return;
    const summary = tokens
      .map(
        (t) =>
          `• [${t.role.toUpperCase()}] ${t.name} (${t.ipOrHostname})\n  Token: ${t.agentToken || 'No agent token'}`,
      )
      .join('\n\n');
    const header = `Server Group Agent Tokens (${tokens.length} servers):\n\n${summary}`;
    try {
      await navigator.clipboard.writeText(header);
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const isGroup = context === 'group-create' || (tokens && tokens.length > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isGroup
          ? 'Server Group Created — Agent Tokens'
          : context === 'create'
            ? 'Server Created — Agent Token'
            : 'New Agent Token'
      }
      subtitle={serverName || (isGroup ? `${tokens?.length || 0} server tokens generated` : undefined)}
      size={isGroup ? 'lg' : 'md'}
      footer={
        <div className="flex items-center justify-between w-full">
          {isGroup && (tokens?.length ?? 0) > 0 ? (
            <button
              onClick={copyAll}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAll ? 'All Tokens Copied' : 'Copy All Tokens'}
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
          >
            I've stored {isGroup ? 'them' : 'it'} securely
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            Copy {isGroup ? 'these tokens' : 'this token'} now — {isGroup ? 'they' : 'it'} will{' '}
            <strong>not be shown again</strong>. Configure each token on its respective monitoring
            agent so it can report health metrics.
          </p>
        </div>

        {isGroup && tokens && tokens.length > 0 ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {tokens.map((item, idx) => (
              <div
                key={item.serverId || idx}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.role === 'parent' ? (
                      <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ServerIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                      ({item.ipOrHostname})
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                      item.role === 'parent'
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {item.role}
                  </span>
                </div>

                {item.agentToken ? (
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 font-mono text-xs text-gray-800 dark:text-gray-100 break-all">
                      <KeyRound className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="break-all">{item.agentToken}</span>
                    </div>
                    <button
                      onClick={() => copySingle(item.agentToken!, `token-${idx}`)}
                      className="px-2.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold shrink-0"
                    >
                      {copiedId === `token-${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedId === `token-${idx}` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    No monitoring agent token (container-only group).
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Agent token
            </label>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono text-xs text-gray-800 dark:text-gray-100 break-all">
                <KeyRound className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="break-all">{token || 'No agent token required'}</span>
              </div>
              {token && (
                <button
                  onClick={() => copySingle(token, 'single-token')}
                  className="px-3 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                >
                  {copiedId === 'single-token' ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedId === 'single-token' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
