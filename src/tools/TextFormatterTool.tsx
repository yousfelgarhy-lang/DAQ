import { useState } from 'react';
import { Copy, RotateCcw, Trash2 } from 'lucide-react';
import { TextTransformAction, transformText } from '../utils/textLogic';
import { PdfExportButton } from '../components/PdfExportButton';
import { formatCurrentTimestampAr } from '../utils/pdfExport';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface TextFormatterToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

const FORMAT_ACTIONS: { id: TextTransformAction; label: string; subtitle: string }[] = [
  { id: 'uppercase', label: 'UPPERCASE', subtitle: 'تحويل للأحرف الكبيرة' },
  { id: 'lowercase', label: 'lowercase', subtitle: 'تحويل للأحرف الصغيرة' },
  { id: 'titlecase', label: 'Title Case', subtitle: 'تكبير أول كل كلمة' },
  { id: 'removeExtraSpaces', label: 'إزالة المسافات الزائدة', subtitle: 'تنظيف الفراغات المكررة' },
  { id: 'removeEmptyLines', label: 'حذف الأسطر الفارغة', subtitle: 'دمج الأسطر المتباعدة' },
  { id: 'removeDuplicateLines', label: 'حذف الأسطر المكررة', subtitle: 'إبقاء نسخة واحدة' },
  { id: 'reverseText', label: 'عكس النص', subtitle: 'قلب ترتيب الأحرف' },
];

export function TextFormatterTool({ onNotify }: TextFormatterToolProps) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);

  const handleApplyAction = (action: TextTransformAction, label: string) => {
    const source = outputText !== '' ? outputText : inputText;
    if (!source.trim() && source.length === 0) {
      onNotify('يرجى إدخال نص أولاً لتطبيق التنسيق', 'error');
      return;
    }
    const transformed = transformText(source, action);
    setOutputText(transformed);
    setLastActionLabel(label);
    onNotify(`تم تطبيق: ${label}`, 'success');
  };

  const handleInputChange = (val: string) => {
    setInputText(val);
    setOutputText('');
    setLastActionLabel(null);
  };

  const handleCopyOutput = async () => {
    const textToCopy = outputText || inputText;
    if (!textToCopy) {
      onNotify('لا يوجد نص ناتج لنسخه', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      onNotify('تم نسخ النص المنسّق إلى الحافظة', 'success');
    } catch {
      onNotify('تعذّر النسخ التلقائي، يرجى النسخ يدوياً', 'error');
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setLastActionLabel(null);
    onNotify('تم مسح الإدخال', 'info');
  };

  const handleResetOutput = () => {
    setOutputText('');
    setLastActionLabel(null);
  };

  const displayedResult = outputText !== '' ? outputText : inputText;

  useRegisterToolShortcuts({
    onCopy: displayedResult ? handleCopyOutput : undefined,
    copyLabel: displayedResult ? 'نسخ النتيجة' : undefined,
  });

  return (
    <div className="space-y-6">
      {/* Action Buttons Bar */}
      <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5">
        <div className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-3">
          اختر عملية التنسيق المطلوبة
        </div>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {FORMAT_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleApplyAction(action.id, action.label)}
              className="text-start p-3 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] hover:border-[#65A30D] dark:hover:border-[#A3E635] transition-colors cursor-pointer group"
            >
              <div className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] group-hover:text-[#4D7C0F] dark:group-hover:text-[#A3E635] transition-colors">
                {action.label}
              </div>
              <div className="text-xs text-[#5B7869] dark:text-[#86A896] mt-0.5">
                {action.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Input & Output Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="formatter-input"
              className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
            >
              النص الأصلي
            </label>
            <button
              type="button"
              onClick={handleClear}
              disabled={!inputText && !outputText}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold border border-[#D5E3D8] dark:border-[#1E4232] text-[#466355] dark:text-[#9BB5A6] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-45"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح الإدخال</span>
            </button>
          </div>
          <textarea
            id="formatter-input"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            rows={10}
            dir="auto"
            placeholder="أدخل النص الذي تريد تنسيقه أو تنظيفه هنا..."
            className="w-full rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] p-4 text-base text-[#081E15] dark:text-[#F2F7F4] placeholder:text-[#728F80] dark:placeholder:text-[#5F7E6D] leading-relaxed focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635] resize-y"
          />
        </div>

        <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="formatter-output"
                className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
              >
                النص الناتج
              </label>
              {lastActionLabel && (
                <span className="text-xs font-semibold text-[#4D7C0F] dark:text-[#A3E635]">
                  · {lastActionLabel}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {outputText !== '' && (
                <button
                  type="button"
                  onClick={handleResetOutput}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold border border-[#D5E3D8] dark:border-[#1E4232] text-[#466355] dark:text-[#9BB5A6] hover:text-[#081E15] dark:hover:text-[#F2F7F4] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إلغاء التعديل</span>
                </button>
              )}
              <PdfExportButton
                disabled={!displayedResult.trim()}
                onNotify={onNotify}
                buildReport={() => {
                  if (!displayedResult.trim()) return null;
                  return {
                    filename: 'daq-formatted-text.pdf',
                    titleAr: 'تقرير النص المنسّق',
                    subtitleAr: formatCurrentTimestampAr(),
                    metrics: [
                      {
                        label: 'العملية المطبقة',
                        value: lastActionLabel || 'بدون تعديل إضافي',
                        accent: 'purple',
                      },
                      {
                        label: 'عدد الأحرف الناتجة',
                        value: displayedResult.length.toLocaleString('en-US'),
                        accent: 'lime',
                      },
                    ],
                    sections: [
                      {
                        title: 'النص المنسّق',
                        body: displayedResult,
                      },
                    ],
                  };
                }}
              />
              <button
                type="button"
                onClick={handleCopyOutput}
                disabled={!displayedResult}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ النتيجة</span>
              </button>
            </div>
          </div>

          <textarea
            id="formatter-output"
            readOnly
            value={displayedResult}
            rows={10}
            dir="auto"
            placeholder="ستظهر نتيجة التنسيق هنا فوراً..."
            className="w-full rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#EAF2EC]/50 dark:bg-[#06140E] p-4 text-base text-[#081E15] dark:text-[#F2F7F4] placeholder:text-[#728F80] dark:placeholder:text-[#5F7E6D] leading-relaxed focus:outline-none resize-y"
          />
        </div>
      </div>
    </div>
  );
}
