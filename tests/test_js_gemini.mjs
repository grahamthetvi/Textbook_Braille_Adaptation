import assert from "node:assert/strict";
import { test } from "node:test";
import { describeGeminiError, extractText } from "../docs/js/gemini.js";
import { stripModelFences } from "../docs/js/validate.js";

test("extractText joins candidate parts", () => {
  const payload = {
    candidates: [{ content: { parts: [{ text: "Hello" }, { text: " world" }] } }],
  };
  assert.equal(extractText(payload), "Hello\n world");
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
