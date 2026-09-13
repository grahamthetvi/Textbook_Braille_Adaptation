import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CANCELLED_STATUS,
  REMAINING_NOT_SENT,
  applyTranscriptionError,
  formatPageRange,
  formatRunStoppedAlert,
  formatRunStoppedStatus,
  isAbortError,
  runPendingBatches,
} from "../docs/js/run-control.js";

function pending(startPage, endPage) {
  return { startPage, endPage, status: "pending", markdown: "", error: "" };
}

test("formatPageRange zero-pads like output filenames", () => {
  assert.equal(formatPageRange(1, 7), "001-007");
});

test("stop copy includes the page range, Gemini message, and remaining-not-sent note", () => {
  const alert = formatRunStoppedAlert("006-010", "Gemini request failed (HTTP 500).");
  assert.equal(
    alert,
    "pages 006-010 failed: Gemini request failed (HTTP 500). Remaining batches were not sent because of this failure."
  );
  assert.match(formatRunStoppedStatus("006-010"), /pages 006-010/);
  assert.match(formatRunStoppedStatus("006-010"), /Retry that range/);
  assert.equal(REMAINING_NOT_SENT, "Remaining batches were not sent because of this failure.");
});

test("non-abort transcription errors stop the run and leave later batches pending", () => {
  const batches = [pending(1, 5), pending(6, 10), pending(11, 15)];
  const calls = [];
  const result = runPendingBatches(batches, (batch) => {
    calls.push(formatPageRange(batch.startPage, batch.endPage));
    if (batch.startPage === 1) {
      return { ok: true, markdown: "First batch" };
    }
    return { err: new Error("RESOURCE_EXHAUSTED: quota exceeded") };
  });

  assert.equal(result.action, "stop");
  assert.deepEqual(calls, ["001-005", "006-010"]);
  assert.equal(batches[0].status, "done");
  assert.equal(batches[0].markdown, "First batch");
  assert.equal(batches[1].status, "error");
  assert.equal(batches[1].error, "RESOURCE_EXHAUSTED: quota exceeded");
  assert.equal(batches[2].status, "pending");
  assert.equal(
    result.outcome.alertMessage,
    "pages 006-010 failed: RESOURCE_EXHAUSTED: quota exceeded Remaining batches were not sent because of this failure."
  );
  assert.equal(
    result.outcome.statusMessage,
    "Stopped after pages 006-010 failed. Retry that range, or Adapt book to resume remaining pending batches."
  );
});

test("auth-style Gemini errors also stop remaining batches", () => {
  const batches = [pending(1, 5), pending(6, 10)];
  const result = runPendingBatches(batches, () => ({
    err: new Error("API key not valid. Please pass a valid API key."),
  }));
  assert.equal(result.action, "stop");
  assert.equal(batches[0].status, "error");
  assert.equal(batches[1].status, "pending");
  assert.match(result.outcome.alertMessage, /API key not valid/);
  assert.match(result.outcome.alertMessage, /Remaining batches were not sent/);
});

test("AbortError cancels without marking a hard failure", () => {
  const abort = new Error("Adaptation cancelled");
  abort.name = "AbortError";
  assert.equal(isAbortError(abort), true);

  const batches = [pending(1, 5), pending(6, 10)];
  const result = runPendingBatches(batches, () => ({ err: abort }));
  assert.equal(result.action, "cancel");
  assert.equal(batches[0].status, "pending");
  assert.equal(batches[0].error, "");
  assert.equal(batches[1].status, "pending");
  assert.equal(result.outcome.statusMessage, CANCELLED_STATUS);
  assert.equal(result.outcome.alertMessage, "");
});

test("Adapt book after a stop resumes remaining pending rows and skips the failed one", () => {
  const batches = [
    { startPage: 1, endPage: 5, status: "done", markdown: "ok", error: "" },
    { startPage: 6, endPage: 10, status: "error", markdown: "", error: "quota exceeded" },
    pending(11, 15),
  ];
  const calls = [];
  const result = runPendingBatches(batches, (batch) => {
    calls.push(formatPageRange(batch.startPage, batch.endPage));
    return { ok: true, markdown: "later" };
  });
  assert.equal(result.action, "finished");
  assert.deepEqual(calls, ["011-015"]);
  assert.equal(batches[1].status, "error");
  assert.equal(batches[2].status, "done");
});

test("retry of a failed row can run that range again", () => {
  const failed = { startPage: 6, endPage: 10, status: "error", markdown: "", error: "quota exceeded" };
  failed.status = "pending";
  failed.error = "";
  const outcome = applyTranscriptionError(failed, new Error("still failing"));
  assert.equal(outcome.kind, "stop");
  assert.equal(outcome.pageRange, "006-010");
  assert.equal(outcome.error, "still failing");
});
