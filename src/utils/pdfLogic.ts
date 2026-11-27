import { PDFDocument } from 'pdf-lib';

export interface PageRange {
  start: number; // 1-based inclusive
  end: number;   // 1-based inclusive
  label: string;
}

export type ParsePageRangesResult =
  | {
      valid: true;
      ranges: PageRange[];
      uniquePages: number[]; // 1-based unique pages in order of appearance
      orderedPages: number[]; // 1-based pages preserving range order
    }
  | {
      valid: false;
      error: string;
    };

export const MAX_PDF_FILE_BYTES = 50 * 1024 * 1024; // 50 MB safety limit

export function isPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  const headerLen = Math.min(bytes.length, 1024);
  let header = '';
  for (let i = 0; i < headerLen; i++) {
    header += String.fromCharCode(bytes[i]);
  }
  return header.includes('%PDF-');
}

export function isLikelyPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Parses page specifications like "1, 3-5, 8" against a 1-based totalPages count.
 * Supports Arabic comma (،) and semicolons as separators.
 */
export function parsePageRanges(input: string, totalPages: number): ParsePageRangesResult {
  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    return { valid: false, error: 'عدد صفحات ملف PDF غير صالح.' };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: 'يرجى إدخال رقم صفحة أو نطاق صفحات مثل: 1, 3-5' };
  }

  // Normalize Arabic numerals if entered and normalize separators
  const normalized = trimmed
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[،;؛]+/g, ',');

  const rawTokens = normalized
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (rawTokens.length === 0) {
    return { valid: false, error: 'يرجى إدخال نطاق صفحات صالح.' };
  }

  const ranges: PageRange[] = [];
  const orderedPages: number[] = [];
  const seen = new Set<number>();
  const uniquePages: number[] = [];

  for (const token of rawTokens) {
    const singleMatch = token.match(/^(\d+)$/);
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);

    if (singleMatch) {
      const page = Number(singleMatch[1]);
      if (!Number.isInteger(page) || page < 1 || page > totalPages) {
        return {
          valid: false,
          error: `رقم الصفحة (${token}) خارج النطاق المسموح (من 1 إلى ${totalPages}).`,
        };
      }
      ranges.push({ start: page, end: page, label: String(page) });
      orderedPages.push(page);
      if (!seen.has(page)) {
        seen.add(page);
        uniquePages.push(page);
      }
      continue;
    }

    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > totalPages) {
        return {
          valid: false,
          error: `النطاق (${token}) خارج حدود المستند (من 1 إلى ${totalPages}).`,
        };
      }
      if (start > end) {
        return {
          valid: false,
          error: `النطاق (${token}) غير صحيح: يجب أن يكون رقم البداية أصغر من أو يساوي النهاية.`,
        };
      }
      ranges.push({ start, end, label: `${start}-${end}` });
      for (let p = start; p <= end; p++) {
        orderedPages.push(p);
        if (!seen.has(p)) {
          seen.add(p);
          uniquePages.push(p);
        }
      }
      continue;
    }

    return {
      valid: false,
      error: `صيغة غير صالحة عند "${token}". استخدم أرقاماً أو نطاقات مثل: 1, 3-5, 8`,
    };
  }

  return { valid: true, ranges, uniquePages, orderedPages };
}

export async function inspectPdfBytes(
  bytes: Uint8Array,
  fileName: string
): Promise<{ pageCount: number }> {
  if (!isPdfSignature(bytes)) {
    throw new Error(`الملف "${fileName}" ليس ملف PDF صالحاً.`);
  }
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
    const pageCount = doc.getPageCount();
    if (pageCount <= 0) {
      throw new Error(`الملف "${fileName}" لا يحتوي على أي صفحات.`);
    }
    return { pageCount };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (/encrypt/i.test(msg)) {
      throw new Error(`الملف "${fileName}" محمي بكلمة مرور ولا يمكن معالجته مباشرة.`);
    }
    if (msg.includes('لا يحتوي على أي صفحات')) {
      throw err;
    }
    throw new Error(`تعذّر قراءة "${fileName}". قد يكون الملف تالفاً أو غير مدعوم.`);
  }
}

export interface PdfMergeInputItem {
  name: string;
  bytes: Uint8Array;
}

export async function mergePdfBuffers(
  items: PdfMergeInputItem[],
  onProgress?: (percent: number, statusText: string) => void
): Promise<{ bytes: Uint8Array; totalPages: number }> {
  if (items.length < 2) {
    throw new Error('يرجى إضافة ملفي PDF على الأقل لإجراء الدمج.');
  }

  const merged = await PDFDocument.create();
  let totalPages = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress?.(
      Math.round((i / items.length) * 90),
      `جارٍ معالجة الملف ${i + 1} من ${items.length}: ${item.name}`
    );

    if (!isPdfSignature(item.bytes)) {
      throw new Error(`الملف "${item.name}" غير صالح أو تالف.`);
    }

    let sourceDoc: PDFDocument;
    try {
      sourceDoc = await PDFDocument.load(item.bytes, { ignoreEncryption: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/encrypt/i.test(msg)) {
        throw new Error(`الملف "${item.name}" محمي بكلمة مرور ولا يمكن دمجه.`);
      }
      throw new Error(`تعذّر قراءة "${item.name}". قد يكون الملف تالفاً.`);
    }

    const indices = sourceDoc.getPageIndices();
    const copiedPages = await merged.copyPages(sourceDoc, indices);
    for (const page of copiedPages) {
      merged.addPage(page);
      totalPages += 1;
    }

    // Yield to UI thread so real progress updates render smoothly
    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress?.(95, 'جارٍ حفظ ملف PDF المدمج...');
  const mergedBytes = await merged.save();
  onProgress?.(100, 'تم دمج الملفات بنجاح');
  return { bytes: mergedBytes, totalPages };
}

export interface SplitPdfOutputFile {
  label: string;
  pageCount: number;
  bytes: Uint8Array;
}

export async function splitPdfBuffer(
  sourceBytes: Uint8Array,
  ranges: PageRange[],
  combineIntoSingle: boolean,
  onProgress?: (percent: number, statusText: string) => void
): Promise<SplitPdfOutputFile[]> {
  if (!isPdfSignature(sourceBytes)) {
    throw new Error('الملف المحدد ليس ملف PDF صالحاً.');
  }

  if (ranges.length === 0) {
    throw new Error('لا توجد صفحات محددة للاستخراج.');
  }

  let sourceDoc: PDFDocument;
  try {
    sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (/encrypt/i.test(msg)) {
      throw new Error('ملف PDF محمي بكلمة مرور ولا يمكن تقسيمه.');
    }
    throw new Error('تعذّر قراءة ملف PDF. قد يكون تالفاً.');
  }

  const totalPages = sourceDoc.getPageCount();

  if (combineIntoSingle) {
    const indices: number[] = [];
    for (const r of ranges) {
      for (let p = r.start; p <= r.end; p++) {
        if (p < 1 || p > totalPages) {
          throw new Error(`الصفحة ${p} خارج حدود المستند.`);
        }
        indices.push(p - 1);
      }
    }

    onProgress?.(35, `جارٍ استخراج ${indices.length} صفحة...`);
    const outDoc = await PDFDocument.create();
    const copied = await outDoc.copyPages(sourceDoc, indices);
    for (let i = 0; i < copied.length; i++) {
      outDoc.addPage(copied[i]);
      if (i % 10 === 0) {
        onProgress?.(
          35 + Math.round(((i + 1) / copied.length) * 55),
          `جارٍ تجهيز الصفحة ${i + 1} من ${copied.length}...`
        );
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    onProgress?.(95, 'جارٍ إنشاء الملف النهائي...');
    const bytes = await outDoc.save();
    onProgress?.(100, 'تم استخراج الصفحات بنجاح');

    return [
      {
        label: ranges.map((r) => r.label).join('_'),
        pageCount: indices.length,
        bytes,
      },
    ];
  }

  const outputs: SplitPdfOutputFile[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    onProgress?.(
      Math.round((i / ranges.length) * 95),
      `جارٍ استخراج النطاق ${r.label} (${i + 1} من ${ranges.length})...`
    );

    const indices: number[] = [];
    for (let p = r.start; p <= r.end; p++) {
      if (p < 1 || p > totalPages) {
        throw new Error(`الصفحة ${p} خارج حدود المستند.`);
      }
      indices.push(p - 1);
    }

    const partDoc = await PDFDocument.create();
    const copied = await partDoc.copyPages(sourceDoc, indices);
    for (const page of copied) {
      partDoc.addPage(page);
    }
    const bytes = await partDoc.save();
    outputs.push({
      label: r.label,
      pageCount: indices.length,
      bytes,
    });
    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress?.(100, 'تم تقسيم الصفحات بنجاح');
  return outputs;
}
