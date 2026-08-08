import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rhnrcyzzqmqgqoigjmuu.supabase.co';

// Service role key is kept strictly on the server and never sent to client browsers
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnJjeXp6cW1xZ3FvaWdqbXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDQ1NzEsImV4cCI6MjEwMDgyMDU3MX0.k_WOrw3ODkgXPWt6VnVdLFhUcuFR0UuTdmb97KX8C_4';

export const PRIMARY_BUCKET = 'food-images';

// Server-side Supabase client for administrative database & storage operations
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Uploads a binary buffer to Supabase Storage ('food-images')
 * using the server service client and returns the permanent public CDN URL.
 */
export async function uploadBufferToStorage(
  buffer: Buffer | Uint8Array,
  filename: string,
  contentType = 'image/jpeg'
): Promise<{ publicUrl: string | null; error: Error | null }> {
  try {
    // 1. Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return {
        publicUrl: null,
        error: new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds 10MB limit.`),
      };
    }

    // 2. Validate MIME type
    const normalizedMime = contentType.toLowerCase().split(';')[0].trim();
    if (normalizedMime && !ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return {
        publicUrl: null,
        error: new Error(`Invalid file type "${contentType}". Only JPEG, PNG, and WebP are allowed.`),
      };
    }

    // 3. Generate safe unique filename in menu-items directory
    const rawExt = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const fileExt = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const randomHash = Math.random().toString(36).substring(2, 10);
    const filePath = `menu-items/${Date.now()}-${randomHash}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PRIMARY_BUCKET)
      .upload(filePath, buffer, {
        contentType: normalizedMime || 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.error(`Supabase Storage upload to "${PRIMARY_BUCKET}" error:`, uploadError);
      return { publicUrl: null, error: new Error(uploadError.message || 'Failed to upload to Supabase Storage') };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(PRIMARY_BUCKET)
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      return { publicUrl: publicUrlData.publicUrl, error: null };
    }

    return { publicUrl: null, error: new Error('Failed to generate public URL for uploaded image') };
  } catch (err: any) {
    console.error('uploadBufferToStorage exception:', err);
    return { publicUrl: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Deletes an image from the 'food-images' storage bucket given its public URL.
 */
export async function deleteStorageImageByUrl(imageUrl: string): Promise<boolean> {
  if (!imageUrl || !imageUrl.includes(PRIMARY_BUCKET)) {
    return false;
  }

  try {
    const parts = imageUrl.split(`${PRIMARY_BUCKET}/`);
    if (parts.length < 2) return false;

    const filePath = parts[1].split('?')[0];
    const { error } = await supabaseAdmin.storage.from(PRIMARY_BUCKET).remove([filePath]);
    if (error) {
      console.error(`Supabase Storage delete from "${PRIMARY_BUCKET}" error:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteStorageImageByUrl exception:', err);
    return false;
  }
}
