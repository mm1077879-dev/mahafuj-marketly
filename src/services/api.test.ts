import assert from 'node:assert/strict';
import test from 'node:test';
import { api } from './api';

const withMockFetch = async (mockFetch: typeof fetch, run: () => Promise<void>): Promise<void> => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
  }
};

test('forgot-password reports the disabled account recovery state instead of pretending to send mail', async () => {
  await withMockFetch(async (input, init) => {
    assert.equal(String(input), '/api/v1/auth/forgot-password');
    assert.equal(init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(init?.body)), { email: 'buyer@example.test' });
    return new Response(
      JSON.stringify({
        success: false,
        code: 'PASSWORD_RESET_DISABLED',
        message: 'Password reset email delivery is disabled. Please contact support or your administrator to reset access.',
      }),
      { status: 410, headers: { 'Content-Type': 'application/json' } }
    );
  }, async () => {
    await assert.rejects(
      api.forgotPassword('buyer@example.test'),
      /Password reset email delivery is disabled/
    );
  });
});

test('email APIs preserve safe disabled-state messages and reject HTML fallbacks', async () => {
  await withMockFetch(async () =>
    new Response(
      JSON.stringify({
        success: false,
        code: 'EMAIL_VERIFICATION_DISABLED',
        message: 'Email verification has been disabled because outbound email delivery is no longer available.',
      }),
      { status: 410, headers: { 'Content-Type': 'application/json' } }
    ), async () => {
    await assert.rejects(
      api.resendVerification('buyer@example.test'),
      /Email verification has been disabled/
    );
  });

  await withMockFetch(async () =>
    new Response('<html><body>Service unavailable</body></html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    }), async () => {
    await assert.rejects(
      api.forgotPassword('buyer@example.test'),
      /unexpected response/
    );
  });
});
