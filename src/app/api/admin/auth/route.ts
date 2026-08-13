import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminSessionToken,
  verifyAdminCredentials,
  verifyAdminPasscode,
  verifyAdminUsername,
} from '@/lib/authServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, passcode } = body as { username?: string; passcode?: string };

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Passcode is required' },
        { status: 400 }
      );
    }

    // If username is provided, verify both username and passcode
    if (username && typeof username === 'string') {
      if (!verifyAdminCredentials(username, passcode)) {
        return NextResponse.json(
          { success: false, error: 'Invalid admin username or passcode' },
          { status: 401 }
        );
      }
    } else {
      // Passcode-only fallback verification
      if (!verifyAdminPasscode(passcode)) {
        return NextResponse.json(
          { success: false, error: 'Invalid admin passcode' },
          { status: 401 }
        );
      }
    }

    const token = createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: 'Admin authenticated successfully',
      token,
    });

    // Set secure session cookie
    response.cookies.set('namahaa_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error('API /api/admin/auth exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Authentication error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Admin logged out successfully',
  });

  response.cookies.delete('namahaa_admin_token');
  response.cookies.delete('namahaa_admin_auth');

  return response;
}
