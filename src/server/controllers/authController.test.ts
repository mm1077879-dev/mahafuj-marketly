import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { forgotPassword, login, register, resendVerificationEmail, resetPassword, verifyEmail } from './authController';
import { ADMIN_PASSWORD } from '../config/adminCredentials';
import { memoryStore } from '../config/memoryStore';

interface TestResponse {
  statusCode: number;
  body: unknown;
  status(code: number): TestResponse;
  json(body: unknown): TestResponse;
}

const createRequest = (body: Record<string, unknown>): Request =>
  ({ body, protocol: 'https', get: () => 'marketly.example' }) as unknown as Request;

const createResponse = (): { response: Response; result: TestResponse } => {
  const result: TestResponse = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return { response: result as unknown as Response, result };
};

test('registration creates active accounts without pretending that email was sent', async () => {
  const email = `active-${Date.now()}@example.test`;
  const registerResponse = createResponse();
  await register(
    createRequest({ name: 'Enabled Buyer', email, password: 'password-123' }),
    registerResponse.response
  );

  assert.equal(registerResponse.result.statusCode, 201);
  const createdUser = memoryStore.users.find((candidate) => candidate.email === email);
  assert(createdUser);
  assert.equal(createdUser.isEmailVerified, true);
  assert.match(String((registerResponse.result.body as { message?: string }).message), /Email delivery is disabled/i);
});

test('verification and password reset routes fail closed with disabled-state responses', async () => {
  const email = 'support-disabled@example.test';

  const verifyResponse = createResponse();
  await verifyEmail(createRequest({ token: 'token-123' }), verifyResponse.response);
  assert.equal(verifyResponse.result.statusCode, 410);
  assert.equal((verifyResponse.result.body as { code?: string }).code, 'EMAIL_VERIFICATION_DISABLED');

  const resendResponse = createResponse();
  await resendVerificationEmail(createRequest({ email }), resendResponse.response);
  assert.equal(resendResponse.result.statusCode, 410);
  assert.equal((resendResponse.result.body as { code?: string }).code, 'EMAIL_VERIFICATION_DISABLED');

  const forgotResponse = createResponse();
  await forgotPassword(createRequest({ email }), forgotResponse.response);
  assert.equal(forgotResponse.result.statusCode, 410);
  assert.equal((forgotResponse.result.body as { code?: string }).code, 'PASSWORD_RESET_DISABLED');

  const resetResponse = createResponse();
  await resetPassword(createRequest({ token: 'reset-token', newPassword: 'new-password-456' }), resetResponse.response);
  assert.equal(resetResponse.result.statusCode, 410);
  assert.equal((resetResponse.result.body as { code?: string }).code, 'PASSWORD_RESET_DISABLED');
});

test('login remains available for customers and admin accounts without email delivery', async () => {
  const response = createResponse();
  await login(createRequest({ email: 'customer@marketly.com', password: 'Customer@2026!' }), response.response);
  assert.equal(response.result.statusCode, 200);

  const adminResponse = createResponse();
  await login(createRequest({ email: 'admin@marketly.com', password: ADMIN_PASSWORD }), adminResponse.response);
  assert.equal(adminResponse.result.statusCode, 200);
});
