import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  Loader2,
  Smartphone,
  Info,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { ToastType } from '../types/tool';

interface PWAInstallButtonProps {
  onNotify?: (message: string, type?: ToastType) => void;
  compactOnMobile?: boolean;
  fullWidth?: boolean;
}

export function PWAInstallButton({
  onNotify,
  compactOnMobile = false,
  fullWidth = false,
}: PWAInstallButtonProps) {
  const {
    status,
    isInstallable,
    isInstalling,
    isInstalled,
    isAlreadyInstalled,
    isIOS,
    isIOSSafari,
    install,
  } = usePWAInstall();

  const [showGuideModal, setShowGuideModal] = useState(false);
  useLockBodyScroll(showGuideModal);

  useEffect(() => {
    if (!showGuideModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuideModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuideModal]);

  if (isInstalled) {
    return (
      <span
        data-pwa-status={status}
        aria-label={isAlreadyInstalled ? 'التطبيق مثبّت بالفعل' : 'تم تثبيت تطبيق DAQ'}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold text-[#4D7C0F] dark:text-[#A3E635] bg-[#EAF2EC] dark:bg-[#122E22] border border-[#D5E3D8] dark:border-[#1E4232] whitespace-nowrap shrink-0 ${
          fullWidth ? 'w-full' : ''
        }`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span className={compactOnMobile && !fullWidth ? 'hidden sm:inline' : ''}>
          {isAlreadyInstalled ? 'مثبّت بالفعل' : 'تم التثبيت'}
        </span>
        {compactOnMobile && !fullWidth && <span className="sm:hidden">مثبّت</span>}
      </span>
    );
  }

  const handleClick = async () => {
    if (isInstalling) return;

    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        onNotify?.('تم تثبيت تطبيق DAQ بنجاح', 'success');
      } else if (outcome === 'dismissed') {
        onNotify?.('تم إلغاء نافذة التثبيت. يمكنك التثبيت لاحقاً في أي وقت.', 'info');
      } else {
        setShowGuideModal(true);
      }
      return;
    }

    // iOS Safari or browsers where native beforeinstallprompt is unavailable
    setShowGuideModal(true);
  };

  const statusBadgeText = isIOS
    ? isIOSSafari
      ? 'التثبيت عبر قائمة المشاركة في Safari'
      : 'يفضّل فتح الموقع في Safari للتثبيت على iOS'
    : 'التثبيت التلقائي غير متاح في هذه النافذة حالياً';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isInstalling}
        data-pwa-status={status}
        aria-label="تثبيت DAQ"
        className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-bold transition-opacity whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D7C0F] dark:focus-visible:outline-[#A3E635] ${
          isInstallable || isIOS
            ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90'
            : 'border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635]/60'
        } ${fullWidth ? 'w-full' : ''}`}
      >
        {isInstalling ? (
          <>
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            <span>جارٍ التثبيت...</span>
          </>
        ) : (
          <>
            <Download
              className={`w-4 h-4 shrink-0 ${
                isInstallable || isIOS
                  ? 'text-[#A3E635] dark:text-[#06140E]'
                  : 'text-[#4D7C0F] dark:text-[#A3E635]'
              }`}
            />
            <span className={compactOnMobile && !fullWidth ? 'hidden sm:inline' : ''}>
              تثبيت DAQ
            </span>
            {compactOnMobile && !fullWidth && <span className="sm:hidden">تثبيت DAQ</span>}
          </>
        )}
      </button>

      {showGuideModal &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setShowGuideModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] p-5 sm:p-6 shadow-xl text-start space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h3
                  id="pwa-install-title"
                  className="text-base sm:text-lg font-extrabold text-[#081E15] dark:text-[#F2F7F4]"
                >
                  {isIOS ? 'تثبيت DAQ على iPhone و iPad' : 'تثبيت تطبيق DAQ'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  aria-label="إغلاق نافذة التثبيت"
                  className="p-2 rounded-lg text-[#466355] dark:text-[#9BB5A6] hover:bg-[#EAF2EC] dark:hover:bg-[#173A2B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F4F8F5] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1B3B2D] text-xs font-semibold text-[#466355] dark:text-[#9BB5A6]">
                <Info className="w-4 h-4 text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />
                <span>{statusBadgeText}</span>
              </div>

              {isIOS ? (
                <>
                  <p className="text-sm text-[#466355] dark:text-[#9BB5A6] leading-relaxed">
                    {isIOSSafari
                      ? 'في متصفح Safari على أجهزة iOS، يمكنك تثبيت DAQ كتطبيق مستقل عبر الخطوتين التاليتين:'
                      : 'على أجهزة iPhone و iPad، افتح الموقع في متصفح Safari ثم اتبع الخطوتين التاليتين:'}
                  </p>

                  <ol className="space-y-3 text-sm text-[#081E15] dark:text-[#F2F7F4]">
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-[#F4F8F5] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1B3B2D]">
                      <Share className="w-5 h-5 text-[#4D7C0F] dark:text-[#A3E635] shrink-0 mt-0.5" />
                      <span>
                        1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari.
                      </span>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-xl bg-[#F4F8F5] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1B3B2D]">
                      <PlusSquare className="w-5 h-5 text-[#6D28D9] dark:text-[#C4B5FD] shrink-0 mt-0.5" />
                      <span>
                        2. مرر للأسفل واختر{' '}
                        <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> ثم اضغط إضافة.
                      </span>
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="text-sm text-[#466355] dark:text-[#9BB5A6] leading-relaxed">
                    لم يُتح المتصفح نافذة التثبيت التلقائي في الجلسة الحالية (يحدث ذلك عادة عند تصفح التطبيق داخل إطار معاينة مضمّن أو في متصفح لا يدعم ميزة التثبيت المباشر أو إذا كان التطبيق مثبّتاً مسبقاً).
                  </p>

                  <div className="space-y-2.5 text-sm text-[#081E15] dark:text-[#F2F7F4]">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F4F8F5] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1B3B2D]">
                      <Smartphone className="w-5 h-5 text-[#4D7C0F] dark:text-[#A3E635] shrink-0 mt-0.5" />
                      <span>
                        على الكمبيوتر أو Android (Chrome / Edge): افتح رابط الموقع مباشرة في نافذة مستقلة ثم اضغط أيقونة التثبيت في شريط العنوان أو من قائمة المتصفح (<strong>Install DAQ</strong> / <strong>تثبيت التطبيق</strong>).
                      </span>
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
