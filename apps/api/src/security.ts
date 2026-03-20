import crypto from 'node:crypto';
import type { AuthRole } from '@nyvoro/shared-types';

const DEFAULT_SCRYPT_N = 16_384;
const DEFAULT_SCRYPT_R = 8;
const DEFAULT_SCRYPT_P = 1;
const DEFAULT_SCRYPT_KEY_LENGTH = 64;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export type AuthSessionPayload = {
  role: AuthRole;
  email: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type MfaLoginTokenPayload = {
  purpose: 'mfa_login';
  role: 'admin';
  email: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type SignedTokenValidationFailureReason =
  | 'malformed'
  | 'invalid_signature'
  | 'invalid_payload'
  | 'expired';

export type SignedTokenValidationResult<TPayload> =
  | {
      ok: true;
      payload: TPayload;
    }
  | {
      ok: false;
      reason: SignedTokenValidationFailureReason;
    };

export type SessionTokenValidationResult = SignedTokenValidationResult<AuthSessionPayload>;
export type MfaLoginTokenValidationResult = SignedTokenValidationResult<MfaLoginTokenPayload>;

export function hashIpAddress(ipAddress: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${ipAddress}`).digest('hex');
}

export function generateMagicLinkToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function hashMagicLinkToken(token: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${token}`).digest('hex');
}

export function secureCompareHash(left: string, right: string): boolean {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function secureCompareText(left: string, right: string): boolean {
  const leftDigest = crypto.createHash('sha256').update(left).digest();
  const rightDigest = crypto.createHash('sha256').update(right).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateTotpSecret(length = 32): string {
  const randomBytes = crypto.randomBytes(length);
  let result = '';

  for (let index = 0; index < length; index += 1) {
    const byte = randomBytes[index];
    if (typeof byte !== 'number') {
      continue;
    }
    result += BASE32_ALPHABET[byte % BASE32_ALPHABET.length];
  }

  return result;
}

function parseScryptHash(encodedHash: string):
  | {
      N: number;
      r: number;
      p: number;
      salt: string;
      digest: string;
    }
  | undefined {
  const parts = encodedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return undefined;
  }

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = parts[4];
  const digest = parts[5];

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return undefined;
  }

  if (N <= 0 || r <= 0 || p <= 0 || !salt || !digest) {
    return undefined;
  }

  return { N, r, p, salt, digest };
}

export function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(18).toString('base64url');
  const derivedKey = crypto.scryptSync(password, salt, DEFAULT_SCRYPT_KEY_LENGTH, {
    N: DEFAULT_SCRYPT_N,
    r: DEFAULT_SCRYPT_R,
    p: DEFAULT_SCRYPT_P
  });

  return `scrypt$${DEFAULT_SCRYPT_N}$${DEFAULT_SCRYPT_R}$${DEFAULT_SCRYPT_P}$${salt}$${derivedKey.toString('base64url')}`;
}

export function verifyPasswordHash(input: { password: string; encodedHash: string }): boolean {
  const { password, encodedHash } = input;
  const parsed = parseScryptHash(encodedHash);
  if (!parsed) {
    return false;
  }

  const expectedDigest = Buffer.from(parsed.digest, 'base64url');
  if (expectedDigest.length === 0) {
    return false;
  }

  let computedDigest: Buffer;
  try {
    computedDigest = crypto.scryptSync(password, parsed.salt, expectedDigest.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p
    });
  } catch {
    return false;
  }

  return crypto.timingSafeEqual(computedDigest, expectedDigest);
}

function decodeBase32Secret(secret: string): Buffer {
  const normalized = secret.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  if (normalized.length === 0) {
    return Buffer.alloc(0);
  }

  let bitBuffer = 0;
  let bitsInBuffer = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      return Buffer.alloc(0);
    }

    bitBuffer = (bitBuffer << 5) | index;
    bitsInBuffer += 5;

    if (bitsInBuffer >= 8) {
      bitsInBuffer -= 8;
      bytes.push((bitBuffer >>> bitsInBuffer) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

function generateTotpCode(secret: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  const counterAsBigInt = BigInt(counter);
  counterBuffer.writeBigUInt64BE(counterAsBigInt);

  const digest = crypto.createHmac('sha1', secret).update(counterBuffer).digest();
  const dynamicOffset = digest[digest.length - 1];
  if (typeof dynamicOffset !== 'number') {
    return '000000';
  }

  const offset = dynamicOffset & 0x0f;
  const byte0 = digest[offset] ?? 0;
  const byte1 = digest[offset + 1] ?? 0;
  const byte2 = digest[offset + 2] ?? 0;
  const byte3 = digest[offset + 3] ?? 0;
  const binaryCode =
    ((byte0 & 0x7f) << 24) | ((byte1 & 0xff) << 16) | ((byte2 & 0xff) << 8) | (byte3 & 0xff);

  return String(binaryCode % 1_000_000).padStart(6, '0');
}

export function generateTotpCodeFromSecret(input: {
  secret: string;
  timestampMs?: number;
  periodSeconds?: number;
}): string | undefined {
  const periodSeconds = input.periodSeconds ?? 30;
  const timestampMs = input.timestampMs ?? Date.now();
  const secretBytes = decodeBase32Secret(input.secret);
  if (secretBytes.length === 0) {
    return undefined;
  }

  const currentCounter = Math.floor(timestampMs / 1000 / periodSeconds);
  return generateTotpCode(secretBytes, currentCounter);
}

export function verifyTotpCode(input: {
  code: string;
  secret: string;
  timestampMs?: number;
  periodSeconds?: number;
  window?: number;
}): boolean {
  const { code, secret } = input;
  const timestampMs = input.timestampMs ?? Date.now();
  const periodSeconds = input.periodSeconds ?? 30;
  const window = input.window ?? 1;

  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const secretBytes = decodeBase32Secret(secret);
  if (secretBytes.length === 0) {
    return false;
  }

  const currentCounter = Math.floor(timestampMs / 1000 / periodSeconds);

  for (let drift = -window; drift <= window; drift += 1) {
    const expectedCode = generateTotpCode(secretBytes, currentCounter + drift);
    if (secureCompareText(expectedCode, code)) {
      return true;
    }
  }

  return false;
}

function parseSessionPayload(rawPayload: string): AuthSessionPayload | undefined {
  try {
    const parsed = JSON.parse(Buffer.from(rawPayload, 'base64url').toString('utf8')) as Partial<AuthSessionPayload>;
    if (
      (parsed.role !== 'admin' && parsed.role !== 'artist') ||
      typeof parsed.email !== 'string' ||
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.nonce !== 'string'
    ) {
      return undefined;
    }

    return {
      role: parsed.role,
      email: parsed.email,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
      nonce: parsed.nonce
    };
  } catch {
    return undefined;
  }
}

function parseMfaLoginPayload(rawPayload: string): MfaLoginTokenPayload | undefined {
  try {
    const parsed = JSON.parse(Buffer.from(rawPayload, 'base64url').toString('utf8')) as Partial<MfaLoginTokenPayload>;
    if (
      parsed.purpose !== 'mfa_login' ||
      parsed.role !== 'admin' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.nonce !== 'string'
    ) {
      return undefined;
    }

    return {
      purpose: parsed.purpose,
      role: parsed.role,
      email: parsed.email,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
      nonce: parsed.nonce
    };
  } catch {
    return undefined;
  }
}

function createSignedToken<TPayload extends object>(input: {
  payload: TPayload;
  secret: string;
}): string {
  const payloadEncoded = Buffer.from(JSON.stringify(input.payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', input.secret)
    .update(payloadEncoded)
    .digest('base64url');

  return `${payloadEncoded}.${signature}`;
}

function verifySignedTokenWithReason<TPayload>(input: {
  token: string;
  secret: string;
  nowMs?: number;
  parsePayload: (payloadEncoded: string) => TPayload | undefined;
}): SignedTokenValidationResult<TPayload> {
  const tokenParts = input.token.split('.');
  if (tokenParts.length !== 2) {
    return {
      ok: false,
      reason: 'malformed'
    };
  }

  const [payloadEncoded, signature] = tokenParts;
  if (!payloadEncoded || !signature) {
    return {
      ok: false,
      reason: 'malformed'
    };
  }

  const expectedSignature = crypto
    .createHmac('sha256', input.secret)
    .update(payloadEncoded)
    .digest('base64url');

  if (!secureCompareText(signature, expectedSignature)) {
    return {
      ok: false,
      reason: 'invalid_signature'
    };
  }

  const payload = input.parsePayload(payloadEncoded);
  if (!payload || typeof payload !== 'object' || payload === null || !('expiresAt' in payload)) {
    return {
      ok: false,
      reason: 'invalid_payload'
    };
  }

  const expiresAt = payload.expiresAt;
  if (typeof expiresAt !== 'number') {
    return {
      ok: false,
      reason: 'invalid_payload'
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  if (expiresAt <= nowMs) {
    return {
      ok: false,
      reason: 'expired'
    };
  }

  return {
    ok: true,
    payload
  };
}

export function createSignedSessionToken(input: {
  payload: AuthSessionPayload;
  secret: string;
}): string {
  return createSignedToken(input);
}

export function verifySignedSessionToken(input: {
  token: string;
  secret: string;
  nowMs?: number;
}): AuthSessionPayload | undefined {
  const result = verifySignedSessionTokenWithReason(input);
  return result.ok ? result.payload : undefined;
}

export function verifySignedSessionTokenWithReason(input: {
  token: string;
  secret: string;
  nowMs?: number;
}): SessionTokenValidationResult {
  return verifySignedTokenWithReason({
    ...input,
    parsePayload: parseSessionPayload
  });
}

export function createSignedMfaLoginToken(input: {
  payload: MfaLoginTokenPayload;
  secret: string;
}): string {
  return createSignedToken(input);
}

export function verifySignedMfaLoginTokenWithReason(input: {
  token: string;
  secret: string;
  nowMs?: number;
}): MfaLoginTokenValidationResult {
  return verifySignedTokenWithReason({
    ...input,
    parsePayload: parseMfaLoginPayload
  });
}

export function getClientIp(rawIp?: string): string {
  if (!rawIp) {
    return '0.0.0.0';
  }

  const normalized = rawIp.trim();
  if (normalized.length === 0) {
    return '0.0.0.0';
  }

  if (normalized.startsWith('::ffff:')) {
    return normalized.slice('::ffff:'.length);
  }

  return normalized;
}
