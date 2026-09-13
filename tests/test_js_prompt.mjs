import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LATEX_MATH_INSTRUCTION,
  PLAIN_MATH_INSTRUCTION,
  STYLE_RULES,
  buildInterpretationPrompt,
  buildStyleRules,
  formatClarifyFollowUp,
  parseClarify,
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

test("parseClarify detects a CLARIFY-only block", () => {
  assert.equal(parseClarify("CLARIFY:\nIs the figure a pie chart?"), "Is the figure a pie chart?");
  assert.equal(parseClarify("clarify:\nWhat is the printed fraction?"), "What is the printed fraction?");
  assert.equal(parseClarify("Lesson title\n\n1. Identify adjectives"), null);
  assert.equal(parseClarify(""), null);
  assert.equal(parseClarify("CLARIFY:"), "");
});

test("formatClarifyFollowUp asks the model to transcribe or ask again", () => {
  const followUp = formatClarifyFollowUp("It is a pie chart.");
  assert.match(followUp, /It is a pie chart/);
  assert.match(followUp, /transcribe this batch now/i);
  assert.match(followUp, /CLARIFY/);
});
