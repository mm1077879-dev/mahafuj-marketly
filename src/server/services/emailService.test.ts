import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emailOutbox,
  generateSecureToken,
  hashSecureToken,
  isRateLimited,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './emailService';

test('email helpers still generate deterministic hash values for disabled transactional flows', async () => {
  const token = generateSecureToken(16);
  assert.equal(hashSecureToken(token), hashSecureToken(token));
  assert.equal(token.length, 32);
  assert.equal(isRateLimited('reset@example.test'), false);
  assert.equal(emailOutbox.length, 0);
});

test('verification and reset helpers fail closed without consulting any provider or outbox', async () => {
  const verificationResult = await sendVerificationEmail('buyer@example.test', 'verification-token', 'https://marketly.example');
  assert.equal(verificationResult.success, false);
  assert.equal(verificationResult.mode, 'disabled');
  assert.match(verificationResult.message, /Email verification has been disabled/i);

  const resetResult = await sendPasswordResetEmail('buyer@example.test', 'Buyer', 'reset-token', 'https://marketly.example');
  assert.equal(resetResult.success, false);
  assert.equal(resetResult.mode, 'disabled');
  assert.match(resetResult.message, /Password reset email delivery has been disabled/i);

  assert.equal(emailOutbox.length, 0);
  assert.equal(isRateLimited('buyer@example.test'), false);
});
