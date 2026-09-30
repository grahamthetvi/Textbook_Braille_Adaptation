/** In-browser OCR and text extraction for recitation fallback. */

import { t } from "./i18n.js";
import { requirePdfJs } from "./pdf-preview.js";
import { formatPageRange } from "./run-control.js";
import { isRecitationError } from "./gemini.js";

export { isRecitationError };

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

/**
 * Run client-side OCR on rendered page canvases using Tesseract.js if available.
 */
export async function runRasterOcrOnPages(pdfBytes, {
  pdfLib = null,
  tesseractLib = null,
  scale = 2,
  lang = "eng",
  startPage = 1,
  endPage = 1,
  onProgress = null,
} = {}) {
  const lib = pdfLib || requirePdfJs();
  const tess = tesseractLib || globalThis.Tesseract;
  if (!tess?.recognize) {
    return { pages: [], totalChars: 0, available: false };
  }

  const data = pdfBytes instanceof Uint8Array ? pdfBytes.slice() : new Uint8Array(pdfBytes);
  const loadingTask = lib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages = [];
  let totalChars = 0;
  const pageRange = formatPageRange(startPage, endPage);

  try {
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
      await page.render({ canvasContext: context, viewport }).promise;
      const result = await tess.recognize(canvas, lang);
      const pageText = String(result?.data?.text || "").trim();
      totalChars += pageText.replace(/\s+/g, "").length;
      pages.push({ pageNumber, text: pageText });
    }
    return { pages, totalChars, available: true, pageCount: pdf.numPages };
  } finally {
    if (typeof pdf.destroy === "function") {
      await pdf.destroy();
    }
  }
}

/**
 * Extract OCR text across a batch PDF.
 * Tries the high-fidelity embedded text layer first. If empty or sparse (<30 chars),
 * falls back to raster canvas OCR with Tesseract.js.
 */
export async function extractBatchOcrText(pdfBytes, options = {}) {
  const startPage = options.startPage || 1;
  const endPage = options.endPage || startPage;
  const pageRange = formatPageRange(startPage, endPage);
  const onProgress = options.onProgress || null;

  // 1. Try extracting embedded text layer
  let textLayerResult;
  try {
    textLayerResult = await extractPdfTextLayer(pdfBytes, options);
  } catch (err) {
    textLayerResult = { pages: [], totalChars: 0, pageCount: 0 };
  }

  // If text layer has substantial content (>= 30 non-whitespace chars across batch)
  if (textLayerResult.totalChars >= 30) {
    const formatted = textLayerResult.pages
      .map((p) => {
        const absPage = startPage + p.pageNumber - 1;
        return `=== Page ${absPage} ===\n${p.text}`;
      })
      .join("\n\n");
    return {
      text: formatted,
      method: "text-layer",
      pageCount: textLayerResult.pageCount,
      totalChars: textLayerResult.totalChars,
    };
  }

  // 2. Fall back to raster OCR if text layer is empty or sparse (< 30 chars)
  const rasterResult = await runRasterOcrOnPages(pdfBytes, {
    ...options,
    startPage,
    endPage,
    onProgress,
  });

  if (rasterResult.available && rasterResult.totalChars >= 30) {
    const formatted = rasterResult.pages
      .map((p) => {
        const absPage = startPage + p.pageNumber - 1;
        return `=== Page ${absPage} ===\n${p.text}`;
      })
      .join("\n\n");
    return {
      text: formatted,
      method: "raster-ocr",
      pageCount: rasterResult.pageCount,
      totalChars: rasterResult.totalChars,
    };
  }

  // 3. If raster produced some text or text layer had some text
  if (rasterResult.totalChars > 0) {
    const formatted = rasterResult.pages
      .map((p) => `=== Page ${startPage + p.pageNumber - 1} ===\n${p.text}`)
      .join("\n\n");
    return {
      text: formatted,
      method: "raster-ocr-sparse",
      pageCount: rasterResult.pageCount,
      totalChars: rasterResult.totalChars,
    };
  }

  if (textLayerResult.totalChars > 0) {
    const formatted = textLayerResult.pages
      .map((p) => `=== Page ${startPage + p.pageNumber - 1} ===\n${p.text}`)
      .join("\n\n");
    return {
      text: formatted,
      method: "text-layer-sparse",
      pageCount: textLayerResult.pageCount,
      totalChars: textLayerResult.totalChars,
    };
  }

  throw new Error(t("ocr.noTextExtracted", { range: pageRange }));
}
