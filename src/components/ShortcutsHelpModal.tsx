import { createPortal } from 'react-dom';
import { Keyboard, X } from 'lucide-react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface ShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS_LIST = [
  { keys: 'Ctrl / Cmd + K', label: 'فتح نافذة البحث السريع عن الأدوات' },
  { keys: 'Ctrl / Cmd + /', label: 'عرض أو إخفاء قائمة اختصارات لوحة المفاتيح' },
  { keys: 'Ctrl / Cmd + Enter', label: 'تنفيذ الإجراء الرئيسي داخل الأداة الحالية' },
  { keys: 'Ctrl / Cmd + Shift + C', label: 'نسخ النتيجة الحالية في الأداة عند توفرها' },
  { keys: 'Esc', label: 'إغلاق النافذة المفتوحة أو البحث السريع أو القائمة' },
];

export function ShortcutsHelpModal({ open, onClose }: ShortcutsHelpModalProps) {
  useLockBodyScroll(open);
  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-help-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635] flex items-center justify-center shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <h2
              id="shortcuts-help-title"
              className="text-base sm:text-lg font-extrabold text-[#081E15] dark:text-[#F2F7F4]"
            >
              اختصارات لوحة المفاتيح
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الاختصارات"
            className="p-2 rounded-lg text-[#466355] dark:text-[#9BB5A6] hover:bg-[#EAF2EC] dark:hover:bg-[#173A2B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#466355] dark:text-[#9BB5A6]">
          استخدم هذه الاختصارات للتنقل السريع وتنفيذ المهام داخل منصة دقيقة دون مقاطعة الكتابة في الحقول.
        </p>

        <div className="space-y-2.5">
          {SHORTCUTS_LIST.map((item) => (
            <div
              key={item.keys}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#081912]"
            >
              <span className="text-xs sm:text-sm font-semibold text-[#081E15] dark:text-[#F2F7F4]">
                {item.label}
              </span>
              <kbd
                dir="ltr"
                className="font-mono-num text-xs font-bold px-2.5 py-1 rounded-lg border border-[#C6DACB] dark:border-[#244E3B] bg-white dark:bg-[#0D231A] text-[#4D7C0F] dark:text-[#A3E635] whitespace-nowrap shrink-0"
              >
                {item.keys}
              </kbd>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>,
    document.body
  );
}
