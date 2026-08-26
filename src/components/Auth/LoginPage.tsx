import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ITDBLogo } from '../Common/ITDBLogo';
import { ApiError } from '../../api/client';
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Server,
  KeyRound,
  AlertCircle,
  ArrowRight,
  Terminal,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(
          err.status === 401 || err.code === 'INVALID_CREDENTIALS'
            ? 'Invalid email or password.'
            : err.message,
        );
      } else {
        setErrorMsg('Unable to reach the authentication service. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070B12] text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background decorative grid & glowing orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d15_1px,transparent_1px),linear-gradient(to_bottom,#1f293d15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top classification bar */}
      <header className="relative z-10 w-full border-b border-gray-800/80 bg-[#0B0F17]/90 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ITDBLogo size="sm" showSubtext={false} />
          <span className="text-gray-600 font-mono text-xs">|</span>
          <span className="text-[11px] font-mono font-semibold tracking-wider text-gray-400 uppercase">
            Federal Unified Data Operations Portal
          </span>
        </div>
        <div className="bg-amber-950/40 border border-amber-800/50 text-amber-300 rounded px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">
          Restricted System (ISO 27001)
        </div>
      </header>

      {/* Login box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-md bg-[#0F172A]/90 border border-gray-800 rounded-xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <div className="inline-flex p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400 shadow-inner mb-1">
              <Server className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              ITDB Server Monitoring Portal
            </h1>
            <p className="text-xs text-gray-400">
              Sign in with your credentials to access infrastructure telemetry.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800 text-red-200 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@itdb.gov.et"
                  autoComplete="username"
                  className="w-full bg-[#070D18] border border-gray-700 rounded-md pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full bg-[#070D18] border border-gray-700 rounded-md pl-9 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-md shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-gray-800 pt-3 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mb-0.5" />
              <span className="text-[10px] font-semibold text-gray-300">256-Bit TLS</span>
            </div>
            <div className="flex flex-col items-center">
              <KeyRound className="w-4 h-4 text-blue-400 mb-0.5" />
              <span className="text-[10px] font-semibold text-gray-300">Role-Based Access</span>
            </div>
            <div className="flex flex-col items-center">
              <Terminal className="w-4 h-4 text-purple-400 mb-0.5" />
              <span className="text-[10px] font-semibold text-gray-300">Audit Logged</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full border-t border-gray-800/80 bg-[#0B0F17]/90 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-gray-500 text-xs gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Government Enterprise Cloud Infrastructure &amp; Telemetry Gateway</span>
        </div>
        <div className="font-mono text-[10px] text-gray-500">ITDB Server Monitor</div>
      </footer>
    </div>
  );
};
