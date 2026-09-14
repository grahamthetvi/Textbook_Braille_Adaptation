/** Local Ollama vision client. Rasterizes batch pages and chats through the adapter proxy. */

import { t } from "./i18n.js";
import {
  isMissingLocalProxy,
  requestError,
  RETRYABLE_MAX_RETRIES,
  retryingFetchJson,
  sleep,
} from "./http.js";
import { DEFAULT_OLLAMA_URL, normalizeEffort } from "./models.js";
import { renderPdfPagesToPngBase64 } from "./pdf-preview.js";
import {
  buildInterpretationPrompt,
  buildStyleRules,
  formatClarifyFollowUp,
  formatClarifyModelTurn,
  pageRangeLabel,
} from "./prompt.js";
import { stripModelFences } from "./validate.js";

export const OLLAMA_TAGS_PATH = "/api/ollama/api/tags";
export const OLLAMA_CHAT_PATH = "/api/ollama/api/chat";
export const DEFAULT_OLLAMA_MODEL = "qwen2.5vl";

export function ollamaThink(effort) {
  return normalizeEffort("ollama", effort) === "on";
}

export function extractText(payload) {
  const content = payload?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  return "";
}

export function describeOllamaError(payload, status, options = {}) {
  const exhausted = Boolean(options?.exhausted);
  const raw = payload?.error;
  const text = typeof raw === "string" ? raw : String(raw?.message || "");
  if (isMissingLocalProxy(status)) {
    return t("ollama.notLocal");
  }
  if (status === 400 && /loopback|not allowed/i.test(text)) {
    return t("ollama.loopbackOnly");
  }
  if (status === 429) {
    return exhausted ? t("gemini.rateLimitExhausted") : t("gemini.rateLimitRetrying");
  }
  if (status === 503 || status === 529) {
    return exhausted ? t("ollama.unavailableExhausted") : t("ollama.unavailableRetrying");
  }
  return text || t("ollama.requestFailed", { status });
}

export function buildChatMessages({
  startPage,
  endPage,
  images,
  latexMath = false,
  clarifyHistory = [],
  locale = "en",
  emptyRetry = false,
}) {
  const pageRange = pageRangeLabel(startPage, endPage);
  const messages = [
    { role: "system", content: buildStyleRules(latexMath, { locale }) },
    {
      role: "user",
      content: buildInterpretationPrompt(pageRange, { latexMath, locale, emptyRetry }),
      images,
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

export function ollamaHeaders(ollamaUrl = DEFAULT_OLLAMA_URL) {
  return {
    "Content-Type": "application/json",
    "x-ollama-url": (ollamaUrl || DEFAULT_OLLAMA_URL).trim() || DEFAULT_OLLAMA_URL,
  };
}

export async function listOllamaModels({
  ollamaUrl = DEFAULT_OLLAMA_URL,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  const response = await fetchImpl(OLLAMA_TAGS_PATH, {
    method: "GET",
    headers: ollamaHeaders(ollamaUrl),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw requestError(describeOllamaError(payload, response.status), {
      retryable: false,
      httpStatus: response.status,
    });
  }
  return (payload?.models || [])
    .map((item) => item?.name || item?.model || "")
    .filter(Boolean);
}

function shouldFallbackToPerPage(err, imageCount) {
  if (imageCount < 2) {
    return false;
  }
  if (err?.name === "AbortError") {
    return false;
  }
  const status = Number(err?.httpStatus) || 0;
  if (status === 401 || status === 403) {
    return false;
  }
  if (status === 429 || status === 503 || status === 529) {
    return false;
  }
  return true;
}

async function chatOnce({
  model,
  effort,
  ollamaUrl,
  startPage,
  endPage,
  images,
  signal,
  maxRetries,
  onRetry,
  fetchImpl,
  sleepFn,
  latexMath,
  clarifyHistory,
  locale,
  emptyRetry,
}) {
  const body = {
    model,
    stream: false,
    think: ollamaThink(effort),
    messages: buildChatMessages({
      startPage,
      endPage,
      images,
      latexMath,
      clarifyHistory,
      locale,
      emptyRetry,
    }),
  };

  const payload = await retryingFetchJson({
    signal,
    maxRetries,
    onRetry,
    sleepFn,
    describeError: describeOllamaError,
    unreachableMessage: t("ollama.notLocal"),
    failedAfterRetriesMessage: t("ollama.failedAfterRetries"),
    makeRequest: () =>
      fetchImpl(OLLAMA_CHAT_PATH, {
        method: "POST",
        headers: ollamaHeaders(ollamaUrl),
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

export async function transcribeBatch({
  model = DEFAULT_OLLAMA_MODEL,
  effort = "off",
  ollamaUrl = DEFAULT_OLLAMA_URL,
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
  rasterizePages = renderPdfPagesToPngBase64,
}) {
  const images = await rasterizePages(pdfBytes, { scale: 2 });
  if (!images.length) {
    throw requestError(t("ollama.noPages"));
  }

  try {
    return await chatOnce({
      model,
      effort,
      ollamaUrl,
      startPage,
      endPage,
      images,
      signal,
      maxRetries,
      onRetry,
      fetchImpl,
      sleepFn,
      latexMath,
      clarifyHistory,
      locale,
      emptyRetry,
    });
  } catch (err) {
    if (!shouldFallbackToPerPage(err, images.length)) {
      throw err;
    }
  }

  const parts = [];
  for (let index = 0; index < images.length; index += 1) {
    const page = Number(startPage) + index;
    const text = await chatOnce({
      model,
      effort,
      ollamaUrl,
      startPage: page,
      endPage: page,
      images: [images[index]],
      signal,
      maxRetries,
      onRetry,
      fetchImpl,
      sleepFn,
      latexMath,
      clarifyHistory,
      locale,
      emptyRetry,
    });
    parts.push(text);
  }
  const joined = parts.filter(Boolean).join("\n\n").trim();
  if (!joined) {
    throw requestError(t("gemini.empty"));
  }
  return joined;
}
