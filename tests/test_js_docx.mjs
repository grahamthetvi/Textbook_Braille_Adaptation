import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { combinedMarkdown } from "../docs/js/download.js";
import {
  buildDocxFiles,
  escapeXml,
  isPipeSeparatorRow,
  isPipeTableRow,
  markdownToDocumentXml,
  parseInlineRuns,
  parsePipeCells,
} from "../docs/js/docx.js";

const require = createRequire(import.meta.url);
const JSZip = require("../docs/vendor/jszip.min.js");

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

test("parsePipeCells splits a pipe-table row", () => {
  assert.deepEqual(parsePipeCells("| Category | Examples |"), ["Category", "Examples"]);
  assert.deepEqual(parsePipeCells("| Persons | Yo-Yo Ma, children, choir |"), [
    "Persons",
    "Yo-Yo Ma, children, choir",
  ]);
});

test("isPipeTableRow recognizes pipe rows and ignores prose", () => {
  assert.equal(isPipeTableRow("| Category | Examples |"), true);
  assert.equal(isPipeTableRow("| Category | Examples"), true);
  assert.equal(isPipeTableRow("2a A noun is a word."), false);
  assert.equal(isPipeTableRow("---"), false);
  assert.equal(isPipeTableRow(""), false);
});

test("isPipeSeparatorRow detects optional GFM rules", () => {
  assert.equal(isPipeSeparatorRow(["---", "---"]), true);
  assert.equal(isPipeSeparatorRow([":---", "---:", ":---:"]), true);
  assert.equal(isPipeSeparatorRow(["Category", "Examples"]), false);
});

test("pipe tables become Word tables with a header row", () => {
  const xml = markdownToDocumentXml(
    [
      "| Category | Examples |",
      "| Persons | Yo-Yo Ma, children, choir |",
      "| Places | Utah, desert, restaurant, island |",
    ].join("\n")
  );
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /<w:tblHeader\/>/);
  assert.match(
    xml,
    /<w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">Category<\/w:t>/
  );
  assert.match(
    xml,
    /<w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">Examples<\/w:t>/
  );
  assert.match(xml, /<w:t xml:space="preserve">Persons<\/w:t>/);
  assert.match(xml, /<w:t xml:space="preserve">Yo-Yo Ma, children, choir<\/w:t>/);
  assert.doesNotMatch(xml, />\| Category \| Examples \|</);
  assert.equal((xml.match(/<w:tblHeader\/>/g) || []).length, 1);
  assert.equal((xml.match(/<w:tr>/g) || []).length, 3);
});

test("header row is kept when a hyphen separator is present", () => {
  const xml = markdownToDocumentXml(
    [
      "| Proper Nouns | Common Nouns |",
      "| --- | --- |",
      "| Michelangelo | painter |",
    ].join("\n")
  );
  assert.match(xml, /<w:tblHeader\/>/);
  assert.match(xml, />Proper Nouns</);
  assert.match(xml, />Common Nouns</);
  assert.match(xml, />Michelangelo</);
  assert.match(xml, />painter</);
  assert.doesNotMatch(xml, />---</);
  assert.equal((xml.match(/<w:tr>/g) || []).length, 2);
});

test("a single pipe row is still a header table", () => {
  const xml = markdownToDocumentXml("| Category | Examples |");
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /<w:tblHeader\/>/);
  assert.equal((xml.match(/<w:tr>/g) || []).length, 1);
});

test("blank lines split adjacent pipe tables", () => {
  const xml = markdownToDocumentXml(
    ["| A | B |", "| 1 | 2 |", "", "| C | D |", "| 3 | 4 |"].join("\n")
  );
  assert.equal((xml.match(/<w:tbl>/g) || []).length, 2);
  assert.equal((xml.match(/<w:tblHeader\/>/g) || []).length, 2);
  assert.match(xml, /<w:p\/>/);
});

test("table cells keep italic, bold, and underline", () => {
  const xml = markdownToDocumentXml("| _Kind_ | __Note__ | <u>Mark</u> |\n| a | b | c |");
  assert.match(xml, /<w:i\/>/);
  assert.match(xml, />Kind</);
  assert.match(xml, />Note</);
  assert.match(xml, /<w:u w:val="single"\/>/);
  assert.match(xml, />Mark</);
});

test("section rules still become page breaks next to tables", () => {
  const xml = markdownToDocumentXml("| A | B |\n| 1 | 2 |\n---\nAfter");
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /<w:br w:type="page"\/>/);
  assert.match(xml, />After</);
});

test("textbook noun tables keep each header row", () => {
  const xml = markdownToDocumentXml(`2a A noun is a word that names a person, place, thing, or idea.

| Category | Examples |
| Persons | Yo-Yo Ma, children, choir |
| Places | Utah, desert, restaurant, island |
| Things | llama, money, plants, Nobel Prize |
| Ideas | truth, justice, love, freedom |

2b A proper noun is a specific name.

| Proper Nouns | Common Nouns |
| Michelangelo | painter |
| South America | continent |
`);
  assert.equal((xml.match(/<w:tbl>/g) || []).length, 2);
  assert.equal((xml.match(/<w:tblHeader\/>/g) || []).length, 2);
  assert.match(xml, />Category</);
  assert.match(xml, />Proper Nouns</);
  assert.match(xml, />Common Nouns</);
  assert.match(xml, />Persons</);
  assert.match(xml, />Michelangelo</);
});

test("accessible pages-016-020.md produces three headered Word tables", () => {
  const markdown = readFileSync(
    new URL("../accessible/pages-016-020.md", import.meta.url),
    "utf8"
  );
  const xml = markdownToDocumentXml(markdown);
  assert.equal((xml.match(/<w:tbl>/g) || []).length, 3);
  assert.equal((xml.match(/<w:tblHeader\/>/g) || []).length, 3);
  assert.match(xml, />Category</);
  assert.match(xml, />Proper Nouns</);
  assert.match(xml, />Concrete Nouns</);
  assert.match(xml, />Abstract Nouns</);
  assert.doesNotMatch(xml, />\| Category \| Examples \|</);
});

test("JSZip packages table markup into a Word document", async () => {
  const markdown = readFileSync(
    new URL("../accessible/pages-016-020.md", import.meta.url),
    "utf8"
  );
  const zip = new JSZip();
  for (const [path, content] of Object.entries(buildDocxFiles(markdown))) {
    zip.file(path, content);
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const loaded = await JSZip.loadAsync(buffer);
  const xml = await loaded.file("word/document.xml").async("string");
  assert.ok(loaded.file("[Content_Types].xml"));
  assert.ok(loaded.file("word/styles.xml"));
  assert.equal((xml.match(/<w:tbl>/g) || []).length, 3);
  assert.equal((xml.match(/<w:tblHeader\/>/g) || []).length, 3);
});
