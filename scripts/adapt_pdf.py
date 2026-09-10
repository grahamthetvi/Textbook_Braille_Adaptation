#!/usr/bin/env python3
"""CLI fallback: split a textbook PDF and transcribe each batch with Gemini."""

from __future__ import annotations

import argparse
import base64
import json
import os
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

DEFAULT_MODEL = "gemini-2.5-flash"
API_ROOT = "https://generativelanguage.googleapis.com/v1beta"
STYLE_REMINDER = """Accessible Document Style
Transcribe faithfully. Do not change lesson content.
Do not use markdown hash headings unless the book prints that character.
Use Tip: Note: FYI: Directions: Examples Caption: on their own lines when printed.
Comma-group multi-digit numbers. Dates and phones use hyphens.
Do not nest numbered or lettered lists; flatten practice to one level.
Avoid square brackets, number-sign, ampersand, and asterisk unless in the source.
Write "and" not an ampersand. Use [unclear] for unreadable words.
Strip running headers, footers, and lone page numbers. Rejoin line-break hyphens.
"""


def _page_range(start: int, end: int) -> str:
    return f"{start:03d}-{end:03d}"


def _extract_text(payload: dict) -> str:
    candidates = payload.get("candidates") or [{}]
    parts = (candidates[0].get("content") or {}).get("parts") or []
    return "\n".join(part.get("text") or "" for part in parts).strip()


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
        "generationConfig": {"temperature": 0.2},
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
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--preferred", type=int, default=6, help="Preferred batch size (5-8)")
    return parser.parse_args(argv)


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
    for batch in batches:
        label = _page_range(batch.start_page, batch.end_page)
        print(f"Transcribing {label} ({batch.page_count} pages)...", flush=True)
        text = transcribe_pdf_bytes(batch.batch_pdf.read_bytes(), label, args.key, args.model)
        out_path = args.out_dir / f"{batch.output_stem}.md"
        out_path.write_text(text.rstrip() + "\n", encoding="utf-8")
        print(f"  wrote {out_path}", flush=True)
    print(f"Done: {len(batches)} file(s) in {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
