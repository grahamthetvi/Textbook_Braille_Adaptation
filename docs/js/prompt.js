/** Transcription prompt plus accessible-document-style rules sent to Gemini. */

export const STYLE_RULES = `Accessible Document Style

Write plain prose for later Grade 2 braille. Transcribe faithfully — do not change lesson content.

Paragraphs and headings
Preserve the book's intended paragraphs. Do not merge unrelated blocks or split one thought across files.
Apply titles with heading levels that match the book's hierarchy.
Do not use markdown hash headings such as a leading number-sign on a title unless the book itself prints that character.
Use labels such as Tip: Note: FYI: Directions: Examples Caption: on their own lines when the book prints them that way.

Numbers, dates, and phones
Use comma grouping for multi-digit quantities when it aids comprehension, for example 1,000 students.
Write dates and phone numbers with hyphen separators, for example March-4-2026 or 555-123-4567.

Lists and tables
Tables, numbered lists, lettered lists, and bullet points are allowed.
Do not nest numbered lists. Do not nest lettered lists.
Flatten nested practice — renumber or reletter at one level only.
Use a bullet character or 1. 2. 3. at a single level.
Use simple markdown tables when the book shows tabular data.

Transcriber notes
Use a separate paragraph to describe something visual on the page when it cannot be converted accessibly.
If a caption already describes the image, convert the caption and skip an extra note.
When the lesson depends on unseen layout, write: Transcriber note: followed by a short description.

Symbols to avoid
Avoid square brackets, the number-sign, ampersand, and asterisk unless those characters appear explicitly in the source text.
Write "and" not an ampersand.
Use a section break as three hyphens on its own line.
Possessive apostrophes, hyphens, dashes, and quotation marks are allowed when the book uses them.
After writing, search the text for square brackets, number-signs, ampersands, and asterisks and rephrase any hit unless the symbol is truly in the source.

Word clouds and decorative covers
Skip decorative word clouds unless specific words are required for the lesson.
Transcribe the book title, edition, and copyright block on a cover when printed as normal text.
When a page has no readable lesson content, write: Transcriber note: A decorative word cloud fills the cover; no lesson text is present.

URLs and web addresses
Keep the full URL on one line when the book prints it that way.
You may introduce it plainly, for example Permissions website: followed by the URL.

Unreadable words
Use the token [unclear] for a word that cannot be read. Do not guess a word that would change the lesson.
`;

export function buildInterpretationPrompt(pageRange) {
  return `Transcribe scanned textbook pages into accessible plain text for later Grade 2 braille translation.

Follow all accessible document style rules provided in the system instruction. Transcribe faithfully — do not change lesson content. Use [unclear] for unreadable words. Strip running headers, footers, and lone page numbers. Rejoin line-break hyphens. Read columns in order.

Output markdown only. No preamble, no code fences, and no explanation outside the transcription.
Source pages in this batch: ${pageRange}.`;
}

export function pageRangeLabel(startPage, endPage) {
  const pad = (n) => String(n).padStart(3, "0");
  return `${pad(startPage)}-${pad(endPage)}`;
}
