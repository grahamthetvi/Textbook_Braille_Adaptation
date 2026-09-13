#!/usr/bin/env python3
"""Validate accessible markdown against accessible-document-style.mdc rules."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from config import ACCESSIBLE_DIR

FORBIDDEN_DEFAULT = "#&*[]{}"
FORBIDDEN_LATEX_MATH = "#&*[]"


def forbidden_chars(latex_math: bool = False) -> str:
    return FORBIDDEN_LATEX_MATH if latex_math else FORBIDDEN_DEFAULT


def _check_forbidden_chars(text: str, path: Path, *, latex_math: bool = False) -> list[str]:
    issues: list[str] = []
    forbidden = forbidden_chars(latex_math)
    for lineno, line in enumerate(text.splitlines(), start=1):
        for char in forbidden:
            if char in line:
                issues.append(f"{path}:{lineno}: forbidden character '{char}'")
    return issues


def validate_file(path: Path, *, latex_math: bool = False) -> list[str]:
    text = path.read_text(encoding="utf-8")
    return _check_forbidden_chars(text, path, latex_math=latex_math)


def validate_paths(paths: list[Path], *, latex_math: bool = False) -> tuple[list[str], int]:
    all_issues: list[str] = []
    checked = 0
    for path in paths:
        if not path.exists():
            all_issues.append(f"{path}: file not found")
            continue
        if path.suffix.lower() != ".md":
            all_issues.append(f"{path}: expected a .md file")
            continue
        all_issues.extend(validate_file(path, latex_math=latex_math))
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
    parser.add_argument(
        "--latex-math",
        action="store_true",
        help="Allow braces used in LaTeX math; still flag number-sign, asterisk, and square brackets",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.paths:
        paths = [p.resolve() for p in args.paths]
    else:
        paths = sorted(ACCESSIBLE_DIR.glob("*.md"))

    issues, checked = validate_paths(paths, latex_math=args.latex_math)
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
