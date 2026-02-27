import crypto from 'node:crypto';

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

export function getClientIp(rawIp?: string): string {
  if (!rawIp) {
    return '0.0.0.0';
  }

  if (rawIp.includes(',')) {
    return rawIp.split(',')[0]?.trim() ?? '0.0.0.0';
  }

  return rawIp;
}
