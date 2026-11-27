import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileDown, Loader2, X } from 'lucide-react';
import {
  PdfReportData,
  renderReportToPdfBytes,
  triggerUint8Download,
} from '../utils/pdfExport';
import { formatBytes } from '../utils/formatters';
import { PdfPreviewPanel } from './PdfPreviewPanel';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { ToastType } from '../types/tool';

interface PdfExportButtonProps {
  disabled?: boolean;
  buildReport: () => PdfReportData | null;
  onNotify: (message: string, type?: ToastType) => void;
  label?: string;
}

interface PreviewModalState {
  bytes: Uint8Array;
  pageCount: number;
  filename: string;
  titleAr: string;
}

export function PdfExportButton({
  disabled = false,
  buildReport,
  onNotify,
  label = 'تصدير PDF',
}: PdfExportButtonProps) {
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<PreviewModalState | null>(null);
  useLockBodyScroll(Boolean(preview));

  useEffect(() => {
    if (!preview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreview(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preview]);

  const handleOpenPreview = async () => {
    if (preparing || disabled) return;
    const report = buildReport();
    if (!report) {
      onNotify('لا توجد نتائج صالحة للتصدير حالياً', 'info');
      return;
    }

    setPreparing(true);
    try {
      const { bytes, pageCount } = await renderReportToPdfBytes(report);
      setPreview({
        bytes,
        pageCount,
        filename: report.filename,
        titleAr: report.titleAr,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذّر إنشاء معاينة PDF.';
      onNotify(msg, 'error');
    } finally {
      setPreparing(false);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    triggerUint8Download(preview.bytes, preview.filename, 'application/pdf');
    onNotify('تم تصدير التقرير بصيغة PDF بنجاح', 'success');
    setPreview(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenPreview}
        disabled={disabled || preparing}
        aria-busy={preparing}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-bold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635] transition-colors cursor-pointer disabled:opacity-45 whitespace-nowrap"
      >
        {preparing ? (
          <Loader2 className="w-4 h-4 text-[#4D7C0F] dark:text-[#A3E635] animate-spin shrink-0" />
        ) : (
          <FileDown className="w-4 h-4 text-[#6D28D9] dark:text-[#C4B5FD] shrink-0" />
        )}
        <span>{preparing ? 'جارٍ تجهيز المعاينة...' : label}</span>
      </button>

      {preview &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-report-preview-title"
            data-testid="pdf-report-preview-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#040E0A]/75 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPreview(null);
              }
            }}
          >
            <div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto overscroll-contain rounded-2xl border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0B1E16] p-4 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    id="pdf-report-preview-title"
                    className="text-base sm:text-lg font-extrabold text-[#081E15] dark:text-[#F2F7F4]"
                  >
                    معاينة التقرير قبل التحميل
                  </h3>
                  <p className="text-xs text-[#5B7869] dark:text-[#86A896] mt-0.5 truncate">
                    {preview.titleAr} ·{' '}
                    <span dir="ltr" className="font-mono-num">
                      {preview.filename}
                    </span>{' '}
                    ·{' '}
                    <span className="font-mono-num">
                      {preview.pageCount} {preview.pageCount === 1 ? 'صفحة' : 'صفحات'} (
                      {formatBytes(preview.bytes.byteLength)})
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  aria-label="إغلاق معاينة PDF"
                  className="p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <PdfPreviewPanel
                bytes={preview.bytes}
                title="معاينة التقرير"
                subtitle={preview.filename}
                testIdPrefix="pdf-report-preview"
                viewportHeightClass="h-[48dvh] sm:h-[54dvh]"
              />

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[42px] rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>تحميل PDF ({preview.filename})</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
