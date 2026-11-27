export type UnitCategoryId =
  | 'length'
  | 'weight'
  | 'temperature'
  | 'area'
  | 'volume'
  | 'speed'
  | 'data';

export interface UnitDefinition {
  id: string;
  nameAr: string;
  symbol: string;
  /** Ratio to category's base unit (unused for temperature) */
  toBaseFactor: number;
}

export interface UnitCategoryDefinition {
  id: UnitCategoryId;
  nameAr: string;
  defaultFrom: string;
  defaultTo: string;
  units: UnitDefinition[];
}

export const UNIT_CATEGORIES: UnitCategoryDefinition[] = [
  {
    id: 'length',
    nameAr: 'الطول',
    defaultFrom: 'm',
    defaultTo: 'km',
    units: [
      { id: 'mm', nameAr: 'مليمتر', symbol: 'mm', toBaseFactor: 0.001 },
      { id: 'cm', nameAr: 'سنتيمتر', symbol: 'cm', toBaseFactor: 0.01 },
      { id: 'm', nameAr: 'متر', symbol: 'm', toBaseFactor: 1 },
      { id: 'km', nameAr: 'كيلومتر', symbol: 'km', toBaseFactor: 1000 },
      { id: 'in', nameAr: 'بوصة', symbol: 'in', toBaseFactor: 0.0254 },
      { id: 'ft', nameAr: 'قدم', symbol: 'ft', toBaseFactor: 0.3048 },
      { id: 'yd', nameAr: 'ياردة', symbol: 'yd', toBaseFactor: 0.9144 },
      { id: 'mi', nameAr: 'ميل', symbol: 'mi', toBaseFactor: 1609.344 },
    ],
  },
  {
    id: 'weight',
    nameAr: 'الوزن',
    defaultFrom: 'kg',
    defaultTo: 'lb',
    units: [
      { id: 'mg', nameAr: 'مليجرام', symbol: 'mg', toBaseFactor: 0.000001 },
      { id: 'g', nameAr: 'جرام', symbol: 'g', toBaseFactor: 0.001 },
      { id: 'kg', nameAr: 'كيلوجرام', symbol: 'kg', toBaseFactor: 1 },
      { id: 't', nameAr: 'طن متري', symbol: 't', toBaseFactor: 1000 },
      { id: 'oz', nameAr: 'أونصة', symbol: 'oz', toBaseFactor: 0.028349523125 },
      { id: 'lb', nameAr: 'رطل (باوند)', symbol: 'lb', toBaseFactor: 0.45359237 },
    ],
  },
  {
    id: 'temperature',
    nameAr: 'درجة الحرارة',
    defaultFrom: 'C',
    defaultTo: 'F',
    units: [
      { id: 'C', nameAr: 'درجة مئوية (سيلسيوس)', symbol: '°C', toBaseFactor: 1 },
      { id: 'F', nameAr: 'فهرنهايت', symbol: '°F', toBaseFactor: 1 },
      { id: 'K', nameAr: 'كلفن', symbol: 'K', toBaseFactor: 1 },
    ],
  },
  {
    id: 'area',
    nameAr: 'المساحة',
    defaultFrom: 'm2',
    defaultTo: 'ft2',
    units: [
      { id: 'cm2', nameAr: 'سنتيمتر مربع', symbol: 'cm²', toBaseFactor: 0.0001 },
      { id: 'm2', nameAr: 'متر مربع', symbol: 'm²', toBaseFactor: 1 },
      { id: 'km2', nameAr: 'كيلومتر مربع', symbol: 'km²', toBaseFactor: 1_000_000 },
      { id: 'ft2', nameAr: 'قدم مربع', symbol: 'ft²', toBaseFactor: 0.09290304 },
      { id: 'acre', nameAr: 'أكر (Acre)', symbol: 'acre', toBaseFactor: 4046.8564224 },
      { id: 'feddan', nameAr: 'فدان', symbol: 'فدان', toBaseFactor: 4200.833333333333 },
      { id: 'ha', nameAr: 'هكتار', symbol: 'ha', toBaseFactor: 10_000 },
    ],
  },
  {
    id: 'volume',
    nameAr: 'الحجم',
    defaultFrom: 'L',
    defaultTo: 'mL',
    units: [
      { id: 'mL', nameAr: 'مليلتر', symbol: 'mL', toBaseFactor: 0.001 },
      { id: 'L', nameAr: 'لتر', symbol: 'L', toBaseFactor: 1 },
      { id: 'm3', nameAr: 'متر مكعب', symbol: 'm³', toBaseFactor: 1000 },
      { id: 'cup', nameAr: 'كوب قياسي', symbol: 'cup', toBaseFactor: 0.2365882365 },
      { id: 'floz', nameAr: 'أونصة سائلة (US)', symbol: 'fl oz', toBaseFactor: 0.0295735295625 },
      { id: 'gal', nameAr: 'جالون أمريكي', symbol: 'gal', toBaseFactor: 3.785411784 },
    ],
  },
  {
    id: 'speed',
    nameAr: 'السرعة',
    defaultFrom: 'kmh',
    defaultTo: 'mph',
    units: [
      { id: 'mps', nameAr: 'متر / ثانية', symbol: 'm/s', toBaseFactor: 1 },
      { id: 'kmh', nameAr: 'كيلومتر / ساعة', symbol: 'km/h', toBaseFactor: 1 / 3.6 },
      { id: 'mph', nameAr: 'ميل / ساعة', symbol: 'mph', toBaseFactor: 0.44704 },
      { id: 'knot', nameAr: 'عقدة بحرية', symbol: 'kn', toBaseFactor: 0.5144444444444445 },
    ],
  },
  {
    id: 'data',
    nameAr: 'تخزين البيانات',
    defaultFrom: 'GB',
    defaultTo: 'MB',
    units: [
      { id: 'bit', nameAr: 'بت (Bit)', symbol: 'bit', toBaseFactor: 0.125 },
      { id: 'B', nameAr: 'بايت (Byte)', symbol: 'B', toBaseFactor: 1 },
      { id: 'KB', nameAr: 'كيلوبايت (1024 B)', symbol: 'KB', toBaseFactor: 1024 },
      { id: 'MB', nameAr: 'ميجابايت (1024 KB)', symbol: 'MB', toBaseFactor: 1024 ** 2 },
      { id: 'GB', nameAr: 'جيجابايت (1024 MB)', symbol: 'GB', toBaseFactor: 1024 ** 3 },
      { id: 'TB', nameAr: 'تيرابايت (1024 GB)', symbol: 'TB', toBaseFactor: 1024 ** 4 },
    ],
  },
];

export type UnitConversionResult =
  | {
      valid: true;
      value: number;
      formatted: string;
    }
  | {
      valid: false;
      error: string;
    };

export function convertTemperature(value: number, fromId: string, toId: string): number {
  let celsius: number;
  if (fromId === 'C') {
    celsius = value;
  } else if (fromId === 'F') {
    celsius = ((value - 32) * 5) / 9;
  } else if (fromId === 'K') {
    celsius = value - 273.15;
  } else {
    throw new Error('وحدة حرارة غير معروفة');
  }

  if (toId === 'C') return celsius;
  if (toId === 'F') return (celsius * 9) / 5 + 32;
  if (toId === 'K') return celsius + 273.15;
  throw new Error('وحدة حرارة غير معروفة');
}

export function formatConvertedValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  // Clean floating point noise near zero
  const normalized = Math.abs(value) < 1e-12 ? 0 : value;
  if (normalized === 0) return '0';

  const abs = Math.abs(normalized);
  if (abs >= 1e14 || abs < 1e-7) {
    return normalized.toExponential(6).replace(/\.?0+e/, 'e');
  }

  // Preserve meaningful precision for small numbers while keeping normal values tidy
  let decimals: number;
  if (abs >= 1000) decimals = 4;
  else if (abs >= 1) decimals = 6;
  else if (abs >= 0.001) decimals = 7;
  else decimals = 10;

  const fixed = Number(normalized.toFixed(decimals));
  // Avoid grouping commas if too small; format nicely for readability
  if (Math.abs(fixed) >= 1) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: decimals,
    }).format(fixed);
  }
  return fixed.toString();
}

export function convertUnitValue(
  categoryId: UnitCategoryId,
  fromUnitId: string,
  toUnitId: string,
  rawInput: string
): UnitConversionResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, error: 'أدخل قيمة رقمية للتحويل.' };
  }

  const numericValue = Number(trimmed);
  if (!Number.isFinite(numericValue)) {
    return { valid: false, error: 'القيمة المدخلة غير صالحة أو خارج النطاق الحسابي.' };
  }

  const category = UNIT_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) {
    return { valid: false, error: 'فئة التحويل غير موجودة.' };
  }

  if (categoryId === 'temperature') {
    const kelvinCheck =
      fromUnitId === 'K'
        ? numericValue
        : fromUnitId === 'C'
        ? numericValue + 273.15
        : ((numericValue - 32) * 5) / 9 + 273.15;
    if (kelvinCheck < -1e-9) {
      return {
        valid: false,
        error: 'درجة الحرارة أقل من الصفر المطلق (−273.15°C / 0 K) غير ممكنة فيزيائياً.',
      };
    }

    const converted = convertTemperature(numericValue, fromUnitId, toUnitId);
    if (!Number.isFinite(converted)) {
      return { valid: false, error: 'النتيجة خارج النطاق الرقمي المسموح.' };
    }
    return {
      valid: true,
      value: converted,
      formatted: formatConvertedValue(converted),
    };
  }

  if (numericValue < 0) {
    return { valid: false, error: 'لا يمكن إدخال قيمة سالبة في هذه الفئة.' };
  }

  const fromUnit = category.units.find((u) => u.id === fromUnitId);
  const toUnit = category.units.find((u) => u.id === toUnitId);
  if (!fromUnit || !toUnit) {
    return { valid: false, error: 'وحدة القياس المحددة غير صالحة.' };
  }

  const baseValue = numericValue * fromUnit.toBaseFactor;
  const converted = fromUnit.id === toUnit.id ? numericValue : baseValue / toUnit.toBaseFactor;

  if (!Number.isFinite(converted)) {
    return { valid: false, error: 'النتيجة خارج النطاق الرقمي المسموح.' };
  }

  return {
    valid: true,
    value: converted,
    formatted: formatConvertedValue(converted),
  };
}
