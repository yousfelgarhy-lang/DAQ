import { useCallback, useEffect, useState } from 'react';
import { CategoryId, ThemeMode, ToastItem, ToastType, ToolId } from './types/tool';
import { getToolById, isValidToolId } from './data/tools';
import {
  getInitialTheme,
  loadFavorites,
  loadRecents,
  pushRecentTool,
  saveFavorites,
  saveTheme,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { ToolPageRouter } from './components/ToolPageRouter';
import { ToastContainer } from './components/ToastContainer';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import {
  ToolShortcutProvider,
  isEditableElement,
  useToolShortcutContext,
} from './hooks/useToolShortcuts';
import { scrollToSection } from './utils/scroll';

function parseRouteFromLocation(): { activeTool: ToolId | null; path: string } {
  const pathname = window.location.pathname || '/';
  const match = pathname.match(/^\/tool\/([^/]+)\/?$/);
  if (match && isValidToolId(match[1])) {
    return { activeTool: match[1], path: pathname };
  }
  return { activeTool: null, path: '/' };
}

function AppContent() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [activeTool, setActiveTool] = useState<ToolId | null>(() => parseRouteFromLocation().activeTool);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [favorites, setFavorites] = useState<ToolId[]>(() => loadFavorites());
  const [recents, setRecents] = useState<ToolId[]>(() => loadRecents());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const shortcutCtx = useToolShortcutContext();

  // Apply theme class cleanly on documentElement without losing child component state
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  // Sync document title for direct links / back-forward navigation
  useEffect(() => {
    if (activeTool) {
      const tool = getToolById(activeTool);
      document.title = tool ? `${tool.nameAr} | DAQ — دقيقة` : 'DAQ — دقيقة';
    } else {
      document.title = 'DAQ — دقيقة | أدوات ويب ذكية في مكان واحد';
    }
  }, [activeTool]);

  // Handle browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseRouteFromLocation();
      setActiveTool(parsed.activeTool);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Record direct-linked initial tool into recents on mount if opened directly
  useEffect(() => {
    if (activeTool) {
      setRecents((prev) => pushRecentTool(activeTool, prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // App-wide keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const hasPrimaryMod = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (shortcutsModalOpen) {
          e.preventDefault();
          setShortcutsModalOpen(false);
          return;
        }
        if (searchModalOpen) {
          e.preventDefault();
          setSearchModalOpen(false);
          return;
        }
        return;
      }

      // Ctrl/Cmd + K: Global Quick Search
      if (hasPrimaryMod && !e.shiftKey && !e.altKey && (keyLower === 'k' || e.code === 'KeyK')) {
        e.preventDefault();
        setShortcutsModalOpen(false);
        setSearchModalOpen((prev) => !prev);
        return;
      }

      // Ctrl/Cmd + /: Keyboard Shortcuts Help
      if (hasPrimaryMod && !e.shiftKey && !e.altKey && (e.key === '/' || e.code === 'Slash')) {
        e.preventDefault();
        setSearchModalOpen(false);
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Do not trigger active-tool action/copy while a modal is open
      if (searchModalOpen || shortcutsModalOpen) return;

      // Ctrl/Cmd + Enter: Execute primary action in active tool (works inside inputs/textareas too)
      if (hasPrimaryMod && !e.altKey && (e.key === 'Enter' || e.code === 'Enter')) {
        if (activeTool && shortcutCtx?.triggerExecute()) {
          e.preventDefault();
        }
        return;
      }

      // Ctrl/Cmd + Shift + C: Copy current tool result when not typing in an editable field or selecting text
      if (hasPrimaryMod && e.shiftKey && !e.altKey && (keyLower === 'c' || e.code === 'KeyC')) {
        const selectionText = window.getSelection()?.toString() ?? '';
        if (isEditableElement(e.target) || selectionText.length > 0) {
          return;
        }
        if (activeTool && shortcutCtx?.triggerCopy()) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, searchModalOpen, shortcutsModalOpen, shortcutCtx]);

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleOpenTool = useCallback((toolId: ToolId) => {
    setActiveTool(toolId);
    setRecents((prev) => pushRecentTool(toolId, prev));
    const targetUrl = `/tool/${toolId}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ toolId }, '', targetUrl);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateHome = useCallback((sectionId?: string) => {
    setActiveTool(null);
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    if (sectionId) {
      scrollToSection(sectionId);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleToggleFavorite = useCallback(
    (toolId: ToolId) => {
      const tool = getToolById(toolId);
      setFavorites((prev) => {
        const exists = prev.includes(toolId);
        const next = exists ? prev.filter((id) => id !== toolId) : [toolId, ...prev];
        saveFavorites(next);
        notify(
          exists
            ? `تمت إزالة ${tool?.nameAr || 'الأداة'} من المفضلة`
            : `تمت إضافة ${tool?.nameAr || 'الأداة'} إلى المفضلة`,
          exists ? 'info' : 'success'
        );
        return next;
      });
    },
    [notify]
  );

  const handleFooterCategory = useCallback(
    (categoryId: CategoryId) => {
      setSelectedCategory(categoryId);
      handleNavigateHome('tools-directory-section');
    },
    [handleNavigateHome]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8F5] text-[#081E15] dark:bg-[#06140E] dark:text-[#F2F7F4] transition-colors duration-200 overflow-x-clip">
      <Navbar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onNavigateHome={handleNavigateHome}
        activePath={activeTool ? `/tool/${activeTool}` : '/'}
        onNotify={notify}
      />

      <main className="flex-1">
        {activeTool ? (
          <ToolPageRouter
            key={activeTool}
            toolId={activeTool}
            isFavorite={favorites.includes(activeTool)}
            onToggleFavorite={handleToggleFavorite}
            onNavigateHome={() => handleNavigateHome()}
            onOpenTool={handleOpenTool}
            onNotify={notify}
          />
        ) : (
          <HomePage
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            favorites={favorites}
            recents={recents}
            onOpenTool={handleOpenTool}
            onToggleFavorite={handleToggleFavorite}
            onOpenQuickSearch={() => setSearchModalOpen(true)}
            onOpenShortcuts={() => setShortcutsModalOpen(true)}
          />
        )}
      </main>

      <Footer
        onSelectCategory={handleFooterCategory}
        onNavigateHome={() => handleNavigateHome()}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />

      <GlobalSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onOpenTool={handleOpenTool}
      />

      <ShortcutsHelpModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <ToolShortcutProvider>
      <AppContent />
    </ToolShortcutProvider>
  );
}
