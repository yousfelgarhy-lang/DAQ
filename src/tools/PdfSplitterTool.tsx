import { useRef, useState } from 'react';
import { FileUp, Scissors, Download, RotateCcw, AlertCircle, FileText, Eye } from 'lucide-react';
import {
  MAX_PDF_FILE_BYTES,
  SplitPdfOutputFile,
  inspectPdfBytes,
  isLikelyPdfFile,
  parsePageRanges,
  splitPdfBuffer,
} from '../utils/pdfLogic';
import { formatBytes } from '../utils/formatters';
import { triggerUint8Download } from '../utils/pdfExport';
import { OperationProgress } from '../components/OperationProgress';
import { PdfPreviewPanel } from '../components/PdfPreviewPanel';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface PdfSplitterToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

interface LoadedPdfSource {
  name: string;
  size: number;
  pageCount: number;
  bytes: Uint8Array;
}

export function PdfSplitterTool({ onNotify }: PdfSplitterToolProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<LoadedPdfSource | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rangeInput, setRangeInput] = useState('1');
  const [outputMode, setOutputMode] = useState<'separate' | 'single'>('separate');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);
  const [outputs, setOutputs] = useState<SplitPdfOutputFile[]>([]);
  const [selectedOutputIndex, setSelectedOutputIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || isSplitting || isLoadingFile) return;
    const file = fileList[0];
    setError(null);
    setOutputs([]);
    setSelectedOutputIndex(0);

    if (!isLikelyPdfFile(file)) {
      const msg = `"${file.name}" ليس ملف PDF صالحاً.`;
      setError(msg);
      onNotify(msg, 'error');
      return;
    }
    if (file.size > MAX_PDF_FILE_BYTES) {
      const msg = 'حجم ملف PDF يتجاوز الحد الأقصى المسموح (50 ميجابايت).';
      setError(msg);
      onNotify(msg, 'error');
      return;
    }

    setIsLoadingFile(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { pageCount } = await inspectPdfBytes(bytes, file.name);
      setSource({ name: file.name, size: file.size, pageCount, bytes });
      setRangeInput(pageCount > 1 ? `1-${Math.min(2, pageCount)}` : '1');
      onNotify(`تم تحميل الملف (${pageCount} صفحة)`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذّر قراءة ملف PDF.';
      setError(msg);
      onNotify(msg, 'error');
      setSource(null);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleSplit = async () => {
    if (!source || isSplitting || isLoadingFile) return;

    const parsed = parsePageRanges(rangeInput, source.pageCount);
    if (!parsed.valid) {
      setError(parsed.error);
      onNotify(parsed.error, 'error');
      return;
    }

    setError(null);
    setOutputs([]);
    setSelectedOutputIndex(0);
    setIsSplitting(true);
    setProgress({ percent: 0, label: 'جارٍ تجهيز الصفحات المطلوبة...' });

    try {
      const files = await splitPdfBuffer(
        source.bytes,
        parsed.ranges,
        outputMode === 'single',
        (percent, label) => setProgress({ percent, label })
      );
      setOutputs(files);
      setSelectedOutputIndex(0);
      onNotify(
        files.length === 1
          ? `تم استخراج ${files[0].pageCount} صفحة بنجاح`
          : `تم إنشاء ${files.length} ملفات PDF بنجاح`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تقسيم الملف.';
      setError(msg);
      onNotify(msg, 'error');
    } finally {
      setIsSplitting(false);
      setProgress(null);
    }
  };

  const handleSplitEveryPage = () => {
    if (!source) return;
    if (source.pageCount > 50) {
      const msg = 'لتفادي كثرة الملفات، أدخل نطاقات مخصصة للمستندات الأكبر من 50 صفحة.';
      setError(msg);
      onNotify(msg, 'info');
      return;
    }
    const allPages = Array.from({ length: source.pageCount }, (_, i) => String(i + 1)).join(', ');
    setRangeInput(allPages);
    setOutputMode('separate');
    setOutputs([]);
    setSelectedOutputIndex(0);
    setError(null);
  };

  const baseName = source ? source.name.replace(/\.pdf$/i, '') : 'daq-split';

  const downloadOutputFile = (item: SplitPdfOutputFile) => {
    const filename = `${baseName}-pages-${item.label}.pdf`;
    triggerUint8Download(item.bytes, filename, 'application/pdf');
    onNotify(`تم تحميل ${filename}`, 'success');
  };

  const handleReset = () => {
    if (isSplitting) return;
    setSource(null);
    setOutputs([]);
    setSelectedOutputIndex(0);
    setError(null);
    setProgress(null);
  };

  useRegisterToolShortcuts({
    onExecute: source ? handleSplit : undefined,
    executeLabel: 'تقسيم واستخراج',
    onCopy: outputs.length > 0 ? () => downloadOutputFile(outputs[0]) : undefined,
  });

  const livePreview = source ? parsePageRanges(rangeInput, source.pageCount) : null;

  return (
    <div className="space-y-6">
      {!source ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!isLoadingFile) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!isLoadingFile) void handleFile(e.dataTransfer.files);
          }}
          className={`rounded-2xl border-2 border-dashed p-5 sm:p-8 text-center transition-colors ${
            isDragging
              ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#A3E635]/10'
              : 'border-[#BFD3C4] dark:border-[#244E3B] bg-[#F4F8F5] dark:bg-[#081912]/70 hover:border-[#65A30D] dark:hover:border-[#A3E635]/60'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            disabled={isLoadingFile}
            onChange={(e) => {
              void handleFile(e.target.files);
              e.target.value = '';
            }}
            aria-label="اختيار ملف PDF للتقسيم"
            className="sr-only"
            id="pdf-splitter-file-input"
          />

          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635] flex items-center justify-center">
              <FileUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
                اسحب ملف PDF وأفلته هنا، أو اضغط لاختيار ملف
              </p>
              <p className="text-xs text-[#5B7869] dark:text-[#86A896] mt-1">
                استخراج صفحات محددة أو تقسيم نطاقات متعددة محلياً بالكامل
              </p>
            </div>
            <button
              type="button"
              disabled={isLoadingFile}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <Scissors className="w-4 h-4 shrink-0" />
              <span>اختيار ملف PDF</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-5">
            {/* File Summary */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F4F8F5] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1B3B2D]">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-[#4D7C0F] dark:text-[#A3E635] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] truncate">
                    {source.name}
                  </div>
                  <div className="text-xs text-[#5B7869] dark:text-[#86A896] font-mono-num">
                    {formatBytes(source.size)}
                  </div>
                </div>
              </div>
              <div className="text-end shrink-0">
                <div className="text-xs text-[#5B7869] dark:text-[#86A896]">إجمالي الصفحات</div>
                <div
                  data-testid="pdf-split-total-pages"
                  className="font-mono-num text-lg font-extrabold text-[#4D7C0F] dark:text-[#A3E635]"
                >
                  {source.pageCount}
                </div>
              </div>
            </div>

            {/* Range Input */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label
                  htmlFor="pdf-split-ranges"
                  className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
                >
                  الصفحات أو النطاقات المطلوبة
                </label>
                <button
                  type="button"
                  onClick={handleSplitEveryPage}
                  disabled={isSplitting}
                  className="text-xs font-bold text-[#4D7C0F] dark:text-[#A3E635] hover:underline cursor-pointer"
                >
                  كل الصفحات منفردة
                </button>
              </div>
              <input
                id="pdf-split-ranges"
                type="text"
                dir="ltr"
                value={rangeInput}
                onChange={(e) => {
                  setRangeInput(e.target.value);
                  setOutputs([]);
                  setSelectedOutputIndex(0);
                  setError(null);
                }}
                disabled={isSplitting}
                placeholder="مثال: 1, 3-5, 8"
                className="w-full px-4 py-3 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
              />
              <p className="text-xs text-[#5B7869] dark:text-[#86A896] mt-1.5">
                أدخل أرقام صفحات فردية أو نطاقات مفصولة بفاصلة، مثل: <span dir="ltr" className="font-mono-num font-bold">1, 3-5</span>
              </p>
              {livePreview?.valid && (
                <p className="text-xs font-semibold text-[#4D7C0F] dark:text-[#A3E635] mt-1">
                  سيتم استخراج <span className="font-mono-num">{livePreview.orderedPages.length}</span> صفحة عبر{' '}
                  <span className="font-mono-num">{livePreview.ranges.length}</span>{' '}
                  {livePreview.ranges.length === 1 ? 'نطاق' : 'نطاقات'}
                </p>
              )}
            </div>

            {/* Output Mode */}
            <div>
              <span className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2">
                طريقة الإخراج
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isSplitting}
                  onClick={() => {
                    setOutputMode('separate');
                    setOutputs([]);
                    setSelectedOutputIndex(0);
                  }}
                  className={`p-3 rounded-xl border text-start transition-colors cursor-pointer ${
                    outputMode === 'separate'
                      ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                      : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">ملف لكل نطاق/اختيار</div>
                  <div className="text-xs opacity-80 mt-0.5">إنشاء ملف مستقل لكل جزء محدد</div>
                </button>

                <button
                  type="button"
                  disabled={isSplitting}
                  onClick={() => {
                    setOutputMode('single');
                    setOutputs([]);
                    setSelectedOutputIndex(0);
                  }}
                  className={`p-3 rounded-xl border text-start transition-colors cursor-pointer ${
                    outputMode === 'single'
                      ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                      : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">ملف PDF واحد مجمّع</div>
                  <div className="text-xs opacity-80 mt-0.5">جمع كل الصفحات المختارة بملف واحد</div>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSplit}
                disabled={isSplitting || !rangeInput.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45 whitespace-nowrap"
              >
                <Scissors className="w-4 h-4 shrink-0" />
                <span>{isSplitting ? 'جارٍ التقسيم...' : 'تقسيم واستخراج PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isSplitting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer disabled:opacity-45 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>ملف جديد</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
              الملفات الناتجة
            </h2>

            <OperationProgress
              active={isSplitting && progress !== null}
              label={progress?.label || 'جارٍ استخراج الصفحات...'}
              percent={progress?.percent}
            />

            {outputs.length > 0 ? (
              <div className="space-y-3">
                {outputs.map((item, idx) => {
                  const isActive = idx === selectedOutputIndex;
                  return (
                    <div
                      key={`${item.label}-${idx}`}
                      data-testid={`pdf-split-output-${idx}`}
                      className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
                        isActive
                          ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#A3E635]/10'
                          : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] truncate">
                          {baseName}-pages-{item.label}.pdf
                        </div>
                        <div className="text-xs text-[#5B7869] dark:text-[#86A896] font-mono-num">
                          الصفحات: {item.label} · {item.pageCount}{' '}
                          {item.pageCount === 1 ? 'صفحة' : 'صفحات'} ·{' '}
                          {formatBytes(item.bytes.byteLength)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedOutputIndex(idx)}
                          aria-pressed={isActive}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#EAF2EC] dark:bg-[#143326] text-[#3F6212] dark:text-[#A3E635]'
                              : 'border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isActive ? 'قيد المعاينة' : 'معاينة'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadOutputFile(item)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تحميل</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              !isSplitting && (
                <div className="rounded-xl border border-dashed border-[#BFD3C4] dark:border-[#244E3B] p-8 text-center text-sm text-[#5B7869] dark:text-[#86A896]">
                  أدخل أرقام الصفحات أو النطاقات واضغط على "تقسيم واستخراج PDF" لعرض الملفات الجاهزة للتحميل.
                </div>
              )
            )}
          </div>
        </div>
      )}

      {outputs.length > 0 && outputs[selectedOutputIndex] && (
        <div className="space-y-3">
          {outputs.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#466355] dark:text-[#9BB5A6]">
                معاينة الملف:
              </span>
              {outputs.map((item, idx) => (
                <button
                  key={`tab-${item.label}-${idx}`}
                  type="button"
                  onClick={() => setSelectedOutputIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono-num border transition-colors cursor-pointer ${
                    idx === selectedOutputIndex
                      ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                      : 'border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                  }`}
                >
                  نطاق {item.label} ({item.pageCount})
                </button>
              ))}
            </div>
          )}
          <PdfPreviewPanel
            bytes={outputs[selectedOutputIndex].bytes}
            title={`معاينة الملف: ${baseName}-pages-${outputs[selectedOutputIndex].label}.pdf`}
            subtitle={`الصفحات المشمولة: ${outputs[selectedOutputIndex].label} · ${outputs[selectedOutputIndex].pageCount} ${
              outputs[selectedOutputIndex].pageCount === 1 ? 'صفحة' : 'صفحات'
            }`}
            testIdPrefix="pdf-splitter-preview"
          />
        </div>
      )}

      <OperationProgress
        active={isLoadingFile}
        label="جارٍ فحص ملف PDF..."
      />

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm font-semibold"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
