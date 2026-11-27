export type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export const ACCEPTED_IMAGE_MIMES: SupportedImageMime[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB safety cap
export const MAX_CANVAS_DIMENSION = 8192;

export function isSupportedImageFile(file: File): boolean {
  if (ACCEPTED_IMAGE_MIMES.includes(file.type as SupportedImageMime)) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
}

export function getExtensionFromMime(mime: SupportedImageMime): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
  }
}

export function getMimeLabel(mime: SupportedImageMime): string {
  switch (mime) {
    case 'image/jpeg':
      return 'JPG';
    case 'image/png':
      return 'PNG';
    case 'image/webp':
      return 'WebP';
  }
}

export function detectImageMime(file: File): SupportedImageMime {
  if (file.type === 'image/png') return 'image/png';
  if (file.type === 'image/webp') return 'image/webp';
  if (file.type === 'image/jpeg') return 'image/jpeg';
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export interface LoadedImageInfo {
  element: HTMLImageElement;
  objectUrl: string;
  width: number;
  height: number;
  mime: SupportedImageMime;
  size: number;
  name: string;
}

export function loadImageFile(file: File): Promise<LoadedImageInfo> {
  return new Promise((resolve, reject) => {
    if (!isSupportedImageFile(file)) {
      reject(new Error('صيغة الملف غير مدعومة. الصيغ المتاحة: JPG و PNG و WebP.'));
      return;
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      reject(new Error('حجم الصورة كبير جداً (الحد الأقصى 25 ميجابايت). يرجى اختيار صورة أصغر.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('تعذّر قراءة أبعاد الصورة. قد يكون الملف تالفاً.'));
        return;
      }
      resolve({
        element: img,
        objectUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        mime: detectImageMime(file),
        size: file.size,
        name: file.name,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذّر تحميل الصورة. يرجى التأكد من سلامة الملف.'));
    };

    img.src = objectUrl;
  });
}

export interface ProcessedImageResult {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
  mime: SupportedImageMime;
}

export function processImageOnCanvas(
  img: HTMLImageElement,
  options: {
    width: number;
    height: number;
    mime: SupportedImageMime;
    quality: number; // 0.1 to 1
  }
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    let targetWidth = Math.max(1, Math.round(options.width));
    let targetHeight = Math.max(1, Math.round(options.height));

    // Gracefully cap giant dimensions so canvas never crashes browser memory
    if (targetWidth > MAX_CANVAS_DIMENSION || targetHeight > MAX_CANVAS_DIMENSION) {
      const scale = Math.min(MAX_CANVAS_DIMENSION / targetWidth, MAX_CANVAS_DIMENSION / targetHeight);
      targetWidth = Math.max(1, Math.round(targetWidth * scale));
      targetHeight = Math.max(1, Math.round(targetHeight * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('المتصفح لا يدعم معالجة الصور عبر Canvas.'));
      return;
    }

    // Fill white background when converting transparent images to JPEG
    if (options.mime === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const clampedQuality = Math.min(1, Math.max(0.05, options.quality));

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('فشلت معالجة الصورة. حاول اختيار أبعاد أو صيغة أخرى.'));
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve({
          blob,
          url,
          size: blob.size,
          width: targetWidth,
          height: targetHeight,
          mime: options.mime,
        });
      },
      options.mime,
      options.mime === 'image/png' ? undefined : clampedQuality
    );
  });
}

export function triggerBlobDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function buildOutputFilename(originalName: string, suffix: string, mime: SupportedImageMime): string {
  const base = originalName.replace(/\.[^/.]+$/, '') || 'daq-image';
  const ext = getExtensionFromMime(mime);
  return `${base}-${suffix}.${ext}`;
}
