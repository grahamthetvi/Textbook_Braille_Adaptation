import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RECOVERY_STORAGE_KEY,
  applyRecoveryToBatches,
  batchesFromRecovery,
  clearDownloadedText,
  listRecoveries,
  loadRecovery,
  rememberFinishedBatch,
  removeRecovery,
  textKey,
} from "../docs/js/recovery.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function finishedBatch(startPage, endPage, markdown, extra = {}) {
  return {
    startPage,
    endPage,
    status: "done",
    markdown,
    headings: [{ level: 1, title: "Chapter" }],
    skippedBlank: false,
    bytes: new Uint8Array([1, 2, 3]),
    ocrText: "should-not-be-stored",
    ...extra,
  };
}

test("textKey distinguishes file name and page count", () => {
  assert.equal(textKey("Book.pdf", 12), textKey("Book.pdf", 12));
  assert.notEqual(textKey("Book.pdf", 12), textKey("Book.pdf", 13));
  assert.notEqual(textKey("A.pdf", 12), textKey("B.pdf", 12));
  assert.equal(textKey("  ", 0), "0:textbook.pdf");
});

test("finished batches are stored without PDF bytes or OCR text", () => {
  const storage = memoryStorage();
  const saved = rememberFinishedBatch(storage, {
    fileName: "grammar.pdf",
    pageCount: 12,
    batch: finishedBatch(1, 6, "Adjectives describe nouns."),
    now: () => "2026-10-01T12:00:00.000Z",
  });
  assert.equal(saved.fileName, "grammar.pdf");
  assert.equal(saved.batches.length, 1);
  assert.equal(saved.batches[0].markdown, "Adjectives describe nouns.");
  assert.deepEqual(saved.batches[0].headings, [{ level: 1, title: "Chapter" }]);
  const raw = storage.getItem(RECOVERY_STORAGE_KEY);
  assert.equal(raw.includes("should-not-be-stored"), false);
  assert.equal(raw.includes("bytes"), false);
  const loaded = loadRecovery(storage, textKey("grammar.pdf", 12));
  assert.equal(loaded.batches[0].markdown, "Adjectives describe nouns.");
});

test("a second text does not replace the first", () => {
  const storage = memoryStorage();
  rememberFinishedBatch(storage, {
    fileName: "one.pdf",
    pageCount: 10,
    batch: finishedBatch(1, 5, "First book"),
    now: () => "2026-10-01T12:00:00.000Z",
  });
  rememberFinishedBatch(storage, {
    fileName: "two.pdf",
    pageCount: 8,
    batch: finishedBatch(1, 5, "Second book"),
    now: () => "2026-10-01T13:00:00.000Z",
  });
  const listed = listRecoveries(storage);
  assert.deepEqual(
    listed.map((item) => item.fileName),
    ["two.pdf", "one.pdf"]
  );
  assert.equal(loadRecovery(storage, textKey("one.pdf", 10)).batches[0].markdown, "First book");
});

test("overlapping page ranges replace older finished text", () => {
  const storage = memoryStorage();
  rememberFinishedBatch(storage, {
    fileName: "grammar.pdf",
    pageCount: 20,
    batch: finishedBatch(1, 6, "Old opening"),
    now: () => "2026-10-01T12:00:00.000Z",
  });
  rememberFinishedBatch(storage, {
    fileName: "grammar.pdf",
    pageCount: 20,
    batch: finishedBatch(7, 12, "Middle"),
    now: () => "2026-10-01T12:05:00.000Z",
  });
  const replaced = rememberFinishedBatch(storage, {
    fileName: "grammar.pdf",
    pageCount: 20,
    batch: finishedBatch(1, 6, "New opening"),
    now: () => "2026-10-01T12:10:00.000Z",
  });
  assert.deepEqual(
    replaced.batches.map((batch) => [batch.startPage, batch.endPage, batch.markdown]),
    [
      [1, 6, "New opening"],
      [7, 12, "Middle"],
    ]
  );
});

test("pending, blank, and empty results are not stored", () => {
  const storage = memoryStorage();
  assert.equal(
    rememberFinishedBatch(storage, {
      fileName: "grammar.pdf",
      pageCount: 6,
      batch: { ...finishedBatch(1, 6, "Hello"), status: "pending" },
    }),
    null
  );
  assert.equal(
    rememberFinishedBatch(storage, {
      fileName: "grammar.pdf",
      pageCount: 6,
      batch: finishedBatch(1, 6, "   \n"),
    }),
    null
  );
  assert.equal(storage.getItem(RECOVERY_STORAGE_KEY), null);
});

test("downloading one text deletes that text and leaves other texts", () => {
  const storage = memoryStorage();
  rememberFinishedBatch(storage, {
    fileName: "grammar.pdf",
    pageCount: 20,
    batch: finishedBatch(1, 6, "Opening"),
  });
  rememberFinishedBatch(storage, {
    fileName: "grammar.pdf",
    pageCount: 20,
    batch: finishedBatch(7, 12, "Later"),
  });
  rememberFinishedBatch(storage, {
    fileName: "other.pdf",
    pageCount: 10,
    batch: finishedBatch(1, 5, "Other book"),
  });
  const cleared = clearDownloadedText(storage, {
    fileName: "grammar.pdf",
    pageCount: 20,
    batches: [finishedBatch(1, 6, "Opening")],
  });
  assert.equal(cleared, true);
  assert.equal(loadRecovery(storage, textKey("grammar.pdf", 20)), null);
  assert.equal(loadRecovery(storage, textKey("other.pdf", 10)).batches[0].markdown, "Other book");
  assert.equal(
    clearDownloadedText(storage, {
      fileName: "grammar.pdf",
      pageCount: 20,
      batches: [finishedBatch(1, 6, "Opening")],
    }),
    false
  );
  assert.equal(
    clearDownloadedText(storage, {
      fileName: "other.pdf",
      pageCount: 10,
      batches: [{ markdown: "   " }],
    }),
    false
  );
  assert.equal(storage.getItem(RECOVERY_STORAGE_KEY).includes("Other book"), true);
});

test("discard removes one text and leaves the other", () => {
  const storage = memoryStorage();
  rememberFinishedBatch(storage, {
    fileName: "one.pdf",
    pageCount: 6,
    batch: finishedBatch(1, 6, "Keep"),
  });
  rememberFinishedBatch(storage, {
    fileName: "two.pdf",
    pageCount: 6,
    batch: finishedBatch(1, 6, "Drop"),
  });
  assert.equal(removeRecovery(storage, textKey("two.pdf", 6)), true);
  assert.equal(removeRecovery(storage, textKey("two.pdf", 6)), false);
  assert.equal(listRecoveries(storage).length, 1);
  assert.equal(listRecoveries(storage)[0].fileName, "one.pdf");
});

test("corrupt storage is ignored", () => {
  const storage = memoryStorage();
  storage.setItem(RECOVERY_STORAGE_KEY, "{not json");
  assert.deepEqual(listRecoveries(storage), []);
  storage.setItem(
    RECOVERY_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      texts: {
        "6:bad.pdf": {
          fileName: "bad.pdf",
          pageCount: 6,
          batches: [{ startPage: 0, endPage: 2, markdown: "nope", status: "done" }, { startPage: 1, endPage: 6, markdown: "  " }],
        },
      },
    })
  );
  assert.deepEqual(listRecoveries(storage), []);
});

test("applyRecoveryToBatches fills pending ranges and leaves in-flight rows", () => {
  const storage = memoryStorage();
  rememberFinishedBatch(storage, {
    fileName: "grammar.pdf",
    pageCount: 12,
    batch: finishedBatch(1, 6, "Saved", { skippedBlank: false, headings: [{ level: 2, title: "Nouns" }] }),
  });
  const record = loadRecovery(storage, textKey("grammar.pdf", 12));
  const batches = [
    { startPage: 1, endPage: 6, status: "pending", markdown: "" },
    { startPage: 7, endPage: 12, status: "running", markdown: "" },
  ];
  assert.equal(applyRecoveryToBatches(record, batches), 1);
  assert.equal(batches[0].status, "done");
  assert.equal(batches[0].markdown, "Saved");
  assert.deepEqual(batches[0].headings, [{ level: 2, title: "Nouns" }]);
  assert.equal(batches[1].status, "running");
  assert.equal(batches[1].markdown, "");
});

test("batchesFromRecovery builds downloadable rows without source bytes", () => {
  const rows = batchesFromRecovery({
    batches: [
      {
        startPage: 6,
        endPage: 10,
        markdown: "Transcriber note: blank.",
        headings: [],
        skippedBlank: true,
        savedAt: "2026-10-01T12:00:00.000Z",
      },
    ],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "done");
  assert.equal(rows[0].bytes, null);
  assert.equal(rows[0].skippedBlank, true);
  assert.equal(rows[0].pageCount, 5);
  assert.deepEqual(rows[0].issues, []);
});

test("storage failures propagate so the page can warn", () => {
  const storage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {},
  };
  assert.throws(
    () =>
      rememberFinishedBatch(storage, {
        fileName: "grammar.pdf",
        pageCount: 6,
        batch: finishedBatch(1, 6, "Hello"),
      }),
    /quota/
  );
});
