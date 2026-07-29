/**
 * Compresses user-uploaded image files client-side using HTML5 Canvas.
 * Reduces 5MB-15MB camera photos down to lightweight ~40KB JPEGs that sync cleanly
 * across Supabase and render instantly on all customer devices (mobile, tablet, desktop).
 */
export async function compressImageFile(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed JPEG data URL
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };

      img.onerror = () => {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Ensures an image URL has a cache-busting query parameter (e.g. ?v=timestamp)
 * so mobile browsers (iOS Safari, Android Chrome) always bypass stale disk/memory cache
 * and immediately load newly updated images from Supabase Storage CDN.
 */
export function getFreshImageUrl(url: string | undefined | null, timestamp?: number): string {
  if (!url) return '';
  // Data URLs or local SVG assets do not need query params
  if (url.startsWith('data:') || url.startsWith('/')) return url;

  try {
    const ts = timestamp || Date.now();
    const urlObj = new URL(url);
    // If it already has a 'v' or 't' timestamp param, update it, otherwise set 'v'
    urlObj.searchParams.set('v', ts.toString());
    return urlObj.toString();
  } catch {
    // If URL constructor fails on relative path, fallback append
    const ts = timestamp || Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${ts}`;
  }
}
