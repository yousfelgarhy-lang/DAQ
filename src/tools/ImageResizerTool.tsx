import { useEffect, useMemo, useState } from 'react';
import { Download, Lock, Unlock, RotateCcw, Loader2, AlertCircle, Check } from 'lucide-react';
import { ImageDropzone } from '../components/ImageDropzone';
import {
  LoadedImageInfo,
  ProcessedImageResult,
  SupportedImageMime,
  buildOutputFilename,
  getMimeLabel,
  loadImageFile,
  processImageOnCanvas,
  triggerBlobDownload,
} from '../utils/imageProcessing';
import { calculateResizedDimensions, formatBytes } from '../utils/formatters';
import { ToastType } from '../types/tool';

interface ImageResizerToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

const MIN_DIM = 1;
const MAX_DIM = 8192;

function parseValidDimension(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < MIN_DIM || num > MAX_DIM) return null;
  return num;
}

export function ImageResizerTool({ onNotify }: ImageResizerToolProps) {
  const [source, setSource] = useState<LoadedImageInfo | null>(null);
  const [result, setResult] = useState<ProcessedImageResult | null>(null);

  // Raw editable string inputs — never modified by preview, blur, or effects
  const [widthInput, setWidthInput] = useState<string>('800');
  const [heightInput, setHeightInput] = useState<string>('600');

  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [outputMime, setOutputMime] = useState<SupportedImageMime>('image/png');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived validated target dimensions for preview & download (read-only relative to inputs)
  const validatedDims = useMemo<{ width: number; height: number } | null>(() => {
    const w = parseValidDimension(widthInput);
    const h = parseValidDimension(heightInput);
    if (w === null || h === null) return null;
    return { width: w, height: h };
  }, [widthInput, heightInput]);

  useEffect(() => {
    return () => {
      if (source?.objectUrl) URL.revokeObjectURL(source.objectUrl);
    };
  }, [source]);

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  useEffect(() => {
    if (!source || !validatedDims) {
      setLoading(false);
      return;
    }

    const { width, height } = validatedDims;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      processImageOnCanvas(source.element, {
        width,
        height,
        mime: outputMime,
        quality: 0.92,
      })
        .then((res) => {
          if (cancelled) {
            URL.revokeObjectURL(res.url);
            return;
          }
          setResult(res);
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, validatedDims?.width, validatedDims?.height, outputMime]);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const loaded = await loadImageFile(file);
      setWidthInput(String(loaded.width));
      setHeightInput(String(loaded.height));
      setOutputMime(loaded.mime);
      setLockAspect(true);
      setSource(loaded);
      onNotify('تم تحميل الصورة بنجاح', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذّر تحميل الصورة.';
      setError(msg);
      onNotify(msg, 'error');
      setLoading(false);
    }
  };

  const handleWidthChange = (raw: string) => {
    if (raw !== '' && !/^\d*$/.test(raw)) return;
    setWidthInput(raw);
    setError(null);

    if (!lockAspect || !source) {
      return;
    }

    const parsedWidth = parseValidDimension(raw);
    if (parsedWidth === null) {
      return;
    }

    const next = calculateResizedDimensions(
      source.width,
      source.height,
      'width',
      parsedWidth,
      true,
      source.height
    );
    setHeightInput(String(next.height));
  };

  const handleHeightChange = (raw: string) => {
    if (raw !== '' && !/^\d*$/.test(raw)) return;
    setHeightInput(raw);
    setError(null);

    if (!lockAspect || !source) {
      return;
    }

    const parsedHeight = parseValidDimension(raw);
    if (parsedHeight === null) {
      return;
    }

    const next = calculateResizedDimensions(
      source.width,
      source.height,
      'height',
      parsedHeight,
      true,
      source.width
    );
    setWidthInput(String(next.width));
  };

  const validateDimensions = (): { width: number; height: number } | null => {
    const w = parseValidDimension(widthInput);
    const h = parseValidDimension(heightInput);
    if (w === null || h === null) {
      setError(`يرجى إدخال عرض وارتفاع صحيحين بين ${MIN_DIM} و ${MAX_DIM} بكسل.`);
      return null;
    }
    setError(null);
    return { width: w, height: h };
  };

  const handleApplyDimensions = async () => {
    const valid = validateDimensions();
    if (!valid) {
      onNotify('يرجى إدخال أبعاد صالحة قبل التطبيق', 'error');
      return;
    }
    if (!source) return;
    setLoading(true);
    try {
      const res = await processImageOnCanvas(source.element, {
        width: valid.width,
        height: valid.height,
        mime: outputMime,
        quality: 0.92,
      });
      setResult(res);
      onNotify('تم تحديث أبعاد المعاينة', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذّر معالجة الصورة.';
      setError(msg);
      onNotify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = () => {
    setLockAspect((prev) => !prev);
  };

  const handleScalePreset = (factor: number) => {
    if (!source) return;
    const nextW = Math.max(1, Math.round(source.width * factor));
    const nextH = Math.max(1, Math.round(source.height * factor));
    setWidthInput(String(nextW));
    setHeightInput(String(nextH));
    setError(null);
  };

  const handleReset = () => {
    setSource(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setDownloading(false);
  };

  const handleDownload = async () => {
    const valid = validateDimensions();
    if (!valid) {
      onNotify('يرجى إدخال أبعاد صالحة بين 1 و 8192 بكسل قبل التحميل', 'error');
      return;
    }
    if (!source) return;

    // Always export with the exact validated dimensions shown in the inputs
    let targetResult = result;
    if (
      !targetResult ||
      targetResult.width !== valid.width ||
      targetResult.height !== valid.height ||
      targetResult.mime !== outputMime
    ) {
      setDownloading(true);
      try {
        targetResult = await processImageOnCanvas(source.element, {
          width: valid.width,
          height: valid.height,
          mime: outputMime,
          quality: 0.92,
        });
        setResult(targetResult);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'تعذّر معالجة الصورة.';
        setError(msg);
        onNotify(msg, 'error');
        return;
      } finally {
        setDownloading(false);
      }
    }

    const filename = buildOutputFilename(
      source.name,
      `${targetResult.width}x${targetResult.height}`,
      targetResult.mime
    );
    triggerBlobDownload(targetResult.url, filename);
    onNotify('تم تحميل الصورة بالأبعاد الجديدة', 'success');
  };

  const dimsAreValid = validatedDims !== null;

  return (
    <div className="space-y-6">
      {!source ? (
        <ImageDropzone onFileSelected={handleFile} disabled={loading} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
                الأبعاد الجديدة (بكسل)
              </span>
              <button
                type="button"
                onClick={handleToggleLock}
                aria-pressed={lockAspect}
                data-testid="aspect-lock-toggle"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                  lockAspect
                    ? 'border-[#65A30D]/60 dark:border-[#A3E635]/50 bg-[#A3E635]/15 text-[#4D7C0F] dark:text-[#A3E635]'
                    : 'border-[#7C3AED]/40 dark:border-[#A78BFA]/40 bg-[#7C3AED]/10 text-[#6D28D9] dark:text-[#C4B5FD]'
                }`}
              >
                {lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{lockAspect ? 'تناسق الأبعاد: مفعّل' : 'تعديل حر: مستقل'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="resize-width"
                  className="block text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-1.5"
                >
                  العرض (Width)
                </label>
                <input
                  id="resize-width"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={widthInput}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  placeholder="مثال: 800"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                />
              </div>

              <div>
                <label
                  htmlFor="resize-height"
                  className="block text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-1.5"
                >
                  الارتفاع (Height)
                </label>
                <input
                  id="resize-height"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={heightInput}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  placeholder="مثال: 600"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#5B7869] dark:text-[#86A896]">
                {lockAspect
                  ? 'تغيير أحد البعدين يحدّث الآخر تلقائياً للحفاظ على النسبة.'
                  : 'تم فك القفل: العرض والارتفاع يعملان بشكل مستقل تماماً.'}
              </span>
              <button
                type="button"
                onClick={handleApplyDimensions}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>تطبيق</span>
              </button>
            </div>

            {/* Quick scale presets */}
            <div>
              <span className="block text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-2">
                مقاسات سريعة
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '25%', factor: 0.25 },
                  { label: '50%', factor: 0.5 },
                  { label: '75%', factor: 0.75 },
                  { label: 'الأصلي 100%', factor: 1 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleScalePreset(preset.factor)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635]/60 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2">
                صيغة التحميل
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['image/png', 'image/jpeg', 'image/webp'] as SupportedImageMime[]).map((mime) => (
                  <button
                    key={mime}
                    type="button"
                    onClick={() => setOutputMime(mime)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      outputMime === mime
                        ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                        : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                    }`}
                  >
                    {getMimeLabel(mime)}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAF2EC] dark:border-[#183528] flex flex-wrap items-center justify-between gap-2 text-xs text-[#466355] dark:text-[#9BB5A6]">
              <span>
                الأبعاد الأصلية:{' '}
                <strong dir="ltr" className="inline-block font-mono-num">
                  {source.width}×{source.height}
                </strong>
              </span>
              <span>
                الحجم الناتج:{' '}
                <strong className="font-mono-num text-[#4D7C0F] dark:text-[#A3E635]">
                  {result ? formatBytes(result.size) : '...'}
                </strong>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || !dimsAreValid}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>تحميل الصورة المعدّلة</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>إعادة تعيين</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">معاينة النتيجة</h2>
              <span
                dir="ltr"
                data-testid="resize-preview-dims"
                className="font-mono-num text-xs text-[#4D7C0F] dark:text-[#A3E635] font-bold"
              >
                {validatedDims ? `${validatedDims.width} × ${validatedDims.height} px` : '—'}
              </span>
            </div>

            <div className="relative aspect-4/3 rounded-xl overflow-hidden border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#06140E] flex items-center justify-center p-3">
              {loading && (
                <div className="absolute inset-0 bg-[#06140E]/40 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 text-[#A3E635] animate-spin" />
                </div>
              )}
              {result ? (
                <img
                  src={result.url}
                  alt="معاينة الصورة بعد تغيير الأبعاد"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <img
                  src={source.objectUrl}
                  alt="معاينة الصورة"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

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
