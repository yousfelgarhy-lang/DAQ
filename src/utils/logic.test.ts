import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  formatEGP,
  calculateCompressionPercent,
  calculateResizedDimensions,
} from './formatters';
import { analyzeText, transformText, compareTexts } from './textLogic';
import {
  calculateDiscount,
  calculatePercentageOf,
  calculatePercentageChange,
  calculateWhatPercentage,
  calculateBillSplit,
} from './calculatorLogic';
import { searchTools } from '../data/tools';

test('formatters compute byte sizes, EGP currency, compression percent, and aspect ratio dimensions', () => {
  assert.equal(formatBytes(0), '0 بايت');
  assert.equal(formatBytes(1024), '1.00 كيلوبايت');
  assert.equal(formatEGP(1500), '1,500.00 ج.م');
  assert.equal(calculateCompressionPercent(1000, 400), 60);
  assert.equal(calculateCompressionPercent(1000, 1100), -10);

  const locked = calculateResizedDimensions(1920, 1080, 'width', 960, true, 1080);
  assert.deepEqual(locked, { width: 960, height: 540 });

  const unlocked = calculateResizedDimensions(1920, 1080, 'width', 800, false, 800);
  assert.deepEqual(unlocked, { width: 800, height: 800 });
});

test('analyzeText counts Arabic and English words, characters, sentences, paragraphs, and reading time', () => {
  const empty = analyzeText('   ');
  assert.equal(empty.words, 0);
  assert.equal(empty.characters, 3);
  assert.equal(empty.charactersNoSpaces, 0);

  const sample = 'مرحباً بكم في منصة دقيقة. كل حاجة أبسط!\n\nThis is paragraph two.';
  const stats = analyzeText(sample);
  assert.equal(stats.words, 12);
  assert.equal(stats.sentences, 3);
  assert.equal(stats.paragraphs, 2);
  assert.ok(stats.characters > stats.charactersNoSpaces);
  assert.ok(stats.readingTimeLabel.includes('ثانية'));
  assert.equal(analyzeText('أدواتٌ مُتَعَدِّدَةٌ').words, 2);
});

test('transformText performs all 7 formatting actions accurately', () => {
  assert.equal(transformText('hello world', 'uppercase'), 'HELLO WORLD');
  assert.equal(transformText('HELLO WORLD', 'lowercase'), 'hello world');
  assert.equal(transformText('hello world from daq', 'titlecase'), 'Hello World From Daq');
  assert.equal(transformText('  hello   world  \n  test   line  ', 'removeExtraSpaces'), 'hello world\ntest line');
  assert.equal(transformText('a\n\n  \nb\n', 'removeEmptyLines'), 'a\nb');
  assert.equal(transformText('one\ntwo\none\nthree\ntwo', 'removeDuplicateLines'), 'one\ntwo\nthree');
  assert.equal(transformText('abc', 'reverseText'), 'cba');
});

test('compareTexts highlights added, removed, and equal words', () => {
  const same = compareTexts('منصة دقيقة سريعة', 'منصة دقيقة سريعة');
  assert.equal(same.isIdentical, true);
  assert.equal(same.addedCount, 0);
  assert.equal(same.removedCount, 0);

  const diff = compareTexts('مرحبا بالعالم القديم', 'مرحبا بالعالم الجديد الرائع');
  assert.equal(diff.isIdentical, false);
  assert.equal(diff.removedCount, 1);
  assert.equal(diff.addedCount, 2);
  assert.equal(diff.unchangedCount, 2);
});

test('calculatorLogic handles discount, percentages, bill splitting, and invalid inputs', () => {
  const discount = calculateDiscount(1000, 25);
  assert.equal(discount.valid, true);
  assert.equal(discount.savedAmount, 250);
  assert.equal(discount.finalPrice, 750);

  const badDiscount = calculateDiscount(500, 120);
  assert.equal(badDiscount.valid, false);

  assert.equal(calculatePercentageOf(20, 500).value, 100);
  assert.equal(calculatePercentageChange(100, 125).value, 25);
  assert.equal(calculatePercentageChange(0, 50).valid, false);
  assert.equal(calculateWhatPercentage(50, 200).value, 25);
  assert.equal(calculateWhatPercentage(50, 0).valid, false);

  const split = calculateBillSplit(400, 4, 10);
  assert.equal(split.valid, true);
  assert.equal(split.tipAmount, 40);
  assert.equal(split.totalWithTip, 440);
  assert.equal(split.perPerson, 110);

  const badSplit = calculateBillSplit(400, 0, 10);
  assert.equal(badSplit.valid, false);
});

test('searchTools searches Arabic names, English names, and keywords accurately across all 16 tools', () => {
  assert.ok(searchTools('ضغط').some((t) => t.id === 'image-compressor'));
  assert.ok(searchTools('QR').some((t) => t.id === 'qr-generator'));
  assert.ok(searchTools('egp').some((t) => t.id === 'discount-calculator'));
  assert.ok(searchTools('دمج').some((t) => t.id === 'pdf-merger'));
  assert.ok(searchTools('تقسيم').some((t) => t.id === 'pdf-splitter'));
  assert.ok(searchTools('تحويل الصور إلى PDF').some((t) => t.id === 'image-to-pdf'));
  assert.ok(searchTools('باسورد').some((t) => t.id === 'password-generator'));
  assert.ok(searchTools('حرارة').some((t) => t.id === 'unit-converter'));
  assert.ok(searchTools('العمر').some((t) => t.id === 'age-calculator'));
  assert.equal(searchTools('', 'text').length, 3);
  assert.equal(searchTools('', 'calculator').length, 5);
  assert.equal(searchTools('', 'utility').length, 5);
  assert.equal(searchTools('', 'all').length, 16);
});

import { validateAndNormalizeQrInput } from './qrValidation';
import { PDFDocument } from 'pdf-lib';
import {
  inspectPdfBytes,
  mergePdfBuffers,
  parsePageRanges,
  splitPdfBuffer,
} from './pdfLogic';
import { evaluatePasswordStrength, generateSecurePassword } from './passwordLogic';
import { convertUnitValue } from './unitConverterLogic';
import { calculateAge, isLeapYear } from './ageLogic';

test('validateAndNormalizeQrInput accepts real URLs, normalizes bare domains, supports plain text, and rejects invalid URLs', () => {
  const google = validateAndNormalizeQrInput('https://google.com');
  assert.equal(google.valid, true);
  assert.equal(google.isUrl, true);
  assert.equal(google.value, 'https://google.com');

  const yt = validateAndNormalizeQrInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s#top');
  assert.equal(yt.valid, true);
  assert.equal(yt.isUrl, true);
  assert.equal(yt.value, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s#top');

  const bare = validateAndNormalizeQrInput('google.com');
  assert.equal(bare.valid, true);
  assert.equal(bare.isUrl, true);
  assert.equal(bare.wasNormalized, true);
  assert.equal(bare.value, 'https://google.com');

  const barePath = validateAndNormalizeQrInput('www.youtube.com/results?search_query=daq+tools');
  assert.equal(barePath.valid, true);
  assert.equal(barePath.wasNormalized, true);
  assert.equal(barePath.value, 'https://www.youtube.com/results?search_query=daq+tools');

  const arabicText = validateAndNormalizeQrInput('مرحباً بكم في دقيقة');
  assert.equal(arabicText.valid, true);
  assert.equal(arabicText.isUrl, false);

  const empty = validateAndNormalizeQrInput('   ');
  assert.equal(empty.valid, false);

  const brokenScheme = validateAndNormalizeQrInput('http://');
  assert.equal(brokenScheme.valid, false);

  const spaceInHost = validateAndNormalizeQrInput('https://exa mple.com');
  assert.equal(spaceInHost.valid, false);

  const singleLabelHost = validateAndNormalizeQrInput('https://invalid');
  assert.equal(singleLabelHost.valid, false);
});

test('pdfLogic parses page ranges, rejects bad inputs, merges multiple PDFs in order, and splits ranges accurately', async () => {
  // Parse range tests
  const parsed = parsePageRanges('1, 3-5, 8', 10);
  assert.equal(parsed.valid, true);
  if (parsed.valid) {
    assert.deepEqual(parsed.orderedPages, [1, 3, 4, 5, 8]);
    assert.equal(parsed.ranges.length, 3);
  }

  assert.equal(parsePageRanges('0, 2', 5).valid, false);
  assert.equal(parsePageRanges('5-2', 6).valid, false);
  assert.equal(parsePageRanges('1-9', 6).valid, false);
  assert.equal(parsePageRanges('abc', 6).valid, false);
  assert.equal(parsePageRanges('   ', 6).valid, false);

  // Create two synthetic multi-page PDFs with distinct page heights so order is verifiable
  const makePdf = async (heights: number[]) => {
    const doc = await PDFDocument.create();
    for (const h of heights) {
      doc.addPage([400, h]);
    }
    return doc.save();
  };

  const pdfA = await makePdf([300, 310]);
  const pdfB = await makePdf([500, 510, 520]);

  const infoA = await inspectPdfBytes(pdfA, 'a.pdf');
  assert.equal(infoA.pageCount, 2);

  await assert.rejects(() => inspectPdfBytes(new Uint8Array([1, 2, 3, 4, 5]), 'bad.pdf'));

  // Merge in reordered order: B then A
  const merged = await mergePdfBuffers([
    { name: 'b.pdf', bytes: pdfB },
    { name: 'a.pdf', bytes: pdfA },
  ]);
  assert.equal(merged.totalPages, 5);
  const mergedDoc = await PDFDocument.load(merged.bytes);
  assert.deepEqual(
    mergedDoc.getPages().map((p) => p.getHeight()),
    [500, 510, 520, 300, 310]
  );

  // Split into multiple separate range PDFs: "1-2, 5"
  const rangeRes = parsePageRanges('1-2, 5', 5);
  assert.equal(rangeRes.valid, true);
  if (rangeRes.valid) {
    const splitSeparate = await splitPdfBuffer(merged.bytes, rangeRes.ranges, false);
    assert.equal(splitSeparate.length, 2);
    assert.equal(splitSeparate[0].pageCount, 2);
    assert.equal(splitSeparate[1].pageCount, 1);

    const docPart1 = await PDFDocument.load(splitSeparate[0].bytes);
    const docPart2 = await PDFDocument.load(splitSeparate[1].bytes);
    assert.deepEqual(docPart1.getPages().map((p) => p.getHeight()), [500, 510]);
    assert.deepEqual(docPart2.getPages().map((p) => p.getHeight()), [310]);

    const splitSingle = await splitPdfBuffer(merged.bytes, rangeRes.ranges, true);
    assert.equal(splitSingle.length, 1);
    assert.equal(splitSingle[0].pageCount, 3);
  }
});

test('passwordLogic generates secure passwords meeting all enabled character sets and evaluates strength', () => {
  const invalid = generateSecurePassword({
    length: 12,
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: false,
  });
  assert.equal(invalid.valid, false);

  const res = generateSecurePassword({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.password.length, 16);
    assert.match(res.password, /[A-Z]/);
    assert.match(res.password, /[a-z]/);
    assert.match(res.password, /[0-9]/);
    assert.match(res.password, /[^A-Za-z0-9]/);

    const strength = evaluatePasswordStrength(res.password);
    assert.equal(strength.varietyCount, 4);
    assert.ok(strength.score >= 80);
    assert.ok(strength.level === 'strong' || strength.level === 'very-strong');
  }

  const weakStrength = evaluatePasswordStrength('123456');
  assert.equal(weakStrength.level, 'weak');
});

test('unitConverterLogic converts length, weight, temperature, area, volume, speed, and data accurately', () => {
  const cToF = convertUnitValue('temperature', 'C', 'F', '100');
  assert.equal(cToF.valid, true);
  if (cToF.valid) assert.equal(cToF.value, 212);

  const fToC = convertUnitValue('temperature', 'F', 'C', '32');
  assert.equal(fToC.valid, true);
  if (fToC.valid) assert.equal(fToC.value, 0);

  const neg40 = convertUnitValue('temperature', 'C', 'F', '-40');
  assert.equal(neg40.valid, true);
  if (neg40.valid) assert.equal(neg40.value, -40);

  assert.equal(convertUnitValue('temperature', 'C', 'K', '-300').valid, false);

  const kmToMi = convertUnitValue('length', 'km', 'm', '2.5');
  assert.equal(kmToMi.valid, true);
  if (kmToMi.valid) assert.equal(kmToMi.value, 2500);

  const gbToMb = convertUnitValue('data', 'GB', 'MB', '2');
  assert.equal(gbToMb.valid, true);
  if (gbToMb.valid) assert.equal(gbToMb.value, 2048);

  assert.equal(convertUnitValue('weight', 'kg', 'g', '-5').valid, false);
  assert.equal(convertUnitValue('speed', 'kmh', 'mph', '   ').valid, false);
});

test('ageLogic handles leap years, month-length boundaries, total days lived, and rejects future/invalid dates', () => {
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2024), true);

  // Invalid calendar date (Feb 29 in non-leap year)
  assert.equal(calculateAge('2023-02-29', { year: 2026, month: 11, day: 26 }).valid, false);
  // Future date
  assert.equal(calculateAge('2030-01-01', { year: 2026, month: 11, day: 26 }).valid, false);

  // Month boundary: born Jan 31, reference Feb 29 (leap year 2024) -> exact 1 month 0 days
  const leapFebEnd = calculateAge('2024-01-31', { year: 2024, month: 2, day: 29 });
  assert.equal(leapFebEnd.valid, true);
  if (leapFebEnd.valid) {
    assert.equal(leapFebEnd.years, 0);
    assert.equal(leapFebEnd.months, 1);
    assert.equal(leapFebEnd.days, 0);
    assert.equal(leapFebEnd.totalDaysLived, 29);
  }

  // Month boundary: born Jan 31, reference Mar 1 (leap year 2024) -> 1 month 1 day (30 days total)
  const leapBoundary = calculateAge('2024-01-31', { year: 2024, month: 3, day: 1 });
  assert.equal(leapBoundary.valid, true);
  if (leapBoundary.valid) {
    assert.equal(leapBoundary.years, 0);
    assert.equal(leapBoundary.months, 1);
    assert.equal(leapBoundary.days, 1);
    assert.equal(leapBoundary.totalDaysLived, 30);
  }

  // Exact leap day birth: Feb 29, 2000 measured on Nov 26, 2026
  const leapBirth = calculateAge('2000-02-29', { year: 2026, month: 11, day: 26 });
  assert.equal(leapBirth.valid, true);
  if (leapBirth.valid) {
    assert.equal(leapBirth.years, 26);
    assert.equal(leapBirth.months, 8);
    assert.equal(leapBirth.days, 28);
    assert.equal(leapBirth.isLeapFeb29Birth, true);
    assert.ok(leapBirth.totalDaysLived > 9700);
    assert.equal(leapBirth.nextBirthday.totalDaysRemaining, 95);
  }
});

import {
  DEFAULT_IMAGE_TO_PDF_SETTINGS,
  buildImagesPdfBytes,
  computeImageDrawRect,
  resolveMarginPt,
  resolvePageDimensionsPt,
  sanitizePdfFilename,
} from './imageToPdfLogic';

test('imageToPdfLogic resolves page sizes, orientations, margins, placement geometry, and builds valid multi-page PDFs', async () => {
  // Page size & orientation checks
  const a4Portrait = resolvePageDimensionsPt(
    { pageSize: 'a4', customWidthMm: 210, customHeightMm: 297, orientation: 'portrait' },
    1600,
    900
  );
  assert.ok(a4Portrait.widthPt < a4Portrait.heightPt);
  assert.equal(Math.round(a4Portrait.widthPt), 595);

  const a4AutoLandscape = resolvePageDimensionsPt(
    { pageSize: 'a4', customWidthMm: 210, customHeightMm: 297, orientation: 'auto' },
    1600,
    900
  );
  assert.ok(a4AutoLandscape.widthPt > a4AutoLandscape.heightPt);

  const origDims = resolvePageDimensionsPt(
    { pageSize: 'original', customWidthMm: 210, customHeightMm: 297, orientation: 'auto' },
    1200,
    800
  );
  assert.deepEqual(origDims, { widthPt: 1200, heightPt: 800 });

  const customDims = resolvePageDimensionsPt(
    { pageSize: 'custom', customWidthMm: 100, customHeightMm: 200, orientation: 'landscape' },
    500,
    500
  );
  assert.ok(customDims.widthPt > customDims.heightPt);

  // Margins
  assert.equal(resolveMarginPt({ marginPreset: 'none', customMarginMm: 10 }), 0);
  assert.equal(resolveMarginPt({ marginPreset: 'small', customMarginMm: 10 }), 18);
  assert.ok(resolveMarginPt({ marginPreset: 'large', customMarginMm: 10 }) > 40);

  // Placement math: fit vs fill vs stretch
  const fitLayout = computeImageDrawRect(600, 800, 20, 1000, 500, 'fit');
  assert.equal(fitLayout.needsClip, false);
  assert.equal(Math.round(fitLayout.drawRect.width), 560);
  assert.equal(Math.round(fitLayout.drawRect.height), 280);

  const fillLayout = computeImageDrawRect(600, 800, 20, 1000, 500, 'fill');
  assert.equal(fillLayout.needsClip, true);
  assert.ok(fillLayout.drawRect.width > 560);
  assert.equal(Math.round(fillLayout.drawRect.height), 760);

  const stretchLayout = computeImageDrawRect(600, 800, 20, 1000, 500, 'stretch');
  assert.equal(stretchLayout.needsClip, false);
  assert.equal(stretchLayout.drawRect.width, 560);
  assert.equal(stretchLayout.drawRect.height, 760);

  // Filename sanitization
  assert.equal(sanitizePdfFilename('  تقرير الصور  '), 'تقرير الصور.pdf');
  assert.equal(sanitizePdfFilename('custom.pdf'), 'custom.pdf');
  assert.equal(sanitizePdfFilename('   '), 'DAQ-Images.pdf');

  // Empty build throws cleanly
  await assert.rejects(() => buildImagesPdfBytes([], DEFAULT_IMAGE_TO_PDF_SETTINGS));

  // Build real multi-page PDF in Node using valid 1x1 PNG bytes
  const tinyPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const pngBytes = Uint8Array.from(Buffer.from(tinyPngBase64, 'base64'));

  const built = await buildImagesPdfBytes(
    [
      {
        id: '1',
        name: 'landscape.png',
        width: 1200,
        height: 600,
        mime: 'image/png',
        bytes: pngBytes,
      },
      {
        id: '2',
        name: 'portrait.png',
        width: 600,
        height: 1000,
        mime: 'image/png',
        bytes: pngBytes,
      },
    ],
    {
      ...DEFAULT_IMAGE_TO_PDF_SETTINGS,
      pageSize: 'original',
      orientation: 'auto',
      qualityPreset: 'original',
      marginPreset: 'none',
    }
  );

  assert.equal(built.pageCount, 2);
  const loaded = await PDFDocument.load(built.bytes);
  assert.equal(loaded.getPageCount(), 2);
  const pages = loaded.getPages();
  assert.equal(Math.round(pages[0].getWidth()), 1200);
  assert.equal(Math.round(pages[0].getHeight()), 600);
  assert.equal(Math.round(pages[1].getWidth()), 600);
  assert.equal(Math.round(pages[1].getHeight()), 1000);
});

import { detectDesktopKeyboardCapability } from './deviceCapability';
import {
  PDF_ZOOM_STEPS,
  clampPageNumber,
  computeNextZoomStep,
  computePageDisplayGeometry,
  pickMostVisiblePage,
} from './pdfPreviewLogic';

test('detectDesktopKeyboardCapability distinguishes desktop/hybrid devices from mobile/tablet touch interfaces regardless of viewport width', () => {
  // Desktop Chrome / Edge at 1440px
  assert.equal(
    detectDesktopKeyboardCapability({
      hoverHover: true,
      pointerFine: true,
      pointerCoarse: false,
      anyHoverHover: true,
      anyPointerFine: true,
      maxTouchPoints: 0,
      viewportWidth: 1440,
    }),
    true
  );

  // Narrow desktop window (390px wide) still has fine pointer & hover -> keep shortcuts visible
  assert.equal(
    detectDesktopKeyboardCapability({
      hoverHover: true,
      pointerFine: true,
      pointerCoarse: false,
      anyHoverHover: true,
      anyPointerFine: true,
      maxTouchPoints: 0,
      viewportWidth: 390,
    }),
    true
  );

  // 2-in-1 Windows laptop with touchscreen + trackpad/mouse
  assert.equal(
    detectDesktopKeyboardCapability({
      hoverHover: true,
      pointerFine: true,
      pointerCoarse: false,
      anyHoverHover: true,
      anyPointerFine: true,
      maxTouchPoints: 10,
      viewportWidth: 1280,
    }),
    true
  );

  // iPhone / Android phone (touch-only)
  assert.equal(
    detectDesktopKeyboardCapability({
      hoverHover: false,
      pointerFine: false,
      pointerCoarse: true,
      anyHoverHover: false,
      anyPointerFine: false,
      maxTouchPoints: 5,
      viewportWidth: 390,
    }),
    false
  );

  // iPad / Android tablet at wide 1024px+ viewport (touch-only) -> must hide shortcut UI
  assert.equal(
    detectDesktopKeyboardCapability({
      hoverHover: false,
      pointerFine: false,
      pointerCoarse: true,
      anyHoverHover: false,
      anyPointerFine: false,
      maxTouchPoints: 5,
      viewportWidth: 1024,
    }),
    false
  );

  // Fallback without matchMedia
  assert.equal(
    detectDesktopKeyboardCapability({
      hoverHover: null,
      pointerFine: null,
      pointerCoarse: null,
      anyHoverHover: null,
      anyPointerFine: null,
      maxTouchPoints: 5,
      viewportWidth: 1024,
    }),
    false
  );
  assert.equal(
    detectDesktopKeyboardCapability({
      hoverHover: null,
      pointerFine: null,
      pointerCoarse: null,
      anyHoverHover: null,
      anyPointerFine: null,
      maxTouchPoints: 0,
      viewportWidth: 1280,
    }),
    true
  );
});

test('pdfPreviewLogic computes fit-to-width geometry, pixel-capped backing stores, zoom steps, page clamping, and visible page selection', () => {
  assert.equal(clampPageNumber(0, 5), 1);
  assert.equal(clampPageNumber(9, 5), 5);
  assert.equal(clampPageNumber(3, 5), 3);

  assert.equal(computeNextZoomStep(1, 'in', PDF_ZOOM_STEPS), 1.25);
  assert.equal(computeNextZoomStep(1, 'out', PDF_ZOOM_STEPS), 0.75);
  assert.equal(computeNextZoomStep(2, 'in', PDF_ZOOM_STEPS), 2);
  assert.equal(computeNextZoomStep(0.5, 'out', PDF_ZOOM_STEPS), 0.5);

  // Mobile fit-to-width: 595pt A4 page inside 330px container fits within 330px
  const mobileFit = computePageDisplayGeometry({
    pageWidthPt: 595,
    pageHeightPt: 842,
    containerWidthPx: 330,
    zoomMultiplier: 1.5, // ignored in fit-width mode
    fitMode: 'fit-width',
    devicePixelRatio: 2,
  });
  assert.equal(mobileFit.cssWidth, 330);
  assert.ok(mobileFit.cssHeight > 460 && mobileFit.cssHeight < 475);

  // Custom zoom in expands beyond container width cleanly
  const zoomedIn = computePageDisplayGeometry({
    pageWidthPt: 595,
    pageHeightPt: 842,
    containerWidthPx: 500,
    zoomMultiplier: 1.5,
    fitMode: 'custom',
    devicePixelRatio: 2,
    maxCanvasPixels: 1_000_000,
  });
  assert.equal(zoomedIn.cssWidth, 750);
  assert.ok(zoomedIn.pixelWidth * zoomedIn.pixelHeight <= 1_020_000);

  // Active page selection prefers most visible page and breaks ties by viewport center proximity
  assert.equal(pickMostVisiblePage([]), null);
  assert.equal(
    pickMostVisiblePage([
      { pageNumber: 1, ratio: 0.35, distanceFromCenter: 220 },
      { pageNumber: 2, ratio: 0.85, distanceFromCenter: 30 },
      { pageNumber: 3, ratio: 0.1, distanceFromCenter: 310 },
    ]),
    2
  );
  assert.equal(
    pickMostVisiblePage([
      { pageNumber: 2, ratio: 0.5, distanceFromCenter: 110 },
      { pageNumber: 3, ratio: 0.5, distanceFromCenter: 40 },
    ]),
    3
  );
});

