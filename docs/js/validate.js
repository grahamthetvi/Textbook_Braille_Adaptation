/** Client-side checks matching scripts/validate_accessible.py. */

const FORBIDDEN_DEFAULT = "#&*[]{}";
const FORBIDDEN_LATEX_MATH = "#&*[]";

export function forbiddenChars(latexMath = false) {
  return latexMath ? FORBIDDEN_LATEX_MATH : FORBIDDEN_DEFAULT;
}

export function validateMarkdown(text, label = "output", options = {}) {
  const issues = [];
  const latexMath = Boolean(options.latexMath);
  const forbidden = forbiddenChars(latexMath);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineno = index + 1;
    for (const char of forbidden) {
      if (line.includes(char)) {
        issues.push(`${label}:${lineno}: forbidden character '${char}'`);
      }
    }
  });

  return issues;
}

export function stripModelFences(text) {
  let out = (text || "").trim();
  if (out.startsWith("```")) {
    out = out.replace(/^```(?:markdown|md)?\s*/i, "");
    out = out.replace(/\s*```$/, "");
  }
  return out.trim();
}
