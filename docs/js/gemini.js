/** Gemini generateContent client. Calls Google directly from the browser. */

import { EMPTY_BATCH_MESSAGE } from "./blank-pages.js";
import { t } from "./i18n.js";
import {
  buildInterpretationPrompt,
  buildStyleRules,
  formatClarifyFollowUp,
  formatClarifyModelTurn,
  pageRangeLabel,
} from "./prompt.js";
import { stripModelFences } from "./validate.js";

export { EMPTY_BATCH_MESSAGE };

/** Google Gemini API model id. Do not use Cursor slugs such as gemini-3.8-flash-medium. */
export const DEFAULT_MODEL = "gemini-3.8-flash";

/** Matches Google's default thinking level for 3.8 Flash; enough for faithful OCR. */
export const GEMINI_3_THINKING_LEVEL = "medium";

function modelOption(value, labelKey) {
  return {
    value,
    labelKey,
    get label() {
      return t(labelKey);
    },
  };
}

export const MODEL_OPTIONS = [
  modelOption("gemini-3.8-flash", "gemini.modelFlash38"),
  modelOption("gemini-2.5-flash", "gemini.modelFlash25"),
  modelOption("gemini-2.5-pro", "gemini.modelPro25"),
  modelOption("gemini-2.0-flash", "gemini.modelFlash20"),
];

/** Rate limits are transient; keep retrying the current batch much longer than a handful of 429s. */
export const RETRYABLE_MAX_RETRIES = 40;
export const RETRY_BASE_MS = 1000;
export const RETRY_CAP_MS = 60_000;

export const RATE_LIMIT_RETRYING = "Rate limited. Waiting, then retrying this batch.";
export const RATE_LIMIT_EXHAUSTED = "This batch was rate limited after retries.";
export const UNAVAILABLE_RETRYING =
  "Gemini is temporarily unavailable. Waiting, then retrying this batch.";
export const UNAVAILABLE_EXHAUSTED = "Gemini was temporarily unavailable after retries.";

const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

function bytesToBase64(bytes) {
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

export function usesGemini3Thinking(model) {
  return /^gemini-3(\.|-)/i.test(String(model || "").trim());
}

export function buildGenerationConfig(model) {
  if (usesGemini3Thinking(model)) {
    return {
      thinkingConfig: {
        thinkingLevel: GEMINI_3_THINKING_LEVEL,
      },
    };
  }
  return { temperature: 0.2 };
}

export function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

export function isRetryableHttpStatus(status) {
  return status === 429 || status === 503;
}

/** Billing/quota 429s will not recover by waiting; do not treat them as RPM limits. */
export function isNonRetryableResourceExhausted(payload) {
  const message = String(payload?.error?.message || "");
  if (/prepayment credits are depleted/i.test(message)) {
    return true;
  }
  if (/billing/i.test(message) && /ai\.studio|ai studio/i.test(message)) {
    return true;
  }
  return /quota/i.test(message) && /limit:\s*0/i.test(message);
}

export function retryDelayMs(attempt, { baseMs = RETRY_BASE_MS, capMs = RETRY_CAP_MS } = {}) {
  const n = Math.max(0, Number(attempt) || 0);
  return Math.min(capMs, baseMs * 2 ** n);
}

export function geminiError(message, { retryable = false, httpStatus = 0 } = {}) {
  const err = new Error(message);
  err.retryable = Boolean(retryable);
  err.httpStatus = httpStatus;
  return err;
}

export function describeGeminiError(payload, status, options = {}) {
  const exhausted = Boolean(options?.exhausted);
  const message = payload?.error?.message || payload?.error?.status || "";
  if (status === 429 && isNonRetryableResourceExhausted(payload)) {
    return message.trim() || t("gemini.rateLimitExhausted");
  }
  if (status === 429) {
    return exhausted ? t("gemini.rateLimitExhausted") : t("gemini.rateLimitRetrying");
  }
  if (status === 503) {
    return exhausted ? t("gemini.unavailableExhausted") : t("gemini.unavailableRetrying");
  }
  if (status === 401 || status === 403 || /API key/i.test(message)) {
    return message || t("gemini.apiKeyRejected");
  }
  if (payload?.promptFeedback?.blockReason) {
    return t("gemini.blocked", { reason: payload.promptFeedback.blockReason });
  }
  return message || t("gemini.requestFailed", { status });
}

export function buildTranscribeContents({
  startPage,
  endPage,
  pdfBytes,
  latexMath = false,
  clarifyHistory = [],
  locale = "en",
}) {
  const pageRange = pageRangeLabel(startPage, endPage);
  const contents = [
    {
      role: "user",
      parts: [
        {
          inline_data: {
            mime_type: "application/pdf",
            data: bytesToBase64(pdfBytes),
          },
        },
        { text: buildInterpretationPrompt(pageRange, { latexMath, locale }) },
      ],
    },
  ];
  for (const turn of clarifyHistory || []) {
    const turnLocale = turn.locale || locale;
    contents.push({
      role: "model",
      parts: [{ text: formatClarifyModelTurn(turn, { locale: turnLocale }) }],
    });
    contents.push({
      role: "user",
      parts: [{ text: formatClarifyFollowUp(turn.answer, { draft: turn.draft, locale: turnLocale }) }],
    });
  }
  return contents;
}

export async function transcribeBatch({
  apiKey,
  model = DEFAULT_MODEL,
  startPage,
  endPage,
  pdfBytes,
  proxyUrl = "",
  signal,
  maxRetries = RETRYABLE_MAX_RETRIES,
  onRetry,
  fetchImpl = globalThis.fetch,
  sleepFn = sleep,
  latexMath = false,
  clarifyHistory = [],
  locale = "en",
}) {
  const body = {
    system_instruction: {
      parts: [{ text: buildStyleRules(latexMath, { locale }) }],
    },
    contents: buildTranscribeContents({
      startPage,
      endPage,
      pdfBytes,
      latexMath,
      clarifyHistory,
      locale,
    }),
    generationConfig: buildGenerationConfig(model),
  };

  const trimmedProxy = (proxyUrl || "").trim().replace(/\/$/, "");
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException(t("gemini.cancelled"), "AbortError");
    }

    let response;
    try {
      if (trimmedProxy) {
        response = await fetchImpl(`${trimmedProxy}/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(body),
          signal,
        });
      } else {
        const url = `${DEFAULT_ENDPOINT}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        response = await fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        throw err;
      }
      lastError = geminiError(t("gemini.unreachable"), { retryable: attempt < maxRetries });
      if (attempt < maxRetries) {
        await sleepFn(1000 * (attempt + 1), signal);
        continue;
      }
      break;
    }

    const payload = await response.json().catch(() => ({}));
    if (
      isRetryableHttpStatus(response.status) &&
      !isNonRetryableResourceExhausted(payload)
    ) {
      const willRetry = attempt < maxRetries;
      const message = describeGeminiError(payload, response.status, { exhausted: !willRetry });
      lastError = geminiError(message, {
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
      throw geminiError(describeGeminiError(payload, response.status), {
        retryable: false,
        httpStatus: response.status,
      });
    }

    const text = stripModelFences(extractText(payload));
    if (!text) {
      throw geminiError(EMPTY_BATCH_MESSAGE);
    }
    return text;
  }

  throw lastError || geminiError(t("gemini.failedRetries"));
}
