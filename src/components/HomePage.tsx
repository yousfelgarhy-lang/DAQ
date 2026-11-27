import { useMemo } from 'react';
import { Search, X, Heart, Clock, Sparkles, ArrowUpLeft } from 'lucide-react';
import { CATEGORIES, TOOLS, getToolById, searchTools } from '../data/tools';
import { CategoryId, ToolId } from '../types/tool';
import { CategoryIcon } from './ToolIcon';
import { ToolCard } from './ToolCard';
import { scrollToSection } from '../utils/scroll';
import { useSupportsKeyboardShortcuts } from '../hooks/useSupportsKeyboardShortcuts';

interface HomePageProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (cat: CategoryId | 'all') => void;
  favorites: ToolId[];
  recents: ToolId[];
  onOpenTool: (toolId: ToolId) => void;
  onToggleFavorite: (toolId: ToolId) => void;
  onOpenQuickSearch?: () => void;
  onOpenShortcuts?: () => void;
}

export function HomePage({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  favorites,
  recents,
  onOpenTool,
  onToggleFavorite,
  onOpenQuickSearch,
  onOpenShortcuts,
}: HomePageProps) {
  const supportsShortcuts = useSupportsKeyboardShortcuts();
  const hasSearch = searchQuery.trim().length > 0;

  const searchResults = useMemo(
    () => (hasSearch ? searchTools(searchQuery, 'all') : []),
    [searchQuery, hasSearch]
  );

  const directoryTools = useMemo(
    () =>
      selectedCategory === 'all'
        ? TOOLS
        : TOOLS.filter((tool) => tool.category === selectedCategory),
    [selectedCategory]
  );

  const selectedCategoryMeta = useMemo(
    () => CATEGORIES.find((c) => c.id === selectedCategory),
    [selectedCategory]
  );

  const popularTools = useMemo(() => TOOLS.filter((t) => t.popular), []);

  const favoriteTools = useMemo(
    () => favorites.map((id) => getToolById(id)).filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [favorites]
  );

  const recentTools = useMemo(
    () => recents.map((id) => getToolById(id)).filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [recents]
  );

  const handleCategorySelect = (catId: CategoryId | 'all', shouldScroll = true) => {
    onSelectCategory(catId);
    if (shouldScroll) {
      scrollToSection('tools-directory-section');
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#D5E3D8] dark:border-[#1B3B2D] bg-gradient-to-b from-[#EAF2EC] via-[#F4F8F5] to-[#F4F8F5] dark:from-[#0B2218] dark:via-[#071811] dark:to-[#06140E]">
        {/* Subtle atmospheric gradients */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 start-1/2 -translate-x-1/2 w-[680px] h-[320px] rounded-full bg-[#A3E635]/15 dark:bg-[#A3E635]/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-12 end-10 w-[340px] h-[240px] rounded-full bg-[#7C3AED]/10 dark:bg-[#A78BFA]/10 blur-3xl"
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-16 sm:pb-18 text-center">
          <p className="text-xs sm:text-sm font-bold text-[#4D7C0F] dark:text-[#A3E635] mb-3 tracking-wide">
            DAQ · دقيقة — كل حاجة أبسط، في دقيقة
          </p>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#081E15] dark:text-[#F2F7F4] leading-tight text-balance max-w-3xl mx-auto mb-4">
            حاجتك اللي بتدور عليها، في دقيقة.
          </h1>

          <p className="text-sm sm:text-lg text-[#466355] dark:text-[#9BB5A6] max-w-2xl mx-auto leading-relaxed mb-8">
            منصة أدوات يومية ذكية لمعالجة الصور، تنسيق ومقارنة النصوص، الحسابات المالية، وتوليد رموز QR مباشرة داخل متصفحك بدون تسجيل أو رفع ملفات.
          </p>

          {/* Prominent Real-Time Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center rounded-2xl border border-[#C6DACB] dark:border-[#244E3B] bg-white/90 dark:bg-[#0D231A]/90 backdrop-blur-md shadow-sm focus-within:border-[#65A30D] dark:focus-within:border-[#A3E635] transition-colors">
              <Search className="w-5 h-5 text-[#5B7869] dark:text-[#86A896] ms-3.5 sm:ms-4 shrink-0" />
              <label htmlFor="global-tool-search" className="sr-only">
                ابحث عن أداة بالاسم العربي أو الإنجليزي
              </label>
              <input
                id="global-tool-search"
                type="text"
                role="searchbox"
                inputMode="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ابحث عن أداة... مثال: دمج PDF، كلمة مرور، تحويل الوحدات، حساب العمر"
                className="w-full min-w-0 py-3.5 sm:py-4 px-3 sm:px-3.5 bg-transparent text-base text-[#081E15] dark:text-[#F2F7F4] placeholder:text-[#728F80] dark:placeholder:text-[#739382] focus:outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="مسح البحث"
                  className="me-2 p-2.5 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl text-[#5B7869] dark:text-[#86A896] hover:bg-[#EAF2EC] dark:hover:bg-[#173A2B] transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                supportsShortcuts &&
                onOpenQuickSearch && (
                  <button
                    type="button"
                    onClick={onOpenQuickSearch}
                    title="فتح البحث السريع (Ctrl+K)"
                    className="desktop-shortcut-only inline-flex items-center me-3 px-2 py-1 rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[11px] font-bold font-mono-num text-[#5B7869] dark:text-[#86A896] hover:border-[#65A30D] cursor-pointer shrink-0"
                    dir="ltr"
                  >
                    Ctrl + K
                  </button>
                )
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[#5B7869] dark:text-[#86A896]">
              <span>جرب البحث عن:</span>
              {['ضغط', 'PDF', 'كلمة مرور', 'وحدات', 'العمر', 'QR'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => onSearchChange(term)}
                  className="px-3 py-1.5 min-h-[34px] rounded-lg border border-[#D5E3D8] dark:border-[#1E4232] bg-white/70 dark:bg-[#0D231A]/70 text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635] transition-colors cursor-pointer font-medium"
                >
                  {term}
                </button>
              ))}
              {supportsShortcuts && onOpenShortcuts && (
                <button
                  type="button"
                  onClick={onOpenShortcuts}
                  className="desktop-shortcut-only px-2.5 py-1.5 rounded-lg border border-transparent text-[#466355] dark:text-[#9BB5A6] hover:text-[#4D7C0F] dark:hover:text-[#A3E635] transition-colors cursor-pointer font-semibold"
                >
                  اختصارات لوحة المفاتيح (<span dir="ltr" className="font-mono-num">Ctrl+/</span>)
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
        {/* Live Search Results Section (only when user enters search query) */}
        {hasSearch && (
          <section
            id="search-results-section"
            aria-label="نتائج البحث"
            className="scroll-mt-24 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#081E15] dark:text-[#F2F7F4]">
                  {`نتائج البحث عن "${searchQuery.trim()}"`}
                </h2>
                <p className="text-sm text-[#466355] dark:text-[#9BB5A6] mt-0.5">
                  <span className="font-mono-num font-bold">{searchResults.length}</span> أداة مطابقة
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-bold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer"
              >
                مسح البحث
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {searchResults.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    isFavorite={favorites.includes(tool.id)}
                    onOpenTool={onOpenTool}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-8 sm:p-10 text-center space-y-3">
                <Search className="w-8 h-8 text-[#5B7869] dark:text-[#86A896] mx-auto" />
                <h3 className="text-lg font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  لم نجد أداة مطابقة لبحثك
                </h3>
                <p className="text-sm text-[#466355] dark:text-[#9BB5A6] max-w-md mx-auto">
                  جرّب البحث بكلمة أبسط مثل: صورة، نص، نسبة، فاتورة، أو تصفّح الفئات بالأسفل.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Categories Section */}
        <section id="categories-section" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#081E15] dark:text-[#F2F7F4]">
                تصفّح حسب الفئة
              </h2>
              <p className="text-sm text-[#466355] dark:text-[#9BB5A6] mt-1">
                أربعة أقسام منظمة تضم أدوات دقيقة اليومية.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#EAF2EC] dark:bg-[#0D231A] border border-[#D5E3D8] dark:border-[#1B3B2D] self-start md:self-auto max-w-full">
              <button
                type="button"
                onClick={() => handleCategorySelect('all', true)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-white dark:bg-[#A3E635] text-[#081E15] dark:text-[#06140E] shadow-xs'
                    : 'text-[#466355] dark:text-[#9BB5A6] hover:text-[#081E15] dark:hover:text-[#F2F7F4]'
                }`}
              >
                الكل ({TOOLS.length})
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id, true)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-white dark:bg-[#A3E635] text-[#081E15] dark:text-[#06140E] shadow-xs'
                      : 'text-[#466355] dark:text-[#9BB5A6] hover:text-[#081E15] dark:hover:text-[#F2F7F4]'
                  }`}
                >
                  {cat.nameAr}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => {
              const count = TOOLS.filter((t) => t.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id, true)}
                  className={`group text-start rounded-2xl border p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#EAF2EC] dark:bg-[#122E22]'
                      : 'border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A]/90 hover:border-[#65A30D] dark:hover:border-[#A3E635]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                          cat.accentTone === 'purple'
                            ? 'bg-[#7C3AED]/10 text-[#6D28D9] dark:bg-[#A78BFA]/15 dark:text-[#C4B5FD]'
                            : 'bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635]'
                        }`}
                      >
                        <CategoryIcon categoryId={cat.id} className="w-5 h-5" />
                      </div>
                      <span className="font-mono-num text-xs font-bold text-[#5B7869] dark:text-[#86A896]">
                        {count} {count === 1 ? 'أداة' : 'أدوات'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#081E15] dark:text-[#F2F7F4] mb-1.5">
                      {cat.nameAr}
                    </h3>
                    <p className="text-sm text-[#466355] dark:text-[#9BB5A6] leading-relaxed">
                      {cat.descriptionAr}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#EAF2EC] dark:border-[#183528] flex items-center justify-between text-xs font-bold text-[#4D7C0F] dark:text-[#A3E635]">
                    <span>استعراض القسم</span>
                    <ArrowUpLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Single Persistent Tools Directory Section (immediately below Categories so clicking a category never jumps to the bottom) */}
        <section id="tools-directory-section" className="scroll-mt-24 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#081E15] dark:text-[#F2F7F4]">
                {selectedCategoryMeta ? selectedCategoryMeta.nameAr : 'جميع أدوات دقيقة'}
              </h2>
              <p className="text-sm text-[#466355] dark:text-[#9BB5A6] mt-1">
                {selectedCategoryMeta ? (
                  <>
                    {selectedCategoryMeta.descriptionAr} ·{' '}
                    <span className="font-mono-num font-bold">{directoryTools.length}</span>{' '}
                    {directoryTools.length === 1 ? 'أداة' : 'أدوات'}
                  </>
                ) : (
                  `${TOOLS.length} أداة متكاملة تعمل داخل متصفحك بسرعة وموثوقية.`
                )}
              </p>
            </div>

            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => handleCategorySelect('all', false)}
                className="px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-bold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#0D231A] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635] transition-colors cursor-pointer whitespace-nowrap"
              >
                عرض جميع الأقسام ({TOOLS.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {directoryTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isFavorite={favorites.includes(tool.id)}
                onOpenTool={onOpenTool}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>

        {/* Popular Tools Section */}
        <section id="popular-section" className="scroll-mt-24 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#4D7C0F] dark:text-[#A3E635] shrink-0" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#081E15] dark:text-[#F2F7F4]">
                الأدوات الأكثر استخداماً
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896]">
              الأسرع وصولاً للمهام اليومية
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {popularTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isFavorite={favorites.includes(tool.id)}
                onOpenTool={onOpenTool}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>

        {/* Favorites & Recently Used Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Favorites Section */}
          <section id="favorites-section" className="scroll-mt-24 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Heart className="w-5 h-5 text-[#6D28D9] dark:text-[#C4B5FD] shrink-0" />
                <h2 className="text-xl font-extrabold text-[#081E15] dark:text-[#F2F7F4]">
                  المفضلة
                </h2>
              </div>
              {favoriteTools.length > 0 && (
                <span className="font-mono-num text-xs font-bold text-[#5B7869] dark:text-[#86A896]">
                  {favoriteTools.length}
                </span>
              )}
            </div>

            {favoriteTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favoriteTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    isFavorite={true}
                    onOpenTool={onOpenTool}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#BFD3C4] dark:border-[#244E3B] bg-white/60 dark:bg-[#0D231A]/50 p-6 sm:p-8 text-center space-y-2">
                <Heart className="w-7 h-7 text-[#7C3AED] dark:text-[#A78BFA] mx-auto opacity-80" />
                <h3 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  لا توجد أدوات مفضلة بعد
                </h3>
                <p className="text-sm text-[#466355] dark:text-[#9BB5A6] max-w-sm mx-auto">
                  اضغط على أيقونة القلب في أي أداة لحفظها هنا والوصول إليها فوراً في كل زيارة.
                </p>
              </div>
            )}
          </section>

          {/* Recently Used Tools Section */}
          <section id="recents-section" className="scroll-mt-24 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#4D7C0F] dark:text-[#A3E635] shrink-0" />
                <h2 className="text-xl font-extrabold text-[#081E15] dark:text-[#F2F7F4]">
                  الأدوات المستخدمة مؤخراً
                </h2>
              </div>
              {recentTools.length > 0 && (
                <span className="font-mono-num text-xs font-bold text-[#5B7869] dark:text-[#86A896]">
                  {recentTools.length}
                </span>
              )}
            </div>

            {recentTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    isFavorite={favorites.includes(tool.id)}
                    onOpenTool={onOpenTool}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#BFD3C4] dark:border-[#244E3B] bg-white/60 dark:bg-[#0D231A]/50 p-6 sm:p-8 text-center space-y-2">
                <Clock className="w-7 h-7 text-[#4D7C0F] dark:text-[#A3E635] mx-auto opacity-80" />
                <h3 className="text-base font-bold text-[#081E15] dark:text-[#F2F7F4]">
                  لم تستخدم أي أداة بعد
                </h3>
                <p className="text-sm text-[#466355] dark:text-[#9BB5A6] max-w-sm mx-auto">
                  ستظهر هنا آخر الأدوات التي فتحتها تلقائياً لتتابع عملك من حيث توقفت.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
