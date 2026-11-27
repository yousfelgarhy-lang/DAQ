export interface PdfReportMetric {
  label: string;
  value: string;
  accent?: 'lime' | 'purple' | 'neutral';
}

export interface PdfReportSection {
  title: string;
  body?: string;
  lines?: { text: string; tone?: 'normal' | 'added' | 'removed' }[];
}

export interface PdfReportData {
  filename: string;
  titleAr: string;
  subtitleAr: string;
  metrics?: PdfReportMetric[];
  sections?: PdfReportSection[];
}

const PAGE_WIDTH = 1240; // ~150 DPI A4 width
const PAGE_HEIGHT = 1754; // ~150 DPI A4 height
const MARGIN_X = 76;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const TOP_CONTENT_Y = 230;
const BOTTOM_MARGIN = 110;

function createPageCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('المتصفح لا يدعم إنشاء صفحات PDF.');
  }

  // Clean crisp white page background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  return { canvas, ctx };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  titleAr: string,
  subtitleAr: string,
  pageNumber: number
) {
  // Deep forest green top banner matching DAQ brand
  ctx.fillStyle = '#06140E';
  ctx.fillRect(0, 0, PAGE_WIDTH, 168);

  // Subtle lime accent bottom hairline
  ctx.fillStyle = '#A3E635';
  ctx.fillRect(0, 164, PAGE_WIDTH, 4);

  // Brand mark on right (RTL start)
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#A3E635';
  ctx.font = '800 26px "Cairo", "Plus Jakarta Sans", sans-serif';
  ctx.fillText('DAQ · دقيقة', PAGE_WIDTH - MARGIN_X, 54);

  // Main report title
  ctx.fillStyle = '#F2F7F4';
  ctx.font = '800 36px "Cairo", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(titleAr, PAGE_WIDTH - MARGIN_X, 108);

  // Subtitle / Date on left
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9BB5A6';
  ctx.font = '600 20px "Cairo", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitleAr, MARGIN_X, 54);

  // Footer
  ctx.fillStyle = '#5B7869';
  ctx.font = '600 18px "Cairo", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('تم إنشاء هذا التقرير محلياً عبر منصة دقيقة (DAQ) بخصوصية كاملة', PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 44);
  ctx.textAlign = 'left';
  ctx.fillText(`صفحة ${pageNumber}`, MARGIN_X, PAGE_HEIGHT - 44);
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split(/\r?\n/);
  const result: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      result.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) {
          result.push(current);
          current = '';
        }
        // Handle extremely long single tokens without spaces
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
              result.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) {
      result.push(current);
    }
  }

  return result;
}

export async function renderReportToPdfBytes(report: PdfReportData): Promise<{
  bytes: Uint8Array;
  pageCount: number;
}> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvases: HTMLCanvasElement[] = [];
  let pageNum = 1;
  let { canvas, ctx } = createPageCanvas();
  drawHeader(ctx, report.titleAr, report.subtitleAr, pageNum);
  canvases.push(canvas);

  let cursorY = TOP_CONTENT_Y;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > PAGE_HEIGHT - BOTTOM_MARGIN) {
      pageNum += 1;
      const next = createPageCanvas();
      canvas = next.canvas;
      ctx = next.ctx;
      drawHeader(ctx, report.titleAr, report.subtitleAr, pageNum);
      canvases.push(canvas);
      cursorY = TOP_CONTENT_Y;
    }
  };

  // Render summary metrics grid (2 columns in RTL)
  if (report.metrics && report.metrics.length > 0) {
    const colGap = 24;
    const cardWidth = (CONTENT_WIDTH - colGap) / 2;
    const cardHeight = 108;

    for (let i = 0; i < report.metrics.length; i += 2) {
      ensureSpace(cardHeight + 18);
      const rowMetrics = report.metrics.slice(i, i + 2);

      rowMetrics.forEach((metric, colIdx) => {
        // RTL: index 0 goes on the right column, index 1 on the left column
        const x =
          colIdx === 0
            ? PAGE_WIDTH - MARGIN_X - cardWidth
            : MARGIN_X;

        drawRoundedRect(ctx, x, cursorY, cardWidth, cardHeight, 14);
        ctx.fillStyle = '#F4F8F5';
        ctx.fill();
        ctx.strokeStyle = '#D5E3D8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#466355';
        ctx.font = '600 20px "Cairo", "Plus Jakarta Sans", sans-serif';
        ctx.fillText(metric.label, x + cardWidth - 22, cursorY + 38);

        ctx.fillStyle =
          metric.accent === 'lime'
            ? '#3F6212'
            : metric.accent === 'purple'
            ? '#6D28D9'
            : '#081E15';
        ctx.font = '800 28px "Cairo", "JetBrains Mono", sans-serif';
        ctx.fillText(metric.value, x + cardWidth - 22, cursorY + 80);
      });

      cursorY += cardHeight + 18;
    }
    cursorY += 16;
  }

  // Render sections
  if (report.sections && report.sections.length > 0) {
    for (const section of report.sections) {
      ensureSpace(90);

      // Section heading
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#081E15';
      ctx.font = '800 26px "Cairo", "Plus Jakarta Sans", sans-serif';
      ctx.fillText(section.title, PAGE_WIDTH - MARGIN_X, cursorY + 26);
      cursorY += 44;

      // Hairline divider
      ctx.fillStyle = '#D5E3D8';
      ctx.fillRect(MARGIN_X, cursorY, CONTENT_WIDTH, 2);
      cursorY += 20;

      if (section.body !== undefined) {
        ctx.font = '500 22px "Cairo", "Plus Jakarta Sans", sans-serif';
        const lines = wrapTextLines(ctx, section.body, CONTENT_WIDTH - 40);
        const lineHeight = 36;

        for (const line of lines) {
          ensureSpace(lineHeight + 8);
          ctx.direction = 'rtl';
          ctx.textAlign = 'right';
          ctx.fillStyle = '#1E3A2F';
          ctx.font = '500 22px "Cairo", "Plus Jakarta Sans", sans-serif';
          ctx.fillText(line, PAGE_WIDTH - MARGIN_X - 8, cursorY + 24);
          cursorY += lineHeight;
        }
        cursorY += 18;
      }

      if (section.lines && section.lines.length > 0) {
        const lineHeight = 36;
        for (const item of section.lines) {
          ctx.font = '600 21px "Cairo", "Plus Jakarta Sans", sans-serif';
          const wrapped = wrapTextLines(ctx, item.text, CONTENT_WIDTH - 44);
          for (const wline of wrapped) {
            ensureSpace(lineHeight + 8);
            if (item.tone === 'added') {
              drawRoundedRect(ctx, MARGIN_X, cursorY, CONTENT_WIDTH, lineHeight, 8);
              ctx.fillStyle = '#ECFDF5';
              ctx.fill();
              ctx.fillStyle = '#166534';
            } else if (item.tone === 'removed') {
              drawRoundedRect(ctx, MARGIN_X, cursorY, CONTENT_WIDTH, lineHeight, 8);
              ctx.fillStyle = '#FFF1F2';
              ctx.fill();
              ctx.fillStyle = '#9F1239';
            } else {
              ctx.fillStyle = '#081E15';
            }
            ctx.direction = 'rtl';
            ctx.textAlign = 'right';
            ctx.font = '600 21px "Cairo", "Plus Jakarta Sans", sans-serif';
            ctx.fillText(wline, PAGE_WIDTH - MARGIN_X - 16, cursorY + 25);
            cursorY += lineHeight + 6;
          }
        }
        cursorY += 16;
      }
    }
  }

  // Assemble A4 PDF using pdf-lib
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  for (const pageCanvas of canvases) {
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      pageCanvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('تعذّر تحويل صفحة التقرير إلى PDF.'))),
        'image/png'
      );
    });
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    const embeddedPng = await pdfDoc.embedPng(pngBytes);
    const pdfPage = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    pdfPage.drawImage(embeddedPng, {
      x: 0,
      y: 0,
      width: 595.28,
      height: 841.89,
    });
  }

  const bytes = await pdfDoc.save();
  return { bytes, pageCount: canvases.length };
}

export function triggerUint8Download(bytes: Uint8Array, filename: string, mimeType = 'application/pdf') {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function exportReportToPdf(report: PdfReportData): Promise<{ pageCount: number; byteLength: number }> {
  const { bytes, pageCount } = await renderReportToPdfBytes(report);
  triggerUint8Download(bytes, report.filename, 'application/pdf');
  return { pageCount, byteLength: bytes.byteLength };
}

export function formatCurrentTimestampAr(now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
  } catch {
    return now.toLocaleDateString();
  }
}
