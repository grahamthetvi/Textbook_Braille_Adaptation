import assert from "node:assert/strict";
import { test } from "node:test";
import { planBatches } from "../docs/js/batches.js";
import {
  classifySourceFiles,
  fitEdge,
  naturalNameCompare,
  sliceImagePages,
  sortImageFiles,
} from "../docs/js/image-pages.js";
import { buildTranscribeContents } from "../docs/js/gemini.js";
import { buildMessages } from "../docs/js/anthropic.js";
import { buildInput } from "../docs/js/openai.js";
import { setLocale } from "../docs/js/i18n.js";

test("pictures sort in filename order with page 2 before page 10", () => {
  const files = [
    { name: "page-010.jpg" },
    { name: "page-002.jpg" },
    { name: "page-001.png" },
  ];
  assert.deepEqual(
    sortImageFiles(files).map((file) => file.name),
    ["page-001.png", "page-002.jpg", "page-010.jpg"]
  );
  assert.ok(naturalNameCompare("IMG_2.jpg", "IMG_10.jpg") < 0);
});

test("a group of pictures is one source and a mix with a PDF is rejected", () => {
  assert.equal(
    classifySourceFiles([
      { name: "a.jpg", type: "image/jpeg" },
      { name: "b.png", type: "image/png" },
    ]).kind,
    "images"
  );
  assert.equal(classifySourceFiles([{ name: "book.pdf", type: "application/pdf" }]).kind, "pdf");
  assert.equal(
    classifySourceFiles([
      { name: "book.pdf", type: "application/pdf" },
      { name: "a.jpg", type: "image/jpeg" },
    ]).kind,
    "mixed"
  );
  assert.equal(
    classifySourceFiles([
      { name: "a.pdf", type: "application/pdf" },
      { name: "b.pdf", type: "" },
    ]).kind,
    "many-pdfs"
  );
  assert.equal(classifySourceFiles([{ name: "notes.txt", type: "text/plain" }]).kind, "unsupported");
});

test("large pictures are capped on the long edge and batches slice in order", () => {
  assert.deepEqual(fitEdge(4000, 3000, 2400), { width: 2400, height: 1800, scale: 0.6 });
  assert.deepEqual(fitEdge(800, 600, 2400), { width: 800, height: 600, scale: 1 });
  const pages = ["a", "b", "c", "d", "e", "f", "g"];
  const [first] = planBatches(pages.length, 6);
  assert.deepEqual(sliceImagePages(pages, first.startPage, first.endPage), pages);
});

test("picture batches are sent as ordered images", () => {
  setLocale("en");
  const images = [
    { mime: "image/jpeg", bytes: new Uint8Array([1, 2]) },
    { mime: "image/png", bytes: new Uint8Array([3, 4]) },
  ];

  const gemini = buildTranscribeContents({ startPage: 1, endPage: 2, images });
  assert.equal(gemini[0].parts[0].inline_data.mime_type, "image/jpeg");
  assert.equal(gemini[0].parts[1].inline_data.mime_type, "image/png");
  assert.match(gemini[0].parts[2].text, /Each attached picture is one of these pages, in order/);
  assert.match(gemini[0].parts[2].text, /001-002/);

  const claude = buildMessages({ startPage: 3, endPage: 4, images });
  assert.equal(claude[0].content[0].type, "image");
  assert.equal(claude[0].content[0].source.media_type, "image/jpeg");
  assert.equal(claude[0].content[1].type, "image");
  assert.equal(claude[0].content[2].type, "text");

  const openai = buildInput({ startPage: 1, endPage: 2, images });
  assert.equal(openai[0].content[0].type, "input_image");
  assert.match(openai[0].content[0].image_url, /^data:image\/jpeg;base64,/);
  assert.equal(openai[0].content[1].type, "input_image");
  assert.equal(openai[0].content[2].type, "input_text");
});
