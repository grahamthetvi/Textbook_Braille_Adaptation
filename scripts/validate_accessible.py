#!/usr/bin/env python3
"""Validate accessible markdown against accessible-document-style.mdc rules."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from config import ACCESSIBLE_DIR

FORBIDDEN_CHARS = "#&*"
NESTED_NUMBERED = re.compile(r"^(\s*)(\d+)\.\s", re.MULTILINE)
NESTED_LETTERED = re.compile(r"^(\s*)([a-zA-Z])\.\s", re.MULTILINE)
URL_PATTERN = re.compile(r"https?://[^\s)]+", re.IGNORECASE)


def _indent_level(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def _check_forbidden_chars(text: str, path: Path) -> list[str]:
    issues: list[str] = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        for char in FORBIDDEN_CHARS:
            if char in line:
                issues.append(f"{path}:{lineno}: forbidden character '{char}'")
    return issues


def _check_nested_lists(text: str, path: Path) -> list[str]:
    issues: list[str] = []
    prev_number_indent: int | None = None
    prev_letter_indent: int | None = None

    for lineno, line in enumerate(text.splitlines(), start=1):
        stripped = line.lstrip()
        indent = _indent_level(line)

        if NESTED_NUMBERED.match(line):
            if prev_number_indent is not None and indent > prev_number_indent:
                issues.append(f"{path}:{lineno}: nested numbered list")
            prev_number_indent = indent
        elif stripped and not stripped.startswith(("-", "*", "•")):
            prev_number_indent = None

        if NESTED_LETTERED.match(line):
            if prev_letter_indent is not None and indent > prev_letter_indent:
                issues.append(f"{path}:{lineno}: nested lettered list")
            prev_letter_indent = indent
        elif stripped and not stripped.startswith(("-", "*", "•")):
            prev_letter_indent = None

    return issues


def validate_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    issues = _check_forbidden_chars(text, path)
    issues.extend(_check_nested_lists(text, path))
    return issues


def validate_paths(paths: list[Path]) -> tuple[list[str], int]:
    all_issues: list[str] = []
    checked = 0
    for path in paths:
        if not path.exists():
            all_issues.append(f"{path}: file not found")
            continue
        if path.suffix.lower() != ".md":
            all_issues.append(f"{path}: expected a .md file")
            continue
        all_issues.extend(validate_file(path))
        checked += 1
    return all_issues, checked


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        help="Markdown files to validate (default: all under accessible/)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.paths:
        paths = [p.resolve() for p in args.paths]
    else:
        paths = sorted(ACCESSIBLE_DIR.glob("*.md"))

    issues, checked = validate_paths(paths)
    if checked == 0 and not issues:
        print(f"No markdown files found in {ACCESSIBLE_DIR}", file=sys.stderr)
        return 1

    if issues:
        for issue in issues:
            print(issue, file=sys.stderr)
        print(f"\n{len(issues)} issue(s) in {checked} file(s)", file=sys.stderr)
        return 1

    print(f"OK: {checked} file(s) passed validation")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
