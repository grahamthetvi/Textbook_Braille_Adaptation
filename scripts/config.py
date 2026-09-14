"""Shared configuration for the textbook adaptation pipeline."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCANS_DIR = REPO_ROOT / "scans"
ACCESSIBLE_DIR = REPO_ROOT / "accessible"
BATCHES_DIR = SCANS_DIR / ".batches"
STATE_FILE = SCANS_DIR / ".pipeline-state.json"

MIN_PAGES_PER_BATCH = 5
MAX_PAGES_PER_BATCH = 8
DEFAULT_BATCH_SIZE = 6

# Cursor subagent model for batch interpretation (no direct API key required).
# Medium is enough for faithful OCR transcription; avoid "high" unless quality fails.
DEFAULT_SUBAGENT_MODEL = "gemini-3.8-flash-medium"

# Cap parallel interpretation subagents per orchestrator turn to limit token spend.
MAX_SUBAGENTS_PER_TURN = 3

INTERPRETATION_PROMPT = """Produce screen-reader-accessible text from these scanned textbook pages. Do not output braille, contractions, or braille ASCII.

Follow all rules in .cursor/rules/accessible-document-style.mdc. Transcribe faithfully. If you cannot reliably make the content accessible, end with a CLARIFY block. Prefer a CLARIFY-only reply. Nested lists are allowed. Number or letter questions when they sit under a numbered item. Use paragraphs, bullet lists, numbered lists, tables, headings, and blank lines. Avoid square brackets, braces, asterisk, and number-sign unless they appear in the source. Do not use markdown hash headings. Preserve italic, bold, and underlined print as _italics_, __bold__, and <u>underlined</u>. Use (unclear) for unreadable words. Strip running headers, footers, and lone page numbers. Rejoin line-break hyphens. Read columns in order.

Represent math in plain text only (plus, minus, times, divided by, equals, spoken-friendly fractions). Do not use LaTeX.

Output markdown or plain text only when completing the batch. No preamble, no code fences.
Source pages in this batch: {page_range}.
"""
