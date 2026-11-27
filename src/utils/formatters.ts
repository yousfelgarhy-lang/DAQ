export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 بايت';
  const units = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const formatted = i === 0 ? Math.round(value).toString() : value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2);
  return `${formatted} ${units[i]}`;
}

export function formatEGP(amount: number): string {
  if (!Number.isFinite(amount)) return '0.00 ج.م';
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ج.م`;
}

export function formatNumber(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function calculateCompressionPercent(originalBytes: number, compressedBytes: number): number {
  if (!Number.isFinite(originalBytes) || originalBytes <= 0) return 0;
  const pct = ((originalBytes - compressedBytes) / originalBytes) * 100;
  return Math.round(pct * 10) / 10;
}

export function calculateResizedDimensions(
  origWidth: number,
  origHeight: number,
  changedAxis: 'width' | 'height',
  newValue: number,
  lockAspect: boolean,
  currentOther: number
): { width: number; height: number } {
  const safeValue = Math.max(1, Math.round(newValue || 1));
  if (!lockAspect || origWidth <= 0 || origHeight <= 0) {
    return changedAxis === 'width'
      ? { width: safeValue, height: Math.max(1, Math.round(currentOther || 1)) }
      : { width: Math.max(1, Math.round(currentOther || 1)), height: safeValue };
  }
  const ratio = origWidth / origHeight;
  if (changedAxis === 'width') {
    return {
      width: safeValue,
      height: Math.max(1, Math.round(safeValue / ratio)),
    };
  }
  return {
    width: Math.max(1, Math.round(safeValue * ratio)),
    height: safeValue,
  };
}
