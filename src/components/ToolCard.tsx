import { ArrowUpLeft, Heart } from 'lucide-react';
import { ToolId, ToolMeta } from '../types/tool';
import { getCategoryById } from '../data/tools';
import { ToolIcon } from './ToolIcon';

interface ToolCardProps {
  tool: ToolMeta;
  isFavorite: boolean;
  onOpenTool: (toolId: ToolId) => void;
  onToggleFavorite: (toolId: ToolId) => void;
}

export function ToolCard({ tool, isFavorite, onOpenTool, onToggleFavorite }: ToolCardProps) {
  const category = getCategoryById(tool.category);

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A]/90 p-5 transition-all duration-200 hover:border-[#65A30D] dark:hover:border-[#A3E635]/60 hover:-translate-y-0.5 shadow-xs">
      {/* Top row: Icon + Favorite toggle */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#EAF2EC] dark:bg-[#143326] border border-[#D5E3D8] dark:border-[#214736] text-[#4D7C0F] dark:text-[#A3E635] flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#A3E635]/20">
          <ToolIcon toolId={tool.id} className="w-5 h-5" />
        </div>

        <button
          type="button"
          onClick={() => onToggleFavorite(tool.id)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `إزالة ${tool.nameAr} من المفضلة` : `إضافة ${tool.nameAr} إلى المفضلة`}
          className={`relative z-10 w-9 h-9 rounded-lg inline-flex items-center justify-center border transition-colors cursor-pointer ${
            isFavorite
              ? 'border-[#A78BFA]/50 bg-[#A78BFA]/15 text-[#7C3AED] dark:text-[#C4B5FD]'
              : 'border-transparent text-[#5B7869] dark:text-[#86A896] hover:bg-[#EAF2EC] dark:hover:bg-[#173A2B] hover:text-[#081E15] dark:hover:text-[#F2F7F4]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Main clickable navigation link */}
      <div className="flex-1 flex flex-col">
        <div className="text-xs font-medium text-[#5B7869] dark:text-[#86A896] mb-1.5 flex items-center gap-1.5">
          <span>{category?.nameAr}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num">{tool.nameEn}</span>
        </div>

        <h3 className="text-lg font-bold text-[#081E15] dark:text-[#F2F7F4] mb-1.5">
          <a
            href={`/tool/${tool.id}`}
            onClick={(e) => {
              e.preventDefault();
              onOpenTool(tool.id);
            }}
            className="after:absolute after:inset-0 focus:outline-none focus-visible:underline"
          >
            {tool.nameAr}
          </a>
        </h3>

        <p className="text-sm text-[#466355] dark:text-[#9BB5A6] leading-relaxed mb-4">
          {tool.shortDescAr}
        </p>
      </div>

      <div className="pt-3 border-t border-[#EAF2EC] dark:border-[#183528] flex items-center justify-between text-xs font-bold text-[#4D7C0F] dark:text-[#A3E635]">
        <span>افتح الأداة</span>
        <ArrowUpLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </article>
  );
}
