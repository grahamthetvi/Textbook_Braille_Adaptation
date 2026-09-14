#!/usr/bin/env python3
"""Unit tests for accessible-markdown validation."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from validate_accessible import (
    _check_forbidden_chars,
    validate_file,
    validate_paths,
)


class ValidateAccessibleTests(unittest.TestCase):
    def test_plain_text_has_no_issues(self):
        path = Path("sample.md")
        text = "hello"
        self.assertEqual(_check_forbidden_chars(text, path), [])

    def test_ampersand_is_forbidden(self):
        path = Path("sample.md")
        issues = _check_forbidden_chars("Adjectives & Articles", path)
        self.assertEqual(len(issues), 1)
        self.assertIn("forbidden character '&'", issues[0])

    def test_new_forbidden_characters(self):
        path = Path("sample.md")
        issues = _check_forbidden_chars("See [note] {hint} *star* #1", path)
        found = {item.split("'")[1] for item in issues}
        self.assertEqual(found, {"[", "]", "{", "}", "*", "#"})

    def test_unclear_token_must_not_use_brackets(self):
        path = Path("sample.md")
        self.assertEqual(
            _check_forbidden_chars("the word was (unclear) on the scan", path),
            [],
        )
        issues = _check_forbidden_chars("the word was [unclear] on the scan", path)
        self.assertTrue(any("'['" in item for item in issues))
        self.assertTrue(any("']'" in item for item in issues))

    def test_underscore_emphasis_and_underline_tags_are_allowed(self):
        path = Path("sample.md")
        text = "Keep _italic_, __bold__, and <u>underlined</u> words."
        self.assertEqual(_check_forbidden_chars(text, path), [])

    def test_nested_lists_are_allowed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "nested.md"
            path.write_text(
                "1. outer item\n  a. nested question\n  b. second question\n2. next item\n",
                encoding="utf-8",
            )
            self.assertEqual(validate_file(path), [])

    def test_flat_numbered_list_is_ok(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "flat.md"
            path.write_text("1. first\n2. second\n3. third\n", encoding="utf-8")
            self.assertEqual(validate_file(path), [])

    def test_latex_math_allows_braces_but_not_other_forbidden_chars(self):
        path = Path("sample.md")
        math = r"The fraction is \frac{1}{2}."
        default_issues = _check_forbidden_chars(math, path)
        self.assertTrue(any("forbidden character '{'" in item for item in default_issues))
        self.assertTrue(any("forbidden character '}'" in item for item in default_issues))
        self.assertEqual(_check_forbidden_chars(math, path, latex_math=True), [])
        still_bad = "Keep [this] and #1 and *star*"
        issues = _check_forbidden_chars(still_bad, path, latex_math=True)
        found = {item.split("'")[1] for item in issues}
        self.assertEqual(found, {"[", "]", "*", "#"})

    def test_validate_file_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ok.md"
            path.write_text("hello\n", encoding="utf-8")
            self.assertEqual(validate_file(path), [])

    def test_existing_accessible_files_warn_only(self):
        files = sorted((ROOT / "accessible").glob("*.md"))
        if not files:
            self.skipTest("no accessible markdown yet")
        issues, checked = validate_paths(files)
        if issues:
            print(
                f"WARNING: {len(issues)} issue(s) in {checked} existing accessible file(s)",
                file=sys.stderr,
            )
            for issue in issues[:12]:
                print(f"  {issue}", file=sys.stderr)


if __name__ == "__main__":
    unittest.main()
