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

export const BUCKET_NAME = 'food-menu-images';

// Server-side Supabase client for administrative storage operations
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Ensures the 'food-menu-images' storage bucket exists with public read enabled.
 */
export async function ensureBucketExists(): Promise<boolean> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.id === BUCKET_NAME || b.name === BUCKET_NAME);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
      });
    }
    return true;
  } catch (err) {
    console.warn('ensureBucketExists warning:', err);
    return false;
  }
}

/**
 * Uploads a binary buffer or Blob to Supabase Storage ('food-menu-images' bucket)
 * using the server service client and returns the public CDN URL.
 */
export async function uploadBufferToStorage(
  buffer: Buffer | Uint8Array,
  filename: string,
  contentType = 'image/jpeg'
): Promise<{ publicUrl: string | null; error: Error | null }> {
  try {
    await ensureBucketExists();

    const fileExt = filename.split('.').pop() || 'jpg';
    const randomHash = Math.random().toString(36).substring(2, 9);
    const filePath = `dishes/${Date.now()}-${randomHash}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Server storage upload error:', uploadError);
      return { publicUrl: null, error: uploadError };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
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
 * Deletes an image from the 'food-menu-images' bucket given its public URL.
 */
export async function deleteStorageImageByUrl(imageUrl: string): Promise<boolean> {
  if (!imageUrl || !imageUrl.includes(BUCKET_NAME)) return false;

  try {
    // Extract path after /food-menu-images/
    const parts = imageUrl.split(`${BUCKET_NAME}/`);
    if (parts.length < 2) return false;

    // Clean query parameters like ?v=...
    const filePath = parts[1].split('?')[0];

    const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]);
    if (error) {
      console.warn('deleteStorageImageByUrl error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteStorageImageByUrl exception:', err);
    return false;
  }
}
