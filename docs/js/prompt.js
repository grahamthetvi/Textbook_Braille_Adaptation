/** Transcription prompt plus accessible-document-style rules sent to Gemini.
 * Keep STYLE_RULES, PLAIN_MATH_INSTRUCTION, and LATEX_MATH_INSTRUCTION in
 * lockstep with scripts/adapt_pdf.py.
 */

export const STYLE_RULES = `Role: Produce screen-reader-accessible text from scanned textbook pages. Do not output braille, contractions, or braille ASCII. Transcribe faithfully. Do not change lesson content.

When stuck
If you cannot reliably make the content accessible (illegible text, ambiguous layout, a diagram the lesson depends on, or uncertain math), do not guess. Ask one short specific question. If several issues, ask the most blocking one first. Prefer a CLARIFY-only reply. If you already started transcribing, still end with the following block:

CLARIFY:
<one question>

After the user answers, transcribe the complete batch. If you still cannot, end with another CLARIFY block.

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
Do not return an empty reply when printed lesson text is visible. If you cannot transcribe, ask a CLARIFY question instead of silence.
Keep the full URL on one line when the book prints it that way. You may introduce it plainly, for example Permissions website: followed by the URL.
Output markdown or plain text only when completing a batch. No preamble, no code fences.
`;

export const PLAIN_MATH_INSTRUCTION =
  "Represent math in plain text only (plus, minus, times, divided by, equals, spoken-friendly fractions). Do not use LaTeX.";

export const LATEX_MATH_INSTRUCTION =
  "Math LaTeX mode is on. Wrap every mathematical expression, equation, and arithmetic operation in LaTeX notation: \\(...\\) for inline math and $$...$$ for display equations. Leave all non-math prose unchanged. Braces used inside LaTeX math spans are allowed. Still avoid asterisk, number-sign, and square brackets unless they appear in the source.";

/** UI locales the adapter can ask Gemini to write questions in. */
export const OUTPUT_LANGUAGES = {
  en: {
    code: "en",
    englishName: "English",
    nativeName: "English",
    clarifyMarker: "CLARIFY",
    unclearToken: "(unclear)",
  },
  es: {
    code: "es",
    englishName: "Spanish",
    nativeName: "español",
    clarifyMarker: "ACLARAR",
    unclearToken: "(poco claro)",
  },
  ar: {
    code: "ar",
    englishName: "Arabic",
    nativeName: "العربية",
    clarifyMarker: "توضيح",
    unclearToken: "(غير واضح)",
  },
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const CLARIFY_MARKER_PATTERN = Object.values(OUTPUT_LANGUAGES)
  .map((lang) => escapeRegex(lang.clarifyMarker))
  .sort((left, right) => right.length - left.length)
  .join("|");

export function resolveOutputLanguage(locale) {
  const code = String(locale || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return OUTPUT_LANGUAGES[code] || OUTPUT_LANGUAGES.en;
}

export function clarifyMarker(locale) {
  return resolveOutputLanguage(locale).clarifyMarker;
}

export function unclearToken(locale) {
  return resolveOutputLanguage(locale).unclearToken;
}

export function canonicalClarifyMarker(raw) {
  const value = String(raw || "").trim();
  for (const lang of Object.values(OUTPUT_LANGUAGES)) {
    if (lang.clarifyMarker === value || lang.clarifyMarker.toLowerCase() === value.toLowerCase()) {
      return lang.clarifyMarker;
    }
  }
  return OUTPUT_LANGUAGES.en.clarifyMarker;
}

/** Extra system/user line so questions and unreadable-word marks match the website language. */
export function languageInstruction(locale) {
  const lang = resolveOutputLanguage(locale);
  if (lang.code === "en") {
    return "";
  }
  return `Website language: ${lang.englishName} (${lang.nativeName}). Write clarification questions, Transcriber note descriptions, and any other text you author in ${lang.englishName}. Ignore the English CLARIFY: and (unclear) tokens earlier in this prompt. For an unreadable word write ${lang.unclearToken}. If you must ask, end with this block, keeping the marker exactly:

${lang.clarifyMarker}:
<one question>

Transcribe printed lesson wording in the language of the scan; do not translate the lesson.`;
}

export function buildStyleRules(latexMath = false, options = {}) {
  const language = languageInstruction(options.locale);
  if (!language) {
    if (!latexMath) {
      return STYLE_RULES;
    }
    return `${STYLE_RULES}\n${LATEX_MATH_INSTRUCTION}\n`;
  }
  if (!latexMath) {
    return `${STYLE_RULES}\n${language}\n`;
  }
  return `${STYLE_RULES}\n${language}\n${LATEX_MATH_INSTRUCTION}\n`;
}

/** Extra user-turn copy after a reviewer confirmed the scan has printed text. */
export function formatEmptyRetryInstruction(options = {}) {
  const lang = resolveOutputLanguage(options.locale);
  return `Retry after empty output
A reviewer looked at the original scans for this batch and confirmed they contain printed lesson text. Your previous reply was empty. That was a miss, not a blank page.
Transcribe every printed lesson on these pages now. Do not return empty output. Do not skip the batch. Read every page in the attached PDF. If a word is unreadable, write ${lang.unclearToken}. If you cannot reliably make the content accessible, return a ${lang.clarifyMarker} block instead of silence.
Empty output is only for pages with no printed marks. These pages have printed text.`;
}

export function buildInterpretationPrompt(pageRange, options = {}) {
  const latexMath = Boolean(options.latexMath);
  const mathLine = latexMath ? LATEX_MATH_INSTRUCTION : PLAIN_MATH_INSTRUCTION;
  const lang = resolveOutputLanguage(options.locale);
  const language = languageInstruction(options.locale);
  const languageBlock = language ? `\n${language}\n` : "\n";
  const emptyRetry = Boolean(options.emptyRetry)
    ? `\n${formatEmptyRetryInstruction(options)}\n`
    : "";
  return `Produce screen-reader-accessible text from these scanned textbook pages. Do not output braille, contractions, or braille ASCII.

Follow the system instruction. Transcribe faithfully. If you cannot reliably make the content accessible, end with a ${lang.clarifyMarker} block. Prefer a ${lang.clarifyMarker}-only reply. Nested lists are allowed. Number or letter questions when they sit under a numbered item. Use paragraphs, bullet lists, numbered lists, tables, headings, and blank lines. Avoid square brackets, braces, asterisk, and number-sign unless they appear in the source. Do not use markdown hash headings. Use ${lang.unclearToken} for unreadable words. Strip running headers, footers, and lone page numbers. Rejoin line-break hyphens. Read columns in order.
${languageBlock}${mathLine}

Output markdown or plain text only when completing the batch. No preamble, no code fences.
Source pages in this batch: ${pageRange}.${emptyRetry}`;
}

/** Split a model reply into an optional draft and a trailing clarify question. */
export function parseClarifyResponse(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(
    new RegExp(`^(?:([\\s\\S]*)\\r?\\n)?(${CLARIFY_MARKER_PATTERN}):\\s*([\\s\\S]*)$`, "i")
  );
  if (!match) {
    return null;
  }
  return {
    question: match[3].trim(),
    draft: (match[1] || "").trim(),
    marker: canonicalClarifyMarker(match[2]),
  };
}

/** Return the clarify question if the reply ends in a CLARIFY block; otherwise null. */
export function parseClarify(text) {
  const parsed = parseClarifyResponse(text);
  return parsed ? parsed.question : null;
}

export function pageRangeLabel(startPage, endPage) {
  const pad = (n) => String(n).padStart(3, "0");
  return `${pad(startPage)}-${pad(endPage)}`;
}

export function formatClarifyModelTurn(turn = {}, options = {}) {
  const question = String(turn.question || "").trim();
  const draft = String(turn.draft || "").trim();
  const marker = canonicalClarifyMarker(
    turn.marker || clarifyMarker(options.locale || turn.locale)
  );
  if (draft) {
    return `${draft}\n\n${marker}:\n${question}`;
  }
  return `${marker}:\n${question}`;
}

export function formatClarifyFollowUp(answer, options = {}) {
  const draftNote = String(options.draft || "").trim()
    ? " If a draft appears above, correct and complete that transcription."
    : "";
  const lang = resolveOutputLanguage(options.locale);
  const languageNote =
    lang.code === "en"
      ? ""
      : ` Write any new question in ${lang.englishName} as a ${lang.clarifyMarker}: block. Mark unreadable words ${lang.unclearToken}.`;
  return `${String(answer || "").trim()}

Using that answer, transcribe this batch now.${draftNote}${languageNote} If you still cannot reliably make the content accessible, return only another ${lang.clarifyMarker}: block.`;
}
