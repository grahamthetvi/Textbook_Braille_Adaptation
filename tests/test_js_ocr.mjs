import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
  extractBatchOcrText,
  formatPageTextItems,
  isRecitationError,
  extractPdfTextLayer,
} from "../docs/js/ocr.js";
import {
  buildOcrCleanupPrompt,
  LATEX_MATH_INSTRUCTION,
  PLAIN_MATH_INSTRUCTION,
} from "../docs/js/prompt.js";
import {
  emptyOutputError,
  buildTranscribeContents,
  transcribeBatch,
} from "../docs/js/gemini.js";
import { buildRequestBody as buildAnthropicBody } from "../docs/js/anthropic.js";
import { buildInput as buildOpenAIInput } from "../docs/js/openai.js";
import { buildChatMessages as buildOllamaMessages } from "../docs/js/ollama.js";
import { setLocale } from "../docs/js/i18n.js";

before(() => {
  setLocale("en");
});

test("isRecitationError detects recitation from finishReason and message", () => {
  assert.equal(isRecitationError(null), false);
  assert.equal(isRecitationError(undefined), false);
  assert.equal(isRecitationError(new Error("Rate limit exceeded")), false);
  assert.equal(isRecitationError(new Error("Gemini returned empty text for this batch.")), false);

  assert.equal(isRecitationError({ finishReason: "RECITATION" }), true);
  assert.equal(isRecitationError({ recitation: true }), true);
  assert.equal(
    isRecitationError(
      new Error(
        "Gemini returned no text (finish reason: RECITATION). This batch was not treated as blank pages."
      )
    ),
    true
  );
  assert.equal(isRecitationError(new Error("Recitation filter blocked response")), true);
});

test("emptyOutputError sets finishReason on the error object", () => {
  const payload = {
    candidates: [{ finishReason: "RECITATION" }],
  };
  const err = emptyOutputError(payload);
  assert.equal(err.finishReason, "RECITATION");
  assert.match(err.message, /RECITATION/);
  assert.equal(isRecitationError(err), true);
});

test("buildOcrCleanupPrompt formats raw OCR text with style and headings instructions", () => {
  const prompt = buildOcrCleanupPrompt("001-006", "Raw scanned text of lesson.", {
    latexMath: false,
    locale: "en",
  });
  assert.match(prompt, /optical character recognition \(OCR\)/);
  assert.match(prompt, /001-006/);
  assert.match(prompt, /Strip running headers, footers, and lone page numbers/);
  assert.match(prompt, /Rejoin line-break hyphens/);
  assert.match(prompt, /HEADINGS trailer/);
  assert.match(prompt, /--- RAW OCR TEXT \(pages 001-006\) ---/);
  assert.match(prompt, /Raw scanned text of lesson\./);
  assert.equal(prompt.includes(PLAIN_MATH_INSTRUCTION), true);
  assert.equal(prompt.includes(LATEX_MATH_INSTRUCTION), false);
});

test("buildOcrCleanupPrompt includes LaTeX math and heading context when requested", () => {
  const prompt = buildOcrCleanupPrompt("007-012", "x + y = 10", {
    latexMath: true,
    locale: "en",
    headingContext: "H1 MODULE 1: ALGEBRA",
  });
  assert.equal(prompt.includes(LATEX_MATH_INSTRUCTION), true);
  assert.equal(prompt.includes("H1 MODULE 1: ALGEBRA"), true);
});

test("buildOcrCleanupPrompt adapts unclearToken and marker for Spanish and Arabic", () => {
  const esPrompt = buildOcrCleanupPrompt("001-005", "Texto en español", { locale: "es" });
  assert.match(esPrompt, /\(poco claro\)/);
  assert.match(esPrompt, /Spanish/);

  const arPrompt = buildOcrCleanupPrompt("001-005", "نص عربي", { locale: "ar" });
  assert.match(arPrompt, /\(غير واضح\)/);
  assert.match(arPrompt, /Arabic/);
});

test("formatPageTextItems groups items by y coordinate and sorts lines top to bottom", () => {
  const items = [
    { str: "Subheading", transform: [12, 0, 0, 12, 50, 700] },
    { str: "Title Part 1", transform: [14, 0, 0, 14, 50, 750] },
    { str: "Part 2", transform: [14, 0, 0, 14, 150, 750] },
    { str: "Body paragraph line 1", transform: [10, 0, 0, 10, 50, 650] },
    { str: "   ", transform: [10, 0, 0, 10, 50, 640] }, // whitespace only
  ];

  const formatted = formatPageTextItems(items);
  const lines = formatted.split("\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], "Title Part 1 Part 2");
  assert.equal(lines[1], "Subheading");
  assert.equal(lines[2], "Body paragraph line 1");
});

test("formatPageTextItems returns empty string for empty or whitespace-only items", () => {
  assert.equal(formatPageTextItems([]), "");
  assert.equal(formatPageTextItems(null), "");
  assert.equal(formatPageTextItems([{ str: "  " }, { str: "" }]), "");
});

test("extractBatchOcrText returns text-layer when PDF text layer has >= 30 chars", async () => {
  const mockPdfLib = {
    getDocument() {
      return {
        promise: Promise.resolve({
          numPages: 2,
          getPage(pageNum) {
            return Promise.resolve({
              getTextContent() {
                if (pageNum === 1) {
                  return Promise.resolve({
                    items: [
                      { str: "Chapter One: The Great Solar Exploration Begins", transform: [12, 0, 0, 12, 50, 750] },
                      { str: "Astronauts prepared for their departure into deep space.", transform: [10, 0, 0, 10, 50, 720] },
                    ],
                  });
                }
                return Promise.resolve({
                  items: [
                    { str: "Chapter One continued: Planetary Orbit Details", transform: [12, 0, 0, 12, 50, 750] },
                  ],
                });
              },
            });
          },
          destroy() {
            return Promise.resolve();
          },
        }),
      };
    },
  };

  const result = await extractBatchOcrText(new Uint8Array([1, 2, 3]), {
    startPage: 1,
    endPage: 2,
    pdfLib: mockPdfLib,
  });

  assert.equal(result.method, "text-layer");
  assert.equal(result.pageCount, 2);
  assert.match(result.text, /=== Page 1 ===/);
  assert.match(result.text, /Chapter One: The Great Solar Exploration Begins/);
  assert.match(result.text, /=== Page 2 ===/);
  assert.match(result.text, /Planetary Orbit Details/);
});

test("extractBatchOcrText falls back to raster OCR when text layer is empty", async () => {
  const mockPdfLib = {
    getDocument() {
      return {
        promise: Promise.resolve({
          numPages: 1,
          getPage() {
            return Promise.resolve({
              getTextContent() {
                return Promise.resolve({ items: [] });
              },
              getViewport() {
                return { width: 100, height: 100 };
              },
              render() {
                return { promise: Promise.resolve() };
              },
            });
          },
          destroy() {
            return Promise.resolve();
          },
        }),
      };
    },
  };

  // Mock document.createElement for canvas if running in Node
  const originalCreateElement = globalThis.document?.createElement;
  globalThis.document = {
    createElement(tag) {
      if (tag === "canvas") {
        return {
          getContext() {
            return {};
          },
        };
      }
      return {};
    },
  };

  const mockTesseract = {
    recognize() {
      return Promise.resolve({
        data: {
          text: "Scanned textbook page text extracted via raster OCR from the book.",
        },
      });
    },
  };

  try {
    let progressReported = null;
    const result = await extractBatchOcrText(new Uint8Array([1, 2, 3]), {
      startPage: 5,
      endPage: 5,
      pdfLib: mockPdfLib,
      tesseractLib: mockTesseract,
      onProgress(key, params) {
        progressReported = { key, params };
      },
    });

    assert.equal(result.method, "raster-ocr");
    assert.match(result.text, /=== Page 5 ===/);
    assert.match(result.text, /Scanned textbook page text/);
    assert.equal(progressReported?.key, "status.ocrExtractingPage");
    assert.equal(progressReported?.params?.page, 5);
  } finally {
    if (originalCreateElement) {
      globalThis.document.createElement = originalCreateElement;
    }
  }
});

test("extractBatchOcrText throws when both text layer and raster OCR return nothing", async () => {
  const mockPdfLib = {
    getDocument() {
      return {
        promise: Promise.resolve({
          numPages: 1,
          getPage() {
            return Promise.resolve({
              getTextContent() {
                return Promise.resolve({ items: [] });
              },
              getViewport() {
                return { width: 100, height: 100 };
              },
              render() {
                return { promise: Promise.resolve() };
              },
            });
          },
          destroy() {
            return Promise.resolve();
          },
        }),
      };
    },
  };

  await assert.rejects(
    async () => {
      await extractBatchOcrText(new Uint8Array([1, 2, 3]), {
        startPage: 1,
        endPage: 1,
        pdfLib: mockPdfLib,
        tesseractLib: null, // no Tesseract available
      });
    },
    /In-browser OCR could not extract readable text from pages 001-001/
  );
});

test("buildTranscribeContents sends OCR text cleanup prompt without PDF inline_data", () => {
  const contents = buildTranscribeContents({
    startPage: 1,
    endPage: 6,
    pdfBytes: new Uint8Array([1, 2, 3]),
    ocrText: "Sample OCR raw extracted text",
  });

  assert.equal(contents.length, 1);
  assert.equal(contents[0].role, "user");
  assert.equal(contents[0].parts.length, 1);
  assert.equal(Boolean(contents[0].parts[0].inline_data), false);
  assert.match(contents[0].parts[0].text, /optical character recognition \(OCR\)/);
  assert.match(contents[0].parts[0].text, /Sample OCR raw extracted text/);
});

test("transcribeBatch sends ocrText payload to Gemini generateContent", async () => {
  let capturedBody = null;
  const mockFetch = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "Cleaned and accessible lesson text.\n\nHEADINGS:\n1|LESSON ONE",
                },
              ],
            },
          },
        ],
      }),
    };
  };

  const result = await transcribeBatch({
    apiKey: "fake-key",
    startPage: 1,
    endPage: 6,
    pdfBytes: new Uint8Array([1, 2, 3]),
    ocrText: "Extracted raw OCR text for lesson 1.",
    fetchImpl: mockFetch,
  });

  assert.match(result, /Cleaned and accessible lesson text/);
  assert.match(result, /HEADINGS:\n1\|LESSON ONE/);
  assert.equal(capturedBody.contents[0].parts.length, 1);
  assert.equal(Boolean(capturedBody.contents[0].parts[0].inline_data), false);
  assert.match(capturedBody.contents[0].parts[0].text, /Extracted raw OCR text for lesson 1\./);
});

test("buildAnthropicBody with ocrText sends text content without PDF document block", () => {
  const body = buildAnthropicBody({
    model: "claude-sonnet-5",
    effort: "medium",
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3]),
    ocrText: "Anthropic raw OCR content",
  });

  assert.equal(body.messages[0].content.length, 1);
  assert.equal(body.messages[0].content[0].type, "text");
  assert.match(body.messages[0].content[0].text, /optical character recognition \(OCR\)/);
  assert.match(body.messages[0].content[0].text, /Anthropic raw OCR content/);
});

test("buildOpenAIInput with ocrText sends input_text without input_file block", () => {
  const input = buildOpenAIInput({
    startPage: 1,
    endPage: 5,
    pdfBytes: new Uint8Array([1, 2, 3]),
    ocrText: "OpenAI raw OCR content",
  });

  assert.equal(input[0].content.length, 1);
  assert.equal(input[0].content[0].type, "input_text");
  assert.match(input[0].content[0].text, /optical character recognition \(OCR\)/);
  assert.match(input[0].content[0].text, /OpenAI raw OCR content/);
});

test("buildOllamaMessages with ocrText sends OCR cleanup prompt and no images", () => {
  const messages = buildOllamaMessages({
    startPage: 1,
    endPage: 5,
    images: [],
    ocrText: "Ollama raw OCR content",
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
  assert.match(messages[1].content, /optical character recognition \(OCR\)/);
  assert.match(messages[1].content, /Ollama raw OCR content/);
  assert.equal(messages[1].images, undefined);
});
