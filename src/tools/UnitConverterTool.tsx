import { useMemo, useState } from 'react';
import { ArrowLeftRight, Copy, RotateCcw, AlertCircle } from 'lucide-react';
import {
  UNIT_CATEGORIES,
  UnitCategoryId,
  convertUnitValue,
} from '../utils/unitConverterLogic';
import { PdfExportButton } from '../components/PdfExportButton';
import { formatCurrentTimestampAr } from '../utils/pdfExport';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface UnitConverterToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

export function UnitConverterTool({ onNotify }: UnitConverterToolProps) {
  const [categoryId, setCategoryId] = useState<UnitCategoryId>('length');
  const [fromUnitId, setFromUnitId] = useState<string>('m');
  const [toUnitId, setToUnitId] = useState<string>('km');
  const [valueInput, setValueInput] = useState<string>('1000');

  const category = useMemo(
    () => UNIT_CATEGORIES.find((c) => c.id === categoryId) ?? UNIT_CATEGORIES[0],
    [categoryId]
  );

  const handleCategoryChange = (nextId: UnitCategoryId) => {
    const nextCat = UNIT_CATEGORIES.find((c) => c.id === nextId);
    if (!nextCat) return;
    setCategoryId(nextId);
    setFromUnitId(nextCat.defaultFrom);
    setToUnitId(nextCat.defaultTo);
    setValueInput(nextId === 'temperature' ? '25' : '1');
  };

  const handleSwap = () => {
    setFromUnitId(toUnitId);
    setToUnitId(fromUnitId);
  };

  const result = useMemo(
    () => convertUnitValue(categoryId, fromUnitId, toUnitId, valueInput),
    [categoryId, fromUnitId, toUnitId, valueInput]
  );

  const fromUnit = category.units.find((u) => u.id === fromUnitId);
  const toUnit = category.units.find((u) => u.id === toUnitId);

  const allEquivalents = useMemo(() => {
    if (!result.valid) return [];
    return category.units.map((u) => {
      const res = convertUnitValue(categoryId, fromUnitId, u.id, valueInput);
      return {
        unit: u,
        formatted: res.valid ? res.formatted : '—',
      };
    });
  }, [category.units, categoryId, fromUnitId, valueInput, result.valid]);

  const handleCopy = async () => {
    if (!result.valid || !fromUnit || !toUnit) return;
    const text = `${valueInput.trim()} ${fromUnit.symbol} = ${result.formatted} ${toUnit.symbol}`;
    try {
      await navigator.clipboard.writeText(text);
      onNotify('تم نسخ نتيجة التحويل', 'success');
    } catch {
      onNotify('تعذّر النسخ التلقائي', 'error');
    }
  };

  const handleReset = () => {
    setValueInput('');
  };

  useRegisterToolShortcuts({
    onExecute: handleSwap,
    executeLabel: 'تبديل الوحدات',
    onCopy: result.valid ? handleCopy : undefined,
    copyLabel: 'نسخ التحويل',
  });

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-5">
        <div className="text-xs font-bold text-[#5B7869] dark:text-[#86A896] mb-3">
          اختر نوع الوحدات
        </div>
        <div className="flex flex-wrap gap-2">
          {UNIT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              data-testid={`unit-cat-${cat.id}`}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                categoryId === cat.id
                  ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                  : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
              }`}
            >
              {cat.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* Main Converter Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-5">
          <div>
            <label
              htmlFor="unit-input-value"
              className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2"
            >
              القيمة المراد تحويلها
            </label>
            <input
              id="unit-input-value"
              type="number"
              step="any"
              dir="ltr"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder="مثال: 100"
              className="w-full px-4 py-3 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div>
              <label
                htmlFor="unit-from-select"
                className="block text-xs font-bold text-[#5B7869] dark:text-[#86A896] mb-1.5"
              >
                من وحدة
              </label>
              <select
                id="unit-from-select"
                value={fromUnitId}
                onChange={(e) => setFromUnitId(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] text-base sm:text-sm font-semibold focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
              >
                {category.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nameAr} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSwap}
              aria-label="تبديل الوحدتين"
              data-testid="unit-swap-button"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#EAF2EC] dark:bg-[#143326] text-[#4D7C0F] dark:text-[#A3E635] hover:border-[#65A30D] dark:hover:border-[#A3E635] transition-colors cursor-pointer mx-auto"
            >
              <ArrowLeftRight className="w-4 h-4 rotate-90 sm:rotate-0" />
            </button>

            <div>
              <label
                htmlFor="unit-to-select"
                className="block text-xs font-bold text-[#5B7869] dark:text-[#86A896] mb-1.5"
              >
                إلى وحدة
              </label>
              <select
                id="unit-to-select"
                value={toUnitId}
                onChange={(e) => setToUnitId(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] text-base sm:text-sm font-semibold focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
              >
                {category.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nameAr} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!result.valid}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45"
            >
              <Copy className="w-4 h-4" />
              <span>نسخ النتيجة</span>
            </button>

            <PdfExportButton
              disabled={!result.valid}
              onNotify={onNotify}
              buildReport={() => {
                if (!result.valid || !fromUnit || !toUnit) return null;
                return {
                  filename: `daq-unit-converter-${categoryId}.pdf`,
                  titleAr: `تقرير تحويل الوحدات — ${category.nameAr}`,
                  subtitleAr: formatCurrentTimestampAr(),
                  metrics: [
                    { label: `القيمة الأصلية (${fromUnit.nameAr})`, value: `${valueInput.trim()} ${fromUnit.symbol}` },
                    { label: `النتيجة (${toUnit.nameAr})`, value: `${result.formatted} ${toUnit.symbol}`, accent: 'lime' },
                  ],
                  sections: [
                    {
                      title: 'جدول التحويلات المكافئة',
                      lines: allEquivalents.map((item) => ({
                        text: `${item.unit.nameAr} (${item.unit.symbol}): ${item.formatted}`,
                      })),
                    },
                  ],
                };
              }}
            />

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-sm font-semibold border border-[#D5E3D8] dark:border-[#1E4232] bg-white dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>مسح</span>
            </button>
          </div>
        </div>

        {/* Result & Equivalents */}
        <div className="lg:col-span-6 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-5">
          {!result.valid ? (
            valueInput.trim() === '' ? (
              <div className="text-center py-10 text-sm text-[#5B7869] dark:text-[#86A896]">
                أدخل قيمة رقمية في الخانة المقابلة لعرض النتيجة الفورية.
              </div>
            ) : (
              <div
                role="alert"
                className="flex items-center gap-2.5 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm font-semibold"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{result.error}</span>
              </div>
            )
          ) : (
            <>
              <div className="p-5 rounded-2xl bg-[#EAF2EC] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1E4232]">
                <div className="text-xs font-bold text-[#5B7869] dark:text-[#86A896] mb-1">
                  {fromUnit?.nameAr} إلى {toUnit?.nameAr}
                </div>
                <div
                  dir="ltr"
                  data-testid="unit-conversion-result"
                  className="font-mono-num text-3xl sm:text-4xl font-extrabold text-[#4D7C0F] dark:text-[#A3E635] break-all text-end"
                >
                  {result.formatted} {toUnit?.symbol}
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold text-[#5B7869] dark:text-[#86A896] mb-2.5">
                  جميع المكافئات في {category.nameAr}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allEquivalents.map((item) => (
                    <div
                      key={item.unit.id}
                      className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 ${
                        item.unit.id === toUnitId
                          ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#EAF2EC]/70 dark:bg-[#122E22]'
                          : 'border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#081912]/70'
                      }`}
                    >
                      <span className="font-semibold text-[#081E15] dark:text-[#F2F7F4] truncate">
                        {item.unit.nameAr}
                      </span>
                      <span dir="ltr" className="font-mono-num font-bold text-[#4D7C0F] dark:text-[#A3E635] shrink-0">
                        {item.formatted} {item.unit.symbol}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
