import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const envPath = path.resolve(cwd, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

if (process.env.NODE_ENV === 'production') {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (
    !adminEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) ||
    /placeholder|your_|replace_/i.test(adminEmail)
  ) {
    throw new Error('Set ADMIN_EMAIL to a valid bootstrap administrator email before starting in production.');
  }

  const appUrl = process.env.APP_URL?.trim();
  let parsedAppUrl: URL | undefined;
  try {
    if (appUrl) parsedAppUrl = new URL(appUrl);
  } catch {
    parsedAppUrl = undefined;
  }
  if (
    !parsedAppUrl ||
    parsedAppUrl.protocol !== 'https:' ||
    parsedAppUrl.pathname !== '/' ||
    parsedAppUrl.search ||
    parsedAppUrl.hash
  ) {
    throw new Error('Set APP_URL to the public HTTPS application origin before starting in production.');
  }
}
