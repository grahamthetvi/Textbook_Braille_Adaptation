import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
  DEFAULT_MODEL,
  EMPTY_BATCH_MESSAGE,
  RATE_LIMIT_EXHAUSTED,
  RATE_LIMIT_RETRYING,
  RETRYABLE_MAX_RETRIES,
  UNAVAILABLE_EXHAUSTED,
  UNAVAILABLE_RETRYING,
  buildGenerationConfig,
  describeGeminiError,
  extractText,
  isNonRetryableResourceExhausted,
  isRetryableHttpStatus,
  retryDelayMs,
  transcribeBatch,
  buildTranscribeContents,
} from "../docs/js/gemini.js";
import { setLocale } from "../docs/js/i18n.js";
import {
  LATEX_MATH_INSTRUCTION,
  PLAIN_MATH_INSTRUCTION,
  STYLE_RULES,
  parseClarify,
} from "../docs/js/prompt.js";
import { stripModelFences } from "../docs/js/validate.js";

before(() => {
  setLocale("en");
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

test("prepayment 429 is not treated as a retryable rate limit", () => {
  const payload = {
    error: {
      message:
        "Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing.",
    },
  };
  assert.equal(isNonRetryableResourceExhausted(payload), true);
  assert.match(describeGeminiError(payload, 429), /prepayment credits are depleted/i);
  assert.equal(isNonRetryableResourceExhausted({ error: { message: "RESOURCE_EXHAUSTED" } }), false);
  assert.equal(describeGeminiError({ error: { message: "RESOURCE_EXHAUSTED" } }, 429), RATE_LIMIT_RETRYING);
});

test("prepayment 429 throws immediately without retrying", async () => {
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
          return jsonResponse(429, {
            error: {
              message:
                "Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing.",
            },
          });
        },
        sleepFn: async () => {
          throw new Error("should not wait on billing exhaustion");
        },
      }),
    /prepayment credits are depleted/
  );
  assert.equal(calls, 1);
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

test("latex-math mode includes LaTeX wrapping instruction in the Gemini request", async () => {
  let body;
  await transcribeBatch({
    apiKey: "test-key",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    latexMath: true,
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: "Lesson title" }] } }],
      });
    },
  });
  const system = body.system_instruction.parts[0].text;
  const user = body.contents[0].parts[1].text;
  assert.equal(system.includes(LATEX_MATH_INSTRUCTION), true);
  assert.equal(user.includes(LATEX_MATH_INSTRUCTION), true);
  assert.equal(user.includes(PLAIN_MATH_INSTRUCTION), false);
});

test("default Gemini request uses plain-text math and screen-reader prompt", async () => {
  let body;
  await transcribeBatch({
    apiKey: "test-key",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: "Lesson title" }] } }],
      });
    },
  });
  const system = body.system_instruction.parts[0].text;
  const user = body.contents[0].parts[1].text;
  assert.equal(system, STYLE_RULES);
  assert.equal(user.includes(PLAIN_MATH_INSTRUCTION), true);
  assert.equal(system.includes("Math LaTeX mode is on"), false);
  assert.match(user, /screen-reader-accessible/);
  assert.doesNotMatch(user, /Grade 2 braille translation/);
});

test("Spanish locale adds a website-language instruction to the Gemini request", async () => {
  let body;
  await transcribeBatch({
    apiKey: "test-key",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    locale: "es",
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: "Lesson title" }] } }],
      });
    },
  });
  const system = body.system_instruction.parts[0].text;
  const user = body.contents[0].parts[1].text;
  assert.match(system, /Website language: Spanish/);
  assert.match(user, /Website language: Spanish/);
  assert.match(system, /ACLARAR:/);
  assert.match(system, /\(poco claro\)/);
  assert.match(system, /do not translate the lesson/i);
});

test("clarify history is sent as a follow-up turn with the same PDF", () => {
  const contents = buildTranscribeContents({
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    clarifyHistory: [{ question: "Is the figure a pie chart?", answer: "Yes, a pie chart." }],
  });
  assert.equal(contents.length, 3);
  assert.equal(contents[0].role, "user");
  assert.equal(contents[1].role, "model");
  assert.equal(contents[1].parts[0].text, "CLARIFY:\nIs the figure a pie chart?");
  assert.equal(contents[2].role, "user");
  assert.match(contents[2].parts[0].text, /Yes, a pie chart/);
  assert.match(contents[2].parts[0].text, /transcribe this batch now/i);
});

test("clarify follow-up in Spanish uses ACLARAR and (poco claro)", () => {
  const contents = buildTranscribeContents({
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    locale: "es",
    clarifyHistory: [{ question: "¿Es un mapa?", answer: "Sí, un mapa." }],
  });
  assert.match(contents[0].parts[1].text, /ACLARAR/);
  assert.match(contents[0].parts[1].text, /\(poco claro\)/);
  assert.equal(contents[1].parts[0].text, "ACLARAR:\n¿Es un mapa?");
  assert.match(contents[2].parts[0].text, /Sí, un mapa/);
  assert.match(contents[2].parts[0].text, /ACLARAR:/);
  assert.match(contents[2].parts[0].text, /\(poco claro\)/);
});

test("a draft plus CLARIFY is sent back so Gemini can finish the batch", () => {
  const contents = buildTranscribeContents({
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    clarifyHistory: [
      {
        question: "Is this a map?",
        answer: "Yes, a map of Virginia.",
        draft: "Lesson title\nDirections: Circle the noun.",
      },
    ],
  });
  assert.equal(contents[1].role, "model");
  assert.match(contents[1].parts[0].text, /^Lesson title/);
  assert.match(contents[1].parts[0].text, /CLARIFY:\nIs this a map\?/);
  assert.match(contents[2].parts[0].text, /Yes, a map of Virginia/);
  assert.match(contents[2].parts[0].text, /draft appears above/i);
});

test("multiple clarify turns keep the same PDF and later Q&A", () => {
  const contents = buildTranscribeContents({
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    clarifyHistory: [
      { question: "Is the figure a pie chart?", answer: "Yes, a pie chart." },
      { question: "Is the printed total 24 or 42?", answer: "24." },
    ],
  });
  assert.equal(contents.length, 5);
  assert.equal(contents[0].parts[0].inline_data.mime_type, "application/pdf");
  assert.equal(contents[3].role, "model");
  assert.equal(contents[3].parts[0].text, "CLARIFY:\nIs the printed total 24 or 42?");
  assert.match(contents[4].parts[0].text, /^24\./);
});

test("transcribeBatch returns a CLARIFY block for the UI to parse", async () => {
  const markdown = await transcribeBatch({
    apiKey: "test-key",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    fetchImpl: async () =>
      jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: "CLARIFY:\nIs the figure a pie chart?" }] } }],
      }),
  });
  assert.equal(markdown, "CLARIFY:\nIs the figure a pie chart?");
  assert.equal(parseClarify(markdown), "Is the figure a pie chart?");
});

test("transcribeBatch draft plus CLARIFY is still parsed as a question", async () => {
  const markdown = await transcribeBatch({
    apiKey: "test-key",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    fetchImpl: async () =>
      jsonResponse(200, {
        candidates: [
          {
            content: {
              parts: [{ text: "Lesson title\n\nCLARIFY:\nIs this a map?" }],
            },
          },
        ],
      }),
  });
  assert.equal(markdown, "Lesson title\n\nCLARIFY:\nIs this a map?");
  assert.equal(parseClarify(markdown), "Is this a map?");
});

test("empty Gemini text throws the dedicated blank-batch message", async () => {
  await assert.rejects(
    () =>
      transcribeBatch({
        apiKey: "test-key",
        startPage: 6,
        endPage: 10,
        pdfBytes: new Uint8Array([1, 2, 3, 4]),
        fetchImpl: async () =>
          jsonResponse(200, {
            candidates: [{ content: { parts: [{ text: "   " }] } }],
          }),
      }),
    (err) => {
      assert.equal(err.message, EMPTY_BATCH_MESSAGE);
      assert.equal(err.retryable, false);
      return true;
    }
  );
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
