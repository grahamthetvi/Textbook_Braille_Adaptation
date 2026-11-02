/** Order and classify a group of page pictures. Each file is one source page. */

export const MAX_IMAGE_EDGE = 2400;

const IMAGE_EXTENSIONS = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
};

function extensionOf(name) {
  const match = String(name || "")
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

export function imageMime(file) {
  const fromName = IMAGE_EXTENSIONS[extensionOf(file?.name)];
  if (fromName) {
    return fromName;
  }
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/")) {
    return type;
  }
  return "";
}

export function fileKind(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (imageMime(file)) {
    return "image";
  }
  return "other";
}

/** One PDF, or any number of pictures. Mixed selections are rejected. */
export function classifySourceFiles(fileList) {
  const files = [...(fileList || [])];
  if (!files.length) {
    return { kind: "empty", files };
  }
  const kinds = files.map(fileKind);
  if (kinds.every((kind) => kind === "pdf")) {
    return { kind: files.length === 1 ? "pdf" : "many-pdfs", files };
  }
  if (kinds.every((kind) => kind === "image")) {
    return { kind: "images", files };
  }
  if (kinds.some((kind) => kind === "pdf") && kinds.some((kind) => kind === "image")) {
    return { kind: "mixed", files };
  }
  return { kind: "unsupported", files };
}

/** Filename order, with page-2 before page-10. */
export function naturalNameCompare(left, right) {
  const a = String(left || "").toLowerCase();
  const b = String(right || "").toLowerCase();
  const split = (value) => value.split(/(\d+)/).filter((part) => part.length > 0);
  const aParts = split(a);
  const bParts = split(b);
  const count = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < count; index += 1) {
    const aPart = aParts[index] ?? "";
    const bPart = bParts[index] ?? "";
    const aNumber = /^\d+$/.test(aPart);
    const bNumber = /^\d+$/.test(bPart);
    if (aNumber && bNumber) {
      const diff = Number(aPart) - Number(bPart);
      if (diff !== 0) {
        return diff;
      }
    } else if (aPart !== bPart) {
      return aPart < bPart ? -1 : 1;
    }
  }
  return 0;
}

export function sortImageFiles(files) {
  return [...files].sort((left, right) => naturalNameCompare(left?.name, right?.name));
}

export function fitEdge(width, height, maxEdge = MAX_IMAGE_EDGE) {
  const safeWidth = Math.max(1, Math.round(Number(width) || 0));
  const safeHeight = Math.max(1, Math.round(Number(height) || 0));
  const edge = Math.max(safeWidth, safeHeight);
  if (edge <= maxEdge) {
    return { width: safeWidth, height: safeHeight, scale: 1 };
  }
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
    scale,
  };
}

export function sliceImagePages(pages, startPage, endPage) {
  return pages.slice(startPage - 1, endPage);
}
