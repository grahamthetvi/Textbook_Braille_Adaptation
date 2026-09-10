/** Client-side checks matching scripts/validate_accessible.py. */

const FORBIDDEN_CHARS = "#&*";
const NESTED_NUMBERED = /^(\s*)(\d+)\.\s/;
const NESTED_LETTERED = /^(\s*)([a-zA-Z])\.\s/;

function indentLevel(line) {
  return line.length - line.trimStart().length;
}

export function validateMarkdown(text, label = "output") {
  const issues = [];
  const lines = text.split(/\r?\n/);
  let prevNumberIndent = null;
  let prevLetterIndent = null;

  lines.forEach((line, index) => {
    const lineno = index + 1;
    for (const char of FORBIDDEN_CHARS) {
      if (line.includes(char)) {
        issues.push(`${label}:${lineno}: forbidden character '${char}'`);
      }
    }

    const stripped = line.trimStart();
    const indent = indentLevel(line);

    if (NESTED_NUMBERED.test(line)) {
      if (prevNumberIndent !== null && indent > prevNumberIndent) {
        issues.push(`${label}:${lineno}: nested numbered list`);
      }
      prevNumberIndent = indent;
    } else if (stripped && !stripped.startsWith("-") && !stripped.startsWith("*") && !stripped.startsWith("•")) {
      prevNumberIndent = null;
    }

    if (NESTED_LETTERED.test(line)) {
      if (prevLetterIndent !== null && indent > prevLetterIndent) {
        issues.push(`${label}:${lineno}: nested lettered list`);
      }
      prevLetterIndent = indent;
    } else if (stripped && !stripped.startsWith("-") && !stripped.startsWith("*") && !stripped.startsWith("•")) {
      prevLetterIndent = null;
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
