const configuredSecret = process.env.AUTH_SECRET?.trim();
const isPlaceholderSecret =
  !configuredSecret || /secure_random|placeholder|your_|replace_/i.test(configuredSecret);

if (process.env.NODE_ENV === 'production' && (isPlaceholderSecret || (configuredSecret?.length || 0) < 32)) {
  throw new Error('Set AUTH_SECRET to a private value of at least 32 characters before starting in production.');
}

export const JWT_SECRET = configuredSecret || 'marketly-local-development-only-auth-secret';
