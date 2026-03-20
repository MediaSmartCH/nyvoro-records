import crypto from 'node:crypto';
import { appConfig } from './config.js';
import { createDatabase, getAuthUserByRoleAndEmail, insertAuthUser } from './db.js';
import { createPasswordHash, normalizeLoginEmail } from './security.js';

type CliInput = {
  role: 'admin' | 'artist';
  email: string;
  password: string;
};

function printUsage(): void {
  console.error(
    'Usage: pnpm --filter @nyvoro/api auth:create-user -- --role <admin|artist> --email <email> --password <password>'
  );
}

function parseCliArgs(argv: string[]): CliInput | undefined {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith('--')) {
      continue;
    }

    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith('--')) {
      continue;
    }

    values.set(token.slice(2), nextValue);
    index += 1;
  }

  const role = values.get('role');
  const email = values.get('email')?.trim();
  const password = values.get('password');

  if ((role !== 'admin' && role !== 'artist') || !email || !password) {
    return undefined;
  }

  return {
    role,
    email,
    password
  };
}

const input = parseCliArgs(process.argv.slice(2));

if (!input) {
  printUsage();
  process.exit(1);
}

if (input.password.length < 12) {
  console.error('Password must be at least 12 characters long.');
  process.exit(1);
}

const db = createDatabase(appConfig.databaseUrl);
const normalizedEmail = normalizeLoginEmail(input.email);
const existingUser = getAuthUserByRoleAndEmail(db, {
  role: input.role,
  email: normalizedEmail
});

if (existingUser) {
  console.error(`A ${input.role} account already exists for ${normalizedEmail}.`);
  process.exit(1);
}

insertAuthUser(db, {
  id: crypto.randomUUID(),
  role: input.role,
  email: normalizedEmail,
  password_hash: createPasswordHash(input.password),
  totp_secret: null,
  totp_enabled: false,
  is_temporary: false
});

console.log(`Created ${input.role} account for ${normalizedEmail}.`);
