/** Detect empty Gemini output and write a skip note after visual review. */

import { padPage } from "./batches.js";
import { messageMatches } from "./i18n.js";
import { en } from "./locales/en.js";

export const EMPTY_BATCH_MESSAGE = en["gemini.empty"];

/** Markdown left in the download when the user confirms a batch was blank. */
export function skippedBlankMarkdown(startPage, endPage) {
  const start = padPage(startPage);
  const end = padPage(endPage);
  if (startPage === endPage) {
    return `Transcriber note: Source page ${start} was blank and skipped after visual review.`;
  }
  return `Transcriber note: Source pages ${start}-${end} were blank and skipped after visual review.`;
}

export function isBlankTranscription(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return true;
  }
  return lines.every((line) => line === "---");
}

export function isBlankBatchError(err) {
  return Boolean(err) && messageMatches(String(err.message || ""), "gemini.empty");
}

export function pagePreviewFileName(pageNumber) {
  return `source-page-${padPage(pageNumber)}.pdf`;
}
