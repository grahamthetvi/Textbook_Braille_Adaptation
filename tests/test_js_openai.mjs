import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
  OPENAI_RESPONSES_PATH,
  buildInput,
  buildRequestBody,
  extractOutputText,
  transcribeBatch,
} from "../docs/js/openai.js";
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

test("OpenAI request sends input_file with high detail and user effort", () => {
  const body = buildRequestBody({
    model: "gpt-5.6-luna",
    effort: "low",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
  });
  assert.equal(body.model, "gpt-5.6-luna");
  assert.equal(body.max_output_tokens, 16384);
  assert.deepEqual(body.reasoning, { effort: "low" });
  assert.equal(body.reasoning.mode, undefined);
  const file = body.input[0].content[0];
  assert.equal(file.type, "input_file");
  assert.equal(file.detail, "high");
  assert.match(file.file_data, /^data:application\/pdf;base64,/);
  assert.match(file.filename, /pages-001-005\.pdf/);
});

test("extractOutputText skips reasoning items", () => {
  const text = extractOutputText({
    output: [
      { type: "reasoning", content: [{ type: "output_text", text: "hidden" }] },
      {
        type: "message",
        content: [{ type: "output_text", text: "Lesson title" }],
      },
    ],
  });
  assert.equal(text, "Lesson title");
});

test("extractOutputText prefers the output_text convenience field", () => {
  assert.equal(extractOutputText({ output_text: " Lesson title " }), "Lesson title");
});

test("clarify turns after the PDF are text-only", () => {
  const input = buildInput({
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    clarifyHistory: [{ question: "Is this a map?", answer: "Yes." }],
  });
  assert.equal(input.length, 3);
  assert.equal(input[0].content[0].type, "input_file");
  assert.equal(input[1].role, "assistant");
  assert.equal(input[2].role, "user");
  assert.equal(input[2].content[0].type, "input_text");
  assert.match(input[2].content[0].text, /Yes\./);
});

test("transcribeBatch posts to the local OpenAI proxy with effort", async () => {
  let url;
  let headers;
  let body;
  const markdown = await transcribeBatch({
    apiKey: "sk-test",
    model: "gpt-5.6-terra",
    effort: "medium",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    fetchImpl: async (requestUrl, options) => {
      url = requestUrl;
      headers = options.headers;
      body = JSON.parse(options.body);
      return jsonResponse(200, { output_text: "Lesson title" });
    },
  });
  assert.equal(markdown, "Lesson title");
  assert.equal(url, OPENAI_RESPONSES_PATH);
  assert.equal(headers.Authorization, "Bearer sk-test");
  assert.equal(body.reasoning.effort, "medium");
  assert.equal(body.input[0].content[0].detail, "high");
});
