import { createPasswordHash } from './security.js';

const password = process.argv[2]?.trim();

if (!password) {
  console.error('Usage: pnpm --filter @nyvoro/api auth:hash-password -- "YourStrongPassword"');
  process.exit(1);
}

if (password.length < 12) {
  console.error('Password must be at least 12 characters long.');
  process.exit(1);
}

console.log(createPasswordHash(password));
