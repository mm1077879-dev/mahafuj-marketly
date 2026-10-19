import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Parse redirect deep link if user attempted accessing a protected admin page
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect') || '/admin/dashboard';

  const [email, setEmail] = useState('admin@marketly.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your administrator email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Submit credentials to authoritative backend endpoint
      const res = await api.login({
        email: email.trim().toLowerCase(),
        password,
      });

      // 2. Validate user holds administrative privileges
      if (res.user.role !== 'admin' && res.user.role !== 'super_admin') {
        setIsLoading(false);
        setErrorMessage(
          'Access Denied: This account is registered as a customer and does not possess administrator privileges.'
        );
        return;
      }

      // 3. Establish authenticated secure session in store & local storage
      dispatch(
        setCredentials({
          user: res.user,
          token: res.token,
        })
      );

      dispatch(
        addNotification({
          type: 'success',
          title: 'Admin Session Established',
          message: `Welcome back, ${res.user.name}. Authenticated as ${res.user.role.replace('_', ' ')}.`,
          duration: 4000,
        })
      );

      // 4. Redirect to requested deep link or dashboard
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Invalid administrator email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Storefront Link */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storefront</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <h2 className="mt-6 text-center font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
          Admin Portal Authentication
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          Enter verified administrator credentials to access the Marketly Control Center.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-3xl py-8 px-6 sm:px-10 shadow-2xl">
          {errorMessage && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-3">
              <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2"
              >
                Administrator Email Address *
              </label>
              <div className="relative rounded-2xl">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@marketly.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2"
              >
                Master Password *
              </label>
              <div className="relative rounded-2xl">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-900/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !email.trim() || !password}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authenticate & Access Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Default Bootstrap Credentials Info for Auditing */}
          <div className="mt-8 pt-6 border-t border-slate-700/60 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              System Admin Bootstrap: <code className="text-blue-400 font-mono">admin@marketly.com</code>
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Role-based enforcement prevents regular customers from viewing internal management dashboards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
