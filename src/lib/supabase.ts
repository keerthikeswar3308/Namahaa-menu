import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://rhnrcyzzqmqgqoigjmuu.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobnJjeXp6cW1xZ3FvaWdqbXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDQ1NzEsImV4cCI6MjEwMDgyMDU3MX0.k_WOrw3ODkgXPWt6VnVdLFhUcuFR0UuTdmb97KX8C_4';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const BUCKET_NAME = 'food-images';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('xyzcompany') &&
    !supabaseAnonKey.includes('mockkey')
  );
};

// Client instance for public read and interactive menu operations (Anon Read Only)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getAdminAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const username = localStorage.getItem('namahaa_admin_username');
    if (username) {
      headers['x-admin-username'] = username;
    }
    const passcode = localStorage.getItem('namahaa_admin_auth_code');
    if (passcode) {
      headers['x-admin-passcode'] = passcode;
      headers['x-admin-auth'] = passcode;
    }
    const token = sessionStorage.getItem('namahaa_admin_token');
    if (token) {
      headers['x-admin-token'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Uploads a File, Blob, Image URL, or Base64 Data URL to Supabase Storage ('food-images')
 * via the secure Next.js Server API route (/api/admin/upload-image).
 * This keeps the service role key safe on the server and allows only authorized admin uploads.
 */
export async function uploadImageViaAdminApi(
  fileOrBlobOrUrl: File | Blob | string,
  customFilename?: string
): Promise<{ publicUrl: string | null; error: Error | null }> {
  try {
    const authHeaders = getAdminAuthHeaders();

    // 1. File or Blob upload (multipart/form-data)
    if (fileOrBlobOrUrl instanceof File || fileOrBlobOrUrl instanceof Blob) {
      const formData = new FormData();
      formData.append('file', fileOrBlobOrUrl);
      if (customFilename) {
        formData.append('filename', customFilename);
      }

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.publicUrl) {
        return { publicUrl: data.publicUrl, error: null };
      }
      return {
        publicUrl: null,
        error: new Error(data.error || `Server upload failed (HTTP ${res.status})`),
      };
    }

    // 2. Base64 Data URL or External Image URL (application/json)
    if (typeof fileOrBlobOrUrl === 'string') {
      const isDataUrl = fileOrBlobOrUrl.startsWith('data:');
      const payload = isDataUrl
        ? { dataUrl: fileOrBlobOrUrl, filename: customFilename }
        : { imageUrl: fileOrBlobOrUrl, filename: customFilename };

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.publicUrl) {
        return { publicUrl: data.publicUrl, error: null };
      }
      return {
        publicUrl: null,
        error: new Error(data.error || `Failed to import image to server (HTTP ${res.status})`),
      };
    }

    return { publicUrl: null, error: new Error('Unsupported image payload') };
  } catch (err: any) {
    console.error('uploadImageViaAdminApi error:', err);
    return { publicUrl: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Deletes a storage image from 'food-images' via the secure Next.js Server API route.
 */
export async function deleteImageViaAdminApi(imageUrl: string): Promise<boolean> {
  if (!imageUrl || !imageUrl.includes(BUCKET_NAME)) return false;

  try {
    const authHeaders = getAdminAuthHeaders();

    const res = await fetch('/api/admin/delete-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ imageUrl }),
    });

    const data = await res.json();
    return Boolean(res.ok && data.success);
  } catch (err) {
    console.error('deleteImageViaAdminApi error:', err);
    return false;
  }
}

/**
 * Helper to ensure an image URL is uploaded to Supabase Storage if it's a data URL.
 * Returns the public Supabase Storage CDN URL so it is visible to all customer devices.
 */
export async function ensureCloudUrl(url: string): Promise<string> {
  if (!url || typeof url !== 'string') return '';
  // Remote HTTP/HTTPS URLs pass through directly
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Local base64 data URLs get uploaded to Supabase Storage bucket via secure server API
  if (url.startsWith('data:')) {
    try {
      const { publicUrl, error } = await uploadImageViaAdminApi(url);
      if (publicUrl) return publicUrl;
      if (error) console.warn('ensureCloudUrl upload warning:', error);
      return url;
    } catch (err) {
      console.error('ensureCloudUrl error:', err);
      return url;
    }
  }
  return url;
}
