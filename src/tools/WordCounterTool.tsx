import { useMemo, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { analyzeText } from '../utils/textLogic';
import { PdfExportButton } from '../components/PdfExportButton';
import { formatCurrentTimestampAr } from '../utils/pdfExport';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface WordCounterToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

export function WordCounterTool({ onNotify }: WordCounterToolProps) {
  const [text, setText] = useState('');

  const stats = useMemo(() => analyzeText(text), [text]);

  const handleCopy = async () => {
    if (!text) {
      onNotify('لا يوجد نص لنسخه حالياً', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      onNotify('تم نسخ النص إلى الحافظة', 'success');
    } catch {
      onNotify('تعذّر النسخ التلقائي، يرجى النسخ يدوياً', 'error');
    }
  };

  const handleClear = () => {
    setText('');
    onNotify('تم مسح النص', 'info');
  };

  useRegisterToolShortcuts({
    onCopy: text ? handleCopy : undefined,
    copyLabel: text ? 'نسخ النص' : undefined,
  });

  const statCards = [
    { label: 'عدد الكلمات', value: stats.words, highlight: true },
    { label: 'عدد الأحرف', value: stats.characters },
    { label: 'الأحرف بدون مسافات', value: stats.charactersNoSpaces },
    { label: 'عدد الجمل', value: stats.sentences },
    { label: 'عدد الفقرات', value: stats.paragraphs },
    { label: 'وقت القراءة التقديري', value: stats.readingTimeLabel, isText: true },
  ];

  return (
    <div className="space-y-6">
      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4"
          >
            <div className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-1.5">
              {item.label}
            </div>
            <div
              className={`font-mono-num ${
                item.isText ? 'text-base sm:text-xl' : 'text-xl sm:text-2xl'
              } font-extrabold ${
                item.highlight
                  ? 'text-[#4D7C0F] dark:text-[#A3E635]'
                  : 'text-[#081E15] dark:text-[#F2F7F4]'
              }`}
            >
              {item.isText ? item.value : item.value.toLocaleString('en-US')}
            </div>
          </div>
        ))}
      </div>

      {/* Text Input Area */}
      <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="word-counter-textarea"
            className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
          >
            اكتب أو الصق النص هنا
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!text}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45"
            >
              <Copy className="w-4 h-4" />
              <span>نسخ النص</span>
            </button>
            <PdfExportButton
              disabled={!text.trim()}
              onNotify={onNotify}
              buildReport={() => {
                if (!text.trim()) return null;
                return {
                  filename: 'daq-word-counter-report.pdf',
                  titleAr: 'تقرير تحليل النص وعداد الكلمات',
                  subtitleAr: formatCurrentTimestampAr(),
                  metrics: [
                    { label: 'عدد الكلمات', value: stats.words.toLocaleString('en-US'), accent: 'lime' },
                    { label: 'عدد الأحرف', value: stats.characters.toLocaleString('en-US') },
                    { label: 'الأحرف بدون مسافات', value: stats.charactersNoSpaces.toLocaleString('en-US') },
                    { label: 'عدد الجمل', value: stats.sentences.toLocaleString('en-US') },
                    { label: 'عدد الفقرات', value: stats.paragraphs.toLocaleString('en-US') },
                    { label: 'وقت القراءة التقديري', value: stats.readingTimeLabel, accent: 'purple' },
                  ],
                  sections: [
                    {
                      title: 'النص المحلل',
                      body: text,
                    },
                  ],
                };
              }}
            />
            <button
              type="button"
              onClick={handleClear}
              disabled={!text}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-rose-500/60 transition-colors cursor-pointer disabled:opacity-45"
            >
              <Trash2 className="w-4 h-4" />
              <span>مسح النص</span>
            </button>
          </div>
        </div>

        <textarea
          id="word-counter-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={11}
          dir="auto"
          placeholder="ابدأ الكتابة أو الصق مقالك هنا لحساب الكلمات والأحرف ووقت القراءة فوراً..."
          className="w-full rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] p-4 text-base text-[#081E15] dark:text-[#F2F7F4] placeholder:text-[#728F80] dark:placeholder:text-[#5F7E6D] leading-relaxed focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635] resize-y"
        />
      </div>
    </div>
  );
}
