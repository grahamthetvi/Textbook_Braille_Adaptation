/** Split a source PDF into batch PDFs in the browser using pdf-lib. */

import { planBatches, batchPdfName, batchFileStem } from "./batches.js";
import { t } from "./i18n.js";

function requirePdfLib() {
  const lib = window.PDFLib;
  if (!lib?.PDFDocument) {
    throw new Error(t("pdf.libFailed"));
  }
  return lib;
}

export async function inspectPdf(file) {
  const lib = requirePdfLib();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await lib.PDFDocument.load(bytes, { ignoreEncryption: true });
  return {
    bytes,
    pageCount: pdf.getPageCount(),
    fileName: file.name,
  };
}

export async function splitPdfBytes(sourceBytes, preferredBatchSize = 6) {
  const lib = requirePdfLib();
  const source = await lib.PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const pageCount = source.getPageCount();
  const ranges = planBatches(pageCount, preferredBatchSize);
  const batches = [];

  for (const range of ranges) {
    const batchDoc = await lib.PDFDocument.create();
    const indices = [];
    for (let i = range.startPage - 1; i < range.endPage; i += 1) {
      indices.push(i);
    }
    const copied = await batchDoc.copyPages(source, indices);
    copied.forEach((page) => batchDoc.addPage(page));
    const pdfBytes = await batchDoc.save();
    batches.push({
      startPage: range.startPage,
      endPage: range.endPage,
      pageCount: range.endPage - range.startPage + 1,
      stem: batchFileStem(range.startPage, range.endPage),
      pdfName: batchPdfName(range.startPage, range.endPage),
      bytes: pdfBytes,
    });
  }

  return { pageCount, batches };
}

/**
 * Split a PDF into one-page PDFs for on-screen review.
 * If `pdfBytes` is already the batch (page count matches the range), page 1
 * of that file is `startPage`. Otherwise pages are taken from the full source.
 */
export async function extractPagePdfs(pdfBytes, startPage, endPage) {
  const lib = requirePdfLib();
  const source = await lib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const count = source.getPageCount();
  const expected = endPage - startPage + 1;
  if (expected < 1) {
    throw new Error("Page range is empty.");
  }
  const isBatchSubset = count === expected;
  const pages = [];

  for (let offset = 0; offset < expected; offset += 1) {
    const sourceIndex = isBatchSubset ? offset : startPage - 1 + offset;
    if (sourceIndex < 0 || sourceIndex >= count) {
      throw new Error(`Page ${startPage + offset} is missing from the source PDF.`);
    }
    const pageDoc = await lib.PDFDocument.create();
    const [copied] = await pageDoc.copyPages(source, [sourceIndex]);
    pageDoc.addPage(copied);
    pages.push({
      pageNumber: startPage + offset,
      bytes: await pageDoc.save(),
    });
  }

  return pages;
}
