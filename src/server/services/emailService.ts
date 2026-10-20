import crypto from 'crypto';

export interface EmailOutboxItem {
  id: string;
  to: string;
  subject: string;
  type: 'verification' | 'password_reset';
  token?: string;
  recordedAt: string;
  status: 'outbox_logged';
}

export const emailOutbox: EmailOutboxItem[] = [];

const rateLimitMap = new Map<string, number>();

export const isRateLimited = (email: string, windowSeconds = 60): boolean => {
  const normalized = email.toLowerCase().trim();
  const last = rateLimitMap.get(normalized);
  if (last === undefined) return false;
  if (Date.now() - last < windowSeconds * 1000) return true;
  rateLimitMap.delete(normalized);
  return false;
};

export const recordEmailRequest = (email: string): void => {
  rateLimitMap.set(email.toLowerCase().trim(), Date.now());
};

export const generateSecureToken = (bytes = 32): string =>
  crypto.randomBytes(bytes).toString('hex');

export const hashSecureToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const disabledResponse = (type: 'verification' | 'password_reset') => ({
  success: false,
  mode: 'disabled' as const,
  message:
    type === 'verification'
      ? 'Email verification has been disabled because outbound email delivery is no longer available.'
      : 'Password reset email delivery has been disabled because outbound email delivery is no longer available.',
});

export const sendVerificationEmail = async (
  _to: string,
  _token: string,
  _appUrl: string
): Promise<{ success: boolean; mode: 'disabled'; message: string }> => {
  return disabledResponse('verification');
};

export const sendPasswordResetEmail = async (
  _to: string,
  _name: string,
  _token: string,
  _appUrl: string
): Promise<{ success: boolean; mode: 'disabled'; message: string }> => {
  return disabledResponse('password_reset');
};
