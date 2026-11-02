/** Decode page pictures, cap their size, and turn sideways shots upright. */

import { detectQuarterTurns } from "./orient.js";
import { fitEdge, imageMime, sortImageFiles } from "./image-pages.js";

const JPEG_QUALITY = 0.92;
const ORIENT_EDGE = 640;

function yieldToUi() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function decodeImageBitmap(bytes, mime) {
  const blob = new Blob([bytes], { type: mime || "application/octet-stream" });
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(blob);
  }
}

function canvasFromBitmap(bitmap, width, height, quarterTurns = 0) {
  const turns = ((quarterTurns % 4) + 4) % 4;
  const canvas = document.createElement("canvas");
  const swapped = turns % 2 === 1;
  canvas.width = swapped ? height : width;
  canvas.height = swapped ? width : height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not draw the picture.");
  }
  if (turns) {
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((turns * Math.PI) / 2);
    context.drawImage(bitmap, -width / 2, -height / 2, width, height);
  } else {
    context.drawImage(bitmap, 0, 0, width, height);
  }
  return canvas;
}

function grayFromCanvas(canvas) {
  const context = canvas.getContext("2d");
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  const gray = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0, pixel = 0; i < pixels.length; i += 4, pixel += 1) {
    gray[pixel] = (pixels[i] * 54 + pixels[i + 1] * 183 + pixels[i + 2] * 19) >> 8;
  }
  return { gray, width: canvas.width, height: canvas.height };
}

async function canvasToBytes(canvas, mime) {
  const type = mime === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, type, JPEG_QUALITY);
  });
  if (!blob) {
    throw new Error("Could not encode the picture.");
  }
  return { mime: type, bytes: new Uint8Array(await blob.arrayBuffer()) };
}

function outputName(name, mime) {
  const base = String(name || "page").replace(/\.[^.]+$/, "") || "page";
  return mime === "image/png" ? `${base}.png` : `${base}.jpg`;
}

async function normalizePage(page, decode) {
  const bitmap = await decode(page.bytes, page.mime);
  try {
    const fitted = fitEdge(bitmap.width, bitmap.height);
    const canvas = canvasFromBitmap(bitmap, fitted.width, fitted.height, 0);
    const encoded = await canvasToBytes(
      canvas,
      page.mime === "image/png" ? "image/png" : "image/jpeg"
    );
    return {
      name: outputName(page.name, encoded.mime),
      mime: encoded.mime,
      bytes: encoded.bytes,
    };
  } finally {
    bitmap.close?.();
  }
}

export async function prepareImagePages(files, { onProgress, decode = decodeImageBitmap } = {}) {
  const sorted = sortImageFiles(files);
  const pages = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const file = sorted[index];
    if (onProgress) {
      onProgress(index + 1, sorted.length, file.name);
    }
    const mime = imageMime(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      pages.push(await normalizePage({ name: file.name, mime, bytes }, decode));
    } catch {
      const err = new Error(file.name);
      err.pictureName = file.name;
      throw err;
    }
    await yieldToUi();
  }
  return pages;
}

async function grayFrame(page, decode) {
  const bitmap = await decode(page.bytes, page.mime);
  try {
    const fitted = fitEdge(bitmap.width, bitmap.height, ORIENT_EDGE);
    const canvas = canvasFromBitmap(bitmap, fitted.width, fitted.height, 0);
    return grayFromCanvas(canvas);
  } finally {
    bitmap.close?.();
  }
}

async function rotatePage(page, quarterTurns, decode) {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (!turns) {
    return page;
  }
  const bitmap = await decode(page.bytes, page.mime);
  try {
    const canvas = canvasFromBitmap(bitmap, bitmap.width, bitmap.height, turns);
    const mime = page.mime === "image/png" ? "image/png" : "image/jpeg";
    const encoded = await canvasToBytes(canvas, mime);
    return { name: outputName(page.name, encoded.mime), mime: encoded.mime, bytes: encoded.bytes };
  } finally {
    bitmap.close?.();
  }
}

export async function straightenImagePages(pages, { decode = decodeImageBitmap } = {}) {
  if (!pages?.length) {
    throw new Error("This picture batch has no pages to orient.");
  }
  const quarterTurns = [];
  for (const page of pages) {
    const frame = await grayFrame(page, decode);
    quarterTurns.push(detectQuarterTurns(frame.gray, frame.width, frame.height).quarterTurns);
  }
  const rotatedPages = quarterTurns.reduce((count, turns) => count + (turns ? 1 : 0), 0);
  if (!rotatedPages) {
    return { pages, quarterTurns, rotatedPages: 0 };
  }
  const next = [];
  for (let index = 0; index < pages.length; index += 1) {
    next.push(await rotatePage(pages[index], quarterTurns[index], decode));
  }
  return { pages: next, quarterTurns, rotatedPages };
}
