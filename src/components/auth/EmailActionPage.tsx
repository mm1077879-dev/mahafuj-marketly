import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser, setUser } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

interface EmailActionPageProps {
  verificationToken: string | null;
  resetToken: string | null;
}

export const EmailActionPage: React.FC<EmailActionPageProps> = ({
  verificationToken,
  resetToken,
}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => verificationToken ?? resetToken ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const isPasswordReset = Boolean(resetToken);
  const emailDeliveryDisabled = true;

  useEffect(() => {
    const currentToken = verificationToken ?? resetToken;
    if (currentToken) setToken(currentToken);

    const sanitizedParams = new URLSearchParams(location.search);
    sanitizedParams.delete('verifyToken');
    sanitizedParams.delete('resetToken');
    sanitizedParams.delete('email');
    const sanitizedFragment = new URLSearchParams(location.hash.slice(1));
    sanitizedFragment.delete('verifyToken');
    sanitizedFragment.delete('resetToken');
    sanitizedFragment.delete('email');
    const nextSearch = sanitizedParams.toString();
    const nextHash = sanitizedFragment.toString();
    const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}${nextHash ? `#${nextHash}` : ''}`;
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    if (nextUrl !== currentUrl) {
      navigate(nextUrl, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate, resetToken, verificationToken]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('Email delivery is disabled in this deployment. Please contact support or your administrator for account access help.');
    setIsSubmitting(false);
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-12 sm:py-20">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isComplete
            ? isPasswordReset
              ? 'Password updated'
              : 'Email verified'
            : isPasswordReset
              ? 'Choose a new password'
              : 'Verify your email address'}
        </h1>

        {isComplete ? (
          <div className="mt-4 space-y-5">
            <div className="flex items-start gap-2 text-sm leading-relaxed text-emerald-700" role="status">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                {isPasswordReset
                  ? 'Your password has been reset. You can now sign in with the new password.'
                  : 'Your email address is verified and the one-time verification link can no longer be used.'}
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Return to Marketly
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {isPasswordReset
                ? 'This secure link expires after one hour and can only be used once.'
                : 'Confirm this address using the one-time link. Verification links expire after 24 hours.'}
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {errorMessage && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {isPasswordReset && (
                <>
                  <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                    New password
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                    Confirm new password
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </label>
                </>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Processing...</span>
                  </>
                ) : isPasswordReset ? (
                  'Reset password'
                ) : (
                  'Verify email address'
                )}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
};
