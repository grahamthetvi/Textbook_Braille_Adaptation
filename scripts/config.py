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
DEFAULT_SUBAGENT_MODEL = "gemini-3.8-flash-high"

INTERPRETATION_PROMPT = """You are transcribing scanned textbook pages into accessible plain text for later Grade 2 braille translation.

Rules:
- Transcribe faithfully. Do not change lesson content.
- Preserve intended paragraphs.
- Use heading levels that match the book hierarchy.
- Multi-digit numbers: include commas when appropriate (e.g. 1,000).
- Dates and phone numbers: use hyphens as separators (e.g. March-4-2026, 555-123-4567).
- Tables, numbered lists, lettered lists, and bullet points are allowed.
- Do not nest numbered lists inside numbered lists; same for lettered lists.
- Transcriber notes: separate paragraph for visuals that cannot be converted accessibly; skip the note if the visual was converted and nothing extra is needed.
- Avoid square brackets, hash, ampersand, and asterisk unless they appear explicitly in the source text.
- Strip running headers, footers, and lone page numbers.
- Rejoin line-break hyphens across lines.
- Read columns in order.
- Use Caption: for figure captions.
- If a word is unreadable, write [unclear] rather than guessing.

Output markdown only. No preamble or explanation outside the transcription.
Source pages in this batch: {page_range}.
"""
