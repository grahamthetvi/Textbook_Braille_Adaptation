import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_MODEL,
  RATE_LIMIT_EXHAUSTED,
  RATE_LIMIT_RETRYING,
  RETRYABLE_MAX_RETRIES,
  UNAVAILABLE_EXHAUSTED,
  UNAVAILABLE_RETRYING,
  buildGenerationConfig,
  describeGeminiError,
  extractText,
  isRetryableHttpStatus,
  retryDelayMs,
  transcribeBatch,
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

test("429 and 503 are retryable HTTP statuses", () => {
  assert.equal(isRetryableHttpStatus(429), true);
  assert.equal(isRetryableHttpStatus(503), true);
  assert.equal(isRetryableHttpStatus(400), false);
  assert.equal(isRetryableHttpStatus(401), false);
  assert.equal(isRetryableHttpStatus(500), false);
});

test("in-progress 429/503 copy says it is waiting and retrying", () => {
  assert.equal(describeGeminiError({}, 429), RATE_LIMIT_RETRYING);
  assert.equal(describeGeminiError({}, 503), UNAVAILABLE_RETRYING);
  assert.match(RATE_LIMIT_RETRYING, /Waiting, then retrying this batch/);
  assert.equal(RETRYABLE_MAX_RETRIES > 4, true);
});

test("exhausted 429/503 copy does not claim it is still retrying", () => {
  assert.equal(describeGeminiError({}, 429, { exhausted: true }), RATE_LIMIT_EXHAUSTED);
  assert.equal(describeGeminiError({}, 503, { exhausted: true }), UNAVAILABLE_EXHAUSTED);
  assert.doesNotMatch(RATE_LIMIT_EXHAUSTED, /Waiting, then retrying/);
  assert.doesNotMatch(UNAVAILABLE_EXHAUSTED, /Waiting, then retrying/);
  assert.match(RATE_LIMIT_EXHAUSTED, /rate limited after retries/i);
});

test("retry delay uses capped exponential backoff", () => {
  assert.equal(retryDelayMs(0), 1000);
  assert.equal(retryDelayMs(1), 2000);
  assert.equal(retryDelayMs(3), 8000);
  assert.equal(retryDelayMs(10), 60_000);
  assert.equal(retryDelayMs(40), 60_000);
});

function jsonResponse(status, payload) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
  };
}

test("429 retries the same batch in place, then succeeds", async () => {
  let calls = 0;
  const events = [];
  const waits = [];
  const markdown = await transcribeBatch({
    apiKey: "test-key",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    maxRetries: 8,
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) {
        return jsonResponse(429, { error: { message: "RESOURCE_EXHAUSTED" } });
      }
      return jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: "Lesson title" }] } }],
      });
    },
    sleepFn: async (ms) => {
      waits.push(ms);
    },
    onRetry: (info) => events.push(info),
  });

  assert.equal(markdown, "Lesson title");
  assert.equal(calls, 3);
  assert.equal(events.length, 2);
  assert.equal(events[0].httpStatus, 429);
  assert.equal(events[0].message, RATE_LIMIT_RETRYING);
  assert.equal(events[0].waitMs, 1000);
  assert.equal(events[1].waitMs, 2000);
  assert.deepEqual(waits, [1000, 2000]);
});

test("exhausted 429 throws honest copy and is not retryable", async () => {
  await assert.rejects(
    () =>
      transcribeBatch({
        apiKey: "test-key",
        startPage: 1,
        endPage: 5,
        pdfBytes: new Uint8Array([1, 2, 3, 4]),
        maxRetries: 2,
        fetchImpl: async () => jsonResponse(429, { error: { message: "RESOURCE_EXHAUSTED" } }),
        sleepFn: async () => {},
      }),
    (err) => {
      assert.equal(err.retryable, false);
      assert.equal(err.httpStatus, 429);
      assert.equal(err.message, RATE_LIMIT_EXHAUSTED);
      assert.doesNotMatch(err.message, /Waiting, then retrying/);
      return true;
    }
  );
});

test("hard 400 errors throw immediately without retrying", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      transcribeBatch({
        apiKey: "test-key",
        startPage: 1,
        endPage: 5,
        pdfBytes: new Uint8Array([1, 2, 3, 4]),
        maxRetries: 8,
        fetchImpl: async () => {
          calls += 1;
          return jsonResponse(400, { error: { message: "API key not valid. Please pass a valid API key." } });
        },
        sleepFn: async () => {
          throw new Error("should not wait on a hard error");
        },
      }),
    /API key not valid/
  );
  assert.equal(calls, 1);
});


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
