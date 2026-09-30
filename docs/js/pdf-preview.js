/** Rasterize PDF pages with pdf.js for on-screen review and Ollama vision. */

export function requirePdfJs() {
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

function canvasToPngBase64(canvas) {
  const dataUrl = canvas.toDataURL("image/png");
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export async function renderPdfPagesToPngBase64(pdfBytes, { scale = 2 } = {}) {
  const lib = requirePdfJs();
  const data = pdfBytes instanceof Uint8Array ? pdfBytes.slice() : new Uint8Array(pdfBytes);
  const loadingTask = lib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const images = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Could not create a drawing context for the page preview.");
      }
      await page.render({ canvasContext: context, viewport }).promise;
      images.push(canvasToPngBase64(canvas));
    }
    return images;
  } finally {
    await pdf.destroy();
  }
}

/** Low-resolution grayscale frames for orientation detection. */
export async function renderPdfPageGrayscale(pdfBytes, { maxEdge = 640 } = {}) {
  const lib = requirePdfJs();
  const data = pdfBytes instanceof Uint8Array ? pdfBytes.slice() : new Uint8Array(pdfBytes);
  const loadingTask = lib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const frames = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = maxEdge / Math.max(base.width, base.height, 1);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const width = Math.max(1, Math.round(viewport.width));
      const height = Math.max(1, Math.round(viewport.height));
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("Could not create a drawing context for page orientation.");
      }
      await page.render({ canvasContext: context, viewport }).promise;
      const image = context.getImageData(0, 0, width, height);
      const gray = new Uint8Array(width * height);
      const pixels = image.data;
      for (let i = 0, pixel = 0; i < pixels.length; i += 4, pixel += 1) {
        gray[pixel] = (pixels[i] * 54 + pixels[i + 1] * 183 + pixels[i + 2] * 19) >> 8;
      }
      frames.push({ gray, width, height });
    }
    return frames;
  } finally {
    await pdf.destroy();
  }
}
