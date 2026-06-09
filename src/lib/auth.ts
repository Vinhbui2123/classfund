import bcrypt from 'bcryptjs';
import { config } from './config';

const encoder = new TextEncoder();

async function getHmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken(timestamp: number): Promise<string> {
  const secret = config.AUTH_SECRET;
  const data = `${timestamp}`;
  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${timestamp}.${hashHex}`;
}

export async function verifyToken(token: string): Promise<boolean> {
  // Extract secret directly from env if config isn't available on Edge (config reads process.env)
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;
  
  // Check expiration (7 days)
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > sevenDays) return false;
  
  const key = await getHmacKey(secret);
  const expectedBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(timestampStr)
  );
  const hashArray = Array.from(new Uint8Array(expectedBuffer));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return expectedSignature === signature;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  // If the hash is a 64-character hex string, compare using SHA-256
  if (hash.length === 64 && /^[0-9a-f]+$/i.test(hash)) {
    const userHash = await sha256(password);
    return userHash.toLowerCase() === hash.toLowerCase();
  }
  // Otherwise fallback to bcrypt comparison
  return bcrypt.compare(password, hash);
}
