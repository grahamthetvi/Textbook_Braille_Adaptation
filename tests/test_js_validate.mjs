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

test("nested numbered list is reported", () => {
  const issues = validateMarkdown("1. outer item\n  2. nested item\n");
  assert.ok(issues.some((item) => item.includes("nested numbered list")));
});

test("flat numbered list is allowed", () => {
  assert.deepEqual(validateMarkdown("1. first\n2. second\n3. third\n"), []);
});
