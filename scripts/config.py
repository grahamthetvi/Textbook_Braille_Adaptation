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

INTERPRETATION_PROMPT = """Transcribe scanned textbook pages into accessible plain text for later Grade 2 braille translation.

Follow all rules in .cursor/rules/accessible-document-style.mdc. Transcribe faithfully — do not change lesson content. Use [unclear] for unreadable words. Strip running headers, footers, and lone page numbers. Rejoin line-break hyphens. Read columns in order.

Output markdown only. No preamble or explanation outside the transcription.
Source pages in this batch: {page_range}.
"""
