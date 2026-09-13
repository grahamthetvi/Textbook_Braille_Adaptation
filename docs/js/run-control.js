/** Stop-on-error helpers for sequential Gemini batch runs. */

import { padPage } from "./batches.js";

export const REMAINING_NOT_SENT =
  "Remaining batches were not sent because of this failure.";

export const CANCELLED_STATUS =
  "Cancelled. Completed batches are still available to download.";

export function formatPageRange(startPage, endPage) {
  return `${padPage(startPage)}-${padPage(endPage)}`;
}

export function formatRunStoppedAlert(pageRange, errorMessage) {
  return `pages ${pageRange} failed: ${errorMessage} ${REMAINING_NOT_SENT}`;
}

export function formatRunStoppedStatus(pageRange) {
  return `Stopped after pages ${pageRange} failed. Retry that range, or Adapt book to resume remaining pending batches.`;
}

export function isAbortError(err) {
  return Boolean(err) && err.name === "AbortError";
}

/**
 * Map a transcription exception onto batch + UI copy.
 * AbortError is cancellation, not a hard failure of completed work.
 * Every other error stops the run so remaining pending batches are not sent.
 */
export function applyTranscriptionError(batch, err) {
  const pageRange = formatPageRange(batch.startPage, batch.endPage);
  if (isAbortError(err)) {
    return {
      kind: "cancel",
      batchStatus: "pending",
      error: "",
      alertMessage: "",
      statusMessage: CANCELLED_STATUS,
      pageRange,
    };
  }

  const errorMessage = String(err?.message || "This batch failed.");
  return {
    kind: "stop",
    batchStatus: "error",
    error: errorMessage,
    alertMessage: formatRunStoppedAlert(pageRange, errorMessage),
    statusMessage: formatRunStoppedStatus(pageRange),
    pageRange,
  };
}

/**
 * Walk pending batches left to right. On the first failure or cancel, stop
 * without sending later pending rows. Success leaves remaining pending intact
 * until the next iteration.
 */
export function runPendingBatches(batches, transcribe) {
  const sent = [];
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    if (batch.status !== "pending") {
      continue;
    }

    sent.push(formatPageRange(batch.startPage, batch.endPage));
    const result = transcribe(batch, index);
    if (result?.ok) {
      batch.status = "done";
      batch.markdown = result.markdown || "";
      batch.error = "";
      continue;
    }

    const outcome = applyTranscriptionError(batch, result?.err);
    batch.status = outcome.batchStatus;
    batch.error = outcome.error;
    return { action: outcome.kind, sent, outcome, batches };
  }

  return { action: "finished", sent, outcome: null, batches };
}
