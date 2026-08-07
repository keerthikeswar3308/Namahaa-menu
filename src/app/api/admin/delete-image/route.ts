import { NextRequest, NextResponse } from 'next/server';
import { deleteStorageImageByUrl } from '@/lib/supabaseServer';

const VALID_PASSCODES = ['namahaa2026', 'admin', 'namahaa'];

function isAuthorizedAdmin(request: NextRequest): boolean {
  const passcode = request.headers.get('x-admin-passcode') || request.cookies.get('namahaa_admin_auth')?.value;
  return Boolean(passcode && VALID_PASSCODES.includes(passcode.trim()));
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdmin(request)) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (!token || !VALID_PASSCODES.includes(token)) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Valid Admin passcode required' },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteStorageImageByUrl(imageUrl);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Image deleted from Supabase Storage' : 'Image was not in bucket or could not be removed',
    });
  } catch (err: any) {
    console.error('API /api/admin/delete-image error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
