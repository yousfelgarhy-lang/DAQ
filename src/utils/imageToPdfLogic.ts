import {
  PDFDocument,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
} from 'pdf-lib';
import { SupportedImageMime } from './imageProcessing';

export type PdfPageSizePreset = 'a4' | 'a3' | 'letter' | 'original' | 'custom';
export type PdfOrientation = 'portrait' | 'landscape' | 'auto';
export type PdfImagePlacement = 'fit' | 'fill' | 'stretch';
export type PdfMarginPreset = 'none' | 'small' | 'medium' | 'large' | 'custom';
export type PdfImageQualityPreset = 'high' | 'balanced' | 'compact' | 'original';

export interface ImageToPdfSettings {
  pageSize: PdfPageSizePreset;
  customWidthMm: number;
  customHeightMm: number;
  orientation: PdfOrientation;
  placement: PdfImagePlacement;
  marginPreset: PdfMarginPreset;
  customMarginMm: number;
  backgroundMode: 'white' | 'custom';
  backgroundColor: string;
  qualityPreset: PdfImageQualityPreset;
}

export const DEFAULT_IMAGE_TO_PDF_SETTINGS: ImageToPdfSettings = {
  pageSize: 'a4',
  customWidthMm: 210,
  customHeightMm: 297,
  orientation: 'auto',
  placement: 'fit',
  marginPreset: 'small',
  customMarginMm: 10,
  backgroundMode: 'white',
  backgroundColor: '#FFFFFF',
  qualityPreset: 'high',
};

export interface ImageToPdfInput {
  id: string;
  name: string;
  width: number;
  height: number;
  mime: SupportedImageMime;
  bytes: Uint8Array;
  element?: HTMLImageElement;
}

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageDrawLayout {
  contentBox: DrawRect;
  drawRect: DrawRect;
  needsClip: boolean;
}

const PT_PER_INCH = 72;
const MM_PER_INCH = 25.4;
const MAX_PDF_PAGE_PT = 14000;
const MAX_CANVAS_EDGE_HIGH = 3600;
const MAX_CANVAS_EDGE_COMPACT = 2200;

export function mmToPt(mm: number): number {
  if (!Number.isFinite(mm) || mm <= 0) return 0;
  return (mm * PT_PER_INCH) / MM_PER_INCH;
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return { r: 1, g: 1, b: 1 };
  }
  const intVal = parseInt(cleaned, 16);
  return {
    r: ((intVal >> 16) & 255) / 255,
    g: ((intVal >> 8) & 255) / 255,
    b: (intVal & 255) / 255,
  };
}

export function resolveQualityNumber(preset: PdfImageQualityPreset): number {
  switch (preset) {
    case 'original':
      return 1;
    case 'high':
      return 0.92;
    case 'balanced':
      return 0.8;
    case 'compact':
      return 0.62;
  }
}

export function resolveMarginPt(
  settings: Pick<ImageToPdfSettings, 'marginPreset' | 'customMarginMm'>
): number {
  switch (settings.marginPreset) {
    case 'none':
      return 0;
    case 'small':
      return 18; // ~6.35 mm
    case 'medium':
      return 36; // ~12.7 mm
    case 'large':
      return 54; // ~19 mm
    case 'custom':
      return clampNumber(mmToPt(settings.customMarginMm), 0, 220);
  }
}

export function resolvePageDimensionsPt(
  settings: Pick<
    ImageToPdfSettings,
    'pageSize' | 'customWidthMm' | 'customHeightMm' | 'orientation'
  >,
  imgWidth: number,
  imgHeight: number
): { widthPt: number; heightPt: number } {
  const safeImgW = Math.max(1, imgWidth);
  const safeImgH = Math.max(1, imgHeight);

  let baseW: number;
  let baseH: number;

  switch (settings.pageSize) {
    case 'a4':
      baseW = 595.28;
      baseH = 841.89;
      break;
    case 'a3':
      baseW = 841.89;
      baseH = 1190.55;
      break;
    case 'letter':
      baseW = 612;
      baseH = 792;
      break;
    case 'custom': {
      baseW = clampNumber(mmToPt(settings.customWidthMm), 56, MAX_PDF_PAGE_PT);
      baseH = clampNumber(mmToPt(settings.customHeightMm), 56, MAX_PDF_PAGE_PT);
      break;
    }
    case 'original': {
      let w = safeImgW;
      let h = safeImgH;
      if (w > MAX_PDF_PAGE_PT || h > MAX_PDF_PAGE_PT) {
        const s = Math.min(MAX_PDF_PAGE_PT / w, MAX_PDF_PAGE_PT / h);
        w *= s;
        h *= s;
      }
      baseW = w;
      baseH = h;
      break;
    }
  }

  const shortSide = Math.min(baseW, baseH);
  const longSide = Math.max(baseW, baseH);

  if (settings.pageSize === 'original') {
    if (settings.orientation === 'portrait') {
      return { widthPt: shortSide, heightPt: longSide };
    }
    if (settings.orientation === 'landscape') {
      return { widthPt: longSide, heightPt: shortSide };
    }
    return { widthPt: baseW, heightPt: baseH };
  }

  if (settings.orientation === 'portrait') {
    return { widthPt: shortSide, heightPt: longSide };
  }
  if (settings.orientation === 'landscape') {
    return { widthPt: longSide, heightPt: shortSide };
  }

  // 'auto': orient page to match each image's aspect ratio
  const isImageLandscape = safeImgW > safeImgH;
  return isImageLandscape
    ? { widthPt: longSide, heightPt: shortSide }
    : { widthPt: shortSide, heightPt: longSide };
}

export function computeImageDrawRect(
  pageWidthPt: number,
  pageHeightPt: number,
  requestedMarginPt: number,
  imgWidth: number,
  imgHeight: number,
  placement: PdfImagePlacement
): ImageDrawLayout {
  const maxAllowedMargin = Math.max(0, Math.min(pageWidthPt, pageHeightPt) * 0.42);
  const margin = clampNumber(requestedMarginPt, 0, maxAllowedMargin);

  const contentBox: DrawRect = {
    x: margin,
    y: margin,
    width: Math.max(1, pageWidthPt - margin * 2),
    height: Math.max(1, pageHeightPt - margin * 2),
  };

  const safeImgW = Math.max(1, imgWidth);
  const safeImgH = Math.max(1, imgHeight);

  if (placement === 'stretch') {
    return {
      contentBox,
      drawRect: { ...contentBox },
      needsClip: false,
    };
  }

  const scale =
    placement === 'fill'
      ? Math.max(contentBox.width / safeImgW, contentBox.height / safeImgH)
      : Math.min(contentBox.width / safeImgW, contentBox.height / safeImgH);

  const drawW = safeImgW * scale;
  const drawH = safeImgH * scale;
  const drawX = contentBox.x + (contentBox.width - drawW) / 2;
  const drawY = contentBox.y + (contentBox.height - drawH) / 2;

  return {
    contentBox,
    drawRect: {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    },
    needsClip: placement === 'fill',
  };
}

export function sanitizePdfFilename(rawName: string, fallback = 'DAQ-Images'): string {
  const cleaned = rawName
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*]+/g, '-')
    .trim();
  return `${cleaned || fallback}.pdf`;
}

function isJpegSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPngSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

async function rasterizeForPdf(
  item: ImageToPdfInput,
  settings: ImageToPdfSettings
): Promise<{ format: 'jpeg' | 'png'; bytes: Uint8Array; width: number; height: number }> {
  const rawIsJpeg = isJpegSignature(item.bytes);
  const rawIsPng = isPngSignature(item.bytes);
  const bgHex = settings.backgroundMode === 'custom' ? settings.backgroundColor : '#FFFFFF';

  // If user chose original quality and bytes are already native PDF-embeddable JPG or PNG
  // and dimensions are within safe limits, embed directly without lossy re-encoding.
  if (
    settings.qualityPreset === 'original' &&
    (rawIsJpeg || rawIsPng) &&
    item.width <= MAX_CANVAS_EDGE_HIGH &&
    item.height <= MAX_CANVAS_EDGE_HIGH
  ) {
    return {
      format: rawIsJpeg ? 'jpeg' : 'png',
      bytes: item.bytes,
      width: item.width,
      height: item.height,
    };
  }

  // Fallback for Node unit tests when no DOM canvas/element is provided
  if (typeof document === 'undefined' || !item.element) {
    if (rawIsJpeg || rawIsPng) {
      return {
        format: rawIsJpeg ? 'jpeg' : 'png',
        bytes: item.bytes,
        width: item.width,
        height: item.height,
      };
    }
    throw new Error(`تعذّر معالجة الصورة "${item.name}" بدون بيئة المتصفح.`);
  }

  const maxEdge =
    settings.qualityPreset === 'compact' ? MAX_CANVAS_EDGE_COMPACT : MAX_CANVAS_EDGE_HIGH;

  let targetW = Math.max(1, item.width);
  let targetH = Math.max(1, item.height);
  if (targetW > maxEdge || targetH > maxEdge) {
    const scale = Math.min(maxEdge / targetW, maxEdge / targetH);
    targetW = Math.max(1, Math.round(targetW * scale));
    targetH = Math.max(1, Math.round(targetH * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('المتصفح لا يدعم معالجة الصور عبر Canvas.');
  }

  const usePng = settings.qualityPreset === 'original' && item.mime === 'image/webp';
  if (!usePng) {
    // Paint page background color behind transparent PNG/WebP before JPEG encoding
    ctx.fillStyle = /^#[0-9a-fA-F]{6}$/.test(bgHex.trim()) ? bgHex : '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(item.element, 0, 0, targetW, targetH);

  const mimeOut = usePng ? 'image/png' : 'image/jpeg';
  const quality = resolveQualityNumber(settings.qualityPreset);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`فشل تحويل الصورة "${item.name}" لإضافتها إلى PDF.`))),
      mimeOut,
      usePng ? undefined : quality
    );
  });

  const outBytes = new Uint8Array(await blob.arrayBuffer());
  // Release canvas memory promptly
  canvas.width = 0;
  canvas.height = 0;

  return {
    format: usePng ? 'png' : 'jpeg',
    bytes: outBytes,
    width: targetW,
    height: targetH,
  };
}

export async function buildImagesPdfBytes(
  items: ImageToPdfInput[],
  settings: ImageToPdfSettings,
  onProgress?: (percent: number, label: string) => void,
  shouldAbort?: () => boolean
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  if (items.length === 0) {
    throw new Error('يرجى إضافة صورة واحدة على الأقل لإنشاء ملف PDF.');
  }

  const pdfDoc = await PDFDocument.create();
  const marginPt = resolveMarginPt(settings);
  const bgRgb =
    settings.backgroundMode === 'custom'
      ? parseHexRgb(settings.backgroundColor)
      : { r: 1, g: 1, b: 1 };

  for (let i = 0; i < items.length; i++) {
    if (shouldAbort?.()) {
      throw new Error('ABORTED');
    }

    const item = items[i];
    onProgress?.(
      Math.round((i / items.length) * 88),
      `جارٍ تجهيز الصورة ${i + 1} من ${items.length}: ${item.name}`
    );

    const encoded = await rasterizeForPdf(item, settings);
    if (shouldAbort?.()) {
      throw new Error('ABORTED');
    }

    const embedded =
      encoded.format === 'png'
        ? await pdfDoc.embedPng(encoded.bytes)
        : await pdfDoc.embedJpg(encoded.bytes);

    const { widthPt, heightPt } = resolvePageDimensionsPt(
      settings,
      encoded.width,
      encoded.height
    );

    const effectiveMargin = settings.pageSize === 'original' && settings.marginPreset === 'none'
      ? 0
      : marginPt;

    const layout = computeImageDrawRect(
      widthPt,
      heightPt,
      effectiveMargin,
      encoded.width,
      encoded.height,
      settings.placement
    );

    const page = pdfDoc.addPage([widthPt, heightPt]);

    // Fill background color across full page
    page.drawRectangle({
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt,
      color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
    });

    if (layout.needsClip) {
      page.pushOperators(
        pushGraphicsState(),
        rectangle(
          layout.contentBox.x,
          layout.contentBox.y,
          layout.contentBox.width,
          layout.contentBox.height
        ),
        clip(),
        endPath()
      );
      page.drawImage(embedded, {
        x: layout.drawRect.x,
        y: layout.drawRect.y,
        width: layout.drawRect.width,
        height: layout.drawRect.height,
      });
      page.pushOperators(popGraphicsState());
    } else {
      page.drawImage(embedded, {
        x: layout.drawRect.x,
        y: layout.drawRect.y,
        width: layout.drawRect.width,
        height: layout.drawRect.height,
      });
    }

    if (typeof window !== 'undefined') {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  if (shouldAbort?.()) {
    throw new Error('ABORTED');
  }

  onProgress?.(94, 'جارٍ تجميع صفحات ملف PDF...');
  const bytes = await pdfDoc.save();
  onProgress?.(100, 'تم إنشاء معاينة PDF بنجاح');
  return { bytes, pageCount: items.length };
}
