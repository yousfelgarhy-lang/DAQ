import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastItem } from '../types/tool';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] start-4 end-4 sm:end-auto z-50 flex flex-col gap-2.5 sm:max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md bg-white/95 dark:bg-[#0D231A]/95 border-[#D5E3D8] dark:border-[#244E3B] text-[#081E15] dark:text-[#F2F7F4]"
        >
          <div className="flex items-center gap-2.5 text-sm font-semibold min-w-0">
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4D7C0F] dark:text-[#A3E635]" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            {toast.type === 'info' && (
              <Info className="w-4 h-4 shrink-0 text-[#7C3AED] dark:text-[#A78BFA]" />
            )}
            <span className="break-words">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="إغلاق التنبيه"
            className="p-1 rounded-lg text-[#466355] dark:text-[#9BB5A6] hover:bg-[#EAF2EC] dark:hover:bg-[#173A2B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
