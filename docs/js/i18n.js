/**
 * UI localization for the textbook adapter.
 * Locale modules are ES imports so GitHub Pages and serve_adapter.py need no extra MIME setup.
 */

import { ar } from "./locales/ar.js";
import { en } from "./locales/en.js";
import { es } from "./locales/es.js";

export { ar, en, es };

export const LOCALE_STORAGE_KEY = "textbook-adapter-locale";
export const DEFAULT_LOCALE = "en";
export const LOCALES = { en, es, ar };
export const RTL_LOCALES = new Set(["ar"]);

const listeners = new Set();
let currentLocale = DEFAULT_LOCALE;

function getHtml() {
  return typeof document === "undefined" ? null : document.documentElement;
}

function readStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Private mode or missing storage.
  }
}

export function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, name) => {
    if (!Object.prototype.hasOwnProperty.call(vars, name)) {
      return match;
    }
    return String(vars[name]);
  });
}

export function normalizeLocale(code) {
  const lower = String(code || "")
    .trim()
    .toLowerCase();
  if (LOCALES[lower]) {
    return lower;
  }
  const prefix = lower.split("-")[0];
  if (LOCALES[prefix]) {
    return prefix;
  }
  return DEFAULT_LOCALE;
}

export function isRtl(code = currentLocale) {
  return RTL_LOCALES.has(normalizeLocale(code));
}

export function t(key, vars = {}) {
  const catalog = LOCALES[currentLocale] || en;
  const template = catalog[key] ?? en[key];
  if (template === undefined) {
    return key;
  }
  return interpolate(template, vars);
}

export function getLocale() {
  return currentLocale;
}

export function applyDocumentLocale(code = currentLocale) {
  const html = getHtml();
  if (!html) {
    return;
  }
  const locale = normalizeLocale(code);
  html.lang = locale;
  html.dir = isRtl(locale) ? "rtl" : "ltr";
}

export function applyTranslations(root) {
  if (typeof document === "undefined") {
    return;
  }
  const scope = root || document;
  if (typeof scope.querySelectorAll !== "function") {
    applyDocumentLocale();
    if (typeof document.title === "string") {
      document.title = t("header.title");
    }
    return;
  }

  for (const el of scope.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  for (const el of scope.querySelectorAll("[data-i18n-html]")) {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  }
  for (const el of scope.querySelectorAll("[data-i18n-placeholder]")) {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  }
  for (const el of scope.querySelectorAll("[data-i18n-aria-label]")) {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
  }
  document.title = t("header.title");
}

export function onLocaleChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setLocale(code, { persist = true } = {}) {
  const next = normalizeLocale(code);
  currentLocale = next;
  if (persist) {
    writeStorage(LOCALE_STORAGE_KEY, next);
  }
  applyDocumentLocale(next);
  applyTranslations();
  for (const listener of [...listeners]) {
    listener(next);
  }
  return next;
}

export function detectLocale() {
  const stored = readStorage(LOCALE_STORAGE_KEY);
  if (stored) {
    return normalizeLocale(stored);
  }
  const language =
    (typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage)) || "";
  return normalizeLocale(language);
}

export function initI18n() {
  return setLocale(detectLocale(), { persist: false });
}
