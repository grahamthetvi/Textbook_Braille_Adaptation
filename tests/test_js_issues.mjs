import assert from "node:assert/strict";
import { test } from "node:test";
import {
  batchesWithStyleIssues,
  excerptForIssue,
  formatIssueCount,
  issueGroupId,
} from "../docs/js/issues.js";

test("formatIssueCount uses singular and plural labels", () => {
  assert.equal(formatIssueCount(0), "0 issues");
  assert.equal(formatIssueCount(1), "1 issue");
  assert.equal(formatIssueCount(4), "4 issues");
});

test("issueGroupId matches zero-padded page ranges", () => {
  assert.equal(issueGroupId(1, 5), "issues-001-005");
});

test("batchesWithStyleIssues keeps completed rows that have validator hits", () => {
  const flagged = batchesWithStyleIssues([
    { status: "done", skippedBlank: false, issues: ["pages-001-005:2: forbidden character '&'"] },
    { status: "done", skippedBlank: false, issues: [] },
    { status: "done", skippedBlank: true, issues: ["pages-006-010:1: forbidden character '#'"] },
    { status: "error", issues: ["pages-011-015:1: forbidden character '*'"] },
    { status: "pending", issues: [] },
  ]);
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].issues[0].includes("'&'"), true);
});

test("excerptForIssue returns the matching markdown line", () => {
  const markdown = "Lesson title\nAdjectives & Articles\nDirections: Circle the noun.";
  assert.equal(
    excerptForIssue(markdown, "pages-001-005:2: forbidden character '&'"),
    "Adjectives & Articles"
  );
  assert.equal(excerptForIssue(markdown, "no-line-number"), "");
  assert.equal(excerptForIssue(markdown, "pages-001-005:99: forbidden character '*'"), "");
  assert.equal(excerptForIssue("only one line", "pages-001-005:1: something else"), "");
});
