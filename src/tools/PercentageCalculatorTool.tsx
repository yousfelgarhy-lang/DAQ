import { useMemo, useState } from 'react';
import { Copy, RotateCcw, AlertCircle } from 'lucide-react';
import {
  calculatePercentageChange,
  calculatePercentageOf,
  calculateWhatPercentage,
} from '../utils/calculatorLogic';
import { formatNumber } from '../utils/formatters';
import { PdfExportButton } from '../components/PdfExportButton';
import { formatCurrentTimestampAr } from '../utils/pdfExport';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface PercentageCalculatorToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

export function PercentageCalculatorTool({ onNotify }: PercentageCalculatorToolProps) {
  // Mode 1: X% of Y
  const [m1Percent, setM1Percent] = useState('15');
  const [m1Total, setM1Total] = useState('400');

  // Mode 2: Percentage change from A to B
  const [m2From, setM2From] = useState('200');
  const [m2To, setM2To] = useState('250');

  // Mode 3: X is what % of Y
  const [m3Part, setM3Part] = useState('45');
  const [m3Whole, setM3Whole] = useState('180');

  const res1 = useMemo(() => {
    if (m1Percent.trim() === '' || m1Total.trim() === '') return null;
    return calculatePercentageOf(Number(m1Percent), Number(m1Total));
  }, [m1Percent, m1Total]);

  const res2 = useMemo(() => {
    if (m2From.trim() === '' || m2To.trim() === '') return null;
    return calculatePercentageChange(Number(m2From), Number(m2To));
  }, [m2From, m2To]);

  const res3 = useMemo(() => {
    if (m3Part.trim() === '' || m3Whole.trim() === '') return null;
    return calculateWhatPercentage(Number(m3Part), Number(m3Whole));
  }, [m3Part, m3Whole]);

  const copyValue = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify('تم نسخ النتيجة', 'success');
    } catch {
      onNotify('تعذّر النسخ التلقائي', 'error');
    }
  };

  const handleResetAll = () => {
    setM1Percent('');
    setM1Total('');
    setM2From('');
    setM2To('');
    setM3Part('');
    setM3Whole('');
  };

  const hasAnyValid = Boolean(res1?.valid || res2?.valid || res3?.valid);

  const handleCopySummary = async () => {
    const parts: string[] = [];
    if (res1?.valid) parts.push(`${m1Percent}% من ${m1Total} = ${formatNumber(res1.value, 4)}`);
    if (res2?.valid) parts.push(`التغير من ${m2From} إلى ${m2To} = ${res2.value > 0 ? '+' : ''}${formatNumber(res2.value)}%`);
    if (res3?.valid) parts.push(`${m3Part} من ${m3Whole} = ${formatNumber(res3.value)}%`);
    if (parts.length === 0) return;
    await copyValue(parts.join(' | '));
  };

  useRegisterToolShortcuts({
    onCopy: hasAnyValid ? handleCopySummary : undefined,
    copyLabel: hasAnyValid ? 'نسخ الملخص' : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <PdfExportButton
          disabled={!hasAnyValid}
          onNotify={onNotify}
          buildReport={() => {
            if (!hasAnyValid) return null;
            const metrics = [];
            if (res1?.valid) {
              metrics.push({
                label: `01. ${m1Percent}% من ${m1Total}`,
                value: formatNumber(res1.value, 4),
                accent: 'lime' as const,
              });
            }
            if (res2?.valid) {
              metrics.push({
                label: `02. التغير من ${m2From} إلى ${m2To}`,
                value: `${res2.value > 0 ? '+' : ''}${formatNumber(res2.value)}%`,
                accent: res2.value < 0 ? ('neutral' as const) : ('lime' as const),
              });
            }
            if (res3?.valid) {
              metrics.push({
                label: `03. نسبة ${m3Part} من ${m3Whole}`,
                value: `${formatNumber(res3.value)}%`,
                accent: 'purple' as const,
              });
            }
            return {
              filename: 'daq-percentage-report.pdf',
              titleAr: 'تقرير حاسبة النسبة المئوية',
              subtitleAr: formatCurrentTimestampAr(),
              metrics,
            };
          }}
        />
        <button
          type="button"
          onClick={handleResetAll}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>إعادة تعيين الكل</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mode 1 */}
        <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-[#081E15] dark:text-[#F2F7F4]">
              01. حساب نسبة مئوية من رقم
            </h2>
            <p className="text-xs text-[#5B7869] dark:text-[#86A896]">
              كم يساوي X% من القيمة Y؟
            </p>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="m1-percent"
                  className="block text-xs font-semibold text-[#466355] dark:text-[#9BB5A6] mb-1"
                >
                  النسبة المئوية (%)
                </label>
                <input
                  id="m1-percent"
                  type="number"
                  step="any"
                  value={m1Percent}
                  onChange={(e) => setM1Percent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base sm:text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                />
              </div>
              <div>
                <label
                  htmlFor="m1-total"
                  className="block text-xs font-semibold text-[#466355] dark:text-[#9BB5A6] mb-1"
                >
                  من الرقم
                </label>
                <input
                  id="m1-total"
                  type="number"
                  step="any"
                  value={m1Total}
                  onChange={(e) => setM1Total(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base sm:text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EAF2EC] dark:border-[#183528]">
            {res1 && !res1.valid ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{res1.error}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#5B7869] dark:text-[#86A896]">النتيجة</div>
                  <div
                    data-testid="pct-mode1-result"
                    className="font-mono-num text-2xl font-extrabold text-[#4D7C0F] dark:text-[#A3E635]"
                  >
                    {res1 ? formatNumber(res1.value, 4) : '—'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!res1?.valid}
                  onClick={() => res1 && copyValue(String(res1.value))}
                  aria-label="نسخ نتيجة الحساب الأول"
                  className="p-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] hover:border-[#65A30D] text-[#466355] dark:text-[#9BB5A6] cursor-pointer disabled:opacity-40"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mode 2 */}
        <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-[#081E15] dark:text-[#F2F7F4]">
              02. نسبة التغير بين قيمتين
            </h2>
            <p className="text-xs text-[#5B7869] dark:text-[#86A896]">
              احسب نسبة الزيادة أو النقصان من قيمة لأخرى.
            </p>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="m2-from"
                  className="block text-xs font-semibold text-[#466355] dark:text-[#9BB5A6] mb-1"
                >
                  القيمة السابقة (من)
                </label>
                <input
                  id="m2-from"
                  type="number"
                  step="any"
                  value={m2From}
                  onChange={(e) => setM2From(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base sm:text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                />
              </div>
              <div>
                <label
                  htmlFor="m2-to"
                  className="block text-xs font-semibold text-[#466355] dark:text-[#9BB5A6] mb-1"
                >
                  القيمة الجديدة (إلى)
                </label>
                <input
                  id="m2-to"
                  type="number"
                  step="any"
                  value={m2To}
                  onChange={(e) => setM2To(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base sm:text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EAF2EC] dark:border-[#183528]">
            {res2 && !res2.valid ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{res2.error}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#5B7869] dark:text-[#86A896]">نسبة التغير</div>
                  <div
                    data-testid="pct-mode2-result"
                    className={`font-mono-num text-2xl font-extrabold ${
                      res2 && res2.value < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[#4D7C0F] dark:text-[#A3E635]'
                    }`}
                  >
                    {res2 ? `${res2.value > 0 ? '+' : ''}${formatNumber(res2.value)}%` : '—'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!res2?.valid}
                  onClick={() => res2 && copyValue(`${res2.value}%`)}
                  aria-label="نسخ نتيجة الحساب الثاني"
                  className="p-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] hover:border-[#65A30D] text-[#466355] dark:text-[#9BB5A6] cursor-pointer disabled:opacity-40"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mode 3 */}
        <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-[#081E15] dark:text-[#F2F7F4]">
              03. نسبة جزء من إجمالي
            </h2>
            <p className="text-xs text-[#5B7869] dark:text-[#86A896]">
              كم يمثل الرقم الأول كنسبة مئوية من الرقم الثاني؟
            </p>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="m3-part"
                  className="block text-xs font-semibold text-[#466355] dark:text-[#9BB5A6] mb-1"
                >
                  الجزء (الرقم الأول)
                </label>
                <input
                  id="m3-part"
                  type="number"
                  step="any"
                  value={m3Part}
                  onChange={(e) => setM3Part(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base sm:text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                />
              </div>
              <div>
                <label
                  htmlFor="m3-whole"
                  className="block text-xs font-semibold text-[#466355] dark:text-[#9BB5A6] mb-1"
                >
                  الإجمالي (الرقم الثاني)
                </label>
                <input
                  id="m3-whole"
                  type="number"
                  step="any"
                  value={m3Whole}
                  onChange={(e) => setM3Whole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base sm:text-sm focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EAF2EC] dark:border-[#183528]">
            {res3 && !res3.valid ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{res3.error}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#5B7869] dark:text-[#86A896]">النسبة المئوية</div>
                  <div
                    data-testid="pct-mode3-result"
                    className="font-mono-num text-2xl font-extrabold text-[#6D28D9] dark:text-[#C4B5FD]"
                  >
                    {res3 ? `${formatNumber(res3.value)}%` : '—'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!res3?.valid}
                  onClick={() => res3 && copyValue(`${res3.value}%`)}
                  aria-label="نسخ نتيجة الحساب الثالث"
                  className="p-2.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] hover:border-[#65A30D] text-[#466355] dark:text-[#9BB5A6] cursor-pointer disabled:opacity-40"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
