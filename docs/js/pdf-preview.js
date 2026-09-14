/** Rasterize a one-page PDF for on-screen review using pdf.js. */

function requirePdfJs() {
  const lib = window.pdfjsLib;
  if (!lib?.getDocument) {
    throw new Error("pdf.js failed to load. Check docs/vendor/pdf.min.js.");
  }
  if (!lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = new URL(
      "../vendor/pdf.worker.min.js",
      import.meta.url
    ).href;
  }
  return lib;
}

export async function renderPageCanvas(pdfBytes, { scale = 1.35 } = {}) {
  const lib = requirePdfJs();
  const data = pdfBytes instanceof Uint8Array ? pdfBytes.slice() : new Uint8Array(pdfBytes);
  const loadingTask = lib.getDocument({ data });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create a drawing context for the page preview.");
    }
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas;
  } finally {
    await pdf.destroy();
  }
}
