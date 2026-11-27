import { ReactNode } from 'react';
import { ArrowRight, Heart, Info, Keyboard } from 'lucide-react';
import { ToolId, ToolMeta } from '../types/tool';
import { getCategoryById, TOOLS } from '../data/tools';
import { ToolIcon } from './ToolIcon';
import { useToolShortcutContext } from '../hooks/useToolShortcuts';
import { useSupportsKeyboardShortcuts } from '../hooks/useSupportsKeyboardShortcuts';

interface ToolLayoutProps {
  tool: ToolMeta;
  instructions: string;
  isFavorite: boolean;
  onToggleFavorite: (toolId: ToolId) => void;
  onNavigateHome: () => void;
  onOpenTool: (toolId: ToolId) => void;
  children: ReactNode;
}

export function ToolLayout({
  tool,
  instructions,
  isFavorite,
  onToggleFavorite,
  onNavigateHome,
  onOpenTool,
  children,
}: ToolLayoutProps) {
  const category = getCategoryById(tool.category);
  const relatedTools = TOOLS.filter((t) => t.category === tool.category && t.id !== tool.id);
  const shortcutCtx = useToolShortcutContext();
  const activeShortcuts = shortcutCtx?.shortcuts;
  const supportsShortcuts = useSupportsKeyboardShortcuts();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Breadcrumb & Back link */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          className="inline-flex items-center gap-2 min-h-[40px] text-sm font-bold text-[#466355] dark:text-[#9BB5A6] hover:text-[#4D7C0F] dark:hover:text-[#A3E635] transition-colors"
        >
          <ArrowRight className="w-4 h-4 shrink-0" />
          <span>العودة للرئيسية</span>
        </a>

        <div className="text-xs font-medium text-[#5B7869] dark:text-[#86A896] flex items-center gap-2">
          <span>{category?.nameAr}</span>
          <span aria-hidden="true">/</span>
          <span className="font-mono-num">{tool.nameEn}</span>
        </div>
      </div>

      {/* Tool Header */}
      <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-7 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#EAF2EC] dark:bg-[#143326] border border-[#D5E3D8] dark:border-[#214736] text-[#4D7C0F] dark:text-[#A3E635] flex items-center justify-center shrink-0">
              <ToolIcon toolId={tool.id} className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-extrabold text-[#081E15] dark:text-[#F2F7F4] tracking-tight mb-1.5">
                {tool.nameAr}
              </h1>
              <p className="text-sm sm:text-base text-[#466355] dark:text-[#9BB5A6] leading-relaxed max-w-2xl">
                {tool.fullDescAr}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleFavorite(tool.id)}
            aria-pressed={isFavorite}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[42px] rounded-xl text-sm font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start ${
              isFavorite
                ? 'border-[#A78BFA]/60 bg-[#A78BFA]/15 text-[#6D28D9] dark:text-[#C4B5FD]'
                : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#122E22] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635]/60'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            <span>{isFavorite ? 'في المفضلة' : 'إضافة للمفضلة'}</span>
          </button>
        </div>

        {/* Helpful instruction strip */}
        <div className="mt-5 pt-4 border-t border-[#EAF2EC] dark:border-[#183528] space-y-2.5">
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#466355] dark:text-[#9BB5A6]">
            <Info className="w-4 h-4 text-[#7C3AED] dark:text-[#A78BFA] shrink-0 mt-0.5" />
            <p>{instructions}</p>
          </div>
          {supportsShortcuts && (activeShortcuts?.executeLabel || activeShortcuts?.copyLabel) && (
            <div className="desktop-shortcut-only flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#5B7869] dark:text-[#86A896]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#466355] dark:text-[#9BB5A6]">
                <Keyboard className="w-3.5 h-3.5 text-[#4D7C0F] dark:text-[#A3E635]" />
                <span>اختصارات سريعة:</span>
              </span>
              {activeShortcuts.executeLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <kbd dir="ltr" className="font-mono-num px-1.5 py-0.5 rounded border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4]">
                    Ctrl+Enter
                  </kbd>
                  <span>{activeShortcuts.executeLabel}</span>
                </span>
              )}
              {activeShortcuts.copyLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <kbd dir="ltr" className="font-mono-num px-1.5 py-0.5 rounded border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4]">
                    Ctrl+Shift+C
                  </kbd>
                  <span>{activeShortcuts.copyLabel}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <kbd dir="ltr" className="font-mono-num px-1.5 py-0.5 rounded border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4]">
                  Ctrl+/
                </kbd>
                <span>كل الاختصارات</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tool Interactive Surface */}
      <section aria-label={tool.nameAr}>{children}</section>

      {/* Related Tools in Category */}
      {relatedTools.length > 0 && (
        <section className="mt-12 pt-8 border-t border-[#D5E3D8] dark:border-[#1B3B2D]">
          <h2 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4] mb-4">
            أدوات أخرى في {category?.nameAr}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedTools.map((rel) => (
              <a
                key={rel.id}
                href={`/tool/${rel.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenTool(rel.id);
                }}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A]/80 hover:border-[#65A30D] dark:hover:border-[#A3E635]/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635] flex items-center justify-center shrink-0">
                  <ToolIcon toolId={rel.id} className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] truncate">
                    {rel.nameAr}
                  </div>
                  <div className="text-xs text-[#466355] dark:text-[#9BB5A6] truncate">
                    {rel.shortDescAr}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
