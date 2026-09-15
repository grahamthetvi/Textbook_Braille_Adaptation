#!/usr/bin/env python3
"""Unit tests for HEADINGS trailer parsing and heading-map helpers."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from headings import (  # noqa: E402
    HEADING_CONTEXT_INTRO,
    format_heading_context,
    heading_mismatch_warnings,
    merge_heading_map,
    missing_headings_warning,
    parse_headings_response,
)
from spawn_prompt import build_spawn_manifest, build_subagent_prompt  # noqa: E402


class HeadingsParseTests(unittest.TestCase):
    def test_parse_trailer_and_invalid_rows(self):
        parsed = parse_headings_response(
            "MODULE 2: PARTS OF SPEECH\n\nNOUNS\n\nHEADINGS:\n1|MODULE 2: PARTS OF SPEECH\n2|NOUNS\n"
        )
        self.assertTrue(parsed["has_trailer"])
        self.assertEqual(parsed["body"], "MODULE 2: PARTS OF SPEECH\n\nNOUNS")
        self.assertEqual(
            parsed["headings"],
            [
                {"level": 1, "title": "MODULE 2: PARTS OF SPEECH"},
                {"level": 2, "title": "NOUNS"},
            ],
        )
        missing = parse_headings_response("Lesson title")
        self.assertFalse(missing["has_trailer"])
        self.assertEqual(missing["body"], "Lesson title")

    def test_merge_replaces_a_page_range(self):
        first = merge_heading_map([], 1, 5, [{"level": 1, "title": "MODULE 1"}])
        second = merge_heading_map(first, 6, 10, [{"level": 1, "title": "MODULE 2"}])
        retried = merge_heading_map(second, 1, 5, [{"level": 2, "title": "Sentence Sense"}])
        self.assertEqual(retried[0]["title"], "Sentence Sense")
        self.assertEqual(retried[0]["start_page"], 1)
        self.assertEqual(retried[1]["title"], "MODULE 2")

    def test_format_heading_context_matches_js_intro(self):
        self.assertEqual(format_heading_context([]), "")
        context = format_heading_context(
            [
                {"level": 1, "title": "MODULE 1: THE SENTENCE"},
                {"level": 2, "title": "Sentence Sense"},
            ]
        )
        self.assertIn(HEADING_CONTEXT_INTRO, context)
        self.assertIn("H1 MODULE 1: THE SENTENCE", context)
        self.assertIn("H2 Sentence Sense", context)

    def test_mismatch_and_missing_warnings(self):
        warnings = heading_mismatch_warnings(
            "NOUNS\n",
            [{"level": 2, "title": "NOUNS"}, {"level": 1, "title": "Missing"}],
            "pages-016-020",
        )
        self.assertEqual(
            warnings,
            ['pages-016-020: heading "Missing" was listed but not found in the body'],
        )
        self.assertEqual(
            missing_headings_warning(False, "NOUNS", "pages-016-020"),
            "pages-016-020: no HEADINGS trailer",
        )


class SpawnPromptHeadingTests(unittest.TestCase):
    def test_spawn_prompt_includes_heading_context_and_trailer_instructions(self):
        batch = {
            "batch_pdf": "scans/.batches/book/batch-006-010.pdf",
            "output_path": "accessible/pages-006-010.md",
            "output_file": "pages-006-010.md",
            "start_page": 6,
            "end_page": 10,
            "source_pdf": "book.pdf",
        }
        prompt = build_subagent_prompt(
            batch,
            "Heading context from earlier batches (continue this hierarchy; match levels for the same titles):\nH1 MODULE 1: THE SENTENCE",
        )
        self.assertIn("H1 MODULE 1: THE SENTENCE", prompt)
        self.assertIn("HEADINGS trailer", prompt)
        self.assertIn("--sync-state", prompt)

        manifest = build_spawn_manifest(
            [batch],
            {"book.pdf": [{"level": 1, "title": "MODULE 1: THE SENTENCE"}]},
        )
        self.assertIn("H1 MODULE 1: THE SENTENCE", manifest["tasks"][0]["prompt"])


if __name__ == "__main__":
    unittest.main()
