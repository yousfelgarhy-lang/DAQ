export interface DiscountResult {
  valid: boolean;
  error?: string;
  originalPrice: number;
  discountPercent: number;
  savedAmount: number;
  finalPrice: number;
}

export function calculateDiscount(originalPrice: number, discountPercent: number): DiscountResult {
  if (!Number.isFinite(originalPrice) || originalPrice < 0) {
    return {
      valid: false,
      error: 'يرجى إدخال سعر أصلي صحيح أكبر من أو يساوي صفر.',
      originalPrice: 0,
      discountPercent: 0,
      savedAmount: 0,
      finalPrice: 0,
    };
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return {
      valid: false,
      error: 'نسبة الخصم يجب أن تكون بين 0% و 100%.',
      originalPrice,
      discountPercent: 0,
      savedAmount: 0,
      finalPrice: originalPrice,
    };
  }
  const savedAmount = Math.round(originalPrice * (discountPercent / 100) * 100) / 100;
  const finalPrice = Math.round((originalPrice - savedAmount) * 100) / 100;
  return {
    valid: true,
    originalPrice,
    discountPercent,
    savedAmount,
    finalPrice,
  };
}

export interface PercentageCalculationResult {
  valid: boolean;
  error?: string;
  value: number;
}

// Mode 1: What is X% of Y?
export function calculatePercentageOf(percent: number, total: number): PercentageCalculationResult {
  if (!Number.isFinite(percent) || !Number.isFinite(total)) {
    return { valid: false, error: 'يرجى إدخال أرقام صحيحة في جميع الحقول.', value: 0 };
  }
  return {
    valid: true,
    value: Math.round(((percent / 100) * total) * 10000) / 10000,
  };
}

// Mode 2: Percentage change from A to B
export function calculatePercentageChange(fromValue: number, toValue: number): PercentageCalculationResult {
  if (!Number.isFinite(fromValue) || !Number.isFinite(toValue)) {
    return { valid: false, error: 'يرجى إدخال قيم رقمية صحيحة.', value: 0 };
  }
  if (fromValue === 0) {
    return { valid: false, error: 'لا يمكن حساب نسبة التغير عندما تكون القيمة الابتدائية صفراً.', value: 0 };
  }
  const change = ((toValue - fromValue) / Math.abs(fromValue)) * 100;
  return {
    valid: true,
    value: Math.round(change * 100) / 100,
  };
}

// Mode 3: X is what % of Y?
export function calculateWhatPercentage(part: number, whole: number): PercentageCalculationResult {
  if (!Number.isFinite(part) || !Number.isFinite(whole)) {
    return { valid: false, error: 'يرجى إدخال قيم رقمية صحيحة.', value: 0 };
  }
  if (whole === 0) {
    return { valid: false, error: 'لا يمكن القسمة على صفر في القيمة الإجمالية.', value: 0 };
  }
  const pct = (part / whole) * 100;
  return {
    valid: true,
    value: Math.round(pct * 100) / 100,
  };
}

export interface BillSplitResult {
  valid: boolean;
  error?: string;
  subtotal: number;
  tipPercent: number;
  tipAmount: number;
  totalWithTip: number;
  perPerson: number;
  peopleCount: number;
}

export function calculateBillSplit(
  billAmount: number,
  peopleCount: number,
  tipPercent = 0
): BillSplitResult {
  if (!Number.isFinite(billAmount) || billAmount < 0) {
    return {
      valid: false,
      error: 'يرجى إدخال قيمة فاتورة صحيحة أكبر من أو تساوي صفر.',
      subtotal: 0,
      tipPercent: 0,
      tipAmount: 0,
      totalWithTip: 0,
      perPerson: 0,
      peopleCount: 1,
    };
  }
  if (!Number.isFinite(peopleCount) || peopleCount < 1 || !Number.isInteger(peopleCount)) {
    return {
      valid: false,
      error: 'عدد الأشخاص يجب أن يكون رقماً صحيحاً لا يقل عن 1.',
      subtotal: billAmount,
      tipPercent,
      tipAmount: 0,
      totalWithTip: billAmount,
      perPerson: billAmount,
      peopleCount: 1,
    };
  }
  if (!Number.isFinite(tipPercent) || tipPercent < 0 || tipPercent > 200) {
    return {
      valid: false,
      error: 'نسبة الإكرامية يجب أن تكون بين 0% و 200%.',
      subtotal: billAmount,
      tipPercent: 0,
      tipAmount: 0,
      totalWithTip: billAmount,
      perPerson: billAmount / peopleCount,
      peopleCount,
    };
  }

  const tipAmount = Math.round(billAmount * (tipPercent / 100) * 100) / 100;
  const totalWithTip = Math.round((billAmount + tipAmount) * 100) / 100;
  const perPerson = Math.round((totalWithTip / peopleCount) * 100) / 100;

  return {
    valid: true,
    subtotal: billAmount,
    tipPercent,
    tipAmount,
    totalWithTip,
    perPerson,
    peopleCount,
  };
}
