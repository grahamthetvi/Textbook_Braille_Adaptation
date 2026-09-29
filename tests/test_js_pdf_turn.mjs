import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";
import { placementForTurn, rewritePdfOrientation } from "../docs/js/pdf-turn.js";
import { straightenPdfBytes } from "../docs/js/straighten.js";

const require = createRequire(import.meta.url);

before(() => {
  globalThis.window = {
    PDFLib: require("../docs/vendor/pdf-lib.min.js"),
  };
});

function corners(pdfBytes) {
  const dir = mkdtempSync(join(tmpdir(), "pdf-turn-"));
  const path = join(dir, "page.pdf");
  writeFileSync(path, pdfBytes);
  const script = `
import json, sys
import pypdfium2 as pdfium
pdf = pdfium.PdfDocument(sys.argv[1])
out = []
for page in pdf:
    bitmap = page.render(scale=1)
    w, h = bitmap.width, bitmap.height
    buf = bitmap.buffer
    n = bitmap.n_channels
    quads = {"tl": 0, "tr": 0, "bl": 0, "br": 0}
    for y in range(h):
        row = y * bitmap.stride
        for x in range(w):
            i = row + x * n
            b, g, r = buf[i], buf[i + 1], buf[i + 2]
            if r < 40 and g < 40 and b < 40:
                col = "l" if x < w / 2 else "r"
                band = "t" if y < h / 2 else "b"
                quads[band + col] += 1
    out.append({"w": w, "h": h, "quads": quads})
pdf.close()
print(json.dumps(out))
`;
  const result = spawnSync("python3", ["-c", script, path], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || "pdfium could not render the turned page");
  }
  return JSON.parse(result.stdout);
}

async function markedPdf() {
  const { PDFDocument, rgb } = globalThis.window.PDFLib;
  const width = 180;
  const height = 240;
  const doc = await PDFDocument.create();
  const page = doc.addPage([width, height]);
  page.drawRectangle({
    x: 10,
    y: height - 10 - 28,
    width: 28,
    height: 28,
    color: rgb(0, 0, 0),
  });
  page.drawRectangle({
    x: width - 10 - 14,
    y: 10,
    width: 14,
    height: 14,
    color: rgb(0, 0, 0),
  });
  const second = doc.addPage([width, height]);
  second.drawRectangle({
    x: 10,
    y: height - 10 - 28,
    width: 28,
    height: 28,
    color: rgb(0, 0, 0),
  });
  second.drawRectangle({
    x: width - 10 - 14,
    y: 10,
    width: 14,
    height: 14,
    color: rgb(0, 0, 0),
  });
  return doc.save();
}

function heavyCorners(quads) {
  return Object.entries(quads)
    .filter(([, count]) => count > 80)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

test("placement swaps the page for sideways turns", () => {
  assert.deepEqual(placementForTurn(180, 240, 0), {
    pageWidth: 180,
    pageHeight: 240,
    x: 0,
    y: 0,
    rotate: 0,
  });
  assert.equal(placementForTurn(180, 240, 1).pageWidth, 240);
  assert.equal(placementForTurn(180, 240, 1).pageHeight, 180);
  assert.equal(placementForTurn(180, 240, 3).rotate, 90);
  assert.equal(placementForTurn(180, 240, 2).rotate, 180);
  assert.equal(placementForTurn(180, 240, 5).rotate, placementForTurn(180, 240, 1).rotate);
});

test("clockwise turns move a top-left mark to the matching corner", async () => {
  const source = await markedPdf();
  const [original] = corners(source);
  assert.deepEqual(heavyCorners(original.quads), ["tl", "br"]);

  const expectations = {
    1: ["tr", "bl"],
    2: ["br", "tl"],
    3: ["bl", "tr"],
  };
  for (const quarter of [1, 2, 3]) {
    const turned = await rewritePdfOrientation(source, [quarter, 0]);
    const [first, second] = corners(turned);
    assert.deepEqual(heavyCorners(first.quads), expectations[quarter], `quarter ${quarter}`);
    assert.deepEqual(heavyCorners(second.quads), ["tl", "br"]);
    if (quarter === 2) {
      assert.equal(first.w, original.w);
      assert.equal(first.h, original.h);
    } else {
      assert.equal(first.w, original.h);
      assert.equal(first.h, original.w);
    }
  }
});

test("pages that are already upright are not rewritten", async () => {
  const original = new Uint8Array([9, 8, 7]);
  const gray = new Uint8Array(80 * 120);
  gray.fill(255);
  const result = await straightenPdfBytes(original, {
    renderPages: async () => [{ gray, width: 80, height: 120 }],
  });
  assert.equal(result.rotatedPages, 0);
  assert.equal(result.bytes, original);
  assert.deepEqual(result.quarterTurns, [0]);
});
