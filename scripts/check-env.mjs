import fs from 'node:fs';
import path from 'node:path';

const requiredKeys = [
  'PORT',
  'API_ALLOWED_ORIGINS',
  'DATABASE_URL',
  'TURNSTILE_SECRET_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'APPLICATION_RECIPIENT_EMAIL',
  'IP_HASH_SALT',
  'VITE_API_BASE_URL',
  'VITE_TURNSTILE_SITE_KEY',
  'VITE_PRESS_EMAIL',
  'VITE_DEMO_EMAIL'
];

function parseEnvFile(fileContent) {
  return fileContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .reduce((acc, line) => {
      const index = line.indexOf('=');
      if (index === -1) {
        return acc;
      }

      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');

if (!fs.existsSync(envPath)) {
  console.error('[check-env] Missing .env file. Run `make env` first.');
  process.exit(1);
}

const envValues = {
  ...parseEnvFile(fs.readFileSync(envPath, 'utf-8')),
  ...process.env
};

const missing = requiredKeys.filter((key) => {
  const value = envValues[key];
  return value === undefined || String(value).trim().length === 0;
});

if (missing.length > 0) {
  console.error('[check-env] Missing required environment variables:');
  missing.forEach((key) => console.error(` - ${key}`));
  process.exit(1);
}

console.log('[check-env] Environment variables look good.');
