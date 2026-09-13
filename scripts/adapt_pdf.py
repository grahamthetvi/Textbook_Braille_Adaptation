#!/usr/bin/env python3
"""CLI fallback: split a textbook PDF and transcribe each batch with Gemini."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from config import ACCESSIBLE_DIR, INTERPRETATION_PROMPT
from split_pdf import split_pdf

DEFAULT_MODEL = "gemini-3.8-flash"
GEMINI_3_THINKING_LEVEL = "medium"
API_ROOT = "https://generativelanguage.googleapis.com/v1beta"
# Keep in lockstep with docs/js/prompt.js STYLE_RULES.
STYLE_REMINDER = """Accessible Document Style

Write plain prose for later Grade 2 braille. Transcribe faithfully — do not change lesson content.

Paragraphs and headings
Preserve the book's intended paragraphs. Do not merge unrelated blocks or split one thought across files.
Apply titles with heading levels that match the book's hierarchy.
Do not use markdown hash headings such as a leading number-sign on a title unless the book itself prints that character.
Use labels such as Tip: Note: FYI: Directions: Examples Caption: on their own lines when the book prints them that way.

Numbers, dates, and phones
Use comma grouping for multi-digit quantities when it aids comprehension, for example 1,000 students.
Write dates and phone numbers with hyphen separators, for example March-4-2026 or 555-123-4567.

Lists and tables
Tables, numbered lists, lettered lists, and bullet points are allowed.
Do not nest numbered lists. Do not nest lettered lists.
Flatten nested practice — renumber or reletter at one level only.
Use a bullet character or 1. 2. 3. at a single level.
Use simple markdown tables when the book shows tabular data.

Transcriber notes
Use a separate paragraph to describe something visual on the page when it cannot be converted accessibly.
If a caption already describes the image, convert the caption and skip an extra note.
When the lesson depends on unseen layout, write: Transcriber note: followed by a short description.

Symbols to avoid
Avoid square brackets, the number-sign, ampersand, and asterisk unless those characters appear explicitly in the source text.
Write "and" not an ampersand.
Use a section break as three hyphens on its own line.
Possessive apostrophes, hyphens, dashes, and quotation marks are allowed when the book uses them.

Unreadable words
Use the token [unclear] for a word that cannot be read. Do not guess a word that would change the lesson.
"""


def uses_gemini_3_thinking(model: str) -> bool:
    return bool(re.match(r"^gemini-3(\.|-)", (model or "").strip(), flags=re.I))


def build_generation_config(model: str) -> dict:
    if uses_gemini_3_thinking(model):
        return {"thinkingConfig": {"thinkingLevel": GEMINI_3_THINKING_LEVEL}}
    return {"temperature": 0.2}


REMAINING_NOT_SENT = "Remaining batches were not sent because of this failure."


def _page_range(start: int, end: int) -> str:
    return f"{start:03d}-{end:03d}"


def format_stopped_batch_error(page_range: str, error: str) -> str:
    return f"Batch pages {page_range} failed: {error}\n{REMAINING_NOT_SENT}"


def _extract_text(payload: dict) -> str:
    candidates = payload.get("candidates") or [{}]
    parts = (candidates[0].get("content") or {}).get("parts") or []
    return "\n".join(
        part.get("text") or "" for part in parts if not part.get("thought")
    ).strip()


def _strip_fences(text: str) -> str:
    out = (text or "").strip()
    if out.startswith("```"):
        first_newline = out.find("\n")
        out = out[first_newline + 1 :] if first_newline >= 0 else out[3:]
        if out.endswith("```"):
            out = out[:-3]
    return out.strip()


def transcribe_pdf_bytes(
    pdf_bytes: bytes,
    page_range: str,
    api_key: str,
    model: str,
    max_retries: int = 4,
) -> str:
    prompt = INTERPRETATION_PROMPT.format(page_range=page_range)
    body = {
        "system_instruction": {"parts": [{"text": STYLE_REMINDER}]},
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": "application/pdf",
                            "data": base64.b64encode(pdf_bytes).decode("ascii"),
                        }
                    },
                    {"text": f"{prompt}\nNo code fences."},
                ]
            }
        ],
        "generationConfig": build_generation_config(model),
    }
    url = f"{API_ROOT}/models/{model}:generateContent?key={api_key}"
    raw = json.dumps(body).encode("utf-8")
    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        request = urllib.request.Request(
            url,
            data=raw,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            try:
                payload = json.loads(err.read().decode("utf-8") or "{}")
            except json.JSONDecodeError:
                payload = {}
            message = (payload.get("error") or {}).get("message") or f"HTTP {err.code}"
            if err.code in (429, 503):
                last_error = RuntimeError(message)
                time.sleep(min(16, 2**attempt))
                continue
            raise RuntimeError(message) from err
        except urllib.error.URLError as err:
            last_error = RuntimeError(f"Could not reach Gemini: {err.reason}")
            time.sleep(attempt + 1)
            continue
        text = _strip_fences(_extract_text(payload))
        if not text:
            raise RuntimeError("Gemini returned empty text for this batch.")
        return text
    raise last_error or RuntimeError("Gemini request failed after retries.")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Source textbook PDF")
    parser.add_argument(
        "--key",
        default=os.environ.get("GEMINI_API_KEY", ""),
        help="Gemini API key (or set GEMINI_API_KEY)",
    )
    parser.add_argument("--out-dir", type=Path, default=ACCESSIBLE_DIR)
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help="Google Gemini API model id (default gemini-3.8-flash)",
    )
    parser.add_argument("--preferred", type=int, default=6, help="Preferred batch size (5-8)")
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip batches whose markdown already exists in --out-dir",
    )
    parser.add_argument(
        "--max-batches",
        type=int,
        default=0,
        help="Stop after N new transcriptions (0 means no limit)",
    )
    return parser.parse_args(argv)


def run_transcriptions(
    batches,
    *,
    key: str,
    model: str,
    out_dir: Path,
    skip_existing: bool = False,
    max_batches: int = 0,
    transcribe_fn=None,
    log=print,
    err_log=None,
) -> int:
    """Transcribe batches sequentially. Stop on the first failure."""
    if transcribe_fn is None:
        transcribe_fn = transcribe_pdf_bytes
    if err_log is None:

        def _default_err_log(message: str) -> None:
            print(message, file=sys.stderr)

        err_log = _default_err_log

    transcribed = 0
    skipped = 0
    for batch in batches:
        label = _page_range(batch.start_page, batch.end_page)
        out_path = out_dir / f"{batch.output_stem}.md"
        if skip_existing and out_path.exists():
            log(f"Skipping {label} (already at {out_path})")
            skipped += 1
            continue
        if max_batches and transcribed >= max_batches:
            log(f"Stopping after {transcribed} new batch(es) (--max-batches)")
            break
        log(f"Transcribing {label} ({batch.page_count} pages)...")
        try:
            text = transcribe_fn(batch.batch_pdf.read_bytes(), label, key, model)
        except Exception as err:
            err_log(format_stopped_batch_error(label, str(err)))
            return 1
        out_path.write_text(text.rstrip() + "\n", encoding="utf-8")
        transcribed += 1
        log(f"  wrote {out_path}")
    log(f"Done: {transcribed} new file(s), {skipped} skipped, in {out_dir}")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if not args.key:
        print("Provide --key or set GEMINI_API_KEY", file=sys.stderr)
        return 2
    if not args.pdf.is_file():
        print(f"Not found: {args.pdf}", file=sys.stderr)
        return 2

    args.out_dir.mkdir(parents=True, exist_ok=True)
    batches = split_pdf(args.pdf, preferred_batch_size=args.preferred)
    print(f"Split {args.pdf.name} into {len(batches)} batches", flush=True)
    return run_transcriptions(
        batches,
        key=args.key,
        model=args.model,
        out_dir=args.out_dir,
        skip_existing=args.skip_existing,
        max_batches=args.max_batches,
    )


if __name__ == "__main__":
    raise SystemExit(main())
