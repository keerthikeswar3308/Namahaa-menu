import { NextRequest, NextResponse } from 'next/server';
import { uploadBufferToStorage } from '@/lib/supabaseServer';

const VALID_PASSCODES = ['namahaa2026', 'admin', 'namahaa'];

function isAuthorizedAdmin(request: NextRequest): boolean {
  const passcode = request.headers.get('x-admin-passcode') || request.cookies.get('namahaa_admin_auth')?.value;
  return Boolean(passcode && VALID_PASSCODES.includes(passcode.trim()));
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify custom Admin Authentication
    if (!isAuthorizedAdmin(request)) {
      // Check query param fallback if needed
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (!token || !VALID_PASSCODES.includes(token)) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Valid Admin passcode required' },
          { status: 401 }
        );
      }
    }

    const contentType = request.headers.get('content-type') || '';

    // A. Handle multipart/form-data (File from Device / Camera / Drag & Drop)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const customFilename = (formData.get('filename') as string) || file?.name || `dish-${Date.now()}.jpg`;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided in form data' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { publicUrl, error } = await uploadBufferToStorage(
        buffer,
        customFilename,
        file.type || 'image/jpeg'
      );

      if (error || !publicUrl) {
        return NextResponse.json(
          { success: false, error: error?.message || 'Failed to upload image to Supabase Storage' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        publicUrl,
        filename: customFilename,
      });
    }

    // B. Handle JSON Payload (URL Paste / Food Search / Base64 Data URL)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { imageUrl, dataUrl, filename } = body;
      const customFilename = filename || `import-${Date.now()}.jpg`;

      // Case 1: External Image URL (Paste URL or Food Search Result)
      if (imageUrl && typeof imageUrl === 'string') {
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          return NextResponse.json(
            { success: false, error: 'Invalid external image URL' },
            { status: 400 }
          );
        }

        // Fetch image bytes on the server side (bypasses CORS restrictions)
        const fetchRes = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NamahaaBot/1.0',
          },
        });

        if (!fetchRes.ok) {
          return NextResponse.json(
            { success: false, error: `Failed to download image from source (HTTP ${fetchRes.status})` },
            { status: 400 }
          );
        }

        const mimeType = fetchRes.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { publicUrl, error } = await uploadBufferToStorage(buffer, customFilename, mimeType);

        if (error || !publicUrl) {
          return NextResponse.json(
            { success: false, error: error?.message || 'Failed to store downloaded image' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          publicUrl,
          filename: customFilename,
        });
      }

      // Case 2: Base64 Data URL (e.g. from Canvas compression or Webcam snapshot)
      if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return NextResponse.json(
            { success: false, error: 'Invalid data URL format' },
            { status: 400 }
          );
        }

        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        const { publicUrl, error } = await uploadBufferToStorage(buffer, customFilename, mimeType);

        if (error || !publicUrl) {
          return NextResponse.json(
            { success: false, error: error?.message || 'Failed to upload data URL image' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          publicUrl,
          filename: customFilename,
        });
      }

      return NextResponse.json(
        { success: false, error: 'Must provide either file, imageUrl, or dataUrl' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported Content-Type. Use multipart/form-data or application/json' },
      { status: 415 }
    );
  } catch (err: any) {
    console.error('API /api/admin/upload-image error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
