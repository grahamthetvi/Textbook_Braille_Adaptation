/** Turn sideways scanned pages upright before a model sees the batch. */

import { detectQuarterTurns } from "./orient.js";
import { renderPdfPageGrayscale } from "./pdf-preview.js";
import { rewritePdfOrientation } from "./pdf-turn.js";

export async function straightenPdfBytes(pdfBytes, options = {}) {
  const renderPages = options.renderPages || renderPdfPageGrayscale;
  const frames = await renderPages(pdfBytes);
  if (!frames.length) {
    throw new Error("The batch PDF has no pages to orient.");
  }
  const quarterTurns = frames.map(
    (frame) => detectQuarterTurns(frame.gray, frame.width, frame.height).quarterTurns
  );
  const rotatedPages = quarterTurns.reduce((count, turns) => count + (turns ? 1 : 0), 0);
  if (!rotatedPages) {
    return { bytes: pdfBytes, quarterTurns, rotatedPages: 0 };
  }
  const bytes = await rewritePdfOrientation(pdfBytes, quarterTurns);
  return { bytes, quarterTurns, rotatedPages };
}
