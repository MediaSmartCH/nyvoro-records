import crypto from 'node:crypto';

export function hashIpAddress(ipAddress: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${ipAddress}`).digest('hex');
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
