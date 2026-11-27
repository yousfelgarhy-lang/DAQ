export const PDF_ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/**
 * Caps individual preview page backing-store pixels (~2.4M px) to stay well
 * inside mobile & iOS Safari canvas memory budgets when scrolling multi-page PDFs.
 */
export const MAX_PREVIEW_CANVAS_PIXELS = 2_400_000;

export type PdfZoomMode = 'fit-width' | 'custom';

export interface PageDisplayGeometryInput {
  pageWidthPt: number;
  pageHeightPt: number;
  containerWidthPx: number;
  zoomMultiplier: number;
  fitMode: PdfZoomMode;
  devicePixelRatio?: number;
  maxCanvasPixels?: number;
}

export interface PageDisplayGeometry {
  fitScale: number;
  cssScale: number;
  cssWidth: number;
  cssHeight: number;
  renderScale: number;
  pixelWidth: number;
  pixelHeight: number;
}

export function clampPageNumber(page: number, totalPages: number): number {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return 1;
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.round(page)), Math.floor(totalPages));
}

export function computeNextZoomStep(
  currentZoom: number,
  direction: 'in' | 'out',
  steps: readonly number[] = PDF_ZOOM_STEPS
): number {
  if (steps.length === 0) return currentZoom;
  if (direction === 'in') {
    const next = steps.find((step) => step > currentZoom + 0.001);
    return next ?? steps[steps.length - 1];
  }
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (steps[i] < currentZoom - 0.001) {
      return steps[i];
    }
  }
  return steps[0];
}

export function computePageDisplayGeometry(
  input: PageDisplayGeometryInput
): PageDisplayGeometry {
  const safePageW = Math.max(1, input.pageWidthPt);
  const safePageH = Math.max(1, input.pageHeightPt);
  const availableWidth = Math.max(200, input.containerWidthPx);

  const rawFitScale = availableWidth / safePageW;
  const fitScale = Math.min(2, Math.max(0.2, rawFitScale));

  const effectiveZoom = input.fitMode === 'fit-width' ? 1 : Math.max(0.25, input.zoomMultiplier);
  const cssScale = Math.max(0.2, fitScale * effectiveZoom);

  const cssWidth = Math.max(1, Math.round(safePageW * cssScale));
  const cssHeight = Math.max(1, Math.round(safePageH * cssScale));

  const baseDpr = Math.min(2, Math.max(1, input.devicePixelRatio ?? 1));
  const maxPixels = Math.max(250_000, input.maxCanvasPixels ?? MAX_PREVIEW_CANVAS_PIXELS);

  let effectiveDpr = baseDpr;
  const rawPixels = cssWidth * baseDpr * (cssHeight * baseDpr);
  if (rawPixels > maxPixels) {
    const reduction = Math.sqrt(maxPixels / rawPixels);
    effectiveDpr = Math.max(0.6, baseDpr * reduction);
  }

  const pixelWidth = Math.max(1, Math.round(cssWidth * effectiveDpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * effectiveDpr));
  const renderScale = cssScale * effectiveDpr;

  return {
    fitScale,
    cssScale,
    cssWidth,
    cssHeight,
    renderScale,
    pixelWidth,
    pixelHeight,
  };
}

export interface PageVisibilitySample {
  pageNumber: number;
  ratio: number;
  distanceFromCenter: number;
}

export function pickMostVisiblePage(samples: readonly PageVisibilitySample[]): number | null {
  if (samples.length === 0) return null;

  let best = samples[0];
  for (let i = 1; i < samples.length; i += 1) {
    const candidate = samples[i];
    if (candidate.ratio > best.ratio + 0.02) {
      best = candidate;
    } else if (
      Math.abs(candidate.ratio - best.ratio) <= 0.02 &&
      candidate.distanceFromCenter < best.distanceFromCenter
    ) {
      best = candidate;
    }
  }
  return best.pageNumber;
}
