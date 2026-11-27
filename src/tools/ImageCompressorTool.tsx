import { useEffect, useState } from 'react';
import { Download, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
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
import { calculateCompressionPercent, formatBytes } from '../utils/formatters';
import { ToastType } from '../types/tool';

interface ImageCompressorToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

export function ImageCompressorTool({ onNotify }: ImageCompressorToolProps) {
  const [source, setSource] = useState<LoadedImageInfo | null>(null);
  const [result, setResult] = useState<ProcessedImageResult | null>(null);
  const [quality, setQuality] = useState<number>(75);
  const [outputMime, setOutputMime] = useState<SupportedImageMime>('image/webp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!source) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    processImageOnCanvas(source.element, {
      width: source.width,
      height: source.height,
      mime: outputMime,
      quality: quality / 100,
    })
      .then((res) => {
        if (cancelled) {
          URL.revokeObjectURL(res.url);
          return;
        }
        setResult(res);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source, quality, outputMime]);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const loaded = await loadImageFile(file);
      // Use original mime if JPG or WebP; if PNG, default to WebP so quality slider actually compresses size
      const defaultOut: SupportedImageMime =
        loaded.mime === 'image/png' ? 'image/webp' : loaded.mime;
      setOutputMime(defaultOut);
      setSource(loaded);
      onNotify('تم تحميل الصورة بنجاح', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل الصورة.';
      setError(message);
      onNotify(message, 'error');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSource(null);
    setResult(null);
    setQuality(75);
    setError(null);
    setLoading(false);
  };

  const handleDownload = () => {
    if (!result || !source) return;
    const filename = buildOutputFilename(source.name, 'compressed', result.mime);
    triggerBlobDownload(result.url, filename);
    onNotify('تم بدء تحميل الصورة المضغوطة', 'success');
  };

  const savedPercent =
    source && result ? calculateCompressionPercent(source.size, result.size) : 0;

  return (
    <div className="space-y-6">
      {!source ? (
        <ImageDropzone onFileSelected={handleFile} disabled={loading} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-5 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="compress-quality"
                  className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
                >
                  جودة الضغط
                </label>
                <span className="font-mono-num text-sm font-bold text-[#4D7C0F] dark:text-[#A3E635]">
                  {quality}%
                </span>
              </div>
              <input
                id="compress-quality"
                type="range"
                min={10}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-[#65A30D] dark:accent-[#A3E635] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[#5B7869] dark:text-[#86A896] mt-1">
                <span>أعلى ضغط (10%)</span>
                <span>أعلى جودة (100%)</span>
              </div>
            </div>

            <div>
              <span className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2">
                صيغة الإخراج
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['image/webp', 'image/jpeg', 'image/png'] as SupportedImageMime[]).map((mime) => (
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
              {outputMime === 'image/png' && (
                <p className="text-xs text-[#5B7869] dark:text-[#86A896] mt-2">
                  ملاحظة: صيغة PNG غير فاقدة للبيانات؛ للحصول على أصغر حجم ممكن استخدم WebP أو JPG.
                </p>
              )}
            </div>

            {/* Stats Summary */}
            <div className="pt-4 border-t border-[#EAF2EC] dark:border-[#183528] grid grid-cols-1 min-[400px]:grid-cols-3 gap-2.5 sm:gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#F4F8F5] dark:bg-[#081912]">
                <div className="text-xs text-[#5B7869] dark:text-[#86A896] mb-1">الحجم الأصلي</div>
                <div className="font-mono-num text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  {formatBytes(source.size)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F4F8F5] dark:bg-[#081912]">
                <div className="text-xs text-[#5B7869] dark:text-[#86A896] mb-1">بعد الضغط</div>
                <div className="font-mono-num text-sm font-bold text-[#4D7C0F] dark:text-[#A3E635]">
                  {result ? formatBytes(result.size) : '...'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F4F8F5] dark:bg-[#081912]">
                <div className="text-xs text-[#5B7869] dark:text-[#86A896] mb-1">نسبة التوفير</div>
                <div
                  dir="ltr"
                  className={`font-mono-num text-sm font-bold ${
                    savedPercent >= 0
                      ? 'text-[#4D7C0F] dark:text-[#A3E635]'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {result ? `${savedPercent > 0 ? `-${savedPercent}` : `+${Math.abs(savedPercent)}`}%` : '...'}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!result || loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>تحميل الصورة</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>صورة جديدة</span>
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-7 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">معاينة الصورة</h2>
              <span dir="ltr" className="font-mono-num text-xs text-[#5B7869] dark:text-[#86A896]">
                {source.width} × {source.height} px
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896]">
                  الأصلية ({getMimeLabel(source.mime)})
                </div>
                <div className="aspect-4/3 rounded-xl overflow-hidden border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#06140E] flex items-center justify-center">
                  <img
                    src={source.objectUrl}
                    alt="معاينة الصورة الأصلية"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#4D7C0F] dark:text-[#A3E635]">
                  المضغوطة ({getMimeLabel(outputMime)})
                </div>
                <div className="relative aspect-4/3 rounded-xl overflow-hidden border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#06140E] flex items-center justify-center">
                  {loading && (
                    <div className="absolute inset-0 bg-[#06140E]/40 backdrop-blur-xs flex items-center justify-center z-10">
                      <Loader2 className="w-6 h-6 text-[#A3E635] animate-spin" />
                    </div>
                  )}
                  {result && (
                    <img
                      src={result.url}
                      alt="معاينة الصورة بعد الضغط"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              </div>
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
