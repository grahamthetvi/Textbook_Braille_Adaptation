#!/usr/bin/env python3
"""describe_plan tests against the Grammar Workbook PDF when present."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from pypdf import PdfReader
from split_pdf import describe_plan, split_pdf

WORKBOOK = ROOT / "scans" / "Grammar Workbook.pdf"


@unittest.skipUnless(WORKBOOK.is_file(), "Grammar Workbook.pdf not present")
class PdfSplitPlanTests(unittest.TestCase):
    def test_workbook_plan(self):
        ranges = describe_plan(WORKBOOK)
        self.assertEqual(len(ranges), 44)
        self.assertEqual(ranges[0], (1, 5))
        self.assertEqual(ranges[-1], (216, 220))

    def test_split_writes_first_batch(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            batches = split_pdf(WORKBOOK, output_dir=Path(tmp), only_ranges=[(1, 5)])
            self.assertEqual(len(batches), 1)
            self.assertEqual(len(PdfReader(str(batches[0].batch_pdf)).pages), 5)


if __name__ == "__main__":
    unittest.main()
