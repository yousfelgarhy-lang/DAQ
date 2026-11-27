import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowUpLeft } from 'lucide-react';
import { getCategoryById, searchTools } from '../data/tools';
import { ToolId } from '../types/tool';
import { ToolIcon } from './ToolIcon';
import { useSupportsKeyboardShortcuts } from '../hooks/useSupportsKeyboardShortcuts';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  onOpenTool: (toolId: ToolId) => void;
}

export function GlobalSearchModal({ open, onClose, onOpenTool }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const supportsShortcuts = useSupportsKeyboardShortcuts();
  useLockBodyScroll(open);

  const results = useMemo(() => searchTools(query, 'all'), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(0);
    }
  }, [results.length, activeIndex]);

  if (!open) return null;

  const handleSelect = (toolId: ToolId) => {
    onClose();
    onOpenTool(toolId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex((prev) => (prev + 1) % results.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      }
      return;
    }
    if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex].id);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="البحث السريع عن الأدوات"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16 sm:pt-24"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EAF2EC] dark:border-[#183528]">
          <Search className="w-5 h-5 text-[#4D7C0F] dark:text-[#A3E635] shrink-0" />
          <label htmlFor="quick-search-modal-input" className="sr-only">
            ابحث عن أداة في دقيقة
          </label>
          <input
            ref={inputRef}
            id="quick-search-modal-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="ابحث عن أداة... مثال: PDF، باسورد، عمر، وحدات، ضغط"
            className="flex-1 min-w-0 bg-transparent text-base text-[#081E15] dark:text-[#F2F7F4] placeholder:text-[#728F80] dark:placeholder:text-[#5F7E6D] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق البحث السريع"
            className="p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl text-[#5B7869] dark:text-[#86A896] hover:bg-[#EAF2EC] dark:hover:bg-[#173A2B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60dvh] overflow-y-auto overscroll-contain p-2 space-y-1">
          {results.length > 0 ? (
            results.map((tool, index) => {
              const cat = getCategoryById(tool.category);
              const isActive = index === activeIndex;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(tool.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-start transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#EAF2EC] dark:bg-[#143326] text-[#081E15] dark:text-[#F2F7F4]'
                      : 'text-[#081E15] dark:text-[#F2F7F4] hover:bg-[#F4F8F5] dark:hover:bg-[#081912]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1E4232] text-[#4D7C0F] dark:text-[#A3E635] flex items-center justify-center shrink-0">
                      <ToolIcon toolId={tool.id} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{tool.nameAr}</div>
                      <div className="text-xs text-[#5B7869] dark:text-[#86A896] truncate">
                        {cat?.nameAr} · {tool.nameEn}
                      </div>
                    </div>
                  </div>
                  <ArrowUpLeft className="w-4 h-4 text-[#4D7C0F] dark:text-[#A3E635] shrink-0" />
                </button>
              );
            })
          ) : (
            <div className="py-10 text-center text-sm text-[#5B7869] dark:text-[#86A896]">
              لا توجد أداة مطابقة لـ "{query}"
            </div>
          )}
        </div>

        {/* Footer Hint */}
        {supportsShortcuts && (
          <div className="desktop-shortcut-only px-4 py-2.5 border-t border-[#EAF2EC] dark:border-[#183528] bg-[#F4F8F5] dark:bg-[#081912] flex items-center justify-between text-xs text-[#5B7869] dark:text-[#86A896]">
            <span>التنقل بالأسهم · Enter للفتح</span>
            <span dir="ltr" className="font-mono-num">
              Esc للإغلاق
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
