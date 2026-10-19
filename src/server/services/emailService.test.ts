import assert from 'node:assert/strict';
import test from 'node:test';
import { sendPasswordResetEmail, sendVerificationEmail } from './emailService';

test('production email workflows fail instead of reporting outbox delivery', async () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousApiKey = process.env.RESEND_API_KEY;

  process.env.NODE_ENV = 'production';
  delete process.env.RESEND_API_KEY;

  try {
    await assert.rejects(
      sendVerificationEmail('buyer@example.com', 'Buyer', 'verification-token', 'https://marketly.example'),
      /RESEND_API_KEY/
    );
    await assert.rejects(
      sendPasswordResetEmail('buyer@example.com', 'Buyer', 'reset-token', 'https://marketly.example'),
      /RESEND_API_KEY/
    );
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;

    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
  }
});
