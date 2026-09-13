#!/usr/bin/env python3
"""Unit tests for Gemini 3.8 request config used by the CLI adapter."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from adapt_pdf import (  # noqa: E402
    DEFAULT_MODEL,
    _extract_text,
    build_generation_config,
)


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


if __name__ == "__main__":
    unittest.main()
