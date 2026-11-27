import { useMemo, useState } from 'react';
import { Copy, RotateCcw, AlertCircle, Users } from 'lucide-react';
import { calculateBillSplit } from '../utils/calculatorLogic';
import { formatEGP } from '../utils/formatters';
import { PdfExportButton } from '../components/PdfExportButton';
import { formatCurrentTimestampAr } from '../utils/pdfExport';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface BillSplitterToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

export function BillSplitterTool({ onNotify }: BillSplitterToolProps) {
  const [billInput, setBillInput] = useState('600');
  const [peopleInput, setPeopleInput] = useState('4');
  const [tipInput, setTipInput] = useState('10');

  const result = useMemo(() => {
    if (billInput.trim() === '' || peopleInput.trim() === '') return null;
    const tip = tipInput.trim() === '' ? 0 : Number(tipInput);
    return calculateBillSplit(Number(billInput), Number(peopleInput), tip);
  }, [billInput, peopleInput, tipInput]);

  const handleReset = () => {
    setBillInput('');
    setPeopleInput('2');
    setTipInput('0');
  };

  const handleCopy = async () => {
    if (!result || !result.valid) return;
    const summary = `إجمالي الفاتورة: ${formatEGP(result.subtotal)} | الإكرامية (${result.tipPercent}%): ${formatEGP(result.tipAmount)} | الإجمالي النهائي: ${formatEGP(result.totalWithTip)} | نصيب كل شخص (${result.peopleCount}): ${formatEGP(result.perPerson)}`;
    try {
      await navigator.clipboard.writeText(summary);
      onNotify('تم نسخ تفاصيل تقسيم الفاتورة', 'success');
    } catch {
      onNotify('تعذّر النسخ التلقائي', 'error');
    }
  };

  useRegisterToolShortcuts({
    onCopy: result?.valid ? handleCopy : undefined,
    copyLabel: result?.valid ? 'نسخ الملخص' : undefined,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-5">
        <div>
          <label
            htmlFor="bill-amount"
            className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2"
          >
            إجمالي الفاتورة (جنيه مصري)
          </label>
          <input
            id="bill-amount"
            type="number"
            min={0}
            step="any"
            value={billInput}
            onChange={(e) => setBillInput(e.target.value)}
            placeholder="مثال: 850"
            className="w-full px-4 py-3 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
          />
        </div>

        <div>
          <label
            htmlFor="bill-people"
            className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2"
          >
            عدد الأشخاص
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPeopleInput(String(Math.max(1, (Number(peopleInput) || 1) - 1)))}
              aria-label="تقليل عدد الأشخاص"
              className="w-11 h-11 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-lg font-bold text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] cursor-pointer"
            >
              −
            </button>
            <input
              id="bill-people"
              type="number"
              min={1}
              step={1}
              value={peopleInput}
              onChange={(e) => setPeopleInput(e.target.value)}
              className="flex-1 min-w-0 text-center px-3 sm:px-4 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
            />
            <button
              type="button"
              onClick={() => setPeopleInput(String((Number(peopleInput) || 0) + 1))}
              aria-label="زيادة عدد الأشخاص"
              className="w-11 h-11 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-lg font-bold text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="bill-tip"
            className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2"
          >
            نسبة الإكرامية % (اختياري)
          </label>
          <input
            id="bill-tip"
            type="number"
            min={0}
            max={200}
            step="any"
            value={tipInput}
            onChange={(e) => setTipInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {[0, 5, 10, 12, 15].map((tip) => (
              <button
                key={tip}
                type="button"
                onClick={() => setTipInput(String(tip))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer font-mono-num ${
                  tipInput === String(tip)
                    ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                    : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                }`}
              >
                {tip === 0 ? 'بدون إكرامية' : `${tip}%`}
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
            <span>نسخ الملخص</span>
          </button>
          <PdfExportButton
            disabled={!result || !result.valid}
            onNotify={onNotify}
            buildReport={() => {
              if (!result || !result.valid) return null;
              return {
                filename: 'daq-bill-split-report.pdf',
                titleAr: 'تقرير تقسيم الفاتورة',
                subtitleAr: formatCurrentTimestampAr(),
                metrics: [
                  { label: 'نصيب كل شخص', value: formatEGP(result.perPerson), accent: 'lime' },
                  { label: 'عدد الأشخاص', value: String(result.peopleCount) },
                  { label: 'الإجمالي شامل الإكرامية', value: formatEGP(result.totalWithTip) },
                  { label: `قيمة الإكرامية (${result.tipPercent}%)`, value: formatEGP(result.tipAmount), accent: 'purple' },
                  { label: 'قيمة الفاتورة الأساسية', value: formatEGP(result.subtotal) },
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
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#5B7869] dark:text-[#86A896]">
                  نصيب كل شخص
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#466355] dark:text-[#9BB5A6]">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-mono-num">{result.peopleCount}</span>
                </span>
              </div>
              <div
                data-testid="bill-per-person"
                className="font-mono-num text-3xl sm:text-4xl font-extrabold text-[#4D7C0F] dark:text-[#A3E635]"
              >
                {formatEGP(result.perPerson)}
              </div>
            </div>

            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#081912]/70">
                <div className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-1">
                  الإجمالي شامل الإكرامية
                </div>
                <div
                  data-testid="bill-total-with-tip"
                  className="font-mono-num text-xl font-extrabold text-[#081E15] dark:text-[#F2F7F4]"
                >
                  {formatEGP(result.totalWithTip)}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#081912]/70">
                <div className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-1">
                  قيمة الإكرامية
                </div>
                <div className="font-mono-num text-xl font-bold text-[#6D28D9] dark:text-[#C4B5FD]">
                  {formatEGP(result.tipAmount)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-[#5B7869] dark:text-[#86A896]">
            أدخل إجمالي الفاتورة وعدد الأشخاص لحساب نصيب كل فرد.
          </div>
        )}
      </div>
    </div>
  );
}
