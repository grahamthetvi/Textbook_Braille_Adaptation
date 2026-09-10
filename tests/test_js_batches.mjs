import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseBatchSize, planBatches } from "../docs/js/batches.js";

test("planBatches(0) is empty", () => {
  assert.deepEqual(planBatches(0), []);
});

test("planBatches(5) is a single batch", () => {
  assert.deepEqual(planBatches(5), [{ startPage: 1, endPage: 5 }]);
});

test("planBatches(8) is a single batch", () => {
  assert.deepEqual(planBatches(8), [{ startPage: 1, endPage: 8 }]);
});

test("planBatches(10) uses size 5", () => {
  assert.deepEqual(planBatches(10), [
    { startPage: 1, endPage: 5 },
    { startPage: 6, endPage: 10 },
  ]);
});

test("planBatches(220) covers the Grammar Workbook", () => {
  const ranges = planBatches(220);
  assert.equal(ranges.length, 44);
  assert.deepEqual(ranges[0], { startPage: 1, endPage: 5 });
  assert.deepEqual(ranges.at(-1), { startPage: 216, endPage: 220 });
});

test("chooseBatchSize(220, 6) is 5", () => {
  assert.equal(chooseBatchSize(220, 6), 5);
});
