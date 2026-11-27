import { useEffect, useRef, useState } from 'react';
import {
  FileUp,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  Merge,
  RotateCcw,
  AlertCircle,
  FileText,
  Plus,
} from 'lucide-react';
import {
  MAX_PDF_FILE_BYTES,
  inspectPdfBytes,
  isLikelyPdfFile,
  mergePdfBuffers,
} from '../utils/pdfLogic';
import { formatBytes } from '../utils/formatters';
import { triggerUint8Download } from '../utils/pdfExport';
import { OperationProgress } from '../components/OperationProgress';
import { PdfPreviewPanel } from '../components/PdfPreviewPanel';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface PdfMergerToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

interface PdfQueueItem {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  bytes: Uint8Array;
}

export function PdfMergerTool({ onNotify }: PdfMergerToolProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PdfQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);
  const [mergedResult, setMergedResult] = useState<{
    bytes: Uint8Array;
    totalPages: number;
    filename: string;
  } | null>(null);
  const [outputName, setOutputName] = useState('daq-merged');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMergedResult(null);
  }, [files]);

  const handleIncomingFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || isMerging || isLoadingFiles) return;
    setError(null);
    setIsLoadingFiles(true);

    const added: PdfQueueItem[] = [];
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      if (!isLikelyPdfFile(file)) {
        errors.push(`"${file.name}" ليس ملف PDF.`);
        continue;
      }
      if (file.size > MAX_PDF_FILE_BYTES) {
        errors.push(`"${file.name}" يتجاوز الحد الأقصى (50 ميجابايت).`);
        continue;
      }
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const { pageCount } = await inspectPdfBytes(bytes, file.name);
        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          pageCount,
          bytes,
        });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `تعذّر قراءة "${file.name}".`);
      }
    }

    if (added.length > 0) {
      setFiles((prev) => [...prev, ...added]);
      onNotify(`تمت إضافة ${added.length} ${added.length === 1 ? 'ملف PDF' : 'ملفات PDF'}`, 'success');
    }
    if (errors.length > 0) {
      const combinedErr = errors.join(' ');
      setError(combinedErr);
      onNotify(errors[0], 'error');
    }

    setIsLoadingFiles(false);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (isMerging) return;
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const removeItem = (id: string) => {
    if (isMerging) return;
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReset = () => {
    if (isMerging) return;
    setFiles([]);
    setMergedResult(null);
    setError(null);
    setProgress(null);
  };

  const handleMerge = async () => {
    if (isMerging || isLoadingFiles) return;
    if (files.length < 2) {
      const msg = 'يرجى رفع ملفي PDF على الأقل لإجراء الدمج.';
      setError(msg);
      onNotify(msg, 'error');
      return;
    }

    setError(null);
    setMergedResult(null);
    setIsMerging(true);
    setProgress({ percent: 0, label: 'جارٍ تجهيز ملفات PDF للدمج...' });

    try {
      const result = await mergePdfBuffers(
        files.map((f) => ({ name: f.name, bytes: f.bytes })),
        (percent, label) => setProgress({ percent, label })
      );
      const cleanName = (outputName.trim().replace(/\.pdf$/i, '') || 'daq-merged') + '.pdf';
      setMergedResult({
        bytes: result.bytes,
        totalPages: result.totalPages,
        filename: cleanName,
      });
      onNotify(`تم دمج ${files.length} ملفات (${result.totalPages} صفحة) بنجاح`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذّر دمج ملفات PDF.';
      setError(msg);
      onNotify(msg, 'error');
    } finally {
      setIsMerging(false);
      setProgress(null);
    }
  };

  const resolvedFilename =
    (outputName.trim().replace(/\.pdf$/i, '') || 'daq-merged') + '.pdf';

  const handleDownloadMerged = () => {
    if (!mergedResult) return;
    triggerUint8Download(mergedResult.bytes, resolvedFilename, 'application/pdf');
    onNotify(`تم تحميل ${resolvedFilename}`, 'success');
  };

  useRegisterToolShortcuts({
    onExecute: handleMerge,
    executeLabel: 'دمج الملفات',
    onCopy: mergedResult ? handleDownloadMerged : undefined,
  });

  const totalPagesSelected = files.reduce((acc, item) => acc + item.pageCount, 0);
  const totalBytesSelected = files.reduce((acc, item) => acc + item.size, 0);

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isMerging && !isLoadingFiles) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!isMerging && !isLoadingFiles) {
            void handleIncomingFiles(e.dataTransfer.files);
          }
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
          multiple
          disabled={isMerging || isLoadingFiles}
          onChange={(e) => {
            void handleIncomingFiles(e.target.files);
            e.target.value = '';
          }}
          aria-label="اختيار ملفات PDF للدمج"
          className="sr-only"
          id="pdf-merger-file-input"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635] flex items-center justify-center">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
              اسحب ملفات PDF وأفلتها هنا، أو اضغط لاختيار عدة ملفات
            </p>
            <p className="text-xs text-[#5B7869] dark:text-[#86A896] mt-1">
              المعالجة تتم محلياً داخل المتصفح · لا يتم رفع مستنداتك لأي خادم
            </p>
          </div>
          <button
            type="button"
            disabled={isMerging || isLoadingFiles}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{files.length > 0 ? 'إضافة ملفات PDF أخرى' : 'اختيار ملفات PDF'}</span>
          </button>
        </div>
      </div>

      {/* Honest Indeterminate Loading when reading multiple PDFs */}
      <OperationProgress
        active={isLoadingFiles}
        label="جارٍ فحص صفحات ملفات PDF محلياً..."
      />

      {/* Determinate Real Merge Progress */}
      <OperationProgress
        active={isMerging && progress !== null}
        label={progress?.label || 'جارٍ دمج الملفات...'}
        percent={progress?.percent}
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

      {/* Selected Files List & Merge Controls */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
                قائمة الملفات ({files.length})
              </h2>
              <span className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] font-mono-num">
                {totalPagesSelected} صفحة · {formatBytes(totalBytesSelected)}
              </span>
            </div>

            <ol className="space-y-2.5" aria-label="ترتيب ملفات PDF">
              {files.map((item, idx) => (
                <li
                  key={item.id}
                  data-testid={`pdf-merge-item-${idx}`}
                  className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2.5 sm:gap-3 p-3 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912]"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-lg bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635] font-mono-num text-xs font-extrabold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <FileText className="w-4 h-4 text-[#5B7869] dark:text-[#86A896] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#5B7869] dark:text-[#86A896] font-mono-num">
                        {item.pageCount} {item.pageCount === 1 ? 'صفحة' : 'صفحات'} · {formatBytes(item.size)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-1 min-[420px]:pt-0 border-t min-[420px]:border-t-0 border-[#E5EFE7] dark:border-[#173326]">
                    <button
                      type="button"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0 || isMerging}
                      aria-label={`تحريك ${item.name} للأعلى`}
                      className="p-2 min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === files.length - 1 || isMerging}
                      aria-label={`تحريك ${item.name} للأسفل`}
                      className="p-2 min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={isMerging}
                      aria-label={`حذف ${item.name}`}
                      className="p-2 min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-rose-600 dark:text-rose-400 hover:border-rose-500 disabled:opacity-35 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-5 self-start">
            <div>
              <label
                htmlFor="pdf-merge-output-name"
                className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2"
              >
                اسم الملف النهائي
              </label>
              <div className="flex items-center gap-2" dir="ltr">
                <input
                  id="pdf-merge-output-name"
                  type="text"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  disabled={isMerging}
                  placeholder="daq-merged"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base sm:text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                />
                <span className="text-xs font-bold font-mono-num text-[#5B7869] dark:text-[#86A896]">
                  .pdf
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleMerge}
                disabled={files.length < 2 || isMerging || isLoadingFiles}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45 whitespace-nowrap"
              >
                <Merge className="w-4 h-4 shrink-0" />
                <span>{isMerging ? 'جارٍ الدمج...' : 'دمج الملفات الآن'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isMerging}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer disabled:opacity-45 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>إعادة تعيين</span>
              </button>
            </div>

            {files.length === 1 && (
              <p className="text-xs text-[#5B7869] dark:text-[#86A896]">
                أضف ملف PDF واحداً إضافياً على الأقل لتفعيل زر الدمج.
              </p>
            )}

            {mergedResult && (
              <div className="p-4 rounded-xl border border-[#65A30D]/40 dark:border-[#A3E635]/40 bg-[#EAF2EC] dark:bg-[#081912] space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  <span>الملف جاهز للتحميل</span>
                  <span className="font-mono-num text-[#4D7C0F] dark:text-[#A3E635]">
                    {mergedResult.totalPages} صفحة · {formatBytes(mergedResult.bytes.byteLength)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadMerged}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>تحميل الملف المدمج ({resolvedFilename})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {mergedResult && (
        <PdfPreviewPanel
          bytes={mergedResult.bytes}
          title="معاينة الملف المدمج"
          subtitle={`جاهز للتحميل: ${resolvedFilename}`}
          testIdPrefix="pdf-merger-preview"
        />
      )}
    </div>
  );
}
