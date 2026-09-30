/** In-browser OCR and text extraction for recitation fallback. */

import { t } from "./i18n.js";
import { requirePdfJs } from "./pdf-preview.js";
import { formatPageRange } from "./run-control.js";
import { isRecitationError } from "./gemini.js";

export { isRecitationError };

/**
 * Tesseract page segmentation mode 3: fully automatic layout, no orientation detection.
 * This is the mode that reads a full textbook page in normal reading order.
 */
export const OCR_PAGE_SEGMENTATION_MODE = "3";

/** LSTM models are trained near 300 DPI. Canvas PNGs carry no DPI metadata. */
export const OCR_TARGET_DPI = 300;

/** PDF user space is 72 points per inch. Scale 300/72 renders a page at the target DPI. */
export const PDF_POINTS_PER_INCH = 72;

export const OCR_RENDER_SCALE = OCR_TARGET_DPI / PDF_POINTS_PER_INCH;

const MIN_LESSON_CHARS = 30;
const MIN_LETTER_RATIO = 0.45;

export function tesseractParameters(dpi = OCR_TARGET_DPI) {
  return {
    tessedit_pageseg_mode: OCR_PAGE_SEGMENTATION_MODE,
    user_defined_dpi: String(dpi),
  };
}

export function textLetterRatio(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  if (!compact) {
    return 0;
  }
  const letters = compact.match(/\p{L}/gu);
  return (letters ? letters.length : 0) / compact.length;
}

function failsLessonQuality(text) {
  const raw = String(text || "");
  if (/\(cid:\d+\)/i.test(raw)) {
    return true;
  }
  const compact = raw.replace(/\s+/g, "");
  if (!compact) {
    return true;
  }
  const weird = compact.match(/[\uFFFD\uE000-\uF8FF]/g);
  if (weird && weird.length / compact.length > 0.02) {
    return true;
  }
  return textLetterRatio(raw) < MIN_LETTER_RATIO;
}

/** True when extracted text is long enough and mostly real letters, not scan garbage. */
export function isUsableLessonText(text, { minChars = MIN_LESSON_CHARS } = {}) {
  const compactLen = String(text || "").replace(/\s+/g, "").length;
  if (compactLen < minChars) {
    return false;
  }
  return !failsLessonQuality(text);
}

/**
 * Long symbol soup from a broken text layer or a mis-set Tesseract run.
 * Short text is sparse, not garbled.
 */
export function isGarbledLessonText(text, { minChars = MIN_LESSON_CHARS } = {}) {
  const compactLen = String(text || "").replace(/\s+/g, "").length;
  if (compactLen < minChars) {
    return false;
  }
  return failsLessonQuality(text);
}

function combinedPageText(pages) {
  return (pages || []).map((page) => page?.text || "").join("\n");
}

/**
 * Group and format raw pdf.js text items into reading order lines and paragraphs.
 * Items with similar vertical (y) coordinates are grouped onto lines and sorted by x.
 */
export function formatPageTextItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return "";
  }
  const valid = items.filter(
    (item) => item && typeof item.str === "string" && item.str.trim().length > 0
  );
  if (!valid.length) {
    return "";
  }

  // Sort items by y descending (top to bottom in PDF coordinate space).
  // When y coordinates are within vertical tolerance (3 units), sort by x ascending.
  const sorted = [...valid].sort((a, b) => {
    const ya = a.transform?.[5] ?? 0;
    const yb = b.transform?.[5] ?? 0;
    const diff = yb - ya;
    if (Math.abs(diff) > 3) {
      return diff;
    }
    const xa = a.transform?.[4] ?? 0;
    const xb = b.transform?.[4] ?? 0;
    return xa - xb;
  });

  const lines = [];
  let currentLine = [];
  let currentY = null;

  for (const item of sorted) {
    const itemY = item.transform?.[5] ?? 0;
    if (currentY === null || Math.abs(currentY - itemY) > 3) {
      if (currentLine.length) {
        lines.push(currentLine);
      }
      currentLine = [item];
      currentY = itemY;
    } else {
      currentLine.push(item);
    }
  }
  if (currentLine.length) {
    lines.push(currentLine);
  }

  return lines
    .map((line) => {
      line.sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));
      return line
        .map((item) => item.str.trim())
        .filter(Boolean)
        .join(" ");
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Extract embedded text layer from a PDF using pdf.js.
 */
export async function extractPdfTextLayer(pdfBytes, { pdfLib = null } = {}) {
  const lib = pdfLib || requirePdfJs();
  const data = pdfBytes instanceof Uint8Array ? pdfBytes.slice() : new Uint8Array(pdfBytes);
  const loadingTask = lib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages = [];
  let totalChars = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = formatPageTextItems(textContent?.items || []);
      totalChars += pageText.replace(/\s+/g, "").length;
      pages.push({ pageNumber, text: pageText });
    }
    return { pages, totalChars, pageCount: pdf.numPages };
  } finally {
    if (typeof pdf.destroy === "function") {
      await pdf.destroy();
    }
  }
}

function dpiForScale(scale) {
  return String(Math.max(70, Math.round(PDF_POINTS_PER_INCH * scale)));
}

/**
 * Tesseract.recognize(image, lang, options) treats options as worker setup, not
 * tessedit variables. PSM and DPI have to be the createWorker config and the
 * recognize options on that worker.
 */
async function openTesseractSession(tess, lang, dpi) {
  const params = tesseractParameters(dpi);
  if (typeof tess.createWorker === "function") {
    const oem = tess.OEM?.LSTM_ONLY ?? 1;
    const worker = await tess.createWorker(lang, oem, {}, params);
    if (typeof worker.setParameters === "function") {
      await worker.setParameters(params);
    }
    return {
      params,
      recognize(canvas) {
        return worker.recognize(canvas, params);
      },
      async terminate() {
        if (typeof worker.terminate !== "function") {
          return;
        }
        try {
          await worker.terminate();
        } catch {
          // Shutting down the worker must not discard a finished transcript.
        }
      },
    };
  }
  return {
    params,
    recognize(canvas) {
      return tess.recognize(canvas, lang, params);
    },
    async terminate() {},
  };
}

function paintWhiteBackground(context, width, height) {
  context.fillStyle = "#ffffff";
  if (typeof context.fillRect === "function") {
    context.fillRect(0, 0, width, height);
  }
}

/**
 * Run client-side OCR on rendered page canvases using Tesseract.js if available.
 * Pages are rendered near 300 DPI on a white background and read with PSM 3.
 */
export async function runRasterOcrOnPages(pdfBytes, {
  pdfLib = null,
  tesseractLib = null,
  scale = OCR_RENDER_SCALE,
  lang = "eng",
  startPage = 1,
  endPage = 1,
  onProgress = null,
} = {}) {
  const lib = pdfLib || requirePdfJs();
  const tess = tesseractLib || globalThis.Tesseract;
  const canRecognize = typeof tess?.createWorker === "function" || typeof tess?.recognize === "function";
  if (!canRecognize) {
    return { pages: [], totalChars: 0, available: false };
  }

  const data = pdfBytes instanceof Uint8Array ? pdfBytes.slice() : new Uint8Array(pdfBytes);
  const loadingTask = lib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages = [];
  let totalChars = 0;
  const pageRange = formatPageRange(startPage, endPage);
  let session = null;

  try {
    session = await openTesseractSession(tess, lang, dpiForScale(scale));
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const absolutePage = startPage + pageNumber - 1;
      if (onProgress) {
        onProgress("status.ocrExtractingPage", { page: absolutePage, range: pageRange });
      }
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) {
        continue;
      }
      paintWhiteBackground(context, canvas.width, canvas.height);
      await page.render({
        canvasContext: context,
        viewport,
        background: "#ffffff",
      }).promise;
      const result = await session.recognize(canvas);
      const pageText = String(result?.data?.text || "").trim();
      totalChars += pageText.replace(/\s+/g, "").length;
      pages.push({ pageNumber, text: pageText });
    }
    return { pages, totalChars, available: true, pageCount: pdf.numPages };
  } finally {
    if (session) {
      await session.terminate();
    }
    if (typeof pdf.destroy === "function") {
      await pdf.destroy();
    }
  }
}

function formatOcrPages(pages, startPage) {
  return pages
    .map((page) => {
      const absPage = startPage + page.pageNumber - 1;
      return `=== Page ${absPage} ===\n${page.text}`;
    })
    .join("\n\n");
}

/**
 * Extract OCR text across a batch PDF.
 * Uses a real embedded text layer when it is legible. A garbled text layer
 * (common on scans that already contain a failed OCR pass) is skipped in favor
 * of Tesseract PSM 3 on the page image.
 */
export async function extractBatchOcrText(pdfBytes, options = {}) {
  const startPage = options.startPage || 1;
  const endPage = options.endPage || startPage;
  const pageRange = formatPageRange(startPage, endPage);
  const onProgress = options.onProgress || null;

  let textLayerResult;
  try {
    textLayerResult = await extractPdfTextLayer(pdfBytes, options);
  } catch {
    textLayerResult = { pages: [], totalChars: 0, pageCount: 0 };
  }

  const layerText = combinedPageText(textLayerResult.pages);
  if (isUsableLessonText(layerText)) {
    return {
      text: formatOcrPages(textLayerResult.pages, startPage),
      method: "text-layer",
      pageCount: textLayerResult.pageCount,
      totalChars: textLayerResult.totalChars,
    };
  }

  const rasterResult = await runRasterOcrOnPages(pdfBytes, {
    ...options,
    startPage,
    endPage,
    onProgress,
  });

  const rasterText = combinedPageText(rasterResult.pages);
  if (rasterResult.available && isUsableLessonText(rasterText)) {
    return {
      text: formatOcrPages(rasterResult.pages, startPage),
      method: "raster-ocr",
      pageCount: rasterResult.pageCount,
      totalChars: rasterResult.totalChars,
    };
  }

  if (rasterResult.totalChars > 0 && !isGarbledLessonText(rasterText)) {
    return {
      text: formatOcrPages(rasterResult.pages, startPage),
      method: "raster-ocr-sparse",
      pageCount: rasterResult.pageCount,
      totalChars: rasterResult.totalChars,
    };
  }

  if (textLayerResult.totalChars > 0 && !isGarbledLessonText(layerText)) {
    return {
      text: formatOcrPages(textLayerResult.pages, startPage),
      method: "text-layer-sparse",
      pageCount: textLayerResult.pageCount,
      totalChars: textLayerResult.totalChars,
    };
  }

  throw new Error(t("ocr.noTextExtracted", { range: pageRange }));
}
