import assert from "node:assert/strict";
import { test } from "node:test";
import { combinedMarkdown } from "../docs/js/download.js";
import { buildDocxFiles, escapeXml, markdownToDocumentXml } from "../docs/js/docx.js";

test("escapeXml encodes characters that would break OOXML", () => {
  assert.equal(escapeXml("A & B <C>"), "A &amp; B &lt;C&gt;");
});

test("markdownToDocumentXml writes each line as a paragraph", () => {
  const xml = markdownToDocumentXml("Title\n\nTip: Read this.");
  assert.match(xml, /<w:t xml:space="preserve">Title<\/w:t>/);
  assert.match(xml, /<w:t xml:space="preserve">Tip: Read this\.<\/w:t>/);
  assert.match(xml, /<w:p\/>/);
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
