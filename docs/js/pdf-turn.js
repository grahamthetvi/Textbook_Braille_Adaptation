/** Bake clockwise quarter-turns into PDF pages.

pdf-lib draws the embedded page with a content transform, so the pixels
themselves are upright. Page size swaps for 90° and 270°. Unchanged pages
are copied as they are.
*/

function requirePdfLib() {
  const lib = globalThis.window?.PDFLib;
  if (!lib?.PDFDocument || !lib?.degrees) {
    throw new Error("pdf-lib failed to load. Check docs/vendor/pdf-lib.min.js.");
  }
  return lib;
}

/** Where to draw a page of `width` by `height` after clockwise quarter-turns. */
export function placementForTurn(width, height, quarterTurns) {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (turns === 1) {
    return { pageWidth: height, pageHeight: width, x: 0, y: width, rotate: -90 };
  }
  if (turns === 2) {
    return { pageWidth: width, pageHeight: height, x: width, y: height, rotate: 180 };
  }
  if (turns === 3) {
    return { pageWidth: height, pageHeight: width, x: height, y: 0, rotate: 90 };
  }
  return { pageWidth: width, pageHeight: height, x: 0, y: 0, rotate: 0 };
}

export async function rewritePdfOrientation(pdfBytes, quarterTurns) {
  const turns = quarterTurns.map((value) => ((value % 4) + 4) % 4);
  if (turns.every((value) => value === 0)) {
    return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  }
  const lib = requirePdfLib();
  const source = await lib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = source.getPageCount();
  if (turns.length !== pageCount) {
    throw new Error(`Expected ${pageCount} orientation values, received ${turns.length}.`);
  }
  const out = await lib.PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    const quarter = turns[index];
    if (quarter === 0) {
      const [copied] = await out.copyPages(source, [index]);
      out.addPage(copied);
      continue;
    }
    const embedded = await out.embedPage(source.getPage(index));
    const place = placementForTurn(embedded.width, embedded.height, quarter);
    const page = out.addPage([place.pageWidth, place.pageHeight]);
    page.drawPage(embedded, {
      x: place.x,
      y: place.y,
      width: embedded.width,
      height: embedded.height,
      rotate: lib.degrees(place.rotate),
    });
  }
  return out.save();
}
