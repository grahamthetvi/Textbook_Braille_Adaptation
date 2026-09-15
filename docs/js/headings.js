/** Parse HEADINGS trailers, merge a running heading map, and format prompt context. */

export const HEADINGS_MARKER = "HEADINGS";
export const HEADING_CONTEXT_LIMIT = 30;
export const HEADING_CONTEXT_INTRO =
  "Heading context from earlier batches (continue this hierarchy; match levels for the same titles):";

const HEADINGS_TRAILER = /^(?:([\s\S]*)\r?\n)?HEADINGS:\s*([\s\S]*)$/i;

function pageRangeOf(item = {}) {
  const start = Number(item.startPage ?? item.start_page);
  const end = Number(item.endPage ?? item.end_page);
  return {
    startPage: Number.isFinite(start) ? start : 0,
    endPage: Number.isFinite(end) ? end : 0,
  };
}

/** Strip underscore/underline markup so title lines can match a HEADINGS entry. */
export function normalizeHeadingTitle(text) {
  return String(text || "")
    .replace(/<\/?u>/gi, "")
    .replace(/__/g, "")
    .replace(/_/g, "")
    .trim();
}

export function parseHeadingLines(block) {
  const entries = [];
  for (const line of String(block || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(/^([1-6])\|(.*)$/);
    if (!match) {
      continue;
    }
    const title = match[2].trim();
    if (!title) {
      continue;
    }
    entries.push({ level: Number(match[1]), title });
  }
  return entries;
}

/** Split a model reply into the transcription body and a trailing HEADINGS block. */
export function parseHeadingsResponse(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return { body: "", headings: [], hasTrailer: false };
  }
  const match = trimmed.match(HEADINGS_TRAILER);
  if (!match) {
    return { body: trimmed, headings: [], hasTrailer: false };
  }
  return {
    body: (match[1] || "").trim(),
    headings: parseHeadingLines(match[2] || ""),
    hasTrailer: true,
  };
}

export function mergeHeadingMap(map, batchRange = {}, entries = []) {
  const startPage = Number(batchRange.startPage ?? batchRange.start_page);
  const endPage = Number(batchRange.endPage ?? batchRange.end_page);
  const kept = (Array.isArray(map) ? map : []).filter((item) => {
    const range = pageRangeOf(item);
    return range.startPage !== startPage || range.endPage !== endPage;
  });
  const added = (Array.isArray(entries) ? entries : []).map((entry) => ({
    level: Number(entry.level),
    title: String(entry.title || "").trim(),
    startPage,
    endPage,
  }));
  return [...kept, ...added].sort((left, right) => {
    const leftRange = pageRangeOf(left);
    const rightRange = pageRangeOf(right);
    if (leftRange.startPage !== rightRange.startPage) {
      return leftRange.startPage - rightRange.startPage;
    }
    return leftRange.endPage - rightRange.endPage;
  });
}

export function headingMapFromBatches(batches) {
  let map = [];
  for (const batch of batches || []) {
    if (batch?.status !== "done" || batch.skippedBlank) {
      continue;
    }
    map = mergeHeadingMap(map, batch, batch.headings || []);
  }
  return map;
}

export function formatHeadingContext(map, options = {}) {
  const entries = Array.isArray(map) ? map.filter((item) => item && item.title) : [];
  if (!entries.length) {
    return "";
  }
  const limit = Number(options.limit);
  const cap = Number.isFinite(limit) && limit > 0 ? limit : HEADING_CONTEXT_LIMIT;
  let selected = entries;
  if (entries.length > cap) {
    const seen = new Set();
    const h1 = [];
    for (const item of entries) {
      if (Number(item.level) !== 1) {
        continue;
      }
      const key = String(item.title).toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      h1.push(item);
    }
    const tail = entries.slice(-cap);
    const tailKeys = new Set(tail.map((item) => `${item.level}|${item.title}`));
    const extra = h1.filter((item) => !tailKeys.has(`${item.level}|${item.title}`));
    selected = [...extra, ...tail];
  }
  const lines = selected.map((item) => `H${item.level} ${item.title}`);
  return `${HEADING_CONTEXT_INTRO}\n${lines.join("\n")}`;
}

function bodyTitleSet(body) {
  const titles = new Set();
  for (const line of String(body || "").split(/\r?\n/)) {
    const normalized = normalizeHeadingTitle(line);
    if (normalized) {
      titles.add(normalized);
      titles.add(normalized.toLowerCase());
    }
  }
  return titles;
}

export function headingMismatchWarnings(body, headings, label = "output") {
  const titles = bodyTitleSet(body);
  const warnings = [];
  for (const entry of headings || []) {
    const title = String(entry.title || "").trim();
    if (!title) {
      continue;
    }
    const normalized = normalizeHeadingTitle(title);
    if (titles.has(normalized) || titles.has(normalized.toLowerCase())) {
      continue;
    }
    warnings.push(`${label}: heading "${title}" was listed but not found in the body`);
  }
  return warnings;
}

export function missingHeadingsWarning(hasTrailer, body, label = "output") {
  if (hasTrailer || !String(body || "").trim()) {
    return "";
  }
  return `${label}: no HEADINGS trailer`;
}

export function headingLevelForLine(line, headingMap) {
  const trimmed = String(line || "").trim();
  if (!trimmed || !Array.isArray(headingMap) || !headingMap.length) {
    return 0;
  }
  const exact = headingMap.filter((entry) => entry.title === trimmed);
  if (exact.length) {
    return Number(exact[exact.length - 1].level) || 0;
  }
  const folded = trimmed.toLowerCase();
  const caseInsensitive = headingMap.filter(
    (entry) => String(entry.title || "").toLowerCase() === folded
  );
  if (caseInsensitive.length) {
    return Number(caseInsensitive[caseInsensitive.length - 1].level) || 0;
  }
  const normalized = normalizeHeadingTitle(trimmed).toLowerCase();
  const loose = headingMap.filter(
    (entry) => normalizeHeadingTitle(entry.title).toLowerCase() === normalized
  );
  if (loose.length) {
    return Number(loose[loose.length - 1].level) || 0;
  }
  return 0;
}
