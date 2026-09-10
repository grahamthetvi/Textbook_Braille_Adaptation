/** Gemini generateContent client. Calls Google directly from the browser. */

import { STYLE_RULES, buildInterpretationPrompt, pageRangeLabel } from "./prompt.js";
import { stripModelFences } from "./validate.js";

export const DEFAULT_MODEL = "gemini-2.5-flash";

export const MODEL_OPTIONS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (recommended)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

export function describeGeminiError(payload, status) {
  const message = payload?.error?.message || payload?.error?.status || "";
  if (status === 429) {
    return "Rate limited. Waiting, then retrying this batch.";
  }
  if (status === 401 || status === 403 || /API key/i.test(message)) {
    return message || "API key was rejected. Check the key and try again.";
  }
  if (payload?.promptFeedback?.blockReason) {
    return `Gemini blocked this batch: ${payload.promptFeedback.blockReason}`;
  }
  return message || `Gemini request failed (HTTP ${status}).`;
}

export async function transcribeBatch({
  apiKey,
  model = DEFAULT_MODEL,
  startPage,
  endPage,
  pdfBytes,
  proxyUrl = "",
  signal,
  maxRetries = 4,
}) {
  const pageRange = pageRangeLabel(startPage, endPage);
  const body = {
    system_instruction: {
      parts: [{ text: STYLE_RULES }],
    },
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: "application/pdf",
              data: bytesToBase64(pdfBytes),
            },
          },
          { text: buildInterpretationPrompt(pageRange) },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  };

  const trimmedProxy = (proxyUrl || "").trim().replace(/\/$/, "");
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException("Adaptation cancelled", "AbortError");
    }

    let response;
    try {
      if (trimmedProxy) {
        response = await fetch(`${trimmedProxy}/models/${encodeURIComponent(model)}:generateContent`, {
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
        response = await fetch(url, {
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
      lastError = new Error(
        "Could not reach Gemini. If this page is blocked from calling Google, run python3 scripts/serve_adapter.py and use that local address, or set a proxy URL."
      );
      await sleep(1000 * (attempt + 1));
      continue;
    }

    const payload = await response.json().catch(() => ({}));
    if (response.status === 429 || response.status === 503) {
      lastError = new Error(describeGeminiError(payload, response.status));
      const waitMs = Math.min(16000, 1000 * 2 ** attempt);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(describeGeminiError(payload, response.status));
    }

    const text = stripModelFences(extractText(payload));
    if (!text) {
      throw new Error("Gemini returned empty text for this batch.");
    }
    return text;
  }

  throw lastError || new Error("Gemini request failed after retries.");
}
