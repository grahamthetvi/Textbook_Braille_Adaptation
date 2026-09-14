/** Locale lookup, interpolation, and DOM translation for the adapter UI. */

import { ar } from "./locales/ar.js";
import { en } from "./locales/en.js";
import { es } from "./locales/es.js";

export const LOCALES = ["en", "es", "ar"];
export const RTL_LOCALES = new Set(["ar"]);
export const STORAGE_KEY = "textbook-adapter-locale";

export const catalogs = { en, es, ar };

let currentLocale = "en";
const listeners = [];

export function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name]);
    }
    return match;
  });
}

export function t(key, vars) {
  const table = catalogs[currentLocale] || catalogs.en;
  const template = table[key] ?? catalogs.en[key] ?? key;
  if (!vars) {
    return template;
  }
  return interpolate(template, vars);
}

export function getLocale() {
  return currentLocale;
}

export function isRtl(code = currentLocale) {
  return RTL_LOCALES.has(code);
}

export function messageMatches(message, key) {
  return message === t(key) || message === catalogs.en[key];
}

export function applyDocumentLocale(code = currentLocale) {
  if (typeof document === "undefined") {
    return;
  }
  const html = document.documentElement;
  html.lang = code;
  html.dir = isRtl(code) ? "rtl" : "ltr";
}

export function detectLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (LOCALES.includes(stored)) {
      return stored;
    }
  } catch {
    // Ignore missing storage (private mode, Node tests).
  }
  const nav = String(
    (typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage)) || "en"
  ).toLowerCase();
  if (nav.startsWith("ar")) {
    return "ar";
  }
  if (nav.startsWith("es")) {
    return "es";
  }
  return "en";
}

export function onLocaleChange(callback) {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}

export function setLocale(code) {
  const next = LOCALES.includes(code) ? code : "en";
  currentLocale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Ignore missing storage.
  }
  applyDocumentLocale(next);
  for (const callback of listeners) {
    callback(next);
  }
  return next;
}

export function applyTranslations(root) {
  const scope = root || (typeof document === "undefined" ? null : document);
  if (!scope?.querySelectorAll) {
    return;
  }
  for (const el of scope.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  for (const el of scope.querySelectorAll("[data-i18n-html]")) {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  }
  for (const el of scope.querySelectorAll("[data-i18n-aria-label]")) {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
  }
}
