import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_MODEL,
  buildGenerationConfig,
  describeGeminiError,
  extractText,
} from "../docs/js/gemini.js";
import { stripModelFences } from "../docs/js/validate.js";

test("default Google API model is gemini-3.8-flash", () => {
  assert.equal(DEFAULT_MODEL, "gemini-3.8-flash");
});

test("gemini 3.8 generation config uses thinkingLevel and omits temperature", () => {
  const config = buildGenerationConfig("gemini-3.8-flash");
  assert.deepEqual(config, { thinkingConfig: { thinkingLevel: "medium" } });
});

test("gemini 2.5 generation config keeps temperature", () => {
  const config = buildGenerationConfig("gemini-2.5-flash");
  assert.deepEqual(config, { temperature: 0.2 });
});

test("extractText joins candidate parts", () => {
  const payload = {
    candidates: [{ content: { parts: [{ text: "Hello" }, { text: " world" }] } }],
  };
  assert.equal(extractText(payload), "Hello\n world");
});

test("extractText skips Gemini thought parts", () => {
  const payload = {
    candidates: [
      {
        content: {
          parts: [
            { thought: true, text: "internal reasoning" },
            { text: "Lesson title" },
          ],
        },
      },
    ],
  };
  assert.equal(extractText(payload), "Lesson title");
});

test("stripModelFences removes markdown fences", () => {
  assert.equal(stripModelFences("```markdown\nTitle\n```"), "Title");
});

test("invalid API key error is described", () => {
  const message = describeGeminiError(
    { error: { message: "API key not valid. Please pass a valid API key." } },
    400
  );
  assert.match(message, /API key/i);
});
