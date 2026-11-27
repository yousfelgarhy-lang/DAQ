import { Loader2 } from 'lucide-react';

interface OperationProgressProps {
  active: boolean;
  label: string;
  /** Pass 0..100 for real determinate progress; omit for honest indeterminate loading */
  percent?: number;
}

export function OperationProgress({ active, label, percent }: OperationProgressProps) {
  if (!active) return null;

  const isDeterminate = typeof percent === 'number' && Number.isFinite(percent);
  const clamped = isDeterminate ? Math.min(100, Math.max(0, Math.round(percent))) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] p-3.5 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
        <div className="flex items-center gap-2 min-w-0">
          <Loader2 className="w-4 h-4 text-[#4D7C0F] dark:text-[#A3E635] animate-spin shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        {isDeterminate && (
          <span dir="ltr" className="font-mono-num text-xs text-[#4D7C0F] dark:text-[#A3E635] shrink-0">
            {clamped}%
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isDeterminate ? clamped : undefined}
        className="relative h-2 w-full overflow-hidden rounded-full bg-[#DCE9DF] dark:bg-[#143326]"
      >
        {isDeterminate ? (
          <div
            className="h-full w-full origin-left bg-[#65A30D] dark:bg-[#A3E635] transition-transform duration-150 ease-out"
            style={{ transform: `scaleX(${clamped / 100})` }}
          />
        ) : (
          <div className="daq-indeterminate-bar h-full w-2/5 rounded-full bg-[#65A30D] dark:bg-[#A3E635]" />
        )}
      </div>
    </div>
  );
}
