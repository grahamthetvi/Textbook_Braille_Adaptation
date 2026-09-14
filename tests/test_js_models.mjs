import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CUSTOM_MODEL_VALUE,
  DEFAULT_MODEL,
  MODEL_GROUPS,
  OLLAMA_SENTINEL,
  effortAfterProviderChange,
  effortSpec,
  isValidEffort,
  providerForModel,
  recommendedEffort,
} from "../docs/js/models.js";
import { transcribeBatch } from "../docs/js/transcribe.js";
import { ANTHROPIC_MESSAGES_PATH } from "../docs/js/anthropic.js";
import { OPENAI_RESPONSES_PATH } from "../docs/js/openai.js";
import { OLLAMA_CHAT_PATH } from "../docs/js/ollama.js";

function jsonResponse(status, payload) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
  };
}

test("default model is gemini-3.8-flash", () => {
  assert.equal(DEFAULT_MODEL, "gemini-3.8-flash");
});

test("Gemini catalog is only 3.8 Flash and 3.1 Pro", () => {
  const gemini = MODEL_GROUPS.find((group) => group.provider === "gemini");
  assert.deepEqual(
    gemini.models.map((model) => model.value),
    ["gemini-3.8-flash", "gemini-3.1-pro-preview"]
  );
  const ids = MODEL_GROUPS.flatMap((group) => group.models.map((model) => model.value));
  assert.equal(ids.includes("gemini-2.5-flash"), false);
  assert.equal(ids.includes("gemini-2.5-pro"), false);
  assert.equal(ids.includes("gemini-2.0-flash"), false);
});

test("provider lookup uses catalog ids and prefixes", () => {
  assert.equal(providerForModel("gemini-3.8-flash"), "gemini");
  assert.equal(providerForModel("gemini-3.1-pro-preview"), "gemini");
  assert.equal(providerForModel(CUSTOM_MODEL_VALUE), "gemini");
  assert.equal(providerForModel("claude-sonnet-5"), "anthropic");
  assert.equal(providerForModel("claude-opus-5"), "anthropic");
  assert.equal(providerForModel("gpt-5.6-luna"), "openai");
  assert.equal(providerForModel(OLLAMA_SENTINEL), "ollama");
  assert.equal(providerForModel("gemini-2.5-flash"), "gemini");
});

test("recommended effort defaults match the cheaper OCR settings", () => {
  assert.equal(recommendedEffort("gemini"), "medium");
  assert.equal(recommendedEffort("anthropic"), "medium");
  assert.equal(recommendedEffort("openai"), "low");
  assert.equal(recommendedEffort("ollama"), "off");
  assert.equal(effortSpec("openai").effortValues.includes("none"), true);
  assert.equal(isValidEffort("gemini", "xhigh"), false);
  assert.equal(isValidEffort("anthropic", "max"), true);
});

test("switching provider keeps effort when still valid, otherwise uses the recommendation", () => {
  assert.equal(effortAfterProviderChange("anthropic", "medium"), "medium");
  assert.equal(effortAfterProviderChange("openai", "high"), "high");
  assert.equal(effortAfterProviderChange("ollama", "medium"), "off");
  assert.equal(effortAfterProviderChange("gemini", "off"), "medium");
  assert.equal(effortAfterProviderChange("gemini", "xhigh"), "medium");
  assert.equal(effortAfterProviderChange("openai", "none"), "none");
});

test("transcribeBatch dispatches Claude, OpenAI, and Ollama by model id", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push(url);
    const body = JSON.parse(options.body || "{}");
    if (url === ANTHROPIC_MESSAGES_PATH) {
      return jsonResponse(200, { content: [{ type: "text", text: "Claude" }] });
    }
    if (url === OPENAI_RESPONSES_PATH) {
      return jsonResponse(200, { output_text: "OpenAI" });
    }
    if (url === OLLAMA_CHAT_PATH) {
      assert.equal(body.model, "qwen2.5vl");
      return jsonResponse(200, { message: { content: "Ollama" } });
    }
    return jsonResponse(200, {
      candidates: [{ content: { parts: [{ text: "Gemini" }] } }],
    });
  };
  const pdfBytes = new Uint8Array([1, 2, 3, 4]);
  assert.equal(
    await transcribeBatch({
      apiKey: "k",
      model: "claude-sonnet-5",
      startPage: 1,
      endPage: 2,
      pdfBytes,
      fetchImpl,
    }),
    "Claude"
  );
  assert.equal(
    await transcribeBatch({
      apiKey: "k",
      model: "gpt-5.6-luna",
      startPage: 1,
      endPage: 2,
      pdfBytes,
      fetchImpl,
    }),
    "OpenAI"
  );
  assert.equal(
    await transcribeBatch({
      model: OLLAMA_SENTINEL,
      ollamaModel: "qwen2.5vl",
      startPage: 1,
      endPage: 2,
      pdfBytes,
      rasterizePages: async () => ["img"],
      fetchImpl,
    }),
    "Ollama"
  );
  assert.deepEqual(seen, [ANTHROPIC_MESSAGES_PATH, OPENAI_RESPONSES_PATH, OLLAMA_CHAT_PATH]);
});
