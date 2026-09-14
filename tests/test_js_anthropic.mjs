import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
  ANTHROPIC_MESSAGES_PATH,
  buildMessages,
  buildRequestBody,
  extractText,
  transcribeBatch,
} from "../docs/js/anthropic.js";
import { setLocale } from "../docs/js/i18n.js";

before(() => {
  setLocale("en");
});

function jsonResponse(status, payload) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
  };
}

test("Anthropic request sends a native PDF document part and user effort", () => {
  const body = buildRequestBody({
    model: "claude-sonnet-5",
    effort: "medium",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
  });
  assert.equal(body.model, "claude-sonnet-5");
  assert.equal(body.max_tokens, 16384);
  assert.deepEqual(body.output_config, { effort: "medium" });
  assert.equal(body.messages[0].content[0].type, "document");
  assert.equal(body.messages[0].content[0].source.type, "base64");
  assert.equal(body.messages[0].content[0].source.media_type, "application/pdf");
  assert.equal(typeof body.messages[0].content[0].source.data, "string");
  assert.equal(body.messages[0].content[1].type, "text");
});

test("extractText skips Anthropic thinking blocks", () => {
  const text = extractText({
    content: [
      { type: "thinking", thinking: "internal" },
      { type: "text", text: "Lesson title" },
      { type: "text", text: "Directions." },
    ],
  });
  assert.equal(text, "Lesson title\nDirections.");
});

test("clarify turns after the PDF are text-only assistant and user messages", () => {
  const messages = buildMessages({
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    clarifyHistory: [{ question: "Is the figure a pie chart?", answer: "Yes, a pie chart." }],
  });
  assert.equal(messages.length, 3);
  assert.equal(messages[0].content[0].type, "document");
  assert.equal(messages[1].role, "assistant");
  assert.equal(typeof messages[1].content, "string");
  assert.match(messages[1].content, /CLARIFY:/);
  assert.equal(messages[2].role, "user");
  assert.equal(typeof messages[2].content, "string");
  assert.match(messages[2].content, /Yes, a pie chart/);
});

test("transcribeBatch posts to the local Anthropic proxy with effort", async () => {
  let url;
  let headers;
  let body;
  const markdown = await transcribeBatch({
    apiKey: "sk-ant-test",
    model: "claude-opus-5",
    effort: "high",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    fetchImpl: async (requestUrl, options) => {
      url = requestUrl;
      headers = options.headers;
      body = JSON.parse(options.body);
      return jsonResponse(200, {
        content: [
          { type: "thinking", thinking: "skip me" },
          { type: "text", text: "Lesson title" },
        ],
      });
    },
  });
  assert.equal(markdown, "Lesson title");
  assert.equal(url, ANTHROPIC_MESSAGES_PATH);
  assert.equal(headers["x-api-key"], "sk-ant-test");
  assert.equal(headers["anthropic-version"], "2023-06-01");
  assert.equal(body.output_config.effort, "high");
  assert.equal(body.model, "claude-opus-5");
});

test("401 from Anthropic is not retried", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      transcribeBatch({
        apiKey: "bad",
        startPage: 1,
        endPage: 5,
        pdfBytes: new Uint8Array([1, 2, 3, 4]),
        maxRetries: 8,
        fetchImpl: async () => {
          calls += 1;
          return jsonResponse(401, { error: { message: "invalid x-api-key" } });
        },
        sleepFn: async () => {
          throw new Error("should not wait on 401");
        },
      }),
    /invalid x-api-key/
  );
  assert.equal(calls, 1);
});

test("429 from Anthropic retries the same batch", async () => {
  let calls = 0;
  const markdown = await transcribeBatch({
    apiKey: "sk-ant-test",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    maxRetries: 4,
    fetchImpl: async () => {
      calls += 1;
      if (calls < 2) {
        return jsonResponse(429, { error: { message: "rate limited" } });
      }
      return jsonResponse(200, { content: [{ type: "text", text: "Lesson title" }] });
    },
    sleepFn: async () => {},
  });
  assert.equal(markdown, "Lesson title");
  assert.equal(calls, 2);
});
