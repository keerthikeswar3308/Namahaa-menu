import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://rhnrcyzzqmqgqoigjmuu.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnJjeXp6cW1xZ3FvaWdqbXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDQ1NzEsImV4cCI6MjEwMDgyMDU3MX0.k_WOrw3ODkgXPWt6VnVdLFhUcuFR0UuTdmb97KX8C_4';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('xyzcompany') &&
    !supabaseAnonKey.includes('mockkey')
  );
};

// Client instance for public read and interactive menu operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a Blob or File directly to Supabase Storage ('food-images' bucket)
 * and returns the public CDN URL that is accessible on all customer devices worldwide.
 */
export async function uploadImageToSupabaseStorage(
  fileOrBlob: File | Blob,
  customFilename?: string
): Promise<{ publicUrl: string | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { publicUrl: null, error: new Error('Supabase configuration missing.') };
  }

  try {
    const fileExt = customFilename?.split('.').pop() || (fileOrBlob.type === 'image/png' ? 'png' : 'jpg');
    const randomHash = Math.random().toString(36).substring(2, 8);
    const filePath = `dishes/${Date.now()}-${randomHash}.${fileExt}`;

    // 1. First attempt upload to 'food-images' bucket
    let { error: uploadError } = await supabase.storage
      .from('food-images')
      .upload(filePath, fileOrBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: fileOrBlob.type || 'image/jpeg',
      });

    // 2. If bucket is not found, attempt to auto-create 'food-images' public bucket
    if (uploadError && (uploadError.message?.toLowerCase().includes('bucket not found') || (uploadError as any).statusCode === 404)) {
      try {
        await supabase.storage.createBucket('food-images', { public: true });
        
        // Retry upload after creating bucket
        const retryResult = await supabase.storage
          .from('food-images')
          .upload(filePath, fileOrBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: fileOrBlob.type || 'image/jpeg',
          });

        uploadError = retryResult.error;
      } catch (createErr) {
        console.warn('Auto createBucket notice:', createErr);
      }
    }

    if (uploadError) {
      console.error('Supabase storage upload failed:', uploadError);
      return { publicUrl: null, error: uploadError };
    }

    const { data: publicUrlData } = supabase.storage
      .from('food-images')
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      return { publicUrl: publicUrlData.publicUrl, error: null };
    }

    return { publicUrl: null, error: new Error('Could not generate public CDN URL') };
  } catch (err) {
    console.error('Unexpected error during storage upload:', err);
    return { publicUrl: null, error: err as Error };
  }
}

/**
 * Converts a data URL or external image URL to Blob and uploads it to Supabase Storage ('food-images' bucket).
 */
export async function uploadImageUrlToSupabaseStorage(
  imageUrl: string
): Promise<{ publicUrl: string | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { publicUrl: null, error: new Error('Supabase configuration missing.') };
  }

  try {
    let blob: Blob;

    if (imageUrl.startsWith('data:')) {
      const res = await fetch(imageUrl);
      blob = await res.blob();
    } else {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image URL: HTTP ${response.status}`);
      }
      blob = await response.blob();
    }

    return await uploadImageToSupabaseStorage(blob);
  } catch (err) {
    console.error('Failed to convert/upload image URL to Supabase:', err);
    return { publicUrl: null, error: err as Error };
  }
}

/**
 * Helper to ensure an image URL is uploaded to Supabase Storage if it's a data URL.
 * Returns the public Supabase Storage CDN URL so it is visible to all customer devices.
 */
export async function ensureCloudUrl(url: string): Promise<string> {
  if (!url || typeof url !== 'string') return '';
  // Remote HTTP/HTTPS URLs pass through
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Local base64 data URLs get uploaded to Supabase Storage bucket
  if (url.startsWith('data:')) {
    try {
      const { publicUrl } = await uploadImageUrlToSupabaseStorage(url);
      return publicUrl || url;
    } catch (err) {
      console.error('ensureCloudUrl error:', err);
      return url;
    }
  }
  return url;
}
