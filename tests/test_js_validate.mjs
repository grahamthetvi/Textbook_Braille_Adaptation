import assert from "node:assert/strict";
import { test } from "node:test";
import { validateMarkdown } from "../docs/js/validate.js";

test('"hello" has no issues', () => {
  assert.deepEqual(validateMarkdown("hello"), []);
});

test("ampersand is forbidden", () => {
  const issues = validateMarkdown("Adjectives & Articles");
  assert.equal(issues.length, 1);
  assert.match(issues[0], /forbidden character '&'/);
});

test("square brackets, braces, asterisk, and number-sign are forbidden", () => {
  const issues = validateMarkdown("See [note] {hint} *star* #1");
  assert.ok(issues.some((item) => item.includes("forbidden character '['")));
  assert.ok(issues.some((item) => item.includes("forbidden character ']'")));
  assert.ok(issues.some((item) => item.includes("forbidden character '{'")));
  assert.ok(issues.some((item) => item.includes("forbidden character '}'")));
  assert.ok(issues.some((item) => item.includes("forbidden character '*'")));
  assert.ok(issues.some((item) => item.includes("forbidden character '#'")));
});

test("(unclear) is allowed and [unclear] is not", () => {
  assert.deepEqual(validateMarkdown("the word was (unclear) on the scan"), []);
  const issues = validateMarkdown("the word was [unclear] on the scan");
  assert.ok(issues.some((item) => item.includes("'['")));
  assert.ok(issues.some((item) => item.includes("']'")));
});

test("nested numbered and lettered lists are allowed", () => {
  const text = "1. outer item\n  a. nested question\n  b. second question\n2. next item\n";
  assert.deepEqual(validateMarkdown(text), []);
});

test("flat numbered list is allowed", () => {
  assert.deepEqual(validateMarkdown("1. first\n2. second\n3. third\n"), []);
});

test("latex-math mode allows braces but still flags brackets, asterisk, and number-sign", () => {
  const math = "The fraction is \\frac{1}{2}.";
  assert.ok(validateMarkdown(math).some((item) => item.includes("'{'")));
  assert.deepEqual(validateMarkdown(math, "output", { latexMath: true }), []);

  const stillBad = "Keep [this] and #1 and *star*";
  const issues = validateMarkdown(stillBad, "output", { latexMath: true });
  assert.ok(issues.some((item) => item.includes("'['")));
  assert.ok(issues.some((item) => item.includes("']'")));
  assert.ok(issues.some((item) => item.includes("'#'")));
  assert.ok(issues.some((item) => item.includes("'*'")));
  assert.equal(
    issues.some((item) => item.includes("'{'") || item.includes("'}'")),
    false
  );
});
