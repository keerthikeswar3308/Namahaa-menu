import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Server-only admin credential configuration
let dynamicAdminUsername: string | null = null;
let dynamicAdminPasscode: string | null = null;

export function setDynamicAdminCredentials(username: string, passcode: string) {
  if (username && typeof username === 'string') {
    dynamicAdminUsername = username.trim().toLowerCase();
  }
  if (passcode && typeof passcode === 'string') {
    dynamicAdminPasscode = passcode.trim();
  }
}

function getValidUsernames(): string[] {
  const list: string[] = [];
  if (dynamicAdminUsername) {
    list.push(dynamicAdminUsername);
  }
  const envUsernames = process.env.ADMIN_USERNAME || 'admin,namahaa';
  envUsernames
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean)
    .forEach((u) => {
      if (!list.includes(u)) list.push(u);
    });
  return list;
}

function getValidPasscodes(): string[] {
  const list: string[] = [];
  if (dynamicAdminPasscode) {
    list.push(dynamicAdminPasscode);
  }
  const envPasscode = process.env.ADMIN_PASSCODE || 'namahaa2026';
  envPasscode
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p) => {
      if (!list.includes(p)) list.push(p);
    });
  return list;
}

// Server secret key used for HMAC session token signing
const SERVER_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'namahaa-secure-server-secret-key-2026-auth';

/**
 * Validates whether a provided username matches the configured admin username.
 */
export function verifyAdminUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return false;

  const validUsernames = getValidUsernames();
  const inputBuffer = Buffer.from(trimmed);

  return validUsernames.some((valid) => {
    const validBuffer = Buffer.from(valid);
    if (inputBuffer.length !== validBuffer.length) return false;
    try {
      return crypto.timingSafeEqual(inputBuffer, validBuffer);
    } catch {
      return trimmed === valid;
    }
  });
}

/**
 * Validates whether a provided passcode matches the configured admin passcode.
 * Uses timing-safe string comparison to prevent timing attacks.
 */
export function verifyAdminPasscode(passcode: string): boolean {
  if (!passcode || typeof passcode !== 'string') return false;
  const trimmed = passcode.trim();
  if (!trimmed) return false;

  const validPasscodes = getValidPasscodes();
  const inputBuffer = Buffer.from(trimmed);

  return validPasscodes.some((valid) => {
    const validBuffer = Buffer.from(valid);
    if (inputBuffer.length !== validBuffer.length) return false;
    try {
      return crypto.timingSafeEqual(inputBuffer, validBuffer);
    } catch {
      return trimmed === valid;
    }
  });
}

/**
 * Validates both admin username and passcode.
 */
export function verifyAdminCredentials(username: string, passcode: string): boolean {
  return verifyAdminUsername(username) && verifyAdminPasscode(passcode);
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
