/** OpenAI Responses API client. Reaches GPT-5.6 through the local adapter proxy. */

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

export const OPENAI_RESPONSES_PATH = "/api/openai/v1/responses";
export const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";

export function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const chunks = [];
  for (const item of payload?.output || []) {
    if (item?.type === "reasoning") {
      continue;
    }
    const parts = item?.content || [];
    for (const part of parts) {
      if (part?.type === "output_text" || part?.type === "text") {
        chunks.push(part.text || "");
      }
    }
  }
  return chunks.join("\n").trim();
}

export function describeOpenAIError(payload, status, options = {}) {
  const exhausted = Boolean(options?.exhausted);
  const message = payload?.error?.message || payload?.error?.type || "";
  if (isMissingLocalProxy(status)) {
    return t("alert.needLocalServer");
  }
  if (status === 429) {
    return exhausted ? t("gemini.rateLimitExhausted") : t("gemini.rateLimitRetrying");
  }
  if (status === 503 || status === 529) {
    return exhausted ? t("openai.unavailableExhausted") : t("openai.unavailableRetrying");
  }
  if (status === 401 || status === 403) {
    return message || t("openai.keyRejected");
  }
  return message || t("openai.requestFailed", { status });
}

export function buildInput({
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
  const input = [
    {
      role: "user",
      content: [
        {
          type: "input_file",
          filename: `pages-${pageRange}.pdf`,
          file_data: `data:application/pdf;base64,${bytesToBase64(pdfBytes)}`,
          detail: "high",
        },
        {
          type: "input_text",
          text: buildInterpretationPrompt(pageRange, { latexMath, locale, emptyRetry, headingContext }),
        },
      ],
    },
  ];
  for (const turn of clarifyHistory || []) {
    const turnLocale = turn.locale || locale;
    input.push({
      role: "assistant",
      content: [{ type: "output_text", text: formatClarifyModelTurn(turn, { locale: turnLocale }) }],
    });
    input.push({
      role: "user",
      content: [
        {
          type: "input_text",
          text: formatClarifyFollowUp(turn.answer, { draft: turn.draft, locale: turnLocale }),
        },
      ],
    });
  }
  return input;
}

export function buildRequestBody({
  model = DEFAULT_OPENAI_MODEL,
  effort = "low",
  startPage,
  endPage,
  pdfBytes,
  latexMath = false,
  clarifyHistory = [],
  locale = "en",
  emptyRetry = false,
  headingContext = "",
}) {
  return {
    model,
    instructions: buildStyleRules(latexMath, { locale }),
    max_output_tokens: MAX_OUTPUT_TOKENS,
    reasoning: { effort: normalizeEffort("openai", effort) },
    input: buildInput({
      startPage,
      endPage,
      pdfBytes,
      latexMath,
      clarifyHistory,
      locale,
      emptyRetry,
      headingContext,
    }),
  };
}

export async function transcribeBatch({
  apiKey,
  model = DEFAULT_OPENAI_MODEL,
  effort = "low",
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
  headingContext = "",
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
    headingContext,
  });

  const payload = await retryingFetchJson({
    signal,
    maxRetries,
    onRetry,
    sleepFn,
    describeError: describeOpenAIError,
    unreachableMessage: t("alert.needLocalServer"),
    failedAfterRetriesMessage: t("openai.failedAfterRetries"),
    makeRequest: () =>
      fetchImpl(OPENAI_RESPONSES_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      }),
  });

  const text = stripModelFences(extractOutputText(payload));
  if (!text) {
    throw requestError(t("gemini.empty"));
  }
  return text;
}
