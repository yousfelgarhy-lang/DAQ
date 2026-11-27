import { useMemo, useState } from 'react';
import { Copy, RotateCcw, AlertCircle } from 'lucide-react';
import { calculateDiscount } from '../utils/calculatorLogic';
import { formatEGP } from '../utils/formatters';
import { PdfExportButton } from '../components/PdfExportButton';
import { formatCurrentTimestampAr } from '../utils/pdfExport';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface DiscountCalculatorToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

export function DiscountCalculatorTool({ onNotify }: DiscountCalculatorToolProps) {
  const [priceInput, setPriceInput] = useState('1000');
  const [discountInput, setDiscountInput] = useState('20');

  const result = useMemo(() => {
    if (priceInput.trim() === '' || discountInput.trim() === '') {
      return null;
    }
    return calculateDiscount(Number(priceInput), Number(discountInput));
  }, [priceInput, discountInput]);

  const handleReset = () => {
    setPriceInput('');
    setDiscountInput('');
  };

  const handleCopy = async () => {
    if (!result || !result.valid) return;
    const summary = `السعر الأصلي: ${formatEGP(result.originalPrice)} | الخصم: ${result.discountPercent}% | التوفير: ${formatEGP(result.savedAmount)} | السعر النهائي: ${formatEGP(result.finalPrice)}`;
    try {
      await navigator.clipboard.writeText(summary);
      onNotify('تم نسخ ملخص الخصم', 'success');
    } catch {
      onNotify('تعذّر النسخ التلقائي', 'error');
    }
  };

  useRegisterToolShortcuts({
    onCopy: result?.valid ? handleCopy : undefined,
    copyLabel: result?.valid ? 'نسخ النتيجة' : undefined,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-5">
        <div>
          <label
            htmlFor="discount-original-price"
            className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2"
          >
            السعر الأصلي (جنيه مصري)
          </label>
          <input
            id="discount-original-price"
            type="number"
            min={0}
            step="any"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="مثال: 1500"
            className="w-full px-4 py-3 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
          />
        </div>

        <div>
          <label
            htmlFor="discount-percent"
            className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2"
          >
            نسبة الخصم (%)
          </label>
          <input
            id="discount-percent"
            type="number"
            min={0}
            max={100}
            step="any"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            placeholder="مثال: 25"
            className="w-full px-4 py-3 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {[10, 15, 20, 25, 30, 50].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setDiscountInput(String(pct))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer font-mono-num ${
                  discountInput === String(pct)
                    ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                    : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result || !result.valid}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45"
          >
            <Copy className="w-4 h-4" />
            <span>نسخ النتيجة</span>
          </button>
          <PdfExportButton
            disabled={!result || !result.valid}
            onNotify={onNotify}
            buildReport={() => {
              if (!result || !result.valid) return null;
              return {
                filename: 'daq-discount-report.pdf',
                titleAr: 'تقرير حاسبة الخصم',
                subtitleAr: formatCurrentTimestampAr(),
                metrics: [
                  { label: 'السعر النهائي بعد الخصم', value: formatEGP(result.finalPrice), accent: 'lime' },
                  { label: 'المبلغ الموفّر', value: formatEGP(result.savedAmount), accent: 'purple' },
                  { label: 'السعر الأصلي', value: formatEGP(result.originalPrice) },
                  { label: 'نسبة الخصم', value: `${result.discountPercent}%` },
                ],
              };
            }}
          />
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة تعيين</span>
          </button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 flex flex-col justify-center">
        {result && !result.valid ? (
          <div
            role="alert"
            className="flex items-center gap-2.5 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm font-semibold"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{result.error}</span>
          </div>
        ) : result && result.valid ? (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-[#EAF2EC] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1E4232]">
              <div className="text-xs font-bold text-[#5B7869] dark:text-[#86A896] mb-1">
                السعر النهائي بعد الخصم
              </div>
              <div
                data-testid="discount-final-price"
                className="font-mono-num text-3xl sm:text-4xl font-extrabold text-[#4D7C0F] dark:text-[#A3E635]"
              >
                {formatEGP(result.finalPrice)}
              </div>
            </div>

            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#081912]/70">
                <div className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-1">
                  المبلغ الموفّر
                </div>
                <div
                  data-testid="discount-saved-amount"
                  className="font-mono-num text-xl font-extrabold text-[#6D28D9] dark:text-[#C4B5FD]"
                >
                  {formatEGP(result.savedAmount)}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#081912]/70">
                <div className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-1">
                  السعر قبل الخصم
                </div>
                <div className="font-mono-num text-xl font-bold text-[#081E15] dark:text-[#F2F7F4] line-through opacity-75">
                  {formatEGP(result.originalPrice)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-[#5B7869] dark:text-[#86A896]">
            أدخل السعر الأصلي ونسبة الخصم لعرض النتيجة فوراً.
          </div>
        )}
      </div>
    </div>
  );
}
