import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getLocale, setLocale, t } from "../docs/js/i18n.js";
import { ar } from "../docs/js/locales/ar.js";
import { en } from "../docs/js/locales/en.js";
import { es } from "../docs/js/locales/es.js";

afterEach(() => {
  setLocale("en", { persist: false });
});

function installDocumentMock() {
  const previous = Object.prototype.hasOwnProperty.call(globalThis, "document")
    ? globalThis.document
    : undefined;
  const html = { lang: "en", dir: "ltr" };
  globalThis.document = {
    documentElement: html,
    title: "",
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
  };
  return {
    html,
    restore() {
      if (previous === undefined) {
        delete globalThis.document;
      } else {
        globalThis.document = previous;
      }
    },
  };
}

test("t() returns English strings by default without document", () => {
  assert.equal(typeof document, "undefined");
  assert.equal(getLocale(), "en");
  assert.equal(t("header.title"), "Textbook Adapter");
  assert.equal(t("header.themeDark"), "Night mode");
  assert.equal(t("header.themeLight"), "Day mode");
  assert.equal(t("form.customModel"), "Custom model");
  assert.equal(
    t("status.idle"),
    "Load a PDF to plan batches. Gemini is not called until you adapt."
  );
  assert.equal(t("blank.emptyMessage"), "Gemini returned empty text for this batch.");
  assert.equal(
    t("gemini.rateLimitRetrying"),
    "Rate limited. Waiting, then retrying this batch."
  );
  assert.equal(
    t("runControl.failedAlert"),
    "pages {pageRange} failed: {error} {remaining}"
  );
});

test("Spanish catalog lookup works for sample keys", () => {
  setLocale("es", { persist: false });
  assert.equal(getLocale(), "es");
  assert.equal(t("header.title"), es["header.title"]);
  assert.equal(t("header.themeDark"), "Modo nocturno");
  assert.equal(t("form.customModel"), "Modelo personalizado");
  assert.equal(t("status.idle"), es["status.idle"]);
  assert.equal(t("blank.emptyMessage"), es["blank.emptyMessage"]);
  assert.equal(t("gemini.rateLimitRetrying"), es["gemini.rateLimitRetrying"]);
  assert.equal(t("runControl.failedAlert"), es["runControl.failedAlert"]);
});

test("Arabic catalog lookup works for sample keys", () => {
  setLocale("ar", { persist: false });
  assert.equal(getLocale(), "ar");
  assert.equal(t("header.title"), ar["header.title"]);
  assert.equal(t("header.themeDark"), "الوضع الليلي");
  assert.equal(t("form.customModel"), "نموذج مخصص");
  assert.equal(t("status.idle"), ar["status.idle"]);
  assert.equal(t("blank.emptyMessage"), ar["blank.emptyMessage"]);
  assert.equal(t("gemini.rateLimitRetrying"), ar["gemini.rateLimitRetrying"]);
  assert.equal(t("runControl.failedAlert"), ar["runControl.failedAlert"]);
});

test("t() interpolates {placeholder} values", () => {
  assert.equal(t("form.pageMany", { count: 12 }), "12 pages");
  assert.equal(t("form.fileMeta", { fileName: "book.pdf", pages: "3 pages" }), "book.pdf · 3 pages");
  assert.equal(
    t("runControl.failedAlert", {
      pageRange: "001-005",
      error: "boom",
      remaining: "stop",
    }),
    "pages 001-005 failed: boom stop"
  );
  assert.equal(t("form.pageMany", {}), "{count} pages");
});

test("setLocale('ar') sets dir=rtl when document exists; other locales set ltr", () => {
  const mock = installDocumentMock();
  try {
    setLocale("ar", { persist: false });
    assert.equal(mock.html.dir, "rtl");
    assert.equal(mock.html.lang, "ar");
    setLocale("es", { persist: false });
    assert.equal(mock.html.dir, "ltr");
    assert.equal(mock.html.lang, "es");
    setLocale("en", { persist: false });
    assert.equal(mock.html.dir, "ltr");
    assert.equal(mock.html.lang, "en");
  } finally {
    mock.restore();
  }
});

test("missing key falls back to English, then the key string", () => {
  const fallbackKey = "__test.englishOnly";
  en[fallbackKey] = "English fallback";
  try {
    setLocale("es", { persist: false });
    assert.equal(t(fallbackKey), "English fallback");
    assert.equal(t("definitely.missing.key"), "definitely.missing.key");
  } finally {
    delete en[fallbackKey];
  }
});
