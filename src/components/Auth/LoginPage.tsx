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
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          <div className="bg-amber-950/40 border border-amber-800/50 text-amber-300 rounded px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
            Restricted System (ISO 27001)
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-md bg-[#0F172A]/90 border border-gray-800 rounded-xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-5">
          {/* Logo & Headline */}
          <div className="text-center flex flex-col items-center space-y-2">
            <div className="p-3 bg-[#0B132B] border border-gray-700/80 rounded-xl shadow-inner inline-flex items-center justify-center">
              <ITDBLogo size="lg" showSubtext={false} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Sign In to ITDB Portal
            </h1>
            <p className="text-xs text-gray-400">
              Federal Unified Server Infrastructure & NOC Monitor
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-start gap-2.5 text-xs text-red-200 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Username / Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or email (e.g. admin, operator)"
                  required
                  autoFocus
                  className="w-full bg-[#0B132B] border border-gray-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#0B132B] border border-gray-700/80 rounded-lg pl-9 pr-10 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none"
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
                  className="w-3.5 h-3.5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>Remember session</span>
              </label>

              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> JWT Auth
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-gray-800/80 bg-[#0B0F17]/90 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-gray-500 text-xs gap-2">
        <div>
          <span>© {new Date().getFullYear()} Innovation and Technology Bureau (ITDB). All rights reserved.</span>
        </div>
        <div className="font-mono text-[10px] text-gray-500">
          Gateway: <strong className="text-gray-400">REST API v1.0.0</strong> | ISO 27001
        </div>
      </footer>
    </div>
  );
};
