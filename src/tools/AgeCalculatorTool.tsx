import { useMemo, useState } from 'react';
import { Cake, Copy, RotateCcw, AlertCircle, Calendar } from 'lucide-react';
import {
  calculateAge,
  formatCalendarDateArabic,
  formatCalendarDateISO,
  getLocalTodayParts,
} from '../utils/ageLogic';
import { PdfExportButton } from '../components/PdfExportButton';
import { formatCurrentTimestampAr } from '../utils/pdfExport';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface AgeCalculatorToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

export function AgeCalculatorTool({ onNotify }: AgeCalculatorToolProps) {
  const localToday = useMemo(() => getLocalTodayParts(), []);
  const maxDateIso = useMemo(() => formatCalendarDateISO(localToday), [localToday]);

  const [birthDateInput, setBirthDateInput] = useState<string>('2000-02-29');

  const result = useMemo(
    () => calculateAge(birthDateInput, localToday),
    [birthDateInput, localToday]
  );

  const handleCopy = async () => {
    if (!result.valid) return;
    const summary = `العمر الدقيق: ${result.years} سنة و ${result.months} شهر و ${result.days} يوم | إجمالي الأيام: ${result.totalDaysLived.toLocaleString('en-US')} يوم | المتبقي لعيد الميلاد القادم: ${result.nextBirthday.monthsRemaining} شهر و ${result.nextBirthday.daysRemaining} يوم (${result.nextBirthday.totalDaysRemaining} يوم)`;
    try {
      await navigator.clipboard.writeText(summary);
      onNotify('تم نسخ نتيجة حساب العمر', 'success');
    } catch {
      onNotify('تعذّر النسخ التلقائي', 'error');
    }
  };

  const handleReset = () => {
    setBirthDateInput('');
  };

  useRegisterToolShortcuts({
    onCopy: result.valid ? handleCopy : undefined,
    copyLabel: 'نسخ النتيجة',
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Input Card */}
      <div className="lg:col-span-5 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6 space-y-5 self-start">
        <div>
          <label
            htmlFor="age-birth-date"
            className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-2"
          >
            تاريخ الميلاد
          </label>
          <input
            id="age-birth-date"
            type="date"
            dir="ltr"
            max={maxDateIso}
            value={birthDateInput}
            onChange={(e) => setBirthDateInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] font-mono-num text-base focus:outline-none focus:border-[#65A30D] dark:focus:border-[#A3E635]"
          />
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F4F8F5] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1B3B2D] text-xs text-[#466355] dark:text-[#9BB5A6]">
          <Calendar className="w-4 h-4 text-[#4D7C0F] dark:text-[#A3E635] shrink-0" />
          <span>
            التاريخ المحلي اليوم:{' '}
            <strong className="text-[#081E15] dark:text-[#F2F7F4]">
              {formatCalendarDateArabic(localToday)}
            </strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result.valid}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45 whitespace-nowrap"
          >
            <Copy className="w-4 h-4 shrink-0" />
            <span>نسخ النتيجة</span>
          </button>

          <PdfExportButton
            disabled={!result.valid}
            onNotify={onNotify}
            buildReport={() => {
              if (!result.valid) return null;
              return {
                filename: 'daq-age-report.pdf',
                titleAr: 'تقرير حساب العمر الدقيق',
                subtitleAr: formatCurrentTimestampAr(),
                metrics: [
                  {
                    label: 'العمر الدقيق',
                    value: `${result.years} سنة · ${result.months} شهر · ${result.days} يوم`,
                    accent: 'lime',
                  },
                  {
                    label: 'إجمالي الأيام التي عشتها',
                    value: `${result.totalDaysLived.toLocaleString('en-US')} يوم`,
                    accent: 'purple',
                  },
                  {
                    label: 'الأسابيع التقريبية',
                    value: `${result.totalWeeks.toLocaleString('en-US')} أسبوع و ${result.remainingWeekDays} يوم`,
                  },
                  {
                    label: 'المتبقي لعيد الميلاد القادم',
                    value: `${result.nextBirthday.totalDaysRemaining} يوم (${result.nextBirthday.weekdayAr})`,
                  },
                ],
                sections: [
                  {
                    title: 'تفاصيل التواريخ',
                    lines: [
                      { text: `تاريخ الميلاد: ${formatCalendarDateArabic(result.birthDate)}` },
                      { text: `تاريخ الحساب (التقويم المحلي): ${formatCalendarDateArabic(result.referenceDate)}` },
                      {
                        text: `موعد عيد الميلاد القادم: ${result.nextBirthday.dateFormattedAr} (${result.nextBirthday.weekdayAr}) — متبقي ${result.nextBirthday.monthsRemaining} شهر و ${result.nextBirthday.daysRemaining} يوم`,
                      },
                    ],
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

      {/* Output Panel */}
      <div className="lg:col-span-7 rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-4 sm:p-6">
        {!result.valid ? (
          birthDateInput.trim() === '' ? (
            <div className="text-center py-12 text-sm text-[#5B7869] dark:text-[#86A896]">
              اختر تاريخ ميلادك لعرض عمرك الدقيق وإجمالي الأيام وموعد عيد ميلادك القادم.
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
          <div className="space-y-5">
            {result.isBirthdayToday && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#A3E635]/20 border border-[#65A30D]/40 text-[#3F6212] dark:text-[#A3E635] text-sm font-bold">
                <Cake className="w-5 h-5 shrink-0" />
                <span>كل عام وأنت بخير! اليوم هو يوم ميلادك.</span>
              </div>
            )}

            {/* Main Y / M / D breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#EAF2EC] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1E4232] text-center">
                <div
                  data-testid="age-years"
                  className="font-mono-num text-2xl sm:text-4xl font-extrabold text-[#4D7C0F] dark:text-[#A3E635]"
                >
                  {result.years}
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#466355] dark:text-[#9BB5A6] mt-1">
                  سنة
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#EAF2EC] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1E4232] text-center">
                <div
                  data-testid="age-months"
                  className="font-mono-num text-2xl sm:text-4xl font-extrabold text-[#081E15] dark:text-[#F2F7F4]"
                >
                  {result.months}
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#466355] dark:text-[#9BB5A6] mt-1">
                  شهر
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#EAF2EC] dark:bg-[#081912] border border-[#D5E3D8] dark:border-[#1E4232] text-center">
                <div
                  data-testid="age-days"
                  className="font-mono-num text-2xl sm:text-4xl font-extrabold text-[#6D28D9] dark:text-[#C4B5FD]"
                >
                  {result.days}
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#466355] dark:text-[#9BB5A6] mt-1">
                  يوم
                </div>
              </div>
            </div>

            {/* Extended Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#081912]/70">
                <div className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-1">
                  إجمالي الأيام التي عشتها
                </div>
                <div
                  data-testid="age-total-days"
                  className="font-mono-num text-xl font-extrabold text-[#081E15] dark:text-[#F2F7F4]"
                >
                  {result.totalDaysLived.toLocaleString('en-US')} يوم
                </div>
                <div className="text-xs text-[#5B7869] dark:text-[#86A896] mt-1 font-mono-num">
                  {result.totalWeeks.toLocaleString('en-US')} أسبوع و {result.remainingWeekDays} أيام
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-[#F4F8F5] dark:bg-[#081912]/70">
                <div className="text-xs font-semibold text-[#5B7869] dark:text-[#86A896] mb-1">
                  المتبقي لعيد الميلاد القادم
                </div>
                <div
                  data-testid="age-next-birthday"
                  className="font-mono-num text-xl font-extrabold text-[#6D28D9] dark:text-[#C4B5FD]"
                >
                  {result.nextBirthday.monthsRemaining} شهر و {result.nextBirthday.daysRemaining} يوم
                </div>
                <div className="text-xs text-[#5B7869] dark:text-[#86A896] mt-1">
                  ({result.nextBirthday.totalDaysRemaining.toLocaleString('en-US')} يوم) · يوم{' '}
                  {result.nextBirthday.weekdayAr} {result.nextBirthday.dateFormattedAr}
                </div>
              </div>
            </div>

            {result.isLeapFeb29Birth && (
              <p className="text-xs text-[#5B7869] dark:text-[#86A896]">
                ملاحظة: مواليد 29 فبراير (سنة كبيسة) يُحتسب عيد ميلادهم في السنوات غير الكبيسة بتاريخ 1 مارس.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
