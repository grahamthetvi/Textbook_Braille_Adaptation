import assert from "node:assert/strict";
import { test } from "node:test";
import { detectQuarterTurns } from "../docs/js/orient.js";

const GLYPHS = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", ".....", "....."],
  a: [".....", ".....", ".##..", "#..#.", "####.", "#..#.", "#..#.", "....."],
  b: ["#....", "#....", "###..", "#..#.", "#..#.", "#..#.", "###..", "....."],
  c: [".....", ".....", ".###.", "#....", "#....", "#....", ".###.", "....."],
  d: ["...#.", "...#.", ".###.", "#..#.", "#..#.", "#..#.", ".###.", "....."],
  e: [".....", ".....", ".##..", "#..#.", "####.", "#....", ".###.", "....."],
  f: [".##..", "#....", "###..", "#....", "#....", "#....", "#....", "....."],
  g: [".....", ".....", ".###.", "#..#.", ".###.", "...#.", "#..#.", ".##.."],
  h: ["#....", "#....", "###..", "#..#.", "#..#.", "#..#.", "#..#.", "....."],
  i: [".....", "..#..", ".....", "..#..", "..#..", "..#..", "..#..", "....."],
  j: [".....", "...#.", ".....", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "....."],
  l: ["#....", "#....", "#....", "#....", "#....", "#....", "#....", "....."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#", "....."],
  n: [".....", ".....", "###..", "#..#.", "#..#.", "#..#.", "#..#.", "....."],
  o: [".....", ".....", ".##..", "#..#.", "#..#.", "#..#.", ".##..", "....."],
  p: [".....", ".....", "###..", "#..#.", "#..#.", "###..", "#....", "#...."],
  q: [".....", ".....", ".###.", "#..#.", "#..#.", ".###.", "...#.", "...#."],
  r: [".....", ".....", "#.##.", "##...", "#....", "#....", "#....", "....."],
  s: [".....", ".....", ".###.", "#....", ".##..", "...#.", "###..", "....."],
  t: [".#...", ".#...", "####.", ".#...", ".#...", ".#...", "..##.", "....."],
  u: [".....", ".....", "#..#.", "#..#.", "#..#.", "#..#.", ".###.", "....."],
  v: [".....", ".....", "#..#.", "#..#.", "#..#.", ".##..", "..#..", "....."],
  w: [".....", ".....", "#.#.#", "#.#.#", "#.#.#", "#.#.#", ".#.#.", "....."],
  x: [".....", ".....", "#..#.", ".##..", "..#..", ".##..", "#..#.", "....."],
  y: [".....", ".....", "#..#.", "#..#.", ".###.", "...#.", "...#.", ".##.."],
  z: [".....", ".....", "####.", "...#.", "..#..", ".#...", "####.", "....."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "....."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#..", "....."],
};

const LINES = [
  "The lazy dog jumps over a fox.",
  "Adjectives modify nouns.",
  "A big red ball sits on the shelf.",
  "Pupils read the passage today.",
  "They answer every question.",
  "A tall tree grows by the road.",
  "The happy cat naps on a rug.",
  "Bring the yellow box upstairs.",
  "Write a sentence with a verb.",
  "The old bridge spans the river.",
  "A quiet student reads ahead.",
  "Find the subject and the verb.",
];

function renderLesson() {
  const glyphW = 5;
  const glyphH = 8;
  const gap = 1;
  const lineGap = 6;
  const margin = 18;
  const maxChars = Math.max(...LINES.map((line) => line.length));
  const width = margin * 2 + maxChars * (glyphW + gap) + 40;
  const height = margin * 2 + LINES.length * (glyphH + lineGap) + 80;
  const gray = new Uint8Array(width * height);
  gray.fill(255);
  LINES.forEach((line, lineIndex) => {
    for (let i = 0; i < line.length; i += 1) {
      const glyph = GLYPHS[line[i]] || GLYPHS[" "];
      const ox = margin + i * (glyphW + gap);
      const oy = margin + lineIndex * (glyphH + lineGap);
      for (let gy = 0; gy < glyphH; gy += 1) {
        for (let gx = 0; gx < glyphW; gx += 1) {
          if (glyph[gy][gx] === "#") {
            gray[(oy + gy) * width + (ox + gx)] = 0;
          }
        }
      }
    }
  });
  return { gray, width, height };
}

function rotateClockwise(gray, width, height) {
  const next = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = height - 1 - y;
      const ny = x;
      next[ny * height + nx] = gray[y * width + x];
    }
  }
  return { gray: next, width: height, height: width };
}

function rotateTimes(page, turns) {
  let current = page;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i += 1) {
    current = rotateClockwise(current.gray, current.width, current.height);
  }
  return current;
}

function speckle(page) {
  const gray = page.gray.slice();
  for (let i = 0; i < gray.length; i += 13) {
    if (gray[i] === 255 && (i * 17) % 47 === 0) {
      gray[i] = 30;
    }
  }
  return { gray, width: page.width, height: page.height };
}

test("upright Latin lesson text is left alone", () => {
  const page = renderLesson();
  const found = detectQuarterTurns(page.gray, page.width, page.height);
  assert.equal(found.quarterTurns, 0);
  assert.ok(found.confidence > 0.1);
});

test("sideways and upside-down lesson text is turned upright", () => {
  const upright = renderLesson();
  for (const applied of [1, 2, 3]) {
    const page = rotateTimes(upright, applied);
    const found = detectQuarterTurns(page.gray, page.width, page.height);
    assert.equal(
      found.quarterTurns,
      (4 - applied) % 4,
      `page rotated ${applied} clockwise quarter-turns`
    );
    const fixed = rotateTimes(page, found.quarterTurns);
    const again = detectQuarterTurns(fixed.gray, fixed.width, fixed.height);
    assert.equal(again.quarterTurns, 0);
  }
});

test("speckle does not flip an upright or sideways page", () => {
  const upright = speckle(renderLesson());
  assert.equal(detectQuarterTurns(upright.gray, upright.width, upright.height).quarterTurns, 0);
  const sideways = speckle(rotateTimes(renderLesson(), 1));
  assert.equal(detectQuarterTurns(sideways.gray, sideways.width, sideways.height).quarterTurns, 3);
  const other = speckle(rotateTimes(renderLesson(), 3));
  assert.equal(detectQuarterTurns(other.gray, other.width, other.height).quarterTurns, 1);
});

test("a figure beside upright text does not rotate the page", () => {
  const page = renderLesson();
  const gray = page.gray.slice();
  for (let y = 30; y < page.height - 30; y += 1) {
    for (let x = page.width - 36; x < page.width - 8; x += 1) {
      gray[y * page.width + x] = 0;
    }
  }
  assert.equal(detectQuarterTurns(gray, page.width, page.height).quarterTurns, 0);
});

test("a blank page and a filled block are not rotated", () => {
  const blank = new Uint8Array(80 * 120);
  blank.fill(250);
  assert.deepEqual(detectQuarterTurns(blank, 80, 120), { quarterTurns: 0, confidence: 0 });

  const block = new Uint8Array(90 * 140);
  block.fill(255);
  for (let y = 20; y < 110; y += 1) {
    for (let x = 15; x < 70; x += 1) {
      block[y * 90 + x] = 0;
    }
  }
  assert.equal(detectQuarterTurns(block, 90, 140).quarterTurns, 0);
});
