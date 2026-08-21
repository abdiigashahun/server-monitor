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
  CheckCircle2,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Terminal,
  Activity,
  Layers
} from 'lucide-react';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [name, setName] = useState('Dawit Bekele');
  const [role, setRole] = useState<UserRole>('Admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickFill = (targetRole: UserRole) => {
    setErrorMsg(null);
    setRole(targetRole);
    if (targetRole === 'Admin') {
      setName('Dawit Bekele');
      setPassword('admin123');
    } else if (targetRole === 'Operator') {
      setName('Sarah Jenkins');
      setPassword('operator123');
    } else {
      setName('Kassahun Abebe');
      setPassword('user123');
    }
  };

  const handleRoleSelect = (targetRole: UserRole) => {
    setRole(targetRole);
    setErrorMsg(null);
    if (targetRole === 'Admin' && password === 'operator123' || password === 'user123') {
      setPassword('admin123');
    } else if (targetRole === 'Operator' && password === 'admin123' || password === 'user123') {
      setPassword('operator123');
    } else if (targetRole === 'User' && password === 'admin123' || password === 'operator123') {
      setPassword('user123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter your full name or officer ID.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your security password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const result = await login(name, role, password, rememberMe);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070B12] text-white flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Background Decorative Tech Grid & Glowing Orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d15_1px,transparent_1px),linear-gradient(to_bottom,#1f293d15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Security Classification & National Telemetry */}
      <header className="relative z-10 w-full border-b border-gray-800/80 bg-[#0B0F17]/90 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ITDBLogo size="sm" showSubtext={false} />
          <span className="text-gray-600 dark:text-gray-600 font-mono text-xs">|</span>
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

      {/* Main Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-lg bg-[#0F172A]/90 border border-gray-800 rounded-xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-5">
          {/* Logo & Headline */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400 shadow-inner mb-1">
              <Server className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              ITDB Server Monitoring Portal
            </h1>
            <p className="text-xs text-gray-400">
              Enter your Name, select your System Role, and enter password to access national infrastructure telemetry
            </p>
          </div>

          {/* Quick Demo Role Autofill Presets */}
          <div className="space-y-2 bg-[#131E33]/90 border border-gray-700/60 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-300 uppercase tracking-wider">
              <span>Quick Role Presets</span>
              <span className="text-[10px] font-normal text-blue-400 font-mono">1-Click Load</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Admin Button */}
              <button
                type="button"
                onClick={() => handleQuickFill('Admin')}
                className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all cursor-pointer ${
                  role === 'Admin'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 border-gray-700'
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1">🛡️ Admin</span>
                <span className="text-[9px] opacity-80 font-mono">admin123</span>
              </button>

              {/* Operator Button */}
              <button
                type="button"
                onClick={() => handleQuickFill('Operator')}
                className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all cursor-pointer ${
                  role === 'Operator'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30'
                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 border-gray-700'
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1">👁️ Operator</span>
                <span className="text-[9px] opacity-80 font-mono">operator123</span>
              </button>

              {/* User Button */}
              <button
                type="button"
                onClick={() => handleQuickFill('User')}
                className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all cursor-pointer ${
                  role === 'User'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                    : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 border-gray-700'
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1">📋 User / Audit</span>
                <span className="text-[9px] opacity-80 font-mono">user123</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800 text-red-200 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>1. Your Full Name / Officer Name</span>
                <span className="text-[10px] text-gray-500 font-mono lowercase">required</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name (e.g. Dawit Bekele)"
                  className="w-full bg-[#070D18] border border-gray-700 rounded-md pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                  required
                />
              </div>
            </div>

            {/* 2. Role Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>2. Select Assigned System Role</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {role === 'Admin' ? '🛡️ Full Platform Control' : role === 'Operator' ? '👁️ Telemetry & Day-to-Day Alerts' : '📋 Read-Only Audits'}
                </span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('Admin')}
                  className={`p-2.5 rounded-md border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    role === 'Admin'
                      ? 'bg-blue-950/80 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                      : 'bg-[#070D18] border-gray-700 hover:border-gray-600 text-gray-400'
                  }`}
                >
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <span>Admin</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                    Add/Edit Servers & System Settings
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('Operator')}
                  className={`p-2.5 rounded-md border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    role === 'Operator'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                      : 'bg-[#070D18] border-gray-700 hover:border-gray-600 text-gray-400'
                  }`}
                >
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <span>Operator</span>
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                    Observe Telemetry & Handle Alerts
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('User')}
                  className={`p-2.5 rounded-md border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    role === 'User'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                      : 'bg-[#070D18] border-gray-700 hover:border-gray-600 text-gray-400'
                  }`}
                >
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <span>User / Auditor</span>
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                    Read-Only Telemetry & Backup Reports
                  </p>
                </button>
              </div>
            </div>

            {/* 3. Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  3. System Password
                </label>
                <span className="text-[10px] text-gray-400 font-mono">
                  Default: <strong className="text-blue-300">{role === 'Admin' ? 'admin123' : role === 'Operator' ? 'operator123' : 'user123'}</strong>
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter role security password"
                  className="w-full bg-[#070D18] border border-gray-700 rounded-md pl-9 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Audit Notice */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Remember session</span>
              </label>

              <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> Audit Logged
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
                  <span>Verifying Credentials & Initializing Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {role} ({name})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Features Breakdown */}
          <div className="border-t border-gray-800 pt-3 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mb-0.5" />
              <span className="text-[10px] font-semibold text-gray-300">256-Bit TLS</span>
              <span className="text-[8px] text-gray-500 font-mono">Encrypted Link</span>
            </div>
            <div className="flex flex-col items-center">
              <KeyRound className="w-4 h-4 text-blue-400 mb-0.5" />
              <span className="text-[10px] font-semibold text-gray-300">Role-Based RBAC</span>
              <span className="text-[8px] text-gray-500 font-mono">Admin / Opr / User</span>
            </div>
            <div className="flex flex-col items-center">
              <Terminal className="w-4 h-4 text-purple-400 mb-0.5" />
              <span className="text-[10px] font-semibold text-gray-300">Activity Tracker</span>
              <span className="text-[8px] text-gray-500 font-mono">Every Action Logged</span>
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
          Node: <strong className="text-gray-400">ADDIS-CENTRAL-01</strong> | Build 2026.8.19
        </div>
      </footer>
    </div>
  );
};
