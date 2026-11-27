export interface CalendarDateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export type AgeCalculationResult =
  | {
      valid: true;
      birthDate: CalendarDateParts;
      referenceDate: CalendarDateParts;
      years: number;
      months: number;
      days: number;
      totalDaysLived: number;
      totalWeeks: number;
      remainingWeekDays: number;
      totalMonthsApprox: number;
      totalHoursApprox: number;
      isBirthdayToday: boolean;
      isLeapFeb29Birth: boolean;
      nextBirthday: {
        date: CalendarDateParts;
        dateFormattedAr: string;
        weekdayAr: string;
        monthsRemaining: number;
        daysRemaining: number;
        totalDaysRemaining: number;
      };
    }
  | {
      valid: false;
      error: string;
    };

const ARABIC_WEEKDAYS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month1Based: number): number {
  const m = ((month1Based - 1) % 12 + 12) % 12 + 1;
  switch (m) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

export function getLocalTodayParts(now: Date = new Date()): CalendarDateParts {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

export function formatCalendarDateISO(parts: CalendarDateParts): string {
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatCalendarDateArabic(parts: CalendarDateParts): string {
  return `${parts.day} ${ARABIC_MONTHS[parts.month - 1]} ${parts.year}`;
}

export function parseCalendarDate(dateStr: string): CalendarDateParts | null {
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1850 || year > 2500 || month < 1 || month > 12) return null;
  const maxDay = daysInMonth(year, month);
  if (day < 1 || day > maxDay) return null;
  return { year, month, day };
}

function compareCalendarDates(a: CalendarDateParts, b: CalendarDateParts): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function diffInCalendarDays(from: CalendarDateParts, to: CalendarDateParts): number {
  const utcFrom = Date.UTC(from.year, from.month - 1, from.day);
  const utcTo = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((utcTo - utcFrom) / 86_400_000);
}

function addClampedMonths(from: CalendarDateParts, monthsToAdd: number): CalendarDateParts {
  const zeroBasedMonth = from.month - 1 + monthsToAdd;
  const targetYear = from.year + Math.floor(zeroBasedMonth / 12);
  const targetMonth = ((zeroBasedMonth % 12) + 12) % 12 + 1;
  const maxDay = daysInMonth(targetYear, targetMonth);
  return {
    year: targetYear,
    month: targetMonth,
    day: Math.min(from.day, maxDay),
  };
}

function diffCalendarYMD(
  from: CalendarDateParts,
  to: CalendarDateParts
): { years: number; months: number; days: number } {
  let totalMonths = (to.year - from.year) * 12 + (to.month - from.month);
  let anchor = addClampedMonths(from, totalMonths);

  if (compareCalendarDates(anchor, to) > 0) {
    totalMonths -= 1;
    anchor = addClampedMonths(from, totalMonths);
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const days = diffInCalendarDays(anchor, to);

  return { years, months, days };
}

function resolveBirthdayInYear(birth: CalendarDateParts, targetYear: number): CalendarDateParts {
  // If born on Feb 29, celebrate on Feb 29 in leap years and Mar 1 in non-leap years
  if (birth.month === 2 && birth.day === 29 && !isLeapYear(targetYear)) {
    return { year: targetYear, month: 3, day: 1 };
  }
  return { year: targetYear, month: birth.month, day: birth.day };
}

export function calculateAge(
  birthDateStr: string,
  referenceDate: CalendarDateParts = getLocalTodayParts()
): AgeCalculationResult {
  if (!birthDateStr.trim()) {
    return { valid: false, error: 'يرجى إدخال تاريخ الميلاد لحساب العمر.' };
  }

  const birth = parseCalendarDate(birthDateStr);
  if (!birth) {
    return { valid: false, error: 'تاريخ الميلاد غير صالح. يرجى التأكد من اليوم والشهر والسنة.' };
  }

  if (compareCalendarDates(birth, referenceDate) > 0) {
    return { valid: false, error: 'لا يمكن أن يكون تاريخ الميلاد في المستقبل.' };
  }

  const { years, months, days } = diffCalendarYMD(birth, referenceDate);
  const totalDaysLived = diffInCalendarDays(birth, referenceDate);
  const totalWeeks = Math.floor(totalDaysLived / 7);
  const remainingWeekDays = totalDaysLived % 7;

  const birthInRefYear = resolveBirthdayInYear(birth, referenceDate.year);
  const isBirthdayToday = compareCalendarDates(birthInRefYear, referenceDate) === 0;

  let nextBirthdayDate: CalendarDateParts;
  if (isBirthdayToday) {
    nextBirthdayDate = resolveBirthdayInYear(birth, referenceDate.year + 1);
  } else if (compareCalendarDates(birthInRefYear, referenceDate) > 0) {
    nextBirthdayDate = birthInRefYear;
  } else {
    nextBirthdayDate = resolveBirthdayInYear(birth, referenceDate.year + 1);
  }

  const nextRemainingYMD = diffCalendarYMD(referenceDate, nextBirthdayDate);
  const totalDaysRemaining = diffInCalendarDays(referenceDate, nextBirthdayDate);
  const weekdayIdx = new Date(
    Date.UTC(nextBirthdayDate.year, nextBirthdayDate.month - 1, nextBirthdayDate.day)
  ).getUTCDay();

  return {
    valid: true,
    birthDate: birth,
    referenceDate,
    years,
    months,
    days,
    totalDaysLived,
    totalWeeks,
    remainingWeekDays,
    totalMonthsApprox: years * 12 + months,
    totalHoursApprox: totalDaysLived * 24,
    isBirthdayToday,
    isLeapFeb29Birth: birth.month === 2 && birth.day === 29,
    nextBirthday: {
      date: nextBirthdayDate,
      dateFormattedAr: formatCalendarDateArabic(nextBirthdayDate),
      weekdayAr: ARABIC_WEEKDAYS[weekdayIdx],
      monthsRemaining: nextRemainingYMD.months,
      daysRemaining: nextRemainingYMD.days,
      totalDaysRemaining,
    },
  };
}
