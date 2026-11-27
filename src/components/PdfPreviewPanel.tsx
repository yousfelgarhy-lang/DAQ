import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import {
  PDF_ZOOM_STEPS,
  PdfZoomMode,
  clampPageNumber,
  computeNextZoomStep,
  computePageDisplayGeometry,
  pickMostVisiblePage,
} from '../utils/pdfPreviewLogic';

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;
async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([lib, workerMod]) => {
      lib.GlobalWorkerOptions.workerSrc = workerMod.default;
      return lib;
    });
  }
  return pdfjsPromise;
}

interface PageMeta {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
}

interface PdfPreviewPanelProps {
  bytes: Uint8Array | null;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  isGenerating?: boolean;
  generatingLabel?: string;
  showThumbnails?: boolean;
  testIdPrefix?: string;
  viewportHeightClass?: string;
}

function PdfPageThumbnail({
  pdfDoc,
  pageNumber,
  active,
  onSelect,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onSelect: (page: number) => void;
}) {
  const thumbRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    pdfDoc
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;
        const canvas = thumbRef.current;
        if (!canvas) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 68;
        const scale = targetWidth / Math.max(1, baseViewport.width);
        const viewport = page.getViewport({ scale });

        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));

        renderTask = page.render({
          canvas,
          viewport,
        });
        return renderTask.promise;
      })
      .catch(() => {
        // Ignore cancellation or transient thumbnail errors
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
      if (thumbRef.current) {
        thumbRef.current.width = 0;
        thumbRef.current.height = 0;
      }
    };
  }, [pdfDoc, pageNumber]);

  return (
    <button
      type="button"
      onClick={() => onSelect(pageNumber)}
      aria-label={`الانتقال إلى الصفحة ${pageNumber}`}
      aria-current={active ? 'page' : undefined}
      className={`group shrink-0 flex flex-col items-center gap-1.5 p-1.5 rounded-xl border transition-all cursor-pointer ${
        active
          ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#A3E635]/15 shadow-xs'
          : 'border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] hover:border-[#65A30D]'
      }`}
    >
      <div className="w-[56px] h-[74px] rounded-md overflow-hidden bg-white border border-[#E5EFE7] dark:border-[#1E4232] flex items-center justify-center">
        <canvas ref={thumbRef} className="max-w-full max-h-full object-contain block" />
      </div>
      <span
        className={`font-mono-num text-[11px] font-bold ${
          active
            ? 'text-[#3F6212] dark:text-[#A3E635]'
            : 'text-[#5B7869] dark:text-[#86A896]'
        }`}
      >
        {pageNumber}
      </span>
    </button>
  );
}

function PdfContinuousPage({
  pdfDoc,
  meta,
  totalPages,
  containerWidth,
  zoom,
  fitMode,
  scrollRoot,
  testIdPrefix,
  onRegisterNode,
  onPageReady,
}: {
  pdfDoc: PDFDocumentProxy;
  meta: PageMeta;
  totalPages: number;
  containerWidth: number;
  zoom: number;
  fitMode: PdfZoomMode;
  scrollRoot: HTMLDivElement | null;
  testIdPrefix: string;
  onRegisterNode: (pageNumber: number, el: HTMLDivElement | null) => void;
  onPageReady?: (pageNumber: number) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(meta.pageNumber <= 2);
  const [isRendering, setIsRendering] = useState(false);

  const geometry = useMemo(
    () =>
      computePageDisplayGeometry({
        pageWidthPt: meta.widthPt,
        pageHeightPt: meta.heightPt,
        containerWidthPx: containerWidth,
        zoomMultiplier: zoom,
        fitMode,
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      }),
    [meta.widthPt, meta.heightPt, containerWidth, zoom, fitMode]
  );

  // Register outer page card for scroll tracking & jump-to-page navigation
  useEffect(() => {
    onRegisterNode(meta.pageNumber, cardRef.current);
    return () => onRegisterNode(meta.pageNumber, null);
  }, [meta.pageNumber, onRegisterNode]);

  // Reserve exact frame dimensions so scrolling never jumps even when offscreen canvas is released
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.style.width = `${geometry.cssWidth}px`;
    frame.style.height = `${geometry.cssHeight}px`;
  }, [geometry.cssWidth, geometry.cssHeight]);

  // Lazy visibility observer to mount/release page canvas backing stores
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === el) {
            setIsNearViewport(entry.isIntersecting);
          }
        }
      },
      {
        root: scrollRoot,
        rootMargin: '420px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot]);

  // Render page canvas when near viewport; release backing memory when far offscreen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isNearViewport) {
      canvas.width = 0;
      canvas.height = 0;
      setIsRendering(false);
      return;
    }

    let cancelled = false;
    let renderTask: RenderTask | null = null;
    setIsRendering(true);

    pdfDoc
      .getPage(meta.pageNumber)
      .then((page) => {
        if (cancelled) return;
        const targetCanvas = canvasRef.current;
        if (!targetCanvas) return;

        const viewport = page.getViewport({ scale: geometry.renderScale });
        targetCanvas.width = Math.max(1, Math.round(viewport.width));
        targetCanvas.height = Math.max(1, Math.round(viewport.height));
        targetCanvas.style.width = `${geometry.cssWidth}px`;
        targetCanvas.style.height = `${geometry.cssHeight}px`;

        renderTask = page.render({
          canvas: targetCanvas,
          viewport,
        });

        return renderTask.promise;
      })
      .then(() => {
        if (!cancelled) {
          setIsRendering(false);
          onPageReady?.(meta.pageNumber);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : '';
        if (/cancel/i.test(msg)) return;
        setIsRendering(false);
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [
    pdfDoc,
    meta.pageNumber,
    isNearViewport,
    geometry.renderScale,
    geometry.cssWidth,
    geometry.cssHeight,
    onPageReady,
  ]);

  return (
    <div
      ref={cardRef}
      data-page-number={meta.pageNumber}
      data-testid={`${testIdPrefix}-page-${meta.pageNumber}`}
      className="mx-auto flex flex-col items-center gap-2 shrink-0"
    >
      <div className="w-full flex items-center justify-between gap-2 px-1 text-[11px] font-semibold text-[#5B7869] dark:text-[#86A896]">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/85 dark:bg-[#0D231A]/90 border border-[#D5E3D8] dark:border-[#1E4232] font-mono-num font-bold text-[#081E15] dark:text-[#F2F7F4]">
          صفحة {meta.pageNumber} من {totalPages}
        </span>
        <span dir="ltr" className="font-mono-num">
          {Math.round(meta.widthPt)} × {Math.round(meta.heightPt)} pt
        </span>
      </div>

      <div
        ref={frameRef}
        className="relative rounded-lg overflow-hidden shadow-md bg-white border border-[#D5E3D8] dark:border-[#1E4232] shrink-0"
      >
        {isRendering && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/70"
          >
            <Loader2 className="w-5 h-5 text-[#4D7C0F] animate-spin" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          data-testid={`${testIdPrefix}-canvas-${meta.pageNumber}`}
          aria-label={`معاينة الصفحة ${meta.pageNumber} من ${totalPages}`}
          className="block"
        />
      </div>
    </div>
  );
}

export function PdfPreviewPanel({
  bytes,
  title = 'معاينة ملف PDF',
  subtitle,
  emptyMessage = 'ستظهر معاينة صفحات PDF هنا فور تجهيز الملف.',
  isGenerating = false,
  generatingLabel = 'جارٍ تحديث معاينة PDF...',
  showThumbnails = true,
  testIdPrefix = 'pdf-preview',
  viewportHeightClass = 'h-[460px] sm:h-[560px]',
}: PdfPreviewPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageNodeMapRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollRafRef = useRef<number | null>(null);

  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pagesMeta, setPagesMeta] = useState<PageMeta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<PdfZoomMode>('fit-width');
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(540);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [pageOnePainted, setPageOnePainted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setViewportRef = useCallback((node: HTMLDivElement | null) => {
    scrollContainerRef.current = node;
    setScrollEl(node);
  }, []);

  // Track responsive container width so Fit-to-Width automatically adapts on mobile/tablet/desktop
  useEffect(() => {
    const el = scrollEl;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.max(200, el.clientWidth - 28);
      setContainerWidth((prev) => (Math.abs(prev - next) >= 2 ? next : prev));
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateWidth);
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [scrollEl]);

  // Load PDFDocumentProxy and lightweight page geometry metadata from defensive copy
  useEffect(() => {
    if (!bytes || bytes.byteLength === 0) {
      setPdfDoc(null);
      setPagesMeta([]);
      setCurrentPage(1);
      setPageOnePainted(false);
      setError(null);
      setLoadingDoc(false);
      return;
    }

    let cancelled = false;
    let activeDoc: PDFDocumentProxy | null = null;
    let activeLoadingTask: ReturnType<typeof import('pdfjs-dist')['getDocument']> | null = null;
    setLoadingDoc(true);
    setPageOnePainted(false);
    setPagesMeta([]);
    setCurrentPage(1);
    setError(null);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      scrollContainerRef.current.scrollLeft = 0;
    }

    // Clone Uint8Array so pdfjs worker transfer never detaches caller's download buffer
    const clonedData = bytes.slice();

    loadPdfJs()
      .then((pdfjsLib) => {
        if (cancelled) return null;
        activeLoadingTask = pdfjsLib.getDocument({ data: clonedData });
        return activeLoadingTask.promise;
      })
      .then(async (doc) => {
        if (!doc) return;
        if (cancelled) {
          void doc.cleanup();
          return;
        }
        activeDoc = doc;

        const metas: PageMeta[] = [];
        for (let i = 1; i <= doc.numPages; i += 1) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          metas.push({
            pageNumber: i,
            widthPt: vp.width,
            heightPt: vp.height,
          });
        }

        if (cancelled) {
          void doc.cleanup();
          return;
        }

        setPdfDoc(doc);
        setPagesMeta(metas);
        setCurrentPage(1);
      })
      .catch(() => {
        if (!cancelled) {
          setPdfDoc(null);
          setPagesMeta([]);
          setError('تعذّر عرض معاينة PDF. يمكنك تجربة إعادة التوليد أو التحقق من الملف.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDoc(false);
        }
      });

    return () => {
      cancelled = true;
      if (activeLoadingTask) {
        void activeLoadingTask.destroy();
      }
      if (activeDoc) {
        void activeDoc.cleanup();
      }
    };
  }, [bytes]);

  const pageCount = pagesMeta.length;

  const handleRegisterNode = useCallback((pageNumber: number, el: HTMLDivElement | null) => {
    if (el) {
      pageNodeMapRef.current.set(pageNumber, el);
    } else {
      pageNodeMapRef.current.delete(pageNumber);
    }
  }, []);

  const handlePageReady = useCallback((pageNumber: number) => {
    if (pageNumber === 1) {
      setPageOnePainted(true);
    }
  }, []);

  // Sync active page indicator smoothly while user scrolls vertically through all pages
  useEffect(() => {
    const container = scrollEl;
    if (!container || pageCount <= 1) return;

    const updateActiveFromScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;
      const samples = [];

      for (let i = 1; i <= pageCount; i += 1) {
        const node = pageNodeMapRef.current.get(i);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, containerRect.top);
        const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
        if (ratio > 0) {
          const nodeCenter = rect.top + rect.height / 2;
          samples.push({
            pageNumber: i,
            ratio,
            distanceFromCenter: Math.abs(nodeCenter - containerCenter),
          });
        }
      }

      const best = pickMostVisiblePage(samples);
      if (best !== null) {
        setCurrentPage((prev) => (prev === best ? prev : best));
      }
    };

    const onScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        updateActiveFromScroll();
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [scrollEl, pageCount]);

  const scrollToPage = useCallback(
    (targetPage: number) => {
      const clamped = clampPageNumber(targetPage, pageCount);
      setCurrentPage(clamped);
      const container = scrollContainerRef.current;
      const targetNode = pageNodeMapRef.current.get(clamped);
      if (container && targetNode) {
        const containerRect = container.getBoundingClientRect();
        const nodeRect = targetNode.getBoundingClientRect();
        const nextTop = container.scrollTop + (nodeRect.top - containerRect.top) - 12;
        container.scrollTo({
          top: Math.max(0, nextTop),
          behavior: 'smooth',
        });
      }
    },
    [pageCount]
  );

  const effectiveZoom = fitMode === 'fit-width' ? 1 : zoom;
  const canZoomOut = effectiveZoom > PDF_ZOOM_STEPS[0] + 0.001;
  const canZoomIn = effectiveZoom < PDF_ZOOM_STEPS[PDF_ZOOM_STEPS.length - 1] - 0.001;

  const handleZoomOut = () => {
    const next = computeNextZoomStep(effectiveZoom, 'out', PDF_ZOOM_STEPS);
    setFitMode('custom');
    setZoom(next);
  };

  const handleZoomIn = () => {
    const next = computeNextZoomStep(effectiveZoom, 'in', PDF_ZOOM_STEPS);
    setFitMode('custom');
    setZoom(next);
  };

  const handleFitWidth = () => {
    setFitMode('fit-width');
    setZoom(1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  };

  const isBusy =
    isGenerating ||
    loadingDoc ||
    (Boolean(pdfDoc) && pageCount > 0 && !error && !pageOnePainted);

  return (
    <div
      data-testid={testIdPrefix}
      data-busy={isBusy ? 'true' : 'false'}
      className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 min-w-0 max-w-full"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
              {title}
            </h2>
            {pageCount > 0 && (
              <span
                data-testid={`${testIdPrefix}-page-count`}
                className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono-num bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635]"
              >
                {pageCount} {pageCount === 1 ? 'صفحة' : 'صفحات'}
              </span>
            )}
            {bytes && bytes.byteLength > 0 && (
              <span
                dir="ltr"
                className="font-mono-num text-xs font-semibold text-[#5B7869] dark:text-[#86A896]"
              >
                {formatBytes(bytes.byteLength)}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#5B7869] dark:text-[#86A896] mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Zoom & Fit-to-Width Controls */}
        {pdfDoc && !error && (
          <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!canZoomOut}
              aria-label="تصغير المعاينة"
              className="min-w-[36px] min-h-[36px] p-2 rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] disabled:opacity-35 cursor-pointer flex items-center justify-center"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span
              data-testid={`${testIdPrefix}-zoom-label`}
              className="px-2.5 py-1.5 min-h-[36px] inline-flex items-center rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] font-mono-num text-xs font-bold text-[#081E15] dark:text-[#F2F7F4]"
            >
              {fitMode === 'fit-width' ? '100%' : `${Math.round(zoom * 100)}%`}
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!canZoomIn}
              aria-label="تكبير المعاينة"
              className="min-w-[36px] min-h-[36px] p-2 rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] disabled:opacity-35 cursor-pointer flex items-center justify-center"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleFitWidth}
              aria-pressed={fitMode === 'fit-width'}
              aria-label="ملاءمة العرض"
              data-testid={`${testIdPrefix}-fit-width`}
              className={`min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                fitMode === 'fit-width'
                  ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#EAF2EC] dark:bg-[#143326] text-[#3F6212] dark:text-[#A3E635]'
                  : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span dir="rtl">ملاءمة العرض</span>
            </button>
          </div>
        )}
      </div>

      {/* Continuous Vertical Document Viewport */}
      <div className="relative w-full max-w-full">
        {(isGenerating || loadingDoc) && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-20 rounded-xl bg-[#06140E]/55 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white p-4 text-center"
          >
            <Loader2 className="w-6 h-6 text-[#A3E635] animate-spin" />
            <span className="text-xs sm:text-sm font-bold">
              {isGenerating ? generatingLabel : 'جارٍ تحميل صفحات PDF...'}
            </span>
          </div>
        )}

        <div
          ref={setViewportRef}
          data-testid={`${testIdPrefix}-scroll-viewport`}
          className={`relative w-full max-w-full ${viewportHeightClass} overflow-auto overscroll-contain rounded-xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#EAEFED] dark:bg-[#05120C] px-3 py-4 sm:px-4 sm:py-5`}
        >
          {error ? (
            <div className="min-h-[240px] flex flex-col items-center justify-center gap-2 text-center max-w-xs mx-auto text-rose-600 dark:text-rose-300">
              <AlertCircle className="w-7 h-7" />
              <p className="text-xs sm:text-sm font-semibold">{error}</p>
            </div>
          ) : !bytes || bytes.byteLength === 0 ? (
            <div className="min-h-[240px] flex flex-col items-center justify-center gap-2 text-center max-w-xs mx-auto text-[#5B7869] dark:text-[#86A896]">
              <FileText className="w-8 h-8 opacity-65" />
              <p className="text-xs sm:text-sm font-medium">{emptyMessage}</p>
            </div>
          ) : (
            pdfDoc &&
            pagesMeta.length > 0 && (
              <div className="min-w-full w-max flex flex-col items-center gap-5 sm:gap-6">
                {pagesMeta.map((meta) => (
                  <PdfContinuousPage
                    key={meta.pageNumber}
                    pdfDoc={pdfDoc}
                    meta={meta}
                    totalPages={pageCount}
                    containerWidth={containerWidth}
                    zoom={zoom}
                    fitMode={fitMode}
                    scrollRoot={scrollEl}
                    testIdPrefix={testIdPrefix}
                    onRegisterNode={handleRegisterNode}
                    onPageReady={handlePageReady}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Navigation Footer: Prev / Current Indicator / Next / Direct Jump */}
      {pdfDoc && pageCount > 0 && !error && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => scrollToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="الصفحة السابقة"
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-xs font-bold text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <span
                data-testid={`${testIdPrefix}-page-indicator`}
                className="px-3 py-1.5 min-h-[38px] inline-flex items-center rounded-xl bg-[#EAF2EC] dark:bg-[#143326] text-xs font-bold text-[#081E15] dark:text-[#F2F7F4] font-mono-num"
              >
                صفحة {currentPage} من {pageCount}
              </span>

              <button
                type="button"
                onClick={() => scrollToPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                aria-label="الصفحة التالية"
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-xs font-bold text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] disabled:opacity-40 cursor-pointer"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`${testIdPrefix}-page-jump`}
                  className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] whitespace-nowrap"
                >
                  انتقال إلى:
                </label>
                <select
                  id={`${testIdPrefix}-page-jump`}
                  data-testid={`${testIdPrefix}-page-jump`}
                  value={currentPage}
                  onChange={(e) => scrollToPage(Number(e.target.value))}
                  aria-label="الانتقال إلى صفحة محددة"
                  className="px-2.5 py-1.5 min-h-[38px] rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-base sm:text-xs font-bold font-mono-num text-[#081E15] dark:text-[#F2F7F4] focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                >
                  {pagesMeta.map((m) => (
                    <option key={m.pageNumber} value={m.pageNumber}>
                      صفحة {m.pageNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Thumbnail Strip (Quick Jump for <= 12 pages) */}
          {showThumbnails && pageCount > 1 && pageCount <= 12 && (
            <div
              aria-label="صفحات ملف PDF"
              className="flex items-center gap-2 overflow-x-auto pb-1 pt-1"
            >
              {pagesMeta.map((m) => (
                <PdfPageThumbnail
                  key={m.pageNumber}
                  pdfDoc={pdfDoc}
                  pageNumber={m.pageNumber}
                  active={currentPage === m.pageNumber}
                  onSelect={scrollToPage}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
