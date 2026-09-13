/** Transcription prompt plus accessible-document-style rules sent to Gemini.
 * Keep STYLE_RULES, PLAIN_MATH_INSTRUCTION, and LATEX_MATH_INSTRUCTION in
 * lockstep with scripts/adapt_pdf.py.
 */

export const STYLE_RULES = `Role: Produce screen-reader-accessible text from scanned textbook pages. Do not output braille, contractions, or braille ASCII. Transcribe faithfully. Do not change lesson content.

When stuck
If you cannot reliably make the content accessible (illegible text, ambiguous layout, a diagram the lesson depends on, or uncertain math), do not guess. Ask one short specific question. If several issues, ask the most blocking one first. Return only the following block, with no transcription before or after it:

CLARIFY:
<one question>

After the user answers, transcribe the batch. If you still cannot, return only another CLARIFY block.

Formatting
Use paragraphs, bullet lists, numbered lists, tables, headings, and blank lines.
Nested and indented lists are allowed. Number or letter questions when they sit under a numbered item.
Avoid square brackets, braces, asterisk, and number-sign unless those characters appear in the source. Do not use markdown hash headings. Write headings as plain title lines matching the book's hierarchy.
Default math: plain text only. Write plus, minus, times, divided by, equals, and spoken-friendly fractions. Do not use LaTeX unless math-LaTeX mode is on.
Use simple markdown pipe tables when the book shows tabular data. Do not insert a header-separator row of hyphens; three hyphens on their own line are a section break, not a table rule.
Use labels such as Tip: Note: FYI: Directions: Examples Caption: on their own lines when the book prints them that way.
Transcriber notes only when a visual cannot be converted accessibly. If a caption already describes the image, convert the caption and skip an extra note. Otherwise write Transcriber note: followed by a short description.
Strip running headers, footers, and lone page numbers. Rejoin line-break hyphens. Read columns in order.
Unreadable word: write (unclear). Do not guess a word that would change the lesson. Do not wrap it in square brackets.
Comma-group multi-digit numbers when it aids comprehension, for example 1,000 students. Write dates and phone numbers with hyphen separators, for example March-4-2026 or 555-123-4567.
Write "and" not an ampersand unless the ampersand appears in the source.
Skip decorative word clouds unless specific words are required for the lesson. Transcribe the book title, edition, and copyright block on a cover when printed as normal text. When a page has no readable lesson content, write: Transcriber note: A decorative word cloud fills the cover; no lesson text is present.
Keep the full URL on one line when the book prints it that way. You may introduce it plainly, for example Permissions website: followed by the URL.
Output markdown or plain text only when completing a batch. No preamble, no code fences.
`;

export const PLAIN_MATH_INSTRUCTION =
  "Represent math in plain text only (plus, minus, times, divided by, equals, spoken-friendly fractions). Do not use LaTeX.";

export const LATEX_MATH_INSTRUCTION =
  "Math LaTeX mode is on. Wrap every mathematical expression, equation, and arithmetic operation in LaTeX notation: \\(...\\) for inline math and $$...$$ for display equations. Leave all non-math prose unchanged. Braces used inside LaTeX math spans are allowed. Still avoid asterisk, number-sign, and square brackets unless they appear in the source.";

export function buildStyleRules(latexMath = false) {
  if (!latexMath) {
    return STYLE_RULES;
  }
  return `${STYLE_RULES}\n${LATEX_MATH_INSTRUCTION}\n`;
}

export function buildInterpretationPrompt(pageRange, options = {}) {
  const latexMath = Boolean(options.latexMath);
  const mathLine = latexMath ? LATEX_MATH_INSTRUCTION : PLAIN_MATH_INSTRUCTION;
  return `Produce screen-reader-accessible text from these scanned textbook pages. Do not output braille, contractions, or braille ASCII.

Follow the system instruction. Transcribe faithfully. If you cannot reliably make the content accessible, return only a CLARIFY block. Nested lists are allowed. Number or letter questions when they sit under a numbered item. Use paragraphs, bullet lists, numbered lists, tables, headings, and blank lines. Avoid square brackets, braces, asterisk, and number-sign unless they appear in the source. Do not use markdown hash headings. Use (unclear) for unreadable words. Strip running headers, footers, and lone page numbers. Rejoin line-break hyphens. Read columns in order.

${mathLine}

Output markdown or plain text only when completing the batch. No preamble, no code fences.
Source pages in this batch: ${pageRange}.`;
}

/** Return the clarify question if the model response is a CLARIFY-only block; otherwise null. */
export function parseClarify(text) {
  const trimmed = String(text || "").trim();
  const match = trimmed.match(/^CLARIFY:\s*([\s\S]*)$/i);
  if (!match) {
    return null;
  }
  return match[1].trim();
}

export function pageRangeLabel(startPage, endPage) {
  const pad = (n) => String(n).padStart(3, "0");
  return `${pad(startPage)}-${pad(endPage)}`;
}

export function formatClarifyFollowUp(answer) {
  return `${String(answer || "").trim()}

Using that answer, transcribe this batch now. If you still cannot reliably make the content accessible, return only another CLARIFY block.`;
}
