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
