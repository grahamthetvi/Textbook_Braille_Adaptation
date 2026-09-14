import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LATEX_MATH_INSTRUCTION,
  PLAIN_MATH_INSTRUCTION,
  STYLE_RULES,
  buildInterpretationPrompt,
  buildStyleRules,
  formatClarifyFollowUp,
  formatClarifyModelTurn,
  parseClarify,
  parseClarifyResponse,
  languageInstruction,
  resolveOutputLanguage,
} from "../docs/js/prompt.js";

test("STYLE_RULES is screen-reader agent copy, not Grade 2 as the primary goal", () => {
  assert.match(STYLE_RULES, /screen-reader-accessible/);
  assert.match(STYLE_RULES, /CLARIFY:/);
  assert.match(STYLE_RULES, /Nested and indented lists are allowed/);
  assert.match(STYLE_RULES, /\(unclear\)/);
  assert.doesNotMatch(STYLE_RULES, /later Grade 2 braille/);
  assert.doesNotMatch(STYLE_RULES, /Grade 2 braille translation/);
  assert.doesNotMatch(STYLE_RULES, /\[unclear\]/);
});

test("buildInterpretationPrompt mentions screen reader and nested lists", () => {
  const prompt = buildInterpretationPrompt("001-005");
  assert.match(prompt, /screen-reader-accessible/);
  assert.match(prompt, /CLARIFY/);
  assert.match(prompt, /Nested lists are allowed/);
  assert.match(prompt, /\(unclear\)/);
  assert.match(prompt, /001-005/);
  assert.equal(prompt.includes(PLAIN_MATH_INSTRUCTION), true);
  assert.equal(prompt.includes(LATEX_MATH_INSTRUCTION), false);
  assert.doesNotMatch(prompt, /Grade 2 braille translation/);
});

test("latex-math mode appends the LaTeX wrapping instruction", () => {
  const prompt = buildInterpretationPrompt("006-010", { latexMath: true });
  assert.equal(prompt.includes(LATEX_MATH_INSTRUCTION), true);
  assert.equal(prompt.includes(PLAIN_MATH_INSTRUCTION), false);
  assert.equal(prompt.includes("\\(...\\)"), true);
  assert.equal(prompt.includes("$$...$$"), true);
  assert.equal(buildStyleRules(true).includes(LATEX_MATH_INSTRUCTION), true);
  assert.equal(buildStyleRules(false), STYLE_RULES);
});

test("Spanish and Arabic UI locales ask Gemini to write questions with localized markers", () => {
  assert.equal(resolveOutputLanguage("es-MX").code, "es");
  assert.equal(languageInstruction("en"), "");
  assert.equal(languageInstruction(), "");
  const spanish = languageInstruction("es");
  assert.match(spanish, /Spanish/);
  assert.match(spanish, /español/);
  assert.match(spanish, /ACLARAR:/);
  assert.match(spanish, /\(poco claro\)/);
  assert.match(spanish, /do not translate the lesson/i);
  assert.match(spanish, /Ignore the English CLARIFY/);
  const arabic = languageInstruction("ar");
  assert.match(arabic, /Arabic/);
  assert.match(arabic, /العربية/);
  assert.match(arabic, /توضيح:/);
  assert.match(arabic, /\(غير واضح\)/);
  assert.match(buildStyleRules(false, { locale: "es" }), /ACLARAR:/);
  assert.equal(buildStyleRules(false, { locale: "en" }), STYLE_RULES);
  assert.match(buildInterpretationPrompt("001-005", { locale: "ar" }), /توضيح/);
  assert.match(buildInterpretationPrompt("001-005", { locale: "es" }), /\(poco claro\)/);
  assert.doesNotMatch(buildInterpretationPrompt("001-005"), /Website language/);
  assert.match(formatClarifyFollowUp("Sí, un mapa.", { locale: "es" }), /ACLARAR:/);
  assert.match(formatClarifyFollowUp("Sí, un mapa.", { locale: "es" }), /\(poco claro\)/);
  assert.doesNotMatch(formatClarifyFollowUp("Yes."), /ACLARAR:/);
});

test("parseClarify detects a trailing CLARIFY block after a draft", () => {
  assert.equal(parseClarify("CLARIFY:\nIs the figure a pie chart?"), "Is the figure a pie chart?");
  assert.equal(parseClarify("clarify:\nWhat is the printed fraction?"), "What is the printed fraction?");
  assert.equal(parseClarify("  \nCLARIFY:\nIs this a map?\n  "), "Is this a map?");
  assert.equal(parseClarify("Lesson title\n\n1. Identify adjectives"), null);
  assert.equal(parseClarify("Lesson title\n\nCLARIFY:\nIs this a map?"), "Is this a map?");
  assert.equal(parseClarify(""), null);
  assert.equal(parseClarify("CLARIFY:"), "");

  const mixed = parseClarifyResponse("Lesson title\n\nCLARIFY:\nIs this a map?");
  assert.deepEqual(mixed, { question: "Is this a map?", draft: "Lesson title", marker: "CLARIFY" });
  assert.equal(parseClarifyResponse("1. Identify adjectives"), null);
  assert.equal(parseClarify("Título\n\nACLARAR:\n¿Es un mapa?"), "¿Es un mapa?");
  assert.equal(parseClarifyResponse("Título\n\nACLARAR:\n¿Es un mapa?").marker, "ACLARAR");
  assert.equal(parseClarify("العنوان\n\nتوضيح:\nهل هذه خريطة؟"), "هل هذه خريطة؟");

  const lastAsk = parseClarifyResponse(
    "Draft one\nCLARIFY:\nFirst question?\n\nDraft two\nCLARIFY:\nSecond question?"
  );
  assert.equal(lastAsk.question, "Second question?");
  assert.match(lastAsk.draft, /First question\?/);
});

test("formatClarifyFollowUp asks the model to transcribe or ask again", () => {
  const followUp = formatClarifyFollowUp("It is a pie chart.");
  assert.match(followUp, /It is a pie chart/);
  assert.match(followUp, /transcribe this batch now/i);
  assert.match(followUp, /CLARIFY/);
  assert.doesNotMatch(followUp, /draft appears above/);

  const withDraft = formatClarifyFollowUp("It is a pie chart.", { draft: "Lesson title" });
  assert.match(withDraft, /draft appears above/i);
  assert.equal(
    formatClarifyModelTurn({ question: "Is this a map?", draft: "Lesson title" }),
    "Lesson title\n\nCLARIFY:\nIs this a map?"
  );
  assert.equal(formatClarifyModelTurn({ question: "Is this a map?" }), "CLARIFY:\nIs this a map?");
  assert.equal(
    formatClarifyModelTurn({ question: "¿Es un mapa?" }, { locale: "es" }),
    "ACLARAR:\n¿Es un mapa?"
  );
  assert.equal(
    formatClarifyModelTurn({ question: "هل هذه خريطة؟", marker: "توضيح" }),
    "توضيح:\nهل هذه خريطة؟"
  );
});
