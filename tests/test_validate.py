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
    _check_nested_lists,
    validate_file,
    validate_paths,
)


class ValidateAccessibleTests(unittest.TestCase):
    def test_plain_text_has_no_issues(self):
        path = Path("sample.md")
        text = "hello"
        self.assertEqual(_check_forbidden_chars(text, path), [])
        self.assertEqual(_check_nested_lists(text, path), [])

    def test_ampersand_is_forbidden(self):
        path = Path("sample.md")
        issues = _check_forbidden_chars("Adjectives & Articles", path)
        self.assertEqual(len(issues), 1)
        self.assertIn("forbidden character '&'", issues[0])

    def test_nested_numbered_list(self):
        text = "1. outer item\n  2. nested item\n"
        issues = _check_nested_lists(text, Path("sample.md"))
        self.assertTrue(any("nested numbered list" in item for item in issues))

    def test_flat_numbered_list_is_ok(self):
        text = "1. first\n2. second\n3. third\n"
        self.assertEqual(_check_nested_lists(text, Path("sample.md")), [])

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
