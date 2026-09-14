import assert from "node:assert/strict";
import { test } from "node:test";
import { combinedMarkdown } from "../docs/js/download.js";
import { buildDocxFiles, escapeXml, markdownToDocumentXml, parseInlineRuns } from "../docs/js/docx.js";

test("escapeXml encodes characters that would break OOXML", () => {
  assert.equal(escapeXml("A & B <C>"), "A &amp; B &lt;C&gt;");
});

test("markdownToDocumentXml writes each line as a paragraph", () => {
  const xml = markdownToDocumentXml("Title\n\nTip: Read this.");
  assert.match(xml, /<w:t xml:space="preserve">Title<\/w:t>/);
  assert.match(xml, /<w:t xml:space="preserve">Tip: Read this\.<\/w:t>/);
  assert.match(xml, /<w:p\/>/);
});

test("parseInlineRuns keeps italic, bold, and underline", () => {
  assert.deepEqual(parseInlineRuns("Read _Careful_ and __Note__ then <u>this</u>."), [
    { text: "Read ", bold: false, italic: false, underline: false },
    { text: "Careful", bold: false, italic: true, underline: false },
    { text: " and ", bold: false, italic: false, underline: false },
    { text: "Note", bold: true, italic: false, underline: false },
    { text: " then ", bold: false, italic: false, underline: false },
    { text: "this", bold: false, italic: false, underline: true },
    { text: ".", bold: false, italic: false, underline: false },
  ]);
});

test("parseInlineRuns leaves hyphens and math spans alone", () => {
  assert.deepEqual(parseInlineRuns("Joyner-Kersee and \\(x_1\\)"), [
    { text: "Joyner-Kersee and \\(x_1\\)", bold: false, italic: false, underline: false },
  ]);
});

test("markdownToDocumentXml maps emphasis to Word run properties", () => {
  const xml = markdownToDocumentXml("_italic_ __bold__ <u>under</u>");
  assert.match(xml, /<w:i\/>/);
  assert.match(xml, /<w:b\/>/);
  assert.match(xml, /<w:u w:val="single"\/>/);
  assert.match(xml, />italic</);
  assert.match(xml, />bold</);
  assert.match(xml, />under</);
});

test("section rules become page breaks", () => {
  const xml = markdownToDocumentXml("Batch one\n---\nBatch two");
  assert.match(xml, /<w:br w:type="page"\/>/);
  assert.doesNotMatch(xml, />---</);
});

test("buildDocxFiles includes the required Word parts", () => {
  const files = buildDocxFiles("Lesson title");
  assert.ok(files["[Content_Types].xml"]);
  assert.ok(files["_rels/.rels"]);
  assert.ok(files["word/document.xml"]);
  assert.ok(files["word/styles.xml"]);
  assert.match(files["word/document.xml"], /Lesson title/);
});

test("combined markdown can be turned into a Word document body", () => {
  const markdown = combinedMarkdown(
    [
      { markdown: "First batch & notes" },
      { markdown: "Second batch" },
    ],
    "book.pdf"
  );
  const xml = markdownToDocumentXml(markdown);
  assert.match(xml, /Source: book\.pdf/);
  assert.match(xml, /First batch &amp; notes/);
  assert.match(xml, /Second batch/);
  assert.match(xml, /<w:br w:type="page"\/>/);
});
