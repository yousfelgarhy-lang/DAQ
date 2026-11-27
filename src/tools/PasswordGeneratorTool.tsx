import { useMemo, useState } from 'react';
import { Copy, RefreshCw, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import {
  PasswordOptions,
  evaluatePasswordStrength,
  generateSecurePassword,
} from '../utils/passwordLogic';
import { useRegisterToolShortcuts } from '../hooks/useToolShortcuts';
import { ToastType } from '../types/tool';

interface PasswordGeneratorToolProps {
  onNotify: (message: string, type?: ToastType) => void;
}

const DEFAULT_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

export function PasswordGeneratorTool({ onNotify }: PasswordGeneratorToolProps) {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState<string>(() => {
    const res = generateSecurePassword(DEFAULT_OPTIONS);
    return res.valid ? res.password : '';
  });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const regenerateWith = (nextOptions: PasswordOptions) => {
    const res = generateSecurePassword(nextOptions);
    if (!res.valid) {
      setError(res.error);
      onNotify(res.error, 'error');
      return;
    }
    setError(null);
    setCopied(false);
    setPassword(res.password);
  };

  const handleToggleOption = (key: keyof Omit<PasswordOptions, 'length'>) => {
    const next = { ...options, [key]: !options[key] };
    setOptions(next);
    regenerateWith(next);
  };

  const handleLengthChange = (len: number) => {
    const next = { ...options, length: len };
    setOptions(next);
    regenerateWith(next);
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      onNotify('تم نسخ كلمة المرور إلى الحافظة', 'success');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('تعذّر النسخ التلقائي، يرجى النسخ يدوياً', 'error');
    }
  };

  useRegisterToolShortcuts({
    onExecute: () => regenerateWith(options),
    executeLabel: 'توليد كلمة مرور جديدة',
    onCopy: password ? handleCopy : undefined,
    copyLabel: 'نسخ كلمة المرور',
  });

  const strengthColors = {
    weak: 'bg-rose-500 text-rose-700 dark:text-rose-400',
    fair: 'bg-amber-500 text-amber-700 dark:text-amber-400',
    strong: 'bg-[#65A30D] dark:bg-[#A3E635] text-[#4D7C0F] dark:text-[#A3E635]',
    'very-strong': 'bg-emerald-500 dark:bg-[#A3E635] text-emerald-700 dark:text-[#A3E635]',
  }[strength.level];

  const barFillClass = strengthColors.split(' ')[0];
  const textToneClass = strengthColors.split(' ').slice(1).join(' ');

  return (
    <div className="space-y-6">
      {/* Generated Password Display */}
      <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div
            dir="ltr"
            data-testid="generated-password-output"
            className="flex-1 min-w-0 px-4 py-3.5 rounded-xl border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] font-mono-num text-base sm:text-xl font-bold text-[#081E15] dark:text-[#F2F7F4] break-all select-all text-center sm:text-start"
          >
            {password || '—'}
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => regenerateWith(options)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold border border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D] dark:hover:border-[#A3E635] transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>توليد جديد</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!password}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl text-sm font-bold bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-45 whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
              <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
            </button>
          </div>
        </div>

        {/* Strength Indicator */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-[#081E15] dark:text-[#F2F7F4]">
              <ShieldCheck className={`w-4 h-4 shrink-0 ${textToneClass}`} />
              <span>القوة:</span>
              <span data-testid="password-strength-label" className={textToneClass}>
                {strength.labelAr}
              </span>
            </div>
            <span className="font-mono-num text-xs text-[#5B7869] dark:text-[#86A896]">
              {strength.entropyBits} bit · {strength.varietyCount}/4 أنواع أحرف
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-[#EAF2EC] dark:bg-[#143326] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${barFillClass}`}
              style={{ width: `${strength.score}%` }}
            />
          </div>

          <p className="text-xs text-[#466355] dark:text-[#9BB5A6]">{strength.tipAr}</p>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="rounded-2xl border border-[#D5E3D8] dark:border-[#1B3B2D] bg-white dark:bg-[#0D231A] p-5 sm:p-7 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label
              htmlFor="password-length-slider"
              className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]"
            >
              طول كلمة المرور
            </label>
            <span
              data-testid="password-length-value"
              className="font-mono-num text-base font-extrabold text-[#4D7C0F] dark:text-[#A3E635]"
            >
              {options.length} حرف
            </span>
          </div>

          <input
            id="password-length-slider"
            type="range"
            min={6}
            max={64}
            value={options.length}
            onChange={(e) => handleLengthChange(Number(e.target.value))}
            className="w-full accent-[#65A30D] dark:accent-[#A3E635] cursor-pointer"
          />

          <div className="flex flex-wrap gap-2 mt-3">
            {[8, 12, 16, 24, 32].map((presetLen) => (
              <button
                key={presetLen}
                type="button"
                onClick={() => handleLengthChange(presetLen)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer font-mono-num ${
                  options.length === presetLen
                    ? 'bg-[#0B2218] dark:bg-[#A3E635] text-[#F2F7F4] dark:text-[#06140E] border-transparent'
                    : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912] text-[#081E15] dark:text-[#F2F7F4] hover:border-[#65A30D]'
                }`}
              >
                {presetLen}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-bold text-[#081E15] dark:text-[#F2F7F4] mb-3">
            نوع الأحرف المشمولة
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { key: 'uppercase' as const, label: 'أحرف كبيرة', sample: 'A-Z' },
              { key: 'lowercase' as const, label: 'أحرف صغيرة', sample: 'a-z' },
              { key: 'numbers' as const, label: 'أرقام', sample: '0-9' },
              { key: 'symbols' as const, label: 'رموز خاصة', sample: '!@#$%' },
            ].map((item) => {
              const checked = options[item.key];
              return (
                <label
                  key={item.key}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    checked
                      ? 'border-[#65A30D] dark:border-[#A3E635] bg-[#EAF2EC]/70 dark:bg-[#122E22]'
                      : 'border-[#D5E3D8] dark:border-[#1E4232] bg-[#F4F8F5] dark:bg-[#081912]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleOption(item.key)}
                      className="w-4 h-4 accent-[#65A30D] dark:accent-[#A3E635] cursor-pointer"
                    />
                    <span className="text-sm font-bold text-[#081E15] dark:text-[#F2F7F4]">
                      {item.label}
                    </span>
                  </div>
                  <span dir="ltr" className="font-mono-num text-xs text-[#5B7869] dark:text-[#86A896]">
                    {item.sample}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-[#5B7869] dark:text-[#86A896] pt-2 border-t border-[#EAF2EC] dark:border-[#183528]">
          يتم التوليد محلياً عبر واجهة <span dir="ltr" className="font-mono-num font-semibold">crypto.getRandomValues()</span> ولا يتم حفظ أي كلمة مرور في المتصفح أو إرسالها لأي جهة.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm font-semibold"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
