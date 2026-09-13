#!/usr/bin/env python3
"""Unit tests for Gemini 3.8 request config used by the CLI adapter."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from adapt_pdf import (  # noqa: E402
    DEFAULT_MODEL,
    REMAINING_NOT_SENT,
    _extract_text,
    build_generation_config,
    format_stopped_batch_error,
    run_transcriptions,
)
from split_pdf import PageBatch  # noqa: E402


class AdaptPdfGeminiConfigTests(unittest.TestCase):
    def test_default_model_is_gemini_3_8_flash(self):
        self.assertEqual(DEFAULT_MODEL, "gemini-3.8-flash")

    def test_gemini_3_omits_temperature(self):
        self.assertEqual(
            build_generation_config("gemini-3.8-flash"),
            {"thinkingConfig": {"thinkingLevel": "medium"}},
        )

    def test_gemini_2_keeps_temperature(self):
        self.assertEqual(build_generation_config("gemini-2.5-flash"), {"temperature": 0.2})

    def test_extract_text_skips_thought_parts(self):
        payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"thought": True, "text": "internal reasoning"},
                            {"text": "Lesson title"},
                        ]
                    }
                }
            ]
        }
        self.assertEqual(_extract_text(payload), "Lesson title")


class AdaptPdfStopOnErrorTests(unittest.TestCase):
    def test_format_includes_range_and_remaining_note(self):
        message = format_stopped_batch_error("006-010", "Gemini request failed (HTTP 500).")
        self.assertEqual(
            message,
            "Batch pages 006-010 failed: Gemini request failed (HTTP 500).\n"
            "Remaining batches were not sent because of this failure.",
        )
        self.assertEqual(
            REMAINING_NOT_SENT,
            "Remaining batches were not sent because of this failure.",
        )

    def test_first_failure_stops_later_batches(self):
        with tempfile.TemporaryDirectory() as raw:
            tmp = Path(raw)
            out_dir = tmp / "accessible"
            out_dir.mkdir()
            source = tmp / "book.pdf"
            source.write_bytes(b"%PDF-1.4\n")
            batches = []
            for start, end in ((1, 5), (6, 10), (11, 15)):
                pdf = tmp / f"batch-{start:03d}-{end:03d}.pdf"
                pdf.write_bytes(b"%PDF-fake\n")
                batches.append(
                    PageBatch(
                        source_pdf=source,
                        start_page=start,
                        end_page=end,
                        batch_pdf=pdf,
                    )
                )

            called: list[str] = []

            def transcribe(pdf_bytes, page_range, key, model):
                called.append(page_range)
                if page_range == "006-010":
                    raise RuntimeError("RESOURCE_EXHAUSTED: quota exceeded")
                return "First batch markdown"

            errors: list[str] = []
            code = run_transcriptions(
                batches,
                key="test-key",
                model="gemini-3.8-flash",
                out_dir=out_dir,
                transcribe_fn=transcribe,
                log=lambda _message: None,
                err_log=errors.append,
            )

            self.assertEqual(code, 1)
            self.assertEqual(called, ["001-005", "006-010"])
            self.assertTrue((out_dir / "pages-001-005.md").exists())
            self.assertFalse((out_dir / "pages-006-010.md").exists())
            self.assertFalse((out_dir / "pages-011-015.md").exists())
            self.assertEqual(len(errors), 1)
            self.assertIn("Batch pages 006-010 failed: RESOURCE_EXHAUSTED: quota exceeded", errors[0])
            self.assertIn(REMAINING_NOT_SENT, errors[0])


if __name__ == "__main__":
    unittest.main()
