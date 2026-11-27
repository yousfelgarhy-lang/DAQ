import { Keyboard } from 'lucide-react';
import { CATEGORIES } from '../data/tools';
import { CategoryId } from '../types/tool';
import { useSupportsKeyboardShortcuts } from '../hooks/useSupportsKeyboardShortcuts';

interface FooterProps {
  onSelectCategory: (categoryId: CategoryId) => void;
  onNavigateHome: () => void;
  onOpenShortcuts?: () => void;
}

export function Footer({ onSelectCategory, onNavigateHome, onOpenShortcuts }: FooterProps) {
  const supportsShortcuts = useSupportsKeyboardShortcuts();
  return (
    <footer className="border-t border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#EAF2EC]/60 dark:bg-[#05100B] mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="inline-flex items-center gap-2 text-base font-extrabold text-[#081E15] dark:text-[#F2F7F4]"
            >
              <span>DAQ</span>
              <span className="text-[#4D7C0F] dark:text-[#A3E635]">دقيقة</span>
            </a>
            <p className="text-sm font-medium text-[#466355] dark:text-[#9BB5A6]">
              كل حاجة أبسط، في دقيقة. جميع الأدوات تعمل محلياً داخل متصفحك بخصوصية تامة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-[#466355] dark:text-[#9BB5A6]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="hover:text-[#4D7C0F] dark:hover:text-[#A3E635] transition-colors cursor-pointer whitespace-nowrap"
              >
                {cat.nameAr}
              </button>
            ))}
            {supportsShortcuts && onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                className="desktop-shortcut-only inline-flex items-center gap-1.5 hover:text-[#4D7C0F] dark:hover:text-[#A3E635] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Keyboard className="w-4 h-4" />
                <span>الاختصارات</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#D5E3D8] dark:border-[#1B3B2D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#5B7869] dark:text-[#7E9E8D]">
          <span>DAQ — دقيقة · الإصدار 1.5</span>
          <span>معالجة محلية 100% — لا يتم رفع أي ملفات لخوادم خارجية</span>
        </div>
      </div>
    </footer>
  );
}
