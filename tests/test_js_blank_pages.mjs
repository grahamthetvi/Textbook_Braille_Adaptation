import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
  EMPTY_BATCH_MESSAGE,
  isBlankBatchError,
  isBlankTranscription,
  pagePreviewFileName,
  skippedBlankMarkdown,
} from "../docs/js/blank-pages.js";
import { geminiError } from "../docs/js/gemini.js";
import { setLocale } from "../docs/js/i18n.js";
import { validateMarkdown } from "../docs/js/validate.js";

before(() => {
  setLocale("en");
});

test("empty and whitespace-only transcriptions are blank", () => {
  assert.equal(isBlankTranscription(""), true);
  assert.equal(isBlankTranscription("   \n\n  "), true);
  assert.equal(isBlankTranscription(null), true);
});

test("section-break-only output is treated as blank", () => {
  assert.equal(isBlankTranscription("---"), true);
  assert.equal(isBlankTranscription("---\n\n---\n"), true);
});

test("real lesson text is not blank", () => {
  assert.equal(isBlankTranscription("Chapter 3"), false);
  assert.equal(isBlankTranscription("Tip: Read the sentence.\n\n---\n"), false);
  assert.equal(isBlankTranscription("CLARIFY:\nIs the figure a pie chart?"), false);
});

test("skipped blank markdown names the page range and passes validation", () => {
  const one = skippedBlankMarkdown(6, 6);
  const range = skippedBlankMarkdown(6, 10);
  assert.equal(
    one,
    "Transcriber note: Source page 006 was blank and skipped after visual review."
  );
  assert.equal(
    range,
    "Transcriber note: Source pages 006-010 were blank and skipped after visual review."
  );
  assert.deepEqual(validateMarkdown(one), []);
  assert.deepEqual(validateMarkdown(range), []);
});

test("empty Gemini error is a blank-batch error, not a retryable failure", () => {
  const err = geminiError(EMPTY_BATCH_MESSAGE);
  assert.equal(isBlankBatchError(err), true);
  assert.equal(isBlankBatchError(geminiError("API key was rejected.")), false);
  assert.equal(isBlankBatchError(null), false);
  assert.equal(pagePreviewFileName(6), "source-page-006.pdf");
});
