import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, RotateCcw, AlertCircle, Loader2, Link2 } from 'lucide-react';
import { triggerBlobDownload } from '../utils/imageProcessing';
import { validateAndNormalizeQrInput } from '../utils/qrValidation';
import { ToastType } from '../types/tool';

interface QrGeneratorToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

const DEFAULT_VALUE = 'https://daq.tools';

export function QrGeneratorTool({ onNotify }: QrGeneratorToolProps) {
  const [text, setText] = useState(DEFAULT_VALUE);
  const [size, setSize] = useState(260);
  const [fgColor, setFgColor] = useState('#06140E');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const validation = useMemo(() => validateAndNormalizeQrInput(text), [text]);
  const activeError = !validation.valid ? validation.error ?? 'إدخال غير صالح.' : renderError;

  useEffect(() => {
    if (!validation.valid) {
      setLoading(false);
      setRenderError(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setLoading(true);
    setRenderError(null);

    QRCode.toCanvas(
      canvas,
      validation.value,
      {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: fgColor,
          light: bgColor,
        },
      },
      (err) => {
        if (cancelled) return;
        setLoading(false);
        if (err) {
          setRenderError('تعذّر توليد رمز QR لهذا الإدخال. يرجى التحقق من النص.');
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [validation, size, fgColor, bgColor]);

  const handleDownload = () => {
    if (!validation.valid || activeError || !canvasRef.current) {
      onNotify('يرجى إدخال رابط أو نص صحيح أولاً', 'error');
      return;
    }
    const dataUrl = canvasRef.current.toDataURL('image/png');
    triggerBlobDownload(dataUrl, 'daq-qrcode.png');
    onNotify('تم تحميل رمز QR بصيغة PNG', 'success');
  };

  const handleReset = () => {
    setText(DEFAULT_VALUE);
    setSize(260);
    setFgColor('#06140E');
    setBgColor('#FFFFFF');
    setRenderError(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5 sm:p-6 space-y-5">
        <div>
          <label
            htmlFor="qr-text-input"
            className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2"
          >
            الرابط أو النص المطلوب
          </label>
          <textarea
            id="qr-text-input"
            rows={4}
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://google.com أو https://www.youtube.com أو أي نص..."
            className="w-full rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] p-3.5 text-sm sm:text-base text-[#081E15] dark:text-[#F2F7F4] placeholder:text-[#728F80] focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635] resize-y"
          />

          {validation.valid && validation.wasNormalized && (
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#4D7C0F] dark:text-[#A3E635]">
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              <span>تم تنسيق الرابط تلقائياً:</span>
              <span dir="ltr" className="font-mono-num truncate">
                {validation.value}
              </span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="qr-size-range"
              className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
            >
              حجم الرمز (بكسل)
            </label>
            <span dir="ltr" className="font-mono-num text-sm font-bold text-[#4D7C0F] dark:text-[#A3E635]">
              {size} × {size} px
            </span>
          </div>
          <input
            id="qr-size-range"
            type="range"
            min={160}
            max={420}
            step={20}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-[#65A30D] dark:accent-[#A3E635] cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="qr-fg-color"
              className="block text-xs font-bold text-[#466355] dark:text-[#9BB5A6] mb-1.5"
            >
              لون الرمز
            </label>
            <div className="flex items-center gap-2.5 p-2 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912]">
              <input
                id="qr-fg-color"
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer shrink-0"
              />
              <span dir="ltr" className="font-mono-num text-xs font-semibold text-[#081E15] dark:text-[#F2F7F4]">
                {fgColor.toUpperCase()}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="qr-bg-color"
              className="block text-xs font-bold text-[#466355] dark:text-[#9BB5A6] mb-1.5"
            >
              لون الخلفية
            </label>
            <div className="flex items-center gap-2.5 p-2 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912]">
              <input
                id="qr-bg-color"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-9 h-9 rounded-lg border-0 bg-transparent cursor-pointer shrink-0"
              />
              <span dir="ltr" className="font-mono-num text-xs font-semibold text-[#081E15] dark:text-[#F2F7F4]">
                {bgColor.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {activeError && (
          <div
            role="alert"
            className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-semibold"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{activeError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!validation.valid || Boolean(activeError) || loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45 whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>تحميل PNG</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>إعادة تعيين</span>
          </button>
        </div>
      </div>

      {/* Live Preview — keep canvas mounted so ref is always available when input turns valid */}
      <div className="lg:col-span-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5 sm:p-6 flex flex-col items-center justify-center">
        <div className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-4 self-start">
          المعاينة المباشرة
        </div>

        <div className="relative p-4 sm:p-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#06140E] flex items-center justify-center min-h-[260px] sm:min-h-[280px] w-full">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#06140E]/20 rounded-2xl z-10">
              <Loader2 className="w-6 h-6 text-[#A3E635] animate-spin" />
            </div>
          )}

          {(!validation.valid || Boolean(activeError)) && (
            <div className="text-center text-sm text-[#5B7869] dark:text-[#86A896] max-w-xs">
              أدخل رابطاً أو نصاً صحيحاً في الحقل المقابل لعرض رمز QR هنا.
            </div>
          )}

          <canvas
            ref={canvasRef}
            data-testid="qr-preview-canvas"
            className={
              validation.valid && !activeError
                ? 'block rounded-xl shadow-sm max-w-full h-auto'
                : 'hidden'
            }
          />
        </div>
      </div>
    </div>
  );
}
