#!/usr/bin/env python3
"""Batch planner tests. Must stay in lockstep with docs/js/batches.js."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from split_pdf import choose_batch_size, plan_batches


class PlanBatchesTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(plan_batches(0), [])

    def test_exact_minimum(self):
        self.assertEqual(plan_batches(5), [(1, 5)])

    def test_exact_maximum(self):
        self.assertEqual(plan_batches(8), [(1, 8)])

    def test_ten_pages_uses_size_five(self):
        self.assertEqual(plan_batches(10), [(1, 5), (6, 10)])

    def test_workbook_length(self):
        ranges = plan_batches(220)
        self.assertEqual(len(ranges), 44)
        self.assertEqual(ranges[0], (1, 5))
        self.assertEqual(ranges[-1], (216, 220))

    def test_choose_batch_size_for_workbook(self):
        self.assertEqual(choose_batch_size(220, 6), 5)


if __name__ == "__main__":
    unittest.main()
