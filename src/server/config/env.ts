import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const envPath = path.resolve(cwd, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
