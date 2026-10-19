const configuredAdminPassword = process.env.ADMIN_PASSWORD?.trim();
const isPlaceholderPassword =
  !configuredAdminPassword ||
  configuredAdminPassword === 'Siam12345!' ||
  /replace_|placeholder|your_/i.test(configuredAdminPassword);

if (
  process.env.NODE_ENV === 'production' &&
  (isPlaceholderPassword || (configuredAdminPassword?.length || 0) < 12)
) {
  throw new Error('Set ADMIN_PASSWORD to a private value of at least 12 characters before starting in production.');
}

if (process.env.NODE_ENV !== 'production' && configuredAdminPassword && configuredAdminPassword.length < 12) {
  console.warn(
    'Warning: ADMIN_PASSWORD is shorter than 12 characters. Set a private value of at least 12 characters before deploying to production.'
  );
}

export const ADMIN_PASSWORD = configuredAdminPassword || 'Siam12345!';
