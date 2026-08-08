import { NextRequest, NextResponse } from 'next/server';
import { deleteStorageImageByUrl } from '@/lib/supabaseServer';
import { verifyAdminRequest } from '@/lib/authServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid Admin authentication required' },
        { status: 401 }
      );
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
      message: deleted
        ? 'Image deleted from Supabase Storage (food-images)'
        : 'Image was not in bucket or could not be removed',
    });
  } catch (err: any) {
    console.error('API /api/admin/delete-image error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during image delete' },
      { status: 500 }
    );
  }
}
