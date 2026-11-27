export interface QrInputValidationResult {
  valid: boolean;
  value: string;
  isUrl: boolean;
  wasNormalized: boolean;
  error?: string;
}

const MAX_QR_LENGTH = 1800;

// Matches bare domains like google.com, www.youtube.com/watch?v=123, sub.domain.co.uk:8080/path?q=1
const BARE_DOMAIN_RE =
  /^(?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+(?::\d{1,5})?(?:[/?#][^\s]*)?$/;

// Detects obvious broken URL attempts like "http://", "https:// ", "ht tp://foo.com", "https://.com"
const SCHEME_PREFIX_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;
const BROKEN_SCHEME_RE = /^(?:ht\s*tps?|ftp)\s*:\/\//i;

function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) return false;
  if (hostname.includes('..') || hostname.startsWith('.') || hostname.endsWith('.')) return false;
  if (hostname === 'localhost') return true;
  // IPv4 or IPv6
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.startsWith('[') && hostname.endsWith(']')) return true;
  // Must have at least one dot and valid domain labels
  const labels = hostname.split('.');
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (tld.length < 2) return false;
  return labels.every(
    (label) => label.length >= 1 && label.length <= 63 && !label.startsWith('-') && !label.endsWith('-')
  );
}

export function validateAndNormalizeQrInput(rawInput: string): QrInputValidationResult {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return {
      valid: false,
      value: '',
      isUrl: false,
      wasNormalized: false,
      error: 'يرجى إدخال نص أو رابط صالح لتوليد رمز QR.',
    };
  }

  if (trimmed.length > MAX_QR_LENGTH) {
    return {
      valid: false,
      value: '',
      isUrl: false,
      wasNormalized: false,
      error: 'النص طويل جداً (الحد الأقصى 1800 حرف لضمان وضوح رمز QR).',
    };
  }

  // Case 1: Explicit scheme (http://, https://, etc.) or malformed scheme with whitespace
  if (SCHEME_PREFIX_RE.test(trimmed) || BROKEN_SCHEME_RE.test(trimmed)) {
    // Reject spaces inside the scheme or authority before first path/query/hash
    const withoutScheme = trimmed.replace(/^[a-zA-Z0-9+.\s-]*:\/\//, '');
    const authority = withoutScheme.split(/[/?#]/)[0];

    if (!authority || /\s/.test(authority)) {
      return {
        valid: false,
        value: '',
        isUrl: true,
        wasNormalized: false,
        error: 'صيغة الرابط غير صالحة. تأكد من كتابة النطاق بشكل صحيح مثل https://google.com.',
      };
    }

    try {
      const parsed = new URL(trimmed);
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        !isValidHostname(parsed.hostname)
      ) {
        return {
          valid: false,
          value: '',
          isUrl: true,
          wasNormalized: false,
          error: 'اسم النطاق في الرابط غير صالح. مثال صحيح: https://www.youtube.com.',
        };
      }
      return {
        valid: true,
        value: trimmed,
        isUrl: true,
        wasNormalized: false,
      };
    } catch {
      return {
        valid: false,
        value: '',
        isUrl: true,
        wasNormalized: false,
        error: 'تعذّر قراءة الرابط. تأكد من صحة العنوان مثل https://google.com.',
      };
    }
  }

  // Case 2: Bare domain without protocol (e.g. google.com, www.youtube.com/watch?v=123)
  if (BARE_DOMAIN_RE.test(trimmed)) {
    const normalized = `https://${trimmed}`;
    try {
      const parsed = new URL(normalized);
      if (isValidHostname(parsed.hostname)) {
        return {
          valid: true,
          value: normalized,
          isUrl: true,
          wasNormalized: true,
        };
      }
    } catch {
      // Fall through to plain text if not a valid URL
    }
  }

  // Case 3: Plain text (Arabic/English text, Wi-Fi payloads, phone numbers, mailto:, tel:, etc.)
  return {
    valid: true,
    value: trimmed,
    isUrl: false,
    wasNormalized: false,
  };
}
