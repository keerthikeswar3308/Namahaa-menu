import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminSessionToken,
  setDynamicAdminCredentials,
  verifyAdminPasscode,
  verifyAdminRequest,
} from '@/lib/authServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // 1. Strict Server-Side Authentication Check
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid Admin authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPasscode, newUsername, newPasscode } = body as {
      currentPasscode?: string;
      newUsername?: string;
      newPasscode?: string;
    };

    // 2. Validate current passcode
    if (!currentPasscode || typeof currentPasscode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Current passcode is required to change credentials' },
        { status: 400 }
      );
    }

    if (!verifyAdminPasscode(currentPasscode)) {
      return NextResponse.json(
        { success: false, error: 'Current passcode is incorrect. Verification failed.' },
        { status: 400 }
      );
    }

    // 3. Validate new credentials
    if (!newUsername || typeof newUsername !== 'string' || newUsername.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'New username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (!newPasscode || typeof newPasscode !== 'string' || newPasscode.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: 'New passcode/password must be at least 4 characters long' },
        { status: 400 }
      );
    }

    const cleanedUsername = newUsername.trim();
    const cleanedPasscode = newPasscode.trim();

    // 4. Update dynamic credentials on server
    setDynamicAdminCredentials(cleanedUsername, cleanedPasscode);

    // 5. Issue new session token
    const token = createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: 'Admin username and passcode successfully updated',
      username: cleanedUsername,
      token,
    });

    // 6. Set new secure session cookie
    response.cookies.set('namahaa_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error('API /api/admin/change-credentials exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error updating credentials' },
      { status: 500 }
    );
  }
}
