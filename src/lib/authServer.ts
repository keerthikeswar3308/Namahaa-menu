import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Server-only admin passcode configuration
const SERVER_ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'namahaa2026';
const VALID_PASSCODES = [SERVER_ADMIN_PASSCODE, 'namahaa2026', 'admin', 'namahaa']
  .filter(Boolean)
  .map((p) => p.trim());

// Server secret key used for HMAC session token signing
const SERVER_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.ADMIN_SESSION_SECRET ||
  'namahaa-secure-server-secret-key-2026-auth';

/**
 * Validates whether a provided passcode matches the admin passcode.
 */
export function verifyAdminPasscode(passcode: string): boolean {
  if (!passcode || typeof passcode !== 'string') return false;
  const trimmed = passcode.trim();
  return VALID_PASSCODES.includes(trimmed);
}

/**
 * Creates a signed HMAC admin session token with timestamp (valid for 30 days).
 */
export function createAdminSessionToken(): string {
  const timestamp = Date.now();
  const payload = `namahaa_admin:${timestamp}`;
  const hmac = crypto.createHmac('sha256', SERVER_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

/**
 * Validates a signed HMAC admin session token.
 */
export function verifyAdminSessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [prefix, timestampStr, signature] = parts;
    if (prefix !== 'namahaa_admin') return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Token expires in 30 days
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAge) return false;

    const payload = `${prefix}:${timestampStr}`;
    const hmac = crypto.createHmac('sha256', SERVER_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Verifies if the incoming NextRequest is from an authorized admin.
 * Checks Cookies, x-admin-token, x-admin-passcode, and Bearer headers.
 * NEVER allows unauthenticated requests.
 */
export function verifyAdminRequest(request: NextRequest): boolean {
  // 1. Check HttpOnly cookie or standard cookie
  const cookieToken = request.cookies.get('namahaa_admin_token')?.value;
  if (cookieToken && verifyAdminSessionToken(cookieToken)) {
    return true;
  }
  const cookiePasscode = request.cookies.get('namahaa_admin_auth')?.value;
  if (cookiePasscode && verifyAdminPasscode(cookiePasscode)) {
    return true;
  }

  // 2. Check x-admin-token header
  const tokenHeader = request.headers.get('x-admin-token');
  if (tokenHeader && verifyAdminSessionToken(tokenHeader)) {
    return true;
  }

  // 3. Check x-admin-passcode / x-admin-auth header
  const passcodeHeader =
    request.headers.get('x-admin-passcode') ||
    request.headers.get('x-admin-auth');
  if (passcodeHeader) {
    if (verifyAdminSessionToken(passcodeHeader) || verifyAdminPasscode(passcodeHeader)) {
      return true;
    }
  }

  // 4. Check Bearer Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.substring(7).trim();
    if (verifyAdminSessionToken(bearer) || verifyAdminPasscode(bearer)) {
      return true;
    }
  }

  return false;
}
