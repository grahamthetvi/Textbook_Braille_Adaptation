/** Anthropic Messages API client. Reaches Claude through the local adapter proxy. */

import { t } from "./i18n.js";
import {
  bytesToBase64,
  isMissingLocalProxy,
  requestError,
  RETRYABLE_MAX_RETRIES,
  retryingFetchJson,
  sleep,
} from "./http.js";
import { MAX_OUTPUT_TOKENS, normalizeEffort } from "./models.js";
import {
  buildInterpretationPrompt,
  buildStyleRules,
  formatClarifyFollowUp,
  formatClarifyModelTurn,
  pageRangeLabel,
} from "./prompt.js";
import { stripModelFences } from "./validate.js";

export const ANTHROPIC_MESSAGES_PATH = "/api/anthropic/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";

export function extractText(payload) {
  return (payload?.content || [])
    .filter((block) => block?.type === "text")
    .map((block) => block.text || "")
    .join("\n")
    .trim();
}

export function describeAnthropicError(payload, status, options = {}) {
  const exhausted = Boolean(options?.exhausted);
  const message = payload?.error?.message || payload?.error?.type || "";
  if (isMissingLocalProxy(status)) {
    return t("alert.needLocalServer");
  }
  if (status === 429) {
    return exhausted ? t("gemini.rateLimitExhausted") : t("gemini.rateLimitRetrying");
  }
  if (status === 503 || status === 529) {
    return exhausted ? t("anthropic.unavailableExhausted") : t("anthropic.unavailableRetrying");
  }
  if (status === 401 || status === 403) {
    return message || t("anthropic.keyRejected");
  }
  return message || t("anthropic.requestFailed", { status });
}

export function buildMessages({
  startPage,
  endPage,
  pdfBytes,
  latexMath = false,
  clarifyHistory = [],
  locale = "en",
  emptyRetry = false,
}) {
  const pageRange = pageRangeLabel(startPage, endPage);
  const messages = [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: bytesToBase64(pdfBytes),
          },
        },
        { type: "text", text: buildInterpretationPrompt(pageRange, { latexMath, locale, emptyRetry }) },
      ],
    },
  ];
  for (const turn of clarifyHistory || []) {
    const turnLocale = turn.locale || locale;
    messages.push({
      role: "assistant",
      content: formatClarifyModelTurn(turn, { locale: turnLocale }),
    });
    messages.push({
      role: "user",
      content: formatClarifyFollowUp(turn.answer, { draft: turn.draft, locale: turnLocale }),
    });
  }
  return messages;
}

export function buildRequestBody({
  model = DEFAULT_CLAUDE_MODEL,
  effort = "medium",
  startPage,
  endPage,
  pdfBytes,
  latexMath = false,
  clarifyHistory = [],
  locale = "en",
  emptyRetry = false,
}) {
  return {
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: buildStyleRules(latexMath, { locale }),
    output_config: { effort: normalizeEffort("anthropic", effort) },
    messages: buildMessages({
      startPage,
      endPage,
      pdfBytes,
      latexMath,
      clarifyHistory,
      locale,
      emptyRetry,
    }),
  };
}

export async function transcribeBatch({
  apiKey,
  model = DEFAULT_CLAUDE_MODEL,
  effort = "medium",
  startPage,
  endPage,
  pdfBytes,
  signal,
  maxRetries = RETRYABLE_MAX_RETRIES,
  onRetry,
  fetchImpl = globalThis.fetch,
  sleepFn = sleep,
  latexMath = false,
  clarifyHistory = [],
  locale = "en",
  emptyRetry = false,
}) {
  const body = buildRequestBody({
    model,
    effort,
    startPage,
    endPage,
    pdfBytes,
    latexMath,
    clarifyHistory,
    locale,
    emptyRetry,
  });

  const payload = await retryingFetchJson({
    signal,
    maxRetries,
    onRetry,
    sleepFn,
    describeError: describeAnthropicError,
    unreachableMessage: t("alert.needLocalServer"),
    failedAfterRetriesMessage: t("anthropic.failedAfterRetries"),
    makeRequest: () =>
      fetchImpl(ANTHROPIC_MESSAGES_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal,
      }),
  });

  const text = stripModelFences(extractText(payload));
  if (!text) {
    throw requestError(t("gemini.empty"));
  }
  return text;
}
