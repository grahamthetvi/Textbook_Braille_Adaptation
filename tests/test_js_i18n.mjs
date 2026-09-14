import assert from "node:assert/strict";
import { afterEach, before, test } from "node:test";
import {
  applyDocumentLocale,
  catalogs,
  getLocale,
  interpolate,
  isRtl,
  messageMatches,
  setLocale,
  t,
} from "../docs/js/i18n.js";

before(() => {
  globalThis.document = {
    documentElement: { lang: "en", dir: "ltr" },
  };
  setLocale("en");
});

afterEach(() => {
  setLocale("en");
});

test("t() returns English by default", () => {
  assert.equal(getLocale(), "en");
  assert.equal(t("header.title"), "Textbook Adapter");
  assert.equal(t("toolbar.darkMode"), "Dark mode");
});

test("Spanish lookup works for a sample key", () => {
  setLocale("es");
  assert.equal(getLocale(), "es");
  assert.equal(t("header.title"), "Adaptador de libros de texto");
  assert.equal(t("form.adaptBook"), "Adaptar el libro");
});

test("Arabic lookup works for a sample key", () => {
  setLocale("ar");
  assert.equal(getLocale(), "ar");
  assert.equal(t("header.title"), "محوّل الكتب الدراسية");
  assert.equal(t("toolbar.language"), "اللغة");
});

test("{placeholder} interpolation", () => {
  assert.equal(
    interpolate("Hello {name}", { name: "Ada" }),
    "Hello Ada"
  );
  assert.equal(
    t("status.plannedMany", { batches: 3, count: 20 }),
    "Planned 3 batches from 20 pages. Gemini is not called until you adapt."
  );
  setLocale("es");
  assert.equal(
    t("file.pages", { fileName: "book.pdf", count: 12 }),
    "book.pdf · 12 páginas"
  );
});

test("setLocale('ar') sets dir === 'rtl'; other locales set ltr", () => {
  setLocale("ar");
  applyDocumentLocale();
  assert.equal(isRtl(), true);
  assert.equal(document.documentElement.lang, "ar");
  assert.equal(document.documentElement.dir, "rtl");

  setLocale("es");
  assert.equal(isRtl(), false);
  assert.equal(document.documentElement.dir, "ltr");
  assert.equal(document.documentElement.lang, "es");

  setLocale("en");
  assert.equal(document.documentElement.dir, "ltr");
});

test("missing key falls back to English then to the key", () => {
  assert.equal(t("not.a.real.key"), "not.a.real.key");
  setLocale("es");
  assert.equal(t("header.skip"), "Saltar al contenido principal");
  assert.equal(t("not.a.real.key"), "not.a.real.key");
});

test("messageMatches accepts English and the active locale", () => {
  const english = t("gemini.rateLimitRetrying");
  assert.equal(messageMatches(english, "gemini.rateLimitRetrying"), true);
  setLocale("es");
  assert.equal(messageMatches(english, "gemini.rateLimitRetrying"), true);
  assert.equal(messageMatches(t("gemini.rateLimitRetrying"), "gemini.rateLimitRetrying"), true);
});

test("Spanish and Arabic catalogs cover every English key", () => {
  const englishKeys = Object.keys(catalogs.en).sort();
  assert.deepEqual(Object.keys(catalogs.es).sort(), englishKeys);
  assert.deepEqual(Object.keys(catalogs.ar).sort(), englishKeys);
});
