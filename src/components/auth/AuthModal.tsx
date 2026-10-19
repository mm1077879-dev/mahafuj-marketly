import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import {
  X,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type OAuthProvider = 'google' | 'facebook';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<OAuthProvider | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const oauthPopupRef = useRef<Window | null>(null);
  const oauthPopupMonitorRef = useRef<number | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;

    if (oauthPopupMonitorRef.current !== null) {
      window.clearInterval(oauthPopupMonitorRef.current);
      oauthPopupMonitorRef.current = null;
    }
    oauthPopupRef.current?.close();
    oauthPopupRef.current = null;
    setActiveProvider(null);
    setIsLoading(false);
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Listen for OAuth Popup callbacks
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        !oauthPopupRef.current ||
        event.source !== oauthPopupRef.current
      ) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_CODE') {
        const { provider, code, state } = event.data;
        if (
          (provider !== 'google' && provider !== 'facebook') ||
          typeof code !== 'string' ||
          typeof state !== 'string'
        ) {
          return;
        }
        oauthPopupRef.current = null;
        if (oauthPopupMonitorRef.current !== null) {
          window.clearInterval(oauthPopupMonitorRef.current);
          oauthPopupMonitorRef.current = null;
        }
        setActiveProvider(provider);
        setIsLoading(true);
        setErrorMessage(null);
        try {
          const authResult =
            provider === 'google'
              ? await api.verifyGoogleAuth(code, state)
              : await api.verifyFacebookAuth(code, state);

          dispatch(setCredentials(authResult));
          dispatch(
            addNotification({
              type: 'success',
              title: 'Signed In',
              message: `Welcome back, ${authResult.user.name}!`,
              duration: 4000,
            })
          );
          onClose();
        } catch (error: unknown) {
          setErrorMessage(getErrorMessage(error, `Failed to complete ${provider} authentication`));
        } finally {
          setIsLoading(false);
          setActiveProvider(null);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        oauthPopupRef.current = null;
        if (oauthPopupMonitorRef.current !== null) {
          window.clearInterval(oauthPopupMonitorRef.current);
          oauthPopupMonitorRef.current = null;
        }
        const provider = event.data.provider;
        const providerName =
          provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'Social';
        setErrorMessage(`${providerName} sign-in was cancelled or could not be completed.`);
        setIsLoading(false);
        setActiveProvider(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [dispatch, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Full name is required.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (!agreeTerms) {
        setErrorMessage('Please accept the Terms of Service and Privacy Policy to continue.');
        return;
      }

      setIsLoading(true);
      try {
        const result = await api.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        dispatch(setCredentials(result));
        dispatch(
          addNotification({
            type: 'success',
            title: 'Account Created',
            message: `Welcome to Marketly, ${result.user.name}!`,
            duration: 4000,
          })
        );
        onClose();
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error, 'Registration failed. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login
      setIsLoading(true);
      try {
        const result = await api.login({
          email: email.trim(),
          password,
        });

        dispatch(setCredentials(result));
        dispatch(
          addNotification({
            type: 'success',
            title: 'Signed In Successfully',
            message: `Welcome back, ${result.user.name}!`,
            duration: 3500,
          })
        );
        onClose();
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error, 'Invalid email or password.'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSocialSignIn = async (provider: OAuthProvider) => {
    if (isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);
    setActiveProvider(provider);
    const providerName = provider === 'google' ? 'Google' : 'Facebook';
    const popupFeatures =
      provider === 'google'
        ? 'width=550,height=650,left=200,top=100'
        : 'width=600,height=700,left=200,top=100';
    const authWindow = window.open('about:blank', `${provider}_oauth_popup`, popupFeatures);

    if (!authWindow) {
      setErrorMessage('Popup was blocked by your browser. Please allow popups for this site.');
      setIsLoading(false);
      setActiveProvider(null);
      return;
    }

    oauthPopupRef.current = authWindow;
    oauthPopupMonitorRef.current = window.setInterval(() => {
      if (!authWindow.closed) return;

      if (oauthPopupMonitorRef.current !== null) {
        window.clearInterval(oauthPopupMonitorRef.current);
        oauthPopupMonitorRef.current = null;
      }
      oauthPopupRef.current = null;
      setErrorMessage(`${providerName} sign-in was cancelled.`);
      setIsLoading(false);
      setActiveProvider(null);
    }, 500);

    try {
      const { url } =
        provider === 'google'
          ? await api.getGoogleAuthUrl()
          : await api.getFacebookAuthUrl();
      if (!authWindow.closed) {
        authWindow.location.href = url;
      }
    } catch (error: unknown) {
      authWindow.close();
      oauthPopupRef.current = null;
      if (oauthPopupMonitorRef.current !== null) {
        window.clearInterval(oauthPopupMonitorRef.current);
        oauthPopupMonitorRef.current = null;
      }
      setIsLoading(false);
      setActiveProvider(null);
      setErrorMessage(getErrorMessage(error, `${providerName} sign-in could not be started.`));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-900/70 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md sm:max-w-xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain transform transition-all relative my-auto"
      >
        {/* Header Bar — static brand header (mode is switched by the lower switcher only) */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm rounded-t-2xl sm:rounded-t-3xl px-6 sm:px-10 pt-6 sm:pt-8 pb-4 sm:pb-5 flex items-start justify-between gap-3 border-b border-slate-100 z-10">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md shadow-blue-500/25">
              M
            </div>
            <div className="min-w-0">
              <h2 id="auth-modal-title" className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
                Welcome to Marketly
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Track orders, save items, and enjoy member benefits.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="px-6 sm:px-10 pt-6 sm:pt-7 pb-6 sm:pb-8 space-y-5">
          {errorMessage && (
            <div
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <div className="space-y-3">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 absolute">
                Or continue with
              </span>
            </div>

            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialSignIn('google')}
                disabled={isLoading}
                aria-busy={activeProvider === 'google' && isLoading}
                className="w-full min-h-11 py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2"
                aria-label="Continue with Google"
              >
                {activeProvider === 'google' && isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSocialSignIn('facebook')}
                disabled={isLoading}
                aria-busy={activeProvider === 'facebook' && isLoading}
                className="w-full min-h-11 py-2.5 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2"
                aria-label="Continue with Facebook"
              >
                {activeProvider === 'facebook' && isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Continue with Facebook</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mahim Haque"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-email"
                ref={emailInputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-bold text-slate-700 mb-1.5">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="terms-checkbox" className="text-[11px] text-slate-600 leading-tight">
                I agree to the{' '}
                <a href="#terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                .
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all hover:shadow-lg hover:shadow-blue-500/25 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : mode === 'register' ? (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Footer switcher — the primary authentication switcher */}
        <div className="sticky bottom-0 bg-slate-50/95 backdrop-blur-sm rounded-b-2xl sm:rounded-b-3xl border-t border-slate-100 px-6 sm:px-10 py-4">
          <div
            className="grid grid-cols-2 gap-1 p-1 bg-white border border-slate-200 rounded-xl"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`w-full py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`w-full py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              Create Account
            </button>
          </div>
          <p className="mt-2.5 text-center text-xs text-slate-500">
            {mode === 'register'
              ? 'Already have an account? Switch to Sign In above.'
              : "Don't have an account yet? Switch to Create Account above."}
          </p>
        </div>
      </div>
    </div>
  );
};
