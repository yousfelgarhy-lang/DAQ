import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Download,
  FileImage,
  GripVertical,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  LoadedImageInfo,
  SupportedImageMime,
  getMimeLabel,
  loadImageFile,
} from '../utils/imageProcessing';
import {
  DEFAULT_IMAGE_TO_PDF_SETTINGS,
  ImageToPdfInput,
  ImageToPdfSettings,
  PdfImagePlacement,
  PdfImageQualityPreset,
  PdfMarginPreset,
  PdfOrientation,
  PdfPageSizePreset,
  buildImagesPdfBytes,
  sanitizePdfFilename,
} from '../utils/imageToPdfLogic';
import { formatBytes } from '../utils/formatters';
import { triggerUint8Download } from '../utils/pdfExport';
import { OperationProgress } from '../components/OperationProgress';
import { PdfPreviewPanel } from '../components/PdfPreviewPanel';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface ImageToPdfToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

interface ImageQueueItem extends LoadedImageInfo {
  id: string;
  bytes: Uint8Array;
}

const PAGE_SIZE_OPTIONS: { id: PdfPageSizePreset; label: string }[] = [
  { id: 'a4', label: 'A4' },
  { id: 'a3', label: 'A3' },
  { id: 'letter', label: 'Letter' },
  { id: 'original', label: 'أبعاد الصورة الأصلية' },
  { id: 'custom', label: 'مخصص (ملم)' },
];

const ORIENTATION_OPTIONS: { id: PdfOrientation; label: string }[] = [
  { id: 'auto', label: 'تلقائي' },
  { id: 'portrait', label: 'طولي' },
  { id: 'landscape', label: 'عرضي' },
];

const PLACEMENT_OPTIONS: { id: PdfImagePlacement; label: string; hint: string }[] = [
  { id: 'fit', label: 'احتواء (Fit)', hint: 'يحافظ على كامل الصورة دون قص' },
  { id: 'fill', label: 'ملء (Fill)', hint: 'يملأ الصفحة مع قص الحواف الزائدة' },
  { id: 'stretch', label: 'تمديد (Stretch)', hint: 'يمط الصورة لمطابقة الصفحة' },
];

const MARGIN_OPTIONS: { id: PdfMarginPreset; label: string }[] = [
  { id: 'none', label: 'بدون' },
  { id: 'small', label: 'صغير' },
  { id: 'medium', label: 'متوسط' },
  { id: 'large', label: 'كبير' },
  { id: 'custom', label: 'مخصص' },
];

const QUALITY_OPTIONS: { id: PdfImageQualityPreset; label: string }[] = [
  { id: 'high', label: 'عالية (92%)' },
  { id: 'balanced', label: 'متوازنة (80%)' },
  { id: 'compact', label: 'مضغوطة (62%)' },
  { id: 'original', label: 'الأصلية (بدون ضغط)' },
];

export function ImageToPdfTool({ onNotify }: ImageToPdfToolProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<ImageQueueItem[]>([]);
  const buildIdRef = useRef(0);

  const [items, setItems] = useState<ImageQueueItem[]>([]);
  const [settings, setSettings] = useState<ImageToPdfSettings>(DEFAULT_IMAGE_TO_PDF_SETTINGS);
  const [outputName, setOutputName] = useState('DAQ-Images');
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<{
    bytes: Uint8Array;
    pageCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  itemsRef.current = items;

  // Revoke all remaining object URLs on unmount
  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.objectUrl);
      }
    };
  }, []);

  const resolvedFilename = useMemo(
    () => sanitizePdfFilename(outputName, 'DAQ-Images'),
    [outputName]
  );

  // Rebuild exact PDF preview whenever items or settings change
  useEffect(() => {
    if (items.length === 0) {
      buildIdRef.current += 1;
      setGeneratedPdf(null);
      setIsGenerating(false);
      setProgress(null);
      return;
    }

    const currentBuildId = ++buildIdRef.current;
    setIsGenerating(true);
    setError(null);

    const timer = window.setTimeout(() => {
      const inputs: ImageToPdfInput[] = items.map((item) => ({
        id: item.id,
        name: item.name,
        width: item.width,
        height: item.height,
        mime: item.mime as SupportedImageMime,
        bytes: item.bytes,
        element: item.element,
      }));

      setProgress({ percent: 5, label: 'جارٍ إنشاء معاينة PDF...' });

      void buildImagesPdfBytes(
        inputs,
        settings,
        (percent, label) => {
          if (buildIdRef.current === currentBuildId) {
            setProgress({ percent, label });
          }
        },
        () => buildIdRef.current !== currentBuildId
      )
        .then((res) => {
          if (buildIdRef.current !== currentBuildId) return;
          setGeneratedPdf(res);
        })
        .catch((err: unknown) => {
          if (buildIdRef.current !== currentBuildId) return;
          if (err instanceof Error && err.message === 'ABORTED') return;
          const msg = err instanceof Error ? err.message : 'تعذّر إنشاء ملف PDF من الصور.';
          setGeneratedPdf(null);
          setError(msg);
          onNotify(msg, 'error');
        })
        .finally(() => {
          if (buildIdRef.current !== currentBuildId) return;
          setIsGenerating(false);
          setProgress(null);
        });
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [items, settings, onNotify]);

  const handleIncomingFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || isLoadingFiles) return;
    setError(null);
    setIsLoadingFiles(true);

    const added: ImageQueueItem[] = [];
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      try {
        const [loaded, buffer] = await Promise.all([loadImageFile(file), file.arrayBuffer()]);
        added.push({
          ...loaded,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          bytes: new Uint8Array(buffer),
        });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `تعذّر تحميل "${file.name}".`);
      }
    }

    if (added.length > 0) {
      setItems((prev) => [...prev, ...added]);
      onNotify(
        `تمت إضافة ${added.length} ${added.length === 1 ? 'صورة' : 'صور'}`,
        'success'
      );
    }
    if (errors.length > 0) {
      const uniqueErrors = Array.from(new Set(errors));
      setError(uniqueErrors.join(' '));
      onNotify(uniqueErrors[0], 'error');
    }

    setIsLoadingFiles(false);
  };

  const reorderItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setItems((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.objectUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleReset = () => {
    for (const item of items) {
      URL.revokeObjectURL(item.objectUrl);
    }
    setItems([]);
    setGeneratedPdf(null);
    setError(null);
    setProgress(null);
    setSettings(DEFAULT_IMAGE_TO_PDF_SETTINGS);
    setOutputName('DAQ-Images');
  };

  const handleDownload = () => {
    if (!generatedPdf || isGenerating) return;
    triggerUint8Download(generatedPdf.bytes, resolvedFilename, 'application/pdf');
    onNotify(`تم تحميل ${resolvedFilename}`, 'success');
  };

  useRegisterToolShortcuts({
    onExecute: generatedPdf && !isGenerating ? handleDownload : undefined,
    executeLabel: 'تحميل PDF',
    onCopy: generatedPdf && !isGenerating ? handleDownload : undefined,
    copyLabel: 'تحميل PDF',
  });

  const totalInputBytes = items.reduce((sum, item) => sum + item.size, 0);

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isLoadingFiles) setIsDraggingUpload(true);
        }}
        onDragLeave={() => setIsDraggingUpload(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingUpload(false);
          if (!isLoadingFiles) {
            void handleIncomingFiles(e.dataTransfer.files);
          }
        }}
        className={`rounded-2xl border-2 border-dashed p-5 sm:p-8 text-center transition-colors ${
          isDraggingUpload
            ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#A3E635]/10'
            : 'border-[#BFD3C4] dark:border-[#244E3B] bg-[#F4F8F5] dark:bg-[#081912]/70 hover:border-[#65A30D] dark:hover:border-[#A3E635]/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          disabled={isLoadingFiles}
          onChange={(e) => {
            void handleIncomingFiles(e.target.files);
            e.target.value = '';
          }}
          aria-label="اختيار صور لتحويلها إلى PDF"
          className="sr-only"
          id="image-to-pdf-file-input"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635] flex items-center justify-center">
            <FileImage className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
              اسحب الصور وأفلتها هنا، أو اضغط لاختيار صورة أو عدة صور
            </p>
            <p className="text-xs text-[#5B7869] dark:text-[#86A896] mt-1">
              يدعم JPG و JPEG و PNG و WebP · حتى 25 ميجابايت لكل صورة · معالجة محلية 100%
            </p>
          </div>
          <button
            type="button"
            disabled={isLoadingFiles}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{items.length > 0 ? 'إضافة صور أخرى' : 'اختيار الصور'}</span>
          </button>
        </div>
      </div>

      <OperationProgress active={isLoadingFiles} label="جارٍ قراءة الصور والتحقق من أبعادها..." />

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm font-semibold"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (RTL Start): Ordered Images + Page Settings + Download */}
          <div className="lg:col-span-6 space-y-5 min-w-0">
            {/* Uploaded & Ordered Image List */}
            <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  ترتيب الصور ({items.length})
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] font-mono-num">
                    {formatBytes(totalInputBytes)}
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>مسح الكل</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#5B7869] dark:text-[#86A896]">
                اسحب أي صورة لإعادة ترتيب الصفحات، أو استخدم أسهم التحريك للأعلى والأسفل.
              </p>

              <ol className="space-y-2.5 max-h-[380px] overflow-y-auto pe-1" aria-label="قائمة الصور المرتبة">
                {items.map((item, idx) => {
                  const isBeingDragged = draggedIndex === idx;
                  const isDropTarget = dragOverIndex === idx && draggedIndex !== idx;
                  return (
                    <li
                      key={item.id}
                      draggable
                      data-testid={`image-to-pdf-item-${idx}`}
                      onDragStart={(e) => {
                        setDraggedIndex(idx);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(idx));
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverIndex !== idx) {
                          setDragOverIndex(idx);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverIndex === idx) setDragOverIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from =
                          draggedIndex !== null
                            ? draggedIndex
                            : Number(e.dataTransfer.getData('text/plain'));
                        if (Number.isInteger(from)) {
                          reorderItems(from, idx);
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`flex flex-col min-[460px]:flex-row min-[460px]:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all ${
                        isDropTarget
                          ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#A3E635]/15 scale-[1.01]'
                          : isBeingDragged
                          ? 'opacity-55 border-[#65A30D] dark:border-[#A3E635] bg-[#F4F8F5] dark:bg-[#081912]'
                          : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className="text-[#5B7869] dark:text-[#86A896] cursor-grab active:cursor-grabbing shrink-0"
                          aria-hidden="true"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span className="w-6 h-6 rounded-lg bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635] font-mono-num text-xs font-extrabold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#06140E] shrink-0 flex items-center justify-center">
                          <img
                            src={item.objectUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            dir="auto"
                            className="text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] truncate"
                          >
                            {item.name}
                          </div>
                          <div
                            dir="ltr"
                            className="text-[11px] text-[#5B7869] dark:text-[#86A896] font-mono-num flex flex-wrap items-center gap-x-1.5"
                          >
                            <span>{getMimeLabel(item.mime)}</span>
                            <span>·</span>
                            <span>
                              {item.width} × {item.height} px
                            </span>
                            <span>·</span>
                            <span>{formatBytes(item.size)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-1 min-[460px]:pt-0 border-t min-[460px]:border-t-0 border-[#E5EFE7] dark:border-[#173326]">
                        <button
                          type="button"
                          onClick={() => reorderItems(idx, idx - 1)}
                          disabled={idx === 0}
                          aria-label={`تحريك ${item.name} للأعلى`}
                          className="p-2 min-w-[38px] min-h-[38px] rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] disabled:opacity-35 cursor-pointer flex items-center justify-center"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => reorderItems(idx, idx + 1)}
                          disabled={idx === items.length - 1}
                          aria-label={`تحريك ${item.name} للأسفل`}
                          className="p-2 min-w-[38px] min-h-[38px] rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] disabled:opacity-35 cursor-pointer flex items-center justify-center"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`حذف ${item.name}`}
                          className="p-2 min-w-[38px] min-h-[38px] rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-rose-600 dark:text-rose-400 hover:border-rose-500 cursor-pointer flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Page Settings Panel */}
            <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-5 space-y-5">
              <h2 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
                إعدادات صفحات PDF
              </h2>

              {/* Page Size */}
              <div className="space-y-2">
                <span className="block text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  حجم الصفحة
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, pageSize: opt.id }))}
                      aria-pressed={settings.pageSize === opt.id}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        settings.pageSize === opt.id
                          ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                          : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {settings.pageSize === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label
                        htmlFor="pdf-custom-width-mm"
                        className="block text-xs font-semibold text-[#466355] dark:text-[#9BB5A6] mb-1"
                      >
                        العرض (ملم)
                      </label>
                      <input
                        id="pdf-custom-width-mm"
                        type="number"
                        min={20}
                        max={2000}
                        dir="ltr"
                        value={settings.customWidthMm}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            customWidthMm: Number(e.target.value) || 210,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pdf-custom-height-mm"
                        className="block text-xs font-semibold text-[#466355] dark:text-[#9BB5A6] mb-1"
                      >
                        الارتفاع (ملم)
                      </label>
                      <input
                        id="pdf-custom-height-mm"
                        type="number"
                        min={20}
                        max={2000}
                        dir="ltr"
                        value={settings.customHeightMm}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            customHeightMm: Number(e.target.value) || 297,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Orientation */}
              <div className="space-y-2">
                <span className="block text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  اتجاه الصفحة
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {ORIENTATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, orientation: opt.id }))}
                      aria-pressed={settings.orientation === opt.id}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        settings.orientation === opt.id
                          ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                          : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Placement */}
              <div className="space-y-2">
                <span className="block text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  ملاءمة الصورة داخل الصفحة
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PLACEMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, placement: opt.id }))}
                      aria-pressed={settings.placement === opt.id}
                      className={`p-2.5 rounded-xl border text-start transition-colors cursor-pointer ${
                        settings.placement === opt.id
                          ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                          : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{opt.hint}</div>
                    </button>
                  ))}
                </div>

                {settings.placement === 'stretch' && (
                  <div
                    role="note"
                    data-testid="stretch-distortion-warning"
                    className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      تنبيه: خيار التمديد (Stretch) يغيّر أبعاد الصورة لتطابق الصفحة بالكامل وقد يسبّب تشوهاً بصرياً إذا اختلفت نسبة العرض إلى الارتفاع.
                    </span>
                  </div>
                )}
              </div>

              {/* Margins */}
              <div className="space-y-2">
                <span className="block text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  الهوامش
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {MARGIN_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, marginPreset: opt.id }))}
                      aria-pressed={settings.marginPreset === opt.id}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        settings.marginPreset === opt.id
                          ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                          : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {settings.marginPreset === 'custom' && (
                  <div className="pt-1">
                    <label
                      htmlFor="pdf-custom-margin-mm"
                      className="block text-xs font-semibold text-[#466355] dark:text-[#9BB5A6] mb-1"
                    >
                      حجم الهامش (ملم)
                    </label>
                    <input
                      id="pdf-custom-margin-mm"
                      type="number"
                      min={0}
                      max={75}
                      dir="ltr"
                      value={settings.customMarginMm}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          customMarginMm: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full sm:w-40 px-3 py-2 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Background & Quality */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="block text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
                    خلفية الصفحة
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, backgroundMode: 'white' }))}
                      aria-pressed={settings.backgroundMode === 'white'}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        settings.backgroundMode === 'white'
                          ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                          : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4]'
                      }`}
                    >
                      أبيض
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, backgroundMode: 'custom' }))}
                      aria-pressed={settings.backgroundMode === 'custom'}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        settings.backgroundMode === 'custom'
                          ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                          : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4]'
                      }`}
                    >
                      لون مخصص
                    </button>
                  </div>

                  {settings.backgroundMode === 'custom' && (
                    <div className="flex items-center gap-2.5 p-2 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912]">
                      <input
                        id="pdf-bg-color"
                        aria-label="اختيار لون خلفية الصفحة"
                        type="color"
                        value={settings.backgroundColor}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, backgroundColor: e.target.value }))
                        }
                        className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer shrink-0"
                      />
                      <span
                        dir="ltr"
                        className="font-mono-num text-xs font-bold text-[#081E15] dark:text-[#F2F7F4]"
                      >
                        {settings.backgroundColor.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="pdf-quality-select"
                    className="block text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
                  >
                    جودة الصور في PDF
                  </label>
                  <select
                    id="pdf-quality-select"
                    value={settings.qualityPreset}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        qualityPreset: e.target.value as PdfImageQualityPreset,
                      }))
                    }
                    className="w-full px-3 py-2.5 min-h-[42px] rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] text-base sm:text-sm font-bold focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                  >
                    {QUALITY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Output Filename & Download Action */}
              <div className="pt-4 border-t border-[#EAF2EC] dark:border-[#183528] space-y-3">
                <div>
                  <label
                    htmlFor="image-to-pdf-filename"
                    className="block text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-1.5"
                  >
                    اسم ملف PDF النهائي
                  </label>
                  <div className="flex items-center gap-2" dir="ltr">
                    <input
                      id="image-to-pdf-filename"
                      type="text"
                      value={outputName}
                      onChange={(e) => setOutputName(e.target.value)}
                      placeholder="DAQ-Images"
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base sm:text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                    />
                    <span className="text-xs font-bold font-mono-num text-[#5B7869] dark:text-[#86A896]">
                      .pdf
                    </span>
                  </div>
                </div>

                <OperationProgress
                  active={isGenerating && progress !== null}
                  label={progress?.label || 'جارٍ تجهيز ملف PDF...'}
                  percent={progress?.percent}
                />

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!generatedPdf || isGenerating}
                    data-testid="image-to-pdf-download-btn"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[46px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>
                      {isGenerating
                        ? 'جارٍ تحديث PDF...'
                        : `تحميل PDF (${resolvedFilename})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (RTL End): Live Exact PDF Preview */}
          <div className="lg:col-span-6 min-w-0 lg:sticky lg:top-24">
            <PdfPreviewPanel
              bytes={generatedPdf?.bytes ?? null}
              title="معاينة PDF المباشرة"
              subtitle={
                generatedPdf
                  ? `${resolvedFilename} · ${generatedPdf.pageCount} ${
                      generatedPdf.pageCount === 1 ? 'صفحة' : 'صفحات'
                    }`
                  : undefined
              }
              isGenerating={isGenerating}
              generatingLabel="جارٍ تحديث صفحات PDF وفق الإعدادات..."
              testIdPrefix="image-to-pdf-preview"
              viewportHeightClass="h-[460px] sm:h-[560px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
