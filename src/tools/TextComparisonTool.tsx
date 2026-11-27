import { useState } from 'react';
import { GitCompare, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TextComparisonResult, compareTexts } from '../utils/textLogic';
import { PdfExportButton } from '../components/PdfExportButton';
import { formatCurrentTimestampAr } from '../utils/pdfExport';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface TextComparisonToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

export function TextComparisonTool({ onNotify }: TextComparisonToolProps) {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [diffResult, setDiffResult] = useState<TextComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = () => {
    if (!originalText.trim() && !modifiedText.trim()) {
      setError('يرجى إدخال النصين المراد مقارنتهما أولاً.');
      setDiffResult(null);
      return;
    }
    setError(null);
    const result = compareTexts(originalText, modifiedText);
    setDiffResult(result);
    onNotify(
      result.isIdentical
        ? 'النصان متطابقان تماماً'
        : `تم رصد ${result.addedCount} كلمة مضافة و ${result.removedCount} كلمة محذوفة`,
      'info'
    );
  };

  const handleReset = () => {
    setOriginalText('');
    setModifiedText('');
    setDiffResult(null);
    setError(null);
  };

  useRegisterToolShortcuts({
    onExecute: handleCompare,
    executeLabel: 'مقارنة النصين',
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5 space-y-3">
          <label
            htmlFor="compare-original"
            className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
          >
            النص الأول (الأصلي)
          </label>
          <textarea
            id="compare-original"
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            rows={8}
            dir="auto"
            placeholder="الصق النص الأصلي هنا..."
            className="w-full rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] p-4 text-sm sm:text-base text-[#081E15] dark:text-[#F2F7F4] placeholder:text-[#728F80] dark:placeholder:text-[#5F7E6D] leading-relaxed focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635] resize-y"
          />
        </div>

        <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5 space-y-3">
          <label
            htmlFor="compare-modified"
            className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
          >
            النص الثاني (المعدّل)
          </label>
          <textarea
            id="compare-modified"
            value={modifiedText}
            onChange={(e) => setModifiedText(e.target.value)}
            rows={8}
            dir="auto"
            placeholder="الصق النص الجديد أو المعدّل هنا..."
            className="w-full rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] p-4 text-sm sm:text-base text-[#081E15] dark:text-[#F2F7F4] placeholder:text-[#728F80] dark:placeholder:text-[#5F7E6D] leading-relaxed focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635] resize-y"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCompare}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer"
        >
          <GitCompare className="w-4 h-4" />
          <span>مقارنة النصين</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>إعادة تعيين</span>
        </button>

        <PdfExportButton
          disabled={!diffResult}
          onNotify={onNotify}
          buildReport={() => {
            if (!diffResult) return null;
            return {
              filename: 'daq-text-comparison.pdf',
              titleAr: 'تقرير مقارنة النصوص',
              subtitleAr: formatCurrentTimestampAr(),
              metrics: [
                { label: 'كلمات مضافة', value: `+${diffResult.addedCount}`, accent: 'lime' },
                { label: 'كلمات محذوفة', value: `−${diffResult.removedCount}`, accent: 'purple' },
                { label: 'كلمات متطابقة', value: String(diffResult.unchangedCount) },
                { label: 'الحالة', value: diffResult.isIdentical ? 'متطابقان تماماً' : 'توجد اختلافات' },
              ],
              sections: [
                {
                  title: 'تفاصيل الفروقات',
                  lines: diffResult.tokens.map((t) => ({
                    text:
                      t.type === 'added'
                        ? `+ [مضاف] ${t.value}`
                        : t.type === 'removed'
                        ? `− [محذوف] ${t.value}`
                        : t.value,
                    tone: t.type === 'added' ? 'added' : t.type === 'removed' ? 'removed' : 'normal',
                  })),
                },
              ],
            };
          }}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm font-semibold"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {diffResult && (
        <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-6 space-y-5">
          {/* Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EAF2EC] dark:border-[#183528]">
            <h2 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
              ملخص الفروقات
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-bold">
              <span className="text-emerald-700 dark:text-[#A3E635]">
                + مضاف: <span className="font-mono-num">{diffResult.addedCount}</span>
              </span>
              <span className="text-rose-700 dark:text-rose-400">
                − محذوف: <span className="font-mono-num">{diffResult.removedCount}</span>
              </span>
              <span className="text-[#466355] dark:text-[#9BB5A6]">
                متطابق: <span className="font-mono-num">{diffResult.unchangedCount}</span>
              </span>
            </div>
          </div>

          {diffResult.isIdentical ? (
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#4D7C0F] dark:text-[#A3E635]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>النصان متطابقان تماماً ولا توجد فروقات بينهما.</span>
            </div>
          ) : (
            <div
              dir="auto"
              className="p-4 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] leading-loose text-base flex flex-wrap gap-1.5"
            >
              {diffResult.tokens.map((token, idx) => {
                if (token.type === 'equal') {
                  return (
                    <span key={idx} className="text-[#081E15] dark:text-[#F2F7F4]">
                      {token.value}
                    </span>
                  );
                }
                if (token.type === 'added') {
                  return (
                    <ins
                      key={idx}
                      className="no-underline px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-900 dark:text-[#A3E635] border border-emerald-500/30 font-semibold"
                    >
                      <span className="sr-only">مضاف: </span>+{token.value}
                    </ins>
                  );
                }
                return (
                  <del
                    key={idx}
                    className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-900 dark:text-rose-300 border border-rose-500/30 font-semibold line-through"
                  >
                    <span className="sr-only">محذوف: </span>−{token.value}
                  </del>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
