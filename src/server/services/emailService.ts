// Transactional Email Service via Resend REST API & Fallback Outbox
import crypto from 'crypto';

interface EmailOutboxItem {
  id: string;
  to: string;
  subject: string;
  type: 'verification' | 'password_reset' | 'order_confirmation';
  token?: string;
  sentAt: string;
  status: 'sent' | 'outbox_logged';
}

export const emailOutbox: EmailOutboxItem[] = [];

// Rate limiting map: email -> last sent timestamp
const rateLimitMap = new Map<string, number>();

export const isRateLimited = (email: string, windowSeconds = 60): boolean => {
  const normalized = email.toLowerCase().trim();
  const last = rateLimitMap.get(normalized);
  if (!last) return false;
  return Date.now() - last < windowSeconds * 1000;
};

export const recordEmailSent = (email: string): void => {
  rateLimitMap.set(email.toLowerCase().trim(), Date.now());
};

export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export const sendVerificationEmail = async (
  to: string,
  name: string,
  token: string,
  appUrl: string
): Promise<{ success: boolean; mode: 'live_resend' | 'outbox'; messageId?: string }> => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'Marketly Concierge <concierge@marketly.com>';
  const verifyUrl = `${appUrl}/account?verifyToken=${token}&email=${encodeURIComponent(to)}`;

  recordEmailSent(to);

  if (apiKey && !apiKey.includes('placeholder') && !apiKey.includes('re_1234567890')) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: 'Verify your Marketly account',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
              <h2 style="color: #0f172a; margin-bottom: 12px;">Welcome to Marketly, ${name}!</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                Thank you for creating an account. Please verify your email address to access all luxury shopping features and secure order tracking.
              </p>
              <div style="margin: 28px 0;">
                <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="font-size: 12px; color: #94a3b8;">
                This link will expire in 24 hours. If you did not request this, please disregard this email.
              </p>
            </div>
          `,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.id) {
        emailOutbox.unshift({
          id: resData.id,
          to,
          subject: 'Verify your Marketly account',
          type: 'verification',
          sentAt: new Date().toISOString(),
          status: 'sent',
        });
        return { success: true, mode: 'live_resend', messageId: resData.id };
      }
    } catch (err) {
      console.warn('Resend API delivery error:', err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Verification email could not be delivered. Check the Resend configuration and try again.');
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Transactional email is not configured or could not be delivered. Set RESEND_API_KEY and verify the sender.');
  }

  // Sandbox / development fallback outbox logging
  const outboxId = 'outbox_' + Date.now();
  emailOutbox.unshift({
    id: outboxId,
    to,
    subject: 'Verify your Marketly account',
    type: 'verification',
    token,
    sentAt: new Date().toISOString(),
    status: 'outbox_logged',
  });
  console.log('[Email Service Sandbox] Verification email queued in the development outbox.');

  return { success: true, mode: 'outbox', messageId: outboxId };
};

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  token: string,
  appUrl: string
): Promise<{ success: boolean; mode: 'live_resend' | 'outbox'; messageId?: string }> => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'Marketly Concierge <concierge@marketly.com>';
  const resetUrl = `${appUrl}/account?resetToken=${token}&email=${encodeURIComponent(to)}`;

  recordEmailSent(to);

  if (apiKey && !apiKey.includes('placeholder') && !apiKey.includes('re_1234567890')) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: 'Reset your Marketly password',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
              <h2 style="color: #0f172a; margin-bottom: 12px;">Password Reset Request</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                Hello ${name}, we received a request to reset your password for your Marketly account. Click the button below to set a new password:
              </p>
              <div style="margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="font-size: 12px; color: #94a3b8;">
                This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this message.
              </p>
            </div>
          `,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.id) {
        emailOutbox.unshift({
          id: resData.id,
          to,
          subject: 'Reset your Marketly password',
          type: 'password_reset',
          sentAt: new Date().toISOString(),
          status: 'sent',
        });
        return { success: true, mode: 'live_resend', messageId: resData.id };
      }
    } catch (err) {
      console.warn('Resend API delivery error:', err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Password reset email could not be delivered. Check the Resend configuration and try again.');
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Transactional email is not configured or could not be delivered. Set RESEND_API_KEY and verify the sender.');
  }

  const outboxId = 'outbox_' + Date.now();
  emailOutbox.unshift({
    id: outboxId,
    to,
    subject: 'Reset your Marketly password',
    type: 'password_reset',
    token,
    sentAt: new Date().toISOString(),
    status: 'outbox_logged',
  });
  console.log('[Email Service Sandbox] Password reset email queued in the development outbox.');

  return { success: true, mode: 'outbox', messageId: outboxId };
};
