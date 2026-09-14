/** Manual light/dark theme with localStorage persistence. */

export const THEME_STORAGE_KEY = "textbook-adapter-theme";

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

export function prefersDark() {
  return Boolean(globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
}

export function readStoredTheme() {
  const stored = readStorage(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return null;
}

export function resolveTheme() {
  return readStoredTheme() || (prefersDark() ? "dark" : "light");
}

export function getTheme() {
  const current =
    typeof document === "undefined" ? "" : document.documentElement.dataset.theme;
  if (current === "dark" || current === "light") {
    return current;
  }
  return resolveTheme();
}

export function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = next;
    const button = document.getElementById("theme-toggle");
    if (button) {
      button.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
    }
  }
  return next;
}

export function persistTheme(theme) {
  writeStorage(THEME_STORAGE_KEY, theme === "dark" ? "dark" : "light");
}

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  persistTheme(next);
  return applyTheme(next);
}

export function initTheme() {
  return applyTheme(resolveTheme());
}
