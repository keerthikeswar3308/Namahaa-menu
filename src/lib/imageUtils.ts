/**
 * Compresses user-uploaded image files client-side using HTML5 Canvas.
 * Reduces 5MB-15MB camera photos down to lightweight ~40KB-80KB JPEGs/WebP that sync cleanly
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
 * Converts a File or Blob to a compressed Blob ready for Supabase Storage upload.
 */
export async function compressImageToBlob(
  file: File | Blob,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.75
): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  if (!dataUrl) return file instanceof Blob ? file : new Blob([file]);

  return new Promise((resolve) => {
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
        resolve(file instanceof Blob ? file : new Blob([file]));
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          resolve(blob || (file instanceof Blob ? file : new Blob([file])));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      resolve(file instanceof Blob ? file : new Blob([file]));
    };

    img.src = dataUrl;
  });
}

/**
 * Validates if an image URL points to a loadable image.
 */
export function isValidImageUrl(url: string): Promise<boolean> {
  if (!url || typeof url !== 'string') return Promise.resolve(false);
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
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
    urlObj.searchParams.set('v', ts.toString());
    return urlObj.toString();
  } catch {
    const ts = timestamp || Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${ts}`;
  }
}
