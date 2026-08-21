import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ITDBLogo } from '../Common/ITDBLogo';
import {
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Server,
  KeyRound,
  AlertCircle,
  ArrowRight,
  Terminal,
  Activity,
  Users
} from 'lucide-react';
import { UserAccount } from '../../types';

export const LoginPage: React.FC = () => {
  const { login, accounts } = useAuth();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickFill = (acc: UserAccount) => {
    setErrorMsg(null);
    setUsername(acc.username);
    setPassword(acc.passwordHash);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Please enter your username or email.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    const result = await login(username, password, rememberMe);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070B12] text-white flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Background Tech Glow & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d15_1px,transparent_1px),linear-gradient(to_bottom,#1f293d15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full border-b border-gray-800/80 bg-[#0B0F17]/90 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ITDBLogo size="sm" showSubtext={false} />
          <span className="text-gray-600 font-mono text-xs">|</span>
          <span className="text-[11px] font-mono font-semibold tracking-wider text-gray-400 uppercase">
            Federal Unified Data Operations Portal
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 bg-blue-950/60 border border-blue-800/60 rounded px-2.5 py-1 text-[11px] font-mono text-blue-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>10 Data Centers Connected</span>
          </div>
          <div className="bg-amber-950/40 border border-amber-800/50 text-amber-300 rounded px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">
            Restricted System (ISO 27001)
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-md bg-[#0F172A]/90 border border-gray-800 rounded-xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-5">
          {/* Logo & Headline */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400 shadow-inner mb-1">
              <Server className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Sign In to ITDB Portal
            </h1>
            <p className="text-xs text-gray-400">
              Enter your username and password to access the monitoring dashboard
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800 text-red-200 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username (e.g. admin, operator, user)"
                  className="w-full bg-[#070D18] border border-gray-700 rounded-md pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
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
                  className="w-full bg-[#070D18] border border-gray-700 rounded-md pl-9 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> ISO 27001 Logged
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-md shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="space-y-2 pt-2 border-t border-gray-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Demo Accounts (1-Click Fill)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {accounts.slice(0, 3).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className={`p-2 rounded border text-left transition-all cursor-pointer ${
                    username === acc.username
                      ? 'bg-blue-950/80 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                      : 'bg-[#0B132B] hover:bg-[#131F42] border-gray-700/80 text-gray-300'
                  }`}
                >
                  <div className="text-[10px] font-bold truncate flex items-center justify-between">
                    <span>{acc.user.role}</span>
                  </div>
                  <div className="text-[9px] font-mono text-gray-400 truncate">
                    {acc.username}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-gray-800/80 bg-[#0B0F17]/90 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-gray-500 text-xs gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Government Enterprise Cloud Infrastructure & Telemetry Gateway</span>
        </div>
        <div className="font-mono text-[10px] text-gray-500">
          Node: <strong className="text-gray-400">ADDIS-CENTRAL-01</strong> | Build 2026.8.21
        </div>
      </footer>
    </div>
  );
};
