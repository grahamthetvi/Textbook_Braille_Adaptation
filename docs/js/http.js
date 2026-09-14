/** Shared HTTP helpers for Gemini, Claude, OpenAI, and Ollama clients. */

import { t } from "./i18n.js";

/** Rate limits are transient; keep retrying the current batch much longer than a handful of 429s. */
export const RETRYABLE_MAX_RETRIES = 40;
export const RETRY_BASE_MS = 1000;
export const RETRY_CAP_MS = 60_000;

export function bytesToBase64(bytes) {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException(t("gemini.cancelled"), "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException(t("gemini.cancelled"), "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function isRetryableHttpStatus(status) {
  return status === 429 || status === 503 || status === 529;
}

export function retryDelayMs(attempt, { baseMs = RETRY_BASE_MS, capMs = RETRY_CAP_MS } = {}) {
  const n = Math.max(0, Number(attempt) || 0);
  return Math.min(capMs, baseMs * 2 ** n);
}

export function requestError(message, { retryable = false, httpStatus = 0 } = {}) {
  const err = new Error(message);
  err.retryable = Boolean(retryable);
  err.httpStatus = httpStatus;
  return err;
}

export function isMissingLocalProxy(status) {
  return status === 404 || status === 405;
}

export async function retryingFetchJson({
  makeRequest,
  signal,
  maxRetries = RETRYABLE_MAX_RETRIES,
  onRetry,
  fetchImpl: _fetchImpl,
  sleepFn = sleep,
  isNonRetryablePayload = () => false,
  describeError,
  unreachableMessage,
  failedAfterRetriesMessage,
}) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException(t("gemini.cancelled"), "AbortError");
    }

    let response;
    try {
      response = await makeRequest();
    } catch (err) {
      if (err?.name === "AbortError") {
        throw err;
      }
      lastError = requestError(unreachableMessage, {
        retryable: attempt < maxRetries,
      });
      if (attempt < maxRetries) {
        await sleepFn(1000 * (attempt + 1), signal);
        continue;
      }
      break;
    }

    const payload = await response.json().catch(() => ({}));
    if (isRetryableHttpStatus(response.status) && !isNonRetryablePayload(payload)) {
      const willRetry = attempt < maxRetries;
      const message = describeError(payload, response.status, { exhausted: !willRetry });
      lastError = requestError(message, {
        retryable: willRetry,
        httpStatus: response.status,
      });
      if (willRetry) {
        const waitMs = retryDelayMs(attempt);
        onRetry?.({
          httpStatus: response.status,
          waitMs,
          attempt: attempt + 1,
          maxRetries,
          message,
        });
        await sleepFn(waitMs, signal);
        continue;
      }
      break;
    }

    if (!response.ok) {
      throw requestError(describeError(payload, response.status), {
        retryable: false,
        httpStatus: response.status,
      });
    }

    return payload;
  }

  throw lastError || requestError(failedAfterRetriesMessage);
}
