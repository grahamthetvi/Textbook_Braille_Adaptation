import assert from "node:assert/strict";
import { test } from "node:test";
import { parseClarify } from "../docs/js/prompt.js";
import {
  HEADING_CONTEXT_INTRO,
  formatHeadingContext,
  headingLevelForLine,
  headingMapFromBatches,
  headingMismatchWarnings,
  mergeHeadingMap,
  missingHeadingsWarning,
  normalizeHeadingTitle,
  parseHeadingsResponse,
} from "../docs/js/headings.js";

test("parseHeadingsResponse splits body from a trailing HEADINGS block", () => {
  const parsed = parseHeadingsResponse(
    "MODULE 2: PARTS OF SPEECH\n\nNOUNS\n\nHEADINGS:\n1|MODULE 2: PARTS OF SPEECH\n2|NOUNS\n"
  );
  assert.equal(parsed.hasTrailer, true);
  assert.equal(parsed.body, "MODULE 2: PARTS OF SPEECH\n\nNOUNS");
  assert.deepEqual(parsed.headings, [
    { level: 1, title: "MODULE 2: PARTS OF SPEECH" },
    { level: 2, title: "NOUNS" },
  ]);
});

test("parseHeadingsResponse ignores missing trailers and invalid rows", () => {
  assert.deepEqual(parseHeadingsResponse("Lesson title\n\n1. Identify adjectives"), {
    body: "Lesson title\n\n1. Identify adjectives",
    headings: [],
    hasTrailer: false,
  });
  const parsed = parseHeadingsResponse("Title\n\nHEADINGS:\n7|Too deep\nnot-a-row\n2|Ok\n");
  assert.deepEqual(parsed.headings, [{ level: 2, title: "Ok" }]);
  assert.equal(parseHeadingsResponse("").hasTrailer, false);
});

test("CLARIFY takes precedence over a HEADINGS trailer", () => {
  const text = "Draft\n\nHEADINGS:\n1|Title\n\nCLARIFY:\nIs this a map?";
  assert.equal(parseClarify(text), "Is this a map?");
  const mixed = "Draft\n\nCLARIFY:\nIs this a map?\n\nHEADINGS:\n1|Title";
  assert.match(parseClarify(mixed), /Is this a map\?/);
  assert.equal(parseHeadingsResponse("Draft\n\nHEADINGS:\n1|Title").hasTrailer, true);
});

test("mergeHeadingMap replaces entries for a retried page range", () => {
  const first = mergeHeadingMap([], { startPage: 1, endPage: 5 }, [
    { level: 1, title: "MODULE 1: THE SENTENCE" },
  ]);
  const second = mergeHeadingMap(first, { startPage: 6, endPage: 10 }, [
    { level: 1, title: "MODULE 2: PARTS OF SPEECH" },
  ]);
  const retried = mergeHeadingMap(second, { startPage: 1, endPage: 5 }, [
    { level: 1, title: "Module 1 The Sentence" },
    { level: 2, title: "Sentence Sense" },
  ]);
  assert.equal(retried.length, 3);
  assert.equal(retried[0].title, "Module 1 The Sentence");
  assert.equal(retried[0].startPage, 1);
  assert.equal(retried[2].title, "MODULE 2: PARTS OF SPEECH");
});

test("formatHeadingContext lists H-levels and caps long maps", () => {
  assert.equal(formatHeadingContext([]), "");
  const context = formatHeadingContext([
    { level: 1, title: "MODULE 1: THE SENTENCE" },
    { level: 2, title: "Sentence Sense" },
  ]);
  assert.ok(context.includes(HEADING_CONTEXT_INTRO));
  assert.match(context, /H1 MODULE 1: THE SENTENCE/);
  assert.match(context, /H2 Sentence Sense/);

  const many = [];
  for (let i = 1; i <= 40; i += 1) {
    many.push({ level: i === 1 ? 1 : 2, title: `Item ${i}` });
  }
  const capped = formatHeadingContext(many);
  assert.match(capped, /H1 Item 1/);
  assert.match(capped, /H2 Item 40/);
  assert.doesNotMatch(capped, /H2 Item 2\n/);
});

test("headingMapFromBatches uses completed batches only", () => {
  const map = headingMapFromBatches([
    { status: "done", startPage: 1, endPage: 5, headings: [{ level: 1, title: "Cover" }] },
    { status: "pending", startPage: 6, endPage: 10, headings: [{ level: 1, title: "Skip" }] },
    { status: "done", skippedBlank: true, startPage: 11, endPage: 15, headings: [] },
  ]);
  assert.deepEqual(map, [{ level: 1, title: "Cover", startPage: 1, endPage: 5 }]);
});

test("heading mismatch warnings compare normalized title lines", () => {
  const body = "__MODULE 2: PARTS OF SPEECH__\n\nNOUNS";
  const warnings = headingMismatchWarnings(
    body,
    [
      { level: 1, title: "MODULE 2: PARTS OF SPEECH" },
      { level: 2, title: "NOUNS" },
      { level: 2, title: "Missing title" },
    ],
    "pages-016-020"
  );
  assert.deepEqual(warnings, [
    'pages-016-020: heading "Missing title" was listed but not found in the body',
  ]);
  assert.equal(missingHeadingsWarning(false, body, "pages-016-020"), "pages-016-020: no HEADINGS trailer");
  assert.equal(missingHeadingsWarning(true, body, "pages-016-020"), "");
  assert.equal(normalizeHeadingTitle("__NOUNS__"), "NOUNS");
});

test("headingLevelForLine uses exact then case-insensitive titles", () => {
  const map = [
    { level: 1, title: "MODULE 2: PARTS OF SPEECH" },
    { level: 2, title: "NOUNS" },
  ];
  assert.equal(headingLevelForLine("MODULE 2: PARTS OF SPEECH", map), 1);
  assert.equal(headingLevelForLine("nouns", map), 2);
  assert.equal(headingLevelForLine("__NOUNS__", map), 2);
  assert.equal(headingLevelForLine("A regular sentence.", map), 0);
});
