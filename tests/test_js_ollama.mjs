import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
  OLLAMA_CHAT_PATH,
  OLLAMA_TAGS_PATH,
  buildChatMessages,
  extractText,
  listOllamaModels,
  ollamaThink,
  transcribeBatch,
} from "../docs/js/ollama.js";
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

test("Ollama think maps effort off/on to false/true", () => {
  assert.equal(ollamaThink("off"), false);
  assert.equal(ollamaThink("on"), true);
  assert.equal(ollamaThink("nope"), false);
});

test("extractText uses message.content and ignores thinking", () => {
  assert.equal(
    extractText({ message: { content: "Lesson title", thinking: "internal" } }),
    "Lesson title"
  );
});

test("chat messages put rasterized pages on the first user turn", () => {
  const messages = buildChatMessages({
    startPage: 1,
    endPage: 3,
    images: ["aaa", "bbb"],
    clarifyHistory: [{ question: "Is this a map?", answer: "Yes." }],
  });
  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
  assert.deepEqual(messages[1].images, ["aaa", "bbb"]);
  assert.equal(messages[2].role, "assistant");
  assert.equal(messages[3].role, "user");
  assert.equal(messages[3].images, undefined);
});

test("transcribeBatch sends images and think:false by default", async () => {
  let url;
  let headers;
  let body;
  const markdown = await transcribeBatch({
    model: "qwen2.5vl",
    effort: "off",
    ollamaUrl: "http://127.0.0.1:11434",
    startPage: 1,
    endPage: 2,
    pdfBytes: new Uint8Array([1, 2, 3, 4]),
    rasterizePages: async () => ["PAGE1", "PAGE2"],
    fetchImpl: async (requestUrl, options) => {
      url = requestUrl;
      headers = options.headers;
      body = JSON.parse(options.body);
      return jsonResponse(200, { message: { content: "Lesson title", thinking: "skip" } });
    },
  });
  assert.equal(markdown, "Lesson title");
  assert.equal(url, OLLAMA_CHAT_PATH);
  assert.equal(headers["x-ollama-url"], "http://127.0.0.1:11434");
  assert.equal(body.stream, false);
  assert.equal(body.think, false);
  assert.deepEqual(body.messages[1].images, ["PAGE1", "PAGE2"]);
});

test("transcribeBatch falls back to one page per turn when the batch request fails", async () => {
  const calls = [];
  const markdown = await transcribeBatch({
    model: "qwen2.5vl",
    startPage: 6,
    endPage: 7,
    pdfBytes: new Uint8Array([1]),
    rasterizePages: async () => ["AAA", "BBB"],
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body.messages[1].images);
      if (body.messages[1].images.length === 2) {
        return jsonResponse(400, { error: "too many images" });
      }
      return jsonResponse(200, {
        message: { content: `Page ${body.messages[1].images[0]}` },
      });
    },
  });
  assert.deepEqual(calls[0], ["AAA", "BBB"]);
  assert.equal(calls.length, 3);
  assert.match(markdown, /Page AAA/);
  assert.match(markdown, /Page BBB/);
});

test("listOllamaModels reads names from /api/tags", async () => {
  let url;
  const tags = await listOllamaModels({
    ollamaUrl: "http://localhost:11434",
    fetchImpl: async (requestUrl, options) => {
      url = requestUrl;
      assert.equal(options.headers["x-ollama-url"], "http://localhost:11434");
      return jsonResponse(200, {
        models: [{ name: "qwen2.5vl:latest" }, { model: "gemma4" }],
      });
    },
  });
  assert.equal(url, OLLAMA_TAGS_PATH);
  assert.deepEqual(tags, ["qwen2.5vl:latest", "gemma4"]);
});
