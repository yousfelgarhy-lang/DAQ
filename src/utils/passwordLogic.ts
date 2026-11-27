export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export type PasswordStrengthLevel = 'weak' | 'fair' | 'strong' | 'very-strong';

export interface PasswordStrengthResult {
  score: number; // 0 to 100
  level: PasswordStrengthLevel;
  labelAr: string;
  entropyBits: number;
  varietyCount: number;
  tipAr: string;
}

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
} as const;

/**
 * Returns an unbiased cryptographically secure random integer in [0, max).
 * Uses rejection sampling over crypto.getRandomValues to prevent modulo bias.
 */
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error('Invalid upper bound for secureRandomInt');
  }
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('واجهة crypto.getRandomValues غير مدعومة في هذا المتصفح.');
  }
  const range = 0x100000000;
  const limit = range - (range % max);
  const buf = new Uint32Array(1);
  while (true) {
    cryptoObj.getRandomValues(buf);
    if (buf[0] < limit) {
      return buf[0] % max;
    }
  }
}

export function generateSecurePassword(
  options: PasswordOptions
): { valid: true; password: string } | { valid: false; error: string } {
  const { length, uppercase, lowercase, numbers, symbols } = options;

  if (!Number.isInteger(length) || length < 4 || length > 128) {
    return { valid: false, error: 'يجب أن يكون طول كلمة المرور بين 4 و 128 حرفاً.' };
  }

  const activePools: string[] = [];
  if (uppercase) activePools.push(CHAR_SETS.uppercase);
  if (lowercase) activePools.push(CHAR_SETS.lowercase);
  if (numbers) activePools.push(CHAR_SETS.numbers);
  if (symbols) activePools.push(CHAR_SETS.symbols);

  if (activePools.length === 0) {
    return { valid: false, error: 'يرجى اختيار نوع واحد على الأقل من الأحرف أو الأرقام أو الرموز.' };
  }

  const fullPool = activePools.join('');
  const chars: string[] = [];

  // Ensure at least 1 character from each selected pool when length permits
  for (let i = 0; i < activePools.length && chars.length < length; i++) {
    const pool = activePools[i];
    chars.push(pool[secureRandomInt(pool.length)]);
  }

  while (chars.length < length) {
    chars.push(fullPool[secureRandomInt(fullPool.length)]);
  }

  // Cryptographic Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return { valid: true, password: chars.join('') };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      level: 'weak',
      labelAr: 'غير مولّدة',
      entropyBits: 0,
      varietyCount: 0,
      tipAr: 'اضغط على زر التوليد لإنشاء كلمة مرور عشوائية آمنة.',
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  let poolSize = 0;
  let varietyCount = 0;
  if (hasUpper) {
    poolSize += 26;
    varietyCount += 1;
  }
  if (hasLower) {
    poolSize += 26;
    varietyCount += 1;
  }
  if (hasNumber) {
    poolSize += 10;
    varietyCount += 1;
  }
  if (hasSymbol) {
    poolSize += 26;
    varietyCount += 1;
  }

  const entropyBits = Math.round(password.length * Math.log2(Math.max(poolSize, 1)));

  let level: PasswordStrengthLevel;
  let labelAr: string;
  let tipAr: string;

  if (entropyBits < 40 || password.length < 8) {
    level = 'weak';
    labelAr = 'ضعيفة';
    tipAr = 'يُنصح بزيادة الطول إلى 12 حرفاً على الأقل وتنويع الأحرف والرموز.';
  } else if (entropyBits < 60 || varietyCount < 2) {
    level = 'fair';
    labelAr = 'متوسطة';
    tipAr = 'جيدة للحسابات العادية؛ أضف رموزاً أو ارفع الطول إلى 14+ لحماية أعلى.';
  } else if (entropyBits < 85) {
    level = 'strong';
    labelAr = 'قوية';
    tipAr = 'مناسبة لمعظم الحسابات الشخصية والعملية بتنوع جيد وطول آمن.';
  } else {
    level = 'very-strong';
    labelAr = 'قوية جداً';
    tipAr = 'درجة أمان عالية جداً يصعب تخمينها أو كسرها.';
  }

  const score = Math.min(100, Math.max(8, Math.round((entropyBits / 100) * 100)));

  return {
    score,
    level,
    labelAr,
    entropyBits,
    varietyCount,
    tipAr,
  };
}
