/**
 * Client-Side High-Performance Image Compression
 *
 * Utilizes HTML5 Canvas to downscale and recompress raw mobile camera photos (5MB - 15MB)
 * down to 300KB - 800KB before network transmission.
 * - Saves mobile bandwidth by 80% - 92%
 * - Dramatically speeds up Gemini AI receipt OCR scanning
 * - Protects server from large payload / 431 / 413 errors
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (recommended: 0.82)
  outputType?: 'image/webp' | 'image/jpeg';
}

/**
 * Compresses an image File using HTML5 canvas.
 * If the file is not an image (e.g. PDF) or is already small (< 300KB),
 * it returns the original file untouched without processing.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  // If running in SSR / non-browser, return original
  if (typeof window === 'undefined') return file;

  // If not an image or is SVG, return original
  if (!file.type.startsWith('image/') || file.type.includes('svg')) {
    return file;
  }

  // If already under 300KB, no need to compress further
  if (file.size <= 300 * 1024) {
    return file;
  }

  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    outputType = 'image/webp',
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compressed blob is somehow larger than original, return original
              resolve(file);
              return;
            }

            const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
            const cleanName = file.name.replace(/\.[^.]+$/, '') + ext;
            const compressedFile = new File([blob], cleanName, {
              type: outputType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          outputType,
          quality
        );
      } catch (err) {
        console.warn('Image compression fallback:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

