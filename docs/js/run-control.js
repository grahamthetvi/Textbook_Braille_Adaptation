/** Stop-on-error helpers for sequential Gemini batch runs. */

import { padPage } from "./batches.js";
import {
  RATE_LIMIT_RETRYING,
  UNAVAILABLE_RETRYING,
  isRetryableHttpStatus,
} from "./gemini.js";
import { messageMatches, t } from "./i18n.js";
import { en } from "./locales/en.js";

export const REMAINING_NOT_SENT = en["runControl.remainingNotSent"];

export const CANCELLED_STATUS = en["runControl.cancelled"];

export function formatPageRange(startPage, endPage) {
  return `${padPage(startPage)}-${padPage(endPage)}`;
}

export function formatRunStoppedAlert(pageRange, errorMessage) {
  return t("runControl.pagesFailed", {
    range: pageRange,
    error: errorMessage,
    remaining: t("runControl.remainingNotSent"),
  });
}

export function formatRunStoppedStatus(pageRange) {
  return t("runControl.stopped", { range: pageRange });
}

export function formatRetryingStatus(pageRange, waitMs = 0, httpStatus = 429) {
  const seconds = Math.max(1, Math.ceil((Number(waitMs) || 0) / 1000));
  const key =
    httpStatus === 503 || httpStatus === 529
      ? "runControl.retryingUnavailable"
      : "runControl.retryingRateLimit";
  return t(key, { range: pageRange, seconds });
}

export function isAbortError(err) {
  return Boolean(err) && err.name === "AbortError";
}

export function isRetryableTranscriptionError(err) {
  if (!err || isAbortError(err)) {
    return false;
  }
  if (err.retryable === true) {
    return true;
  }
  if (err.retryable === false) {
    return false;
  }
  if (isRetryableHttpStatus(err.httpStatus)) {
    return true;
  }
  const message = String(err.message || "");
  return (
    message === RATE_LIMIT_RETRYING ||
    message === UNAVAILABLE_RETRYING ||
    messageMatches(message, "gemini.rateLimitRetrying") ||
    messageMatches(message, "gemini.unavailableRetrying")
  );
}

/**
 * Map a transcription exception onto batch + UI copy.
 * AbortError is cancellation, not a hard failure of completed work.
 * In-progress 429/503 waits stay on the current batch (kind: "retry").
 * Hard errors stop the run so remaining pending batches are not sent.
 */
export function applyTranscriptionError(batch, err) {
  const pageRange = formatPageRange(batch.startPage, batch.endPage);
  if (isAbortError(err)) {
    return {
      kind: "cancel",
      batchStatus: "pending",
      error: "",
      alertMessage: "",
      statusMessage: t("runControl.cancelled"),
      pageRange,
    };
  }

  if (isRetryableTranscriptionError(err)) {
    const waitMs = Number(err.waitMs) || 0;
    const httpStatus = err.httpStatus || 429;
    return {
      kind: "retry",
      batchStatus: "retrying",
      error: "",
      alertMessage: "",
      statusMessage: formatRetryingStatus(pageRange, waitMs, httpStatus),
      pageRange,
    };
  }

  const errorMessage = String(err?.message || t("errors.batchFailed"));
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
 * without sending later pending rows. A retryable wait stays on the current
 * batch and does not mark it failed. Success leaves remaining pending intact
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
