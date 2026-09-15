/** Gemini generateContent client. Calls Google directly from the browser. */

import { t } from "./i18n.js";
import { en } from "./locales/en.js";
import { EMPTY_BATCH_MESSAGE } from "./blank-pages.js";
import {
  bytesToBase64,
  isMissingLocalProxy,
  isRetryableHttpStatus,
  requestError,
  retryDelayMs,
  retryingFetchJson,
  RETRYABLE_MAX_RETRIES,
  RETRY_BASE_MS,
  RETRY_CAP_MS,
  sleep,
} from "./http.js";
import { DEFAULT_MODEL } from "./models.js";
import {
  buildInterpretationPrompt,
  buildStyleRules,
  formatClarifyFollowUp,
  formatClarifyModelTurn,
  pageRangeLabel,
} from "./prompt.js";
import { stripModelFences } from "./validate.js";

export { EMPTY_BATCH_MESSAGE, DEFAULT_MODEL };
export {
  bytesToBase64,
  isRetryableHttpStatus,
  retryDelayMs,
  RETRYABLE_MAX_RETRIES,
  RETRY_BASE_MS,
  RETRY_CAP_MS,
  sleep,
};

/** Google Gemini API model id. Do not use Cursor slugs such as gemini-3.8-flash-medium. */

/** Matches Google's default thinking level for 3.8 Flash; enough for faithful OCR. */
export const GEMINI_3_THINKING_LEVEL = "medium";

export const RATE_LIMIT_RETRYING = en["gemini.rateLimitRetrying"];
export const RATE_LIMIT_EXHAUSTED = en["gemini.rateLimitExhausted"];
export const UNAVAILABLE_RETRYING = en["gemini.unavailableRetrying"];
export const UNAVAILABLE_EXHAUSTED = en["gemini.unavailableExhausted"];

const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

export function usesGemini3Thinking(model) {
  return /^gemini-3(\.|-)/i.test(String(model || "").trim());
}

export function normalizeGeminiEffort(effort) {
  const value = String(effort || "").trim().toLowerCase();
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return GEMINI_3_THINKING_LEVEL;
}

export function buildGenerationConfig(model, effort = GEMINI_3_THINKING_LEVEL) {
  if (usesGemini3Thinking(model)) {
    return {
      thinkingConfig: {
        thinkingLevel: normalizeGeminiEffort(effort),
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

export function geminiError(message, { retryable = false, httpStatus = 0 } = {}) {
  return requestError(message, { retryable, httpStatus });
}

export function describeGeminiError(payload, status, options = {}) {
  const exhausted = Boolean(options?.exhausted);
  const message = payload?.error?.message || payload?.error?.status || "";
  if (isMissingLocalProxy(status)) {
    return t("gemini.unreachable");
  }
  if (status === 429 && isNonRetryableResourceExhausted(payload)) {
    return message.trim() || t("gemini.rateLimitExhausted");
  }
  if (status === 429) {
    return exhausted ? t("gemini.rateLimitExhausted") : t("gemini.rateLimitRetrying");
  }
  if (status === 503 || status === 529) {
    return exhausted ? t("gemini.unavailableExhausted") : t("gemini.unavailableRetrying");
  }
  if (status === 401 || status === 403 || /API key/i.test(message)) {
    return message || t("gemini.keyRejected");
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
  emptyRetry = false,
  headingContext = "",
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
        { text: buildInterpretationPrompt(pageRange, { latexMath, locale, emptyRetry, headingContext }) },
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
  effort = GEMINI_3_THINKING_LEVEL,
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
  emptyRetry = false,
  headingContext = "",
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
      emptyRetry,
      headingContext,
    }),
    generationConfig: buildGenerationConfig(model, effort),
  };

  const trimmedProxy = (proxyUrl || "").trim().replace(/\/$/, "");

  const payload = await retryingFetchJson({
    signal,
    maxRetries,
    onRetry,
    sleepFn,
    isNonRetryablePayload: isNonRetryableResourceExhausted,
    describeError: describeGeminiError,
    unreachableMessage: t("gemini.unreachable"),
    failedAfterRetriesMessage: t("gemini.failedAfterRetries"),
    makeRequest: async () => {
      if (trimmedProxy) {
        return fetchImpl(`${trimmedProxy}/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(body),
          signal,
        });
      }
      const url = `${DEFAULT_ENDPOINT}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      return fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    },
  });

  const text = stripModelFences(extractText(payload));
  if (!text) {
    throw geminiError(t("gemini.empty"));
  }
  return text;
}
