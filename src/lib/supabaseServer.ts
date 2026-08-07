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
export const FALLBACK_BUCKET = 'food-menu-images';

// Server-side Supabase client for administrative storage operations
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Finds the active bucket ('food-images' or 'food-menu-images') or creates it if needed.
 */
export async function getActiveBucket(): Promise<string> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (buckets && buckets.length > 0) {
      if (buckets.some((b) => b.name === 'food-images' || b.id === 'food-images')) {
        return 'food-images';
      }
      if (buckets.some((b) => b.name === 'food-menu-images' || b.id === 'food-menu-images')) {
        return 'food-menu-images';
      }
    }
  } catch (err) {
    console.warn('listBuckets check notice:', err);
  }
  return PRIMARY_BUCKET;
}

/**
 * Uploads a binary buffer or Blob to Supabase Storage ('food-images' or 'food-menu-images')
 * using the server service client and returns the public CDN URL.
 */
export async function uploadBufferToStorage(
  buffer: Buffer | Uint8Array,
  filename: string,
  contentType = 'image/jpeg'
): Promise<{ publicUrl: string | null; error: Error | null }> {
  try {
    const bucket = await getActiveBucket();
    const fileExt = filename.split('.').pop() || 'jpg';
    const randomHash = Math.random().toString(36).substring(2, 9);
    const filePath = `dishes/${Date.now()}-${randomHash}.${fileExt}`;

    let { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      });

    // If bucket upload fails on primary, try fallback bucket
    if (uploadError && bucket === PRIMARY_BUCKET) {
      const fallbackUpload = await supabaseAdmin.storage
        .from(FALLBACK_BUCKET)
        .upload(filePath, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        });

      if (!fallbackUpload.error) {
        const { data: fbData } = supabaseAdmin.storage.from(FALLBACK_BUCKET).getPublicUrl(filePath);
        if (fbData?.publicUrl) return { publicUrl: fbData.publicUrl, error: null };
      }
    }

    if (uploadError) {
      console.error('Server storage upload error:', uploadError);
      return { publicUrl: null, error: uploadError };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      return { publicUrl: publicUrlData.publicUrl, error: null };
    }

    return { publicUrl: null, error: new Error('Failed to generate public URL') };
  } catch (err) {
    console.error('uploadBufferToStorage exception:', err);
    return { publicUrl: null, error: err as Error };
  }
}

/**
 * Deletes an image from the storage bucket given its public URL.
 */
export async function deleteStorageImageByUrl(imageUrl: string): Promise<boolean> {
  if (!imageUrl || (!imageUrl.includes('food-images') && !imageUrl.includes('food-menu-images'))) {
    return false;
  }

  try {
    const bucket = imageUrl.includes('food-images') ? 'food-images' : 'food-menu-images';
    const parts = imageUrl.split(`${bucket}/`);
    if (parts.length < 2) return false;

    const filePath = parts[1].split('?')[0];
    const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
    return !error;
  } catch (err) {
    console.error('deleteStorageImageByUrl exception:', err);
    return false;
  }
}
