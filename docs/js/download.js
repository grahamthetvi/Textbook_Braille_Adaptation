/** Combine batch markdown and trigger downloads. */

import { batchFileStem } from "./batches.js";

function requireJsZip() {
  if (!window.JSZip) {
    throw new Error("JSZip failed to load. Check docs/vendor/jszip.min.js.");
  }
  return window.JSZip;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function combinedMarkdown(results, sourceName) {
  const header = [
    `Source: ${sourceName}`,
    `Batches: ${results.length}`,
    "",
  ].join("\n");
  const body = results
    .map((item) => `---\n\n${item.markdown.trim()}\n`)
    .join("\n");
  return `${header}${body}`.trim() + "\n";
}

export function downloadCombined(results, sourceName) {
  const stem = sourceName.replace(/\.pdf$/i, "") || "textbook";
  const text = combinedMarkdown(results, sourceName);
  downloadBlob(new Blob([text], { type: "text/markdown;charset=utf-8" }), `${stem}-accessible.md`);
}

export async function downloadZip(results, sourceName) {
  const JSZip = requireJsZip();
  const zip = new JSZip();
  const folderName = (sourceName.replace(/\.pdf$/i, "") || "textbook").replace(/[^\w.-]+/g, "_");
  const folder = zip.folder(folderName);
  results.forEach((item) => {
    const name = `${batchFileStem(item.startPage, item.endPage)}.md`;
    folder.file(name, item.markdown.trim() + "\n");
  });
  folder.file("_combined.md", combinedMarkdown(results, sourceName));
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${folderName}-accessible.zip`);
}
