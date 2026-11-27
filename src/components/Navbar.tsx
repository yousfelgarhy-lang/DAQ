import { useEffect, useState } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { ThemeMode, ToastType } from '../types/tool';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigateHome: (sectionId?: string) => void;
  activePath: string;
  onNotify?: (message: string, type?: ToastType) => void;
}

export function Navbar({ theme, onToggleTheme, onNavigateHome, activePath, onNotify }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileOpen]);

  const navItems = [
    { label: 'الرئيسية', section: undefined },
    { label: 'الفئات', section: 'categories-section' },
    { label: 'الأدوات الشائعة', section: 'popular-section' },
    { label: 'المفضلة', section: 'favorites-section' },
    { label: 'الأخيرة', section: 'recents-section' },
  ];

  const handleLinkClick = (e: React.MouseEvent, section?: string) => {
    e.preventDefault();
    setMobileOpen(false);
    onNavigateHome(section);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5]/85 dark:bg-[#06140E]/85 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Brand mark */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e)}
          className="inline-flex items-center gap-2 sm:gap-2.5 text-base sm:text-lg font-extrabold tracking-tight text-[#081E15] dark:text-[#F2F7F4] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4D7C0F] dark:focus-visible:outline-[#A3E635] rounded-md"
        >
          <span className="w-8 h-8 rounded-lg bg-[#0B2218] dark:bg-[#A3E635] text-[#A3E635] dark:text-[#06140E] flex items-center justify-center shrink-0 shadow-xs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
              <path d="M12 7.5V12L15.5 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>DAQ</span>
          <span className="text-[#4D7C0F] dark:text-[#A3E635] font-bold">دقيقة</span>
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="التنقل الرئيسي" className="hidden lg:flex items-center gap-6 text-sm font-semibold">
          {navItems.map((item) => {
            const isHomeTop = !item.section && activePath === '/';
            return (
              <a
                key={item.label}
                href={item.section ? `/#${item.section}` : '/'}
                onClick={(e) => handleLinkClick(e, item.section)}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#4D7C0F] dark:hover:text-[#A3E635] ${
                  isHomeTop
                    ? 'text-[#081E15] dark:text-[#F2F7F4]'
                    : 'text-[#466355] dark:text-[#9BB5A6]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: PWA Install + Theme Toggle + Mobile Menu Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton onNotify={onNotify} compactOnMobile />

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
            className="inline-flex items-center justify-center gap-2 px-2.5 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D7C0F] dark:focus-visible:outline-[#A3E635]"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-[#A3E635] shrink-0" />
                <span className="hidden min-[440px]:inline">الوضع الفاتح</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#6D28D9] shrink-0" />
                <span className="hidden min-[440px]:inline">الوضع الداكن</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      {mobileOpen && (
        <nav
          aria-label="قائمة الجوال"
          className="lg:hidden border-t border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#081912] px-4 py-3 flex flex-col gap-1 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain"
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.section ? `/#${item.section}` : '/'}
              onClick={(e) => handleLinkClick(e, item.section)}
              className="px-3 py-3 min-h-[44px] flex items-center rounded-xl text-sm font-semibold text-[#081E15] dark:text-[#F2F7F4] hover:bg-[#EAF2EC] dark:hover:bg-[#122E22] transition-colors"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-2 mt-1 border-t border-[#D5E3D8] dark:border-[#1B3B2D]">
            <PWAInstallButton onNotify={onNotify} fullWidth />
          </div>
        </nav>
      )}
    </header>
  );
}
