import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('xyzcompany') &&
    !supabaseAnonKey.includes('mockkey')
  );
};

// Client instance for public read and interactive menu operations
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

/**
 * Uploads a Blob or File directly to Supabase Storage ('food-images' bucket)
 * and returns the public CDN URL.
 */
export async function uploadImageToSupabaseStorage(
  fileOrBlob: File | Blob,
  customFilename?: string
): Promise<{ publicUrl: string | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { publicUrl: null, error: new Error('Supabase is not configured.') };
  }

  try {
    const fileExt = customFilename?.split('.').pop() || (fileOrBlob.type === 'image/png' ? 'png' : 'jpg');
    const randomHash = Math.random().toString(36).substring(2, 8);
    const filePath = `dishes/${Date.now()}-${randomHash}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('food-images')
      .upload(filePath, fileOrBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: fileOrBlob.type || 'image/jpeg',
      });

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

    return { publicUrl: null, error: new Error('Could not generate public URL') };
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
    return { publicUrl: null, error: new Error('Supabase is not configured.') };
  }

  try {
    let blob: Blob;

    if (imageUrl.startsWith('data:')) {
      // Data URL to Blob
      const res = await fetch(imageUrl);
      blob = await res.blob();
    } else {
      // Remote URL to Blob
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
 * Returns the public Supabase Storage CDN URL, or original URL on fallback.
 */
export async function ensureCloudUrl(url: string): Promise<string> {
  if (!url || typeof url !== 'string') return '';
  if (!url.startsWith('data:')) return url;
  if (!isSupabaseConfigured()) return url;

  try {
    const { publicUrl } = await uploadImageUrlToSupabaseStorage(url);
    return publicUrl || url;
  } catch (err) {
    console.error('ensureCloudUrl error:', err);
    return url;
  }
}


