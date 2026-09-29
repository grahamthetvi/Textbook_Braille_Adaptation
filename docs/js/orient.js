/** Quarter-turn detection for sideways textbook scans.

Latin text is bottom-heavy inside each line (the baseline carries more ink
than the ascender zone). Horizontal projection variance tells 0°/180° from
90°/270°. The baseline bias picks which of those two is upright.

This is for English and Spanish lesson text. A weak signal leaves the page
alone, including blank pages and pages that are not lines of text.
*/

const MIN_INK_PIXELS = 40;
const MIN_CROP_EDGE = 24;
const LINE_STRENGTH_RATIO = 1.45;
const LINE_STRENGTH_SHARE = 0.72;
const UPRIGHT_BIAS = -0.08;

/** Paper is the bright peak. Ink is clearly darker than that paper. */
function documentThreshold(gray) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i += 1) {
    hist[gray[i]] += 1;
  }
  const brightCutoff = gray.length * 0.12;
  let seen = 0;
  let paper = 255;
  for (let i = 255; i >= 0; i -= 1) {
    seen += hist[i];
    if (seen >= brightCutoff) {
      paper = i;
      break;
    }
  }
  return Math.max(1, paper - 40);
}

function binarize(gray) {
  const threshold = documentThreshold(gray);
  const ink = new Uint8Array(gray.length);
  let count = 0;
  for (let i = 0; i < gray.length; i += 1) {
    if (gray[i] < threshold) {
      ink[i] = 1;
      count += 1;
    }
  }
  return { ink, count };
}

function cropInk(ink, width, height, pad = 2) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (!ink[row + x]) {
        continue;
      }
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
    }
  }
  if (maxX < 0) {
    return null;
  }
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const croppedWidth = maxX - minX + 1;
  const croppedHeight = maxY - minY + 1;
  const next = new Uint8Array(croppedWidth * croppedHeight);
  for (let y = 0; y < croppedHeight; y += 1) {
    for (let x = 0; x < croppedWidth; x += 1) {
      next[y * croppedWidth + x] = ink[(y + minY) * width + (x + minX)];
    }
  }
  return { ink: next, width: croppedWidth, height: croppedHeight };
}

function rotateClockwise(ink, width, height) {
  const next = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = height - 1 - y;
      const ny = x;
      next[ny * height + nx] = ink[y * width + x];
    }
  }
  return { ink: next, width: height, height: width };
}

function rotateClockwiseTimes(ink, width, height, turns) {
  let current = { ink, width, height };
  const steps = ((turns % 4) + 4) % 4;
  for (let i = 0; i < steps; i += 1) {
    current = rotateClockwise(current.ink, current.width, current.height);
  }
  return current;
}

function densityVariance(ink, width, height, axis) {
  const bins = axis === "row" ? height : width;
  const span = axis === "row" ? width : height;
  const profile = new Float64Array(bins);
  if (axis === "row") {
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        sum += ink[row + x];
      }
      profile[y] = sum / span;
    }
  } else {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let y = 0; y < height; y += 1) {
        sum += ink[y * width + x];
      }
      profile[x] = sum / span;
    }
  }
  let total = 0;
  for (let i = 0; i < bins; i += 1) {
    total += profile[i];
  }
  const mean = total / bins;
  let acc = 0;
  for (let i = 0; i < bins; i += 1) {
    const delta = profile[i] - mean;
    acc += delta * delta;
  }
  return acc / bins;
}

function median(values) {
  if (!values.length) {
    return 0;
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Negative when the bottoms of text lines carry more ink than the tops. */
function lineBias(ink, width, height) {
  const row = new Float64Array(height);
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    const offset = y * width;
    for (let x = 0; x < width; x += 1) {
      sum += ink[offset + x];
    }
    row[y] = sum;
  }
  let total = 0;
  for (let y = 0; y < height; y += 1) {
    total += row[y];
  }
  const mean = total / height;
  const threshold = mean * 0.35;
  const bands = [];
  let y = 0;
  while (y < height) {
    while (y < height && row[y] <= threshold) {
      y += 1;
    }
    const start = y;
    while (y < height && row[y] > threshold) {
      y += 1;
    }
    const bandHeight = y - start;
    if (bandHeight >= 4) {
      bands.push({ start, end: y, height: bandHeight });
    }
  }
  if (!bands.length) {
    return null;
  }
  const typical = median(bands.map((band) => band.height));
  const maxHeight = Math.max(typical * 2.5, typical + 4, 8);
  let top = 0;
  let bottom = 0;
  let used = 0;
  for (const band of bands) {
    if (band.height > maxHeight || band.height > height * 0.25) {
      continue;
    }
    const topEnd = band.start + Math.max(1, Math.round(band.height * 0.35));
    const bottomStart = band.end - Math.max(1, Math.round(band.height * 0.35));
    for (let yy = band.start; yy < topEnd; yy += 1) {
      top += row[yy];
    }
    for (let yy = bottomStart; yy < band.end; yy += 1) {
      bottom += row[yy];
    }
    used += 1;
  }
  if (!used || top + bottom === 0) {
    return null;
  }
  return (top - bottom) / (top + bottom);
}

function viewSignals(ink, width, height, turns) {
  const view = rotateClockwiseTimes(ink, width, height, turns);
  return {
    turns,
    rowVar: densityVariance(view.ink, view.width, view.height, "row"),
    colVar: densityVariance(view.ink, view.width, view.height, "col"),
    bias: lineBias(view.ink, view.width, view.height),
  };
}

/**
 * Clockwise quarter-turns to apply so Latin lesson text is upright.
 * `gray` is one byte per pixel, 0–255, row-major, top to bottom.
 */
export function detectQuarterTurns(gray, width, height) {
  const none = { quarterTurns: 0, confidence: 0 };
  if (!gray || width < MIN_CROP_EDGE || height < MIN_CROP_EDGE || gray.length < width * height) {
    return none;
  }
  const { ink, count } = binarize(gray);
  if (count < MIN_INK_PIXELS) {
    return none;
  }
  const cropped = cropInk(ink, width, height);
  if (!cropped || cropped.width < MIN_CROP_EDGE || cropped.height < MIN_CROP_EDGE) {
    return none;
  }

  const views = [0, 1, 2, 3].map((turns) =>
    viewSignals(cropped.ink, cropped.width, cropped.height, turns)
  );
  const bestRow = Math.max(...views.map((view) => view.rowVar));
  const aligned = views.filter(
    (view) =>
      view.bias !== null &&
      view.rowVar >= bestRow * LINE_STRENGTH_SHARE &&
      view.rowVar >= view.colVar * LINE_STRENGTH_RATIO
  );
  if (!aligned.length) {
    return none;
  }
  aligned.sort((a, b) => a.bias - b.bias);
  const winner = aligned[0];
  if (winner.bias > UPRIGHT_BIAS) {
    return none;
  }
  const runnerUp = aligned[1];
  if (runnerUp && runnerUp.bias <= UPRIGHT_BIAS && winner.bias - runnerUp.bias > -0.05) {
    return none;
  }
  return {
    quarterTurns: winner.turns,
    confidence: Math.min(1, Math.abs(winner.bias)),
  };
}
