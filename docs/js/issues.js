/** Group completed-batch style findings for the adapter UI. */

import { formatPageRange } from "./run-control.js";

export function batchesWithStyleIssues(batches) {
  return (batches || []).filter(
    (batch) =>
      batch?.status === "done" &&
      !batch.skippedBlank &&
      Array.isArray(batch.issues) &&
      batch.issues.length > 0
  );
}

export function issueGroupId(startPage, endPage) {
  return `issues-${formatPageRange(startPage, endPage)}`;
}

export function formatIssueCount(count) {
  const n = Number(count) || 0;
  return n === 1 ? "1 issue" : `${n} issues`;
}

/** Line text from the batch markdown for a `label:lineno:` validator message. */
export function excerptForIssue(markdown, issue) {
  const match = String(issue || "").match(/:(\d+): forbidden character/);
  if (!match) {
    return "";
  }
  const lineno = Number(match[1]);
  if (!Number.isFinite(lineno) || lineno < 1) {
    return "";
  }
  const lines = String(markdown || "").split(/\r?\n/);
  return (lines[lineno - 1] || "").trim();
}
