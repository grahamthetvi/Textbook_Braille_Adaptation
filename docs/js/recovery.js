/** Keep finished batch text in localStorage until that text is downloaded. */

export const RECOVERY_STORAGE_KEY = "textbook-adapter-finished-texts";
const STORAGE_VERSION = 1;

export function textKey(fileName, pageCount) {
  const name = String(fileName || "textbook.pdf").trim() || "textbook.pdf";
  const pages = Number(pageCount);
  const count = Number.isInteger(pages) && pages > 0 ? pages : 0;
  return `${count}:${encodeURIComponent(name)}`;
}

function emptyStore() {
  return { version: STORAGE_VERSION, texts: {} };
}

function snapshotHeadings(headings) {
  if (!Array.isArray(headings)) {
    return [];
  }
  const result = [];
  for (const entry of headings) {
    const level = Number(entry?.level);
    const title = String(entry?.title || "").trim();
    if (!Number.isInteger(level) || level < 1 || level > 6 || !title) {
      continue;
    }
    result.push({ level, title });
  }
  return result;
}

function snapshotBatch(batch) {
  if (!batch || batch.status !== "done") {
    return null;
  }
  const startPage = Number(batch.startPage);
  const endPage = Number(batch.endPage);
  const markdown = String(batch.markdown || "");
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage)) {
    return null;
  }
  if (startPage < 1 || endPage < startPage || !markdown.trim()) {
    return null;
  }
  return {
    startPage,
    endPage,
    markdown,
    headings: snapshotHeadings(batch.headings),
    skippedBlank: Boolean(batch.skippedBlank),
  };
}

function normalizeStoredBatch(batch) {
  const snap = snapshotBatch({ ...batch, status: "done" });
  if (!snap) {
    return null;
  }
  return { ...snap, savedAt: String(batch?.savedAt || "") };
}

function rangesOverlap(left, right) {
  return left.startPage <= right.endPage && right.startPage <= left.endPage;
}

function sortBatches(batches) {
  return [...batches].sort((left, right) => {
    if (left.startPage !== right.startPage) {
      return left.startPage - right.startPage;
    }
    return left.endPage - right.endPage;
  });
}

function readStore(storage) {
  try {
    const raw = storage.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION || !parsed.texts || typeof parsed.texts !== "object") {
      return emptyStore();
    }
    const texts = {};
    for (const [id, record] of Object.entries(parsed.texts)) {
      if (!record || typeof record !== "object") {
        continue;
      }
      const batches = sortBatches(
        (Array.isArray(record.batches) ? record.batches : [])
          .map(normalizeStoredBatch)
          .filter(Boolean)
      );
      if (!batches.length) {
        continue;
      }
      texts[id] = {
        fileName: String(record.fileName || "textbook.pdf"),
        pageCount: Number.isInteger(Number(record.pageCount)) ? Number(record.pageCount) : 0,
        updatedAt: String(record.updatedAt || ""),
        batches,
      };
    }
    return { version: STORAGE_VERSION, texts };
  } catch {
    return emptyStore();
  }
}

function writeStore(storage, store) {
  if (!Object.keys(store.texts).length) {
    storage.removeItem(RECOVERY_STORAGE_KEY);
    return;
  }
  storage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(store));
}

function cloneBatch(batch) {
  return {
    startPage: batch.startPage,
    endPage: batch.endPage,
    markdown: batch.markdown,
    headings: (batch.headings || []).map((entry) => ({ level: entry.level, title: entry.title })),
    skippedBlank: batch.skippedBlank,
    savedAt: batch.savedAt,
  };
}

function cloneRecord(id, record) {
  return {
    id,
    fileName: record.fileName,
    pageCount: record.pageCount,
    updatedAt: record.updatedAt,
    batches: record.batches.map(cloneBatch),
  };
}

export function rememberFinishedBatch(storage, { fileName, pageCount, batch, now } = {}) {
  const snap = snapshotBatch(batch);
  if (!snap) {
    return null;
  }
  const savedAt = typeof now === "function" ? now() : new Date().toISOString();
  const saved = { ...snap, savedAt: String(savedAt || "") };
  const key = textKey(fileName, pageCount);
  const store = readStore(storage);
  const existing = store.texts[key];
  const kept = (existing?.batches || []).filter((item) => !rangesOverlap(item, saved));
  store.texts[key] = {
    fileName: String(fileName || "textbook.pdf").trim() || "textbook.pdf",
    pageCount: Number(pageCount) || 0,
    updatedAt: saved.savedAt,
    batches: sortBatches([...kept, saved]),
  };
  writeStore(storage, store);
  return cloneRecord(key, store.texts[key]);
}

export function listRecoveries(storage) {
  const store = readStore(storage);
  return Object.entries(store.texts)
    .map(([id, record]) => cloneRecord(id, record))
    .sort((left, right) => {
      const delta = Date.parse(right.updatedAt || "") - Date.parse(left.updatedAt || "");
      if (Number.isFinite(delta) && delta !== 0) {
        return delta;
      }
      return left.fileName.localeCompare(right.fileName);
    });
}

export function loadRecovery(storage, id) {
  const record = readStore(storage).texts[id];
  if (!record) {
    return null;
  }
  return cloneRecord(id, record);
}

export function removeRecovery(storage, id) {
  const store = readStore(storage);
  if (!store.texts[id]) {
    return false;
  }
  delete store.texts[id];
  writeStore(storage, store);
  return true;
}

/** Delete one text's saved copy after the user downloads that text. */
export function clearDownloadedText(storage, { fileName, pageCount, batches } = {}) {
  const downloaded = (Array.isArray(batches) ? batches : []).some((batch) =>
    String(batch?.markdown || "").trim()
  );
  if (!downloaded) {
    return false;
  }
  return removeRecovery(storage, textKey(fileName, pageCount));
}

export function applyRecoveryToBatches(record, batches) {
  const savedByRange = new Map(
    (record?.batches || []).map((batch) => [`${batch.startPage}-${batch.endPage}`, batch])
  );
  let applied = 0;
  for (const batch of batches || []) {
    if (batch.status !== "pending") {
      continue;
    }
    const saved = savedByRange.get(`${batch.startPage}-${batch.endPage}`);
    if (!saved) {
      continue;
    }
    batch.markdown = saved.markdown;
    batch.headings = saved.headings.map((entry) => ({ level: entry.level, title: entry.title }));
    batch.skippedBlank = Boolean(saved.skippedBlank);
    batch.status = "done";
    batch.error = "";
    batch.issues = [];
    applied += 1;
  }
  return applied;
}

export function batchesFromRecovery(record) {
  return (record?.batches || []).map((saved) => ({
    startPage: saved.startPage,
    endPage: saved.endPage,
    pageCount: saved.endPage - saved.startPage + 1,
    bytes: null,
    rawBytes: null,
    status: "done",
    markdown: saved.markdown,
    issues: [],
    error: "",
    clarifyQuestion: "",
    clarifyDraft: "",
    clarifyMarker: "",
    clarifyHistory: [],
    locale: "",
    skippedBlank: Boolean(saved.skippedBlank),
    emptyRetry: false,
    headings: (saved.headings || []).map((entry) => ({ level: entry.level, title: entry.title })),
    ocrAttempted: false,
    ocrText: "",
    ocrMethod: "",
  }));
}
