/** Persist and apply light/dark theme for the adapter UI. */

import { t } from "./i18n.js";

export const THEME_KEY = "textbook-adapter-theme";

export function detectTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Ignore missing storage (private mode, Node tests).
  }
  if (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function getTheme() {
  if (typeof document === "undefined") {
    return "light";
  }
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = next;
  }
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Ignore missing storage.
  }
  syncThemeToggle();
  return next;
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function syncThemeToggle() {
  if (typeof document === "undefined") {
    return;
  }
  const button = document.getElementById("theme-toggle");
  if (!button) {
    return;
  }
  const dark = getTheme() === "dark";
  button.setAttribute("aria-pressed", dark ? "true" : "false");
  button.textContent = t("toolbar.darkMode");
}

export function initTheme() {
  const current =
    typeof document === "undefined" ? "" : document.documentElement.dataset.theme;
  if (current !== "dark" && current !== "light") {
    setTheme(detectTheme());
    return;
  }
  syncThemeToggle();
}
