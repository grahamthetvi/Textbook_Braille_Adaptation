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

from config import ACCESSIBLE_DIR
from split_pdf import split_pdf

DEFAULT_MODEL = "gemini-3.8-flash"
GEMINI_3_THINKING_LEVEL = "medium"
API_ROOT = "https://generativelanguage.googleapis.com/v1beta"
# Keep STYLE_REMINDER, PLAIN_MATH_INSTRUCTION, and LATEX_MATH_INSTRUCTION
# in lockstep with docs/js/prompt.js.
STYLE_REMINDER = """Role: Produce screen-reader-accessible text from scanned textbook pages. Do not output braille, contractions, or braille ASCII. Transcribe faithfully. Do not change lesson content.

When stuck
If you cannot reliably make the content accessible (illegible text, ambiguous layout, a diagram the lesson depends on, or uncertain math), do not guess. Ask one short specific question. If several issues, ask the most blocking one first. Prefer a CLARIFY-only reply. If you already started transcribing, still end with the following block:

CLARIFY:
<one question>

After the user answers, transcribe the complete batch. If you still cannot, end with another CLARIFY block.

Formatting
Use paragraphs, bullet lists, numbered lists, tables, headings, and blank lines.
Nested and indented lists are allowed. Number or letter questions when they sit under a numbered item.
Avoid square brackets, braces, asterisk, and number-sign unless those characters appear in the source. Do not use markdown hash headings. Write headings as plain title lines matching the book's hierarchy. Preserve italic, bold, and underlined print as _italics_, __bold__, and <u>underlined</u>. Do not use asterisk for emphasis. Do not add emphasis the book does not print.
Default math: plain text only. Write plus, minus, times, divided by, equals, and spoken-friendly fractions. Do not use LaTeX unless math-LaTeX mode is on.
Use simple markdown pipe tables when the book shows tabular data. Do not insert a header-separator row of hyphens; three hyphens on their own line are a section break, not a table rule.
Use labels such as Tip: Note: FYI: Directions: Examples Caption: on their own lines when the book prints them that way.
Transcriber notes only when a visual cannot be converted accessibly. If a caption already describes the image, convert the caption and skip an extra note. Otherwise write Transcriber note: followed by a short description.
Strip running headers, footers, and lone page numbers. Rejoin line-break hyphens. Read columns in order.
Unreadable word: write (unclear). Do not guess a word that would change the lesson. Do not wrap it in square brackets.
Comma-group multi-digit numbers when it aids comprehension, for example 1,000 students. Write dates and phone numbers with hyphen separators, for example March-4-2026 or 555-123-4567.
Write "and" not an ampersand unless the ampersand appears in the source.
Skip decorative word clouds unless specific words are required for the lesson. Transcribe the book title, edition, and copyright block on a cover when printed as normal text. When a page has no readable lesson content, write: Transcriber note: A decorative word cloud fills the cover; no lesson text is present.
Do not return an empty reply when printed lesson text is visible. If you cannot transcribe, ask a CLARIFY question instead of silence.
Keep the full URL on one line when the book prints it that way. You may introduce it plainly, for example Permissions website: followed by the URL.
Output markdown or plain text only when completing a batch. No preamble, no code fences.
"""

PLAIN_MATH_INSTRUCTION = (
    "Represent math in plain text only (plus, minus, times, divided by, equals, "
    "spoken-friendly fractions). Do not use LaTeX."
)
LATEX_MATH_INSTRUCTION = (
    "Math LaTeX mode is on. Wrap every mathematical expression, equation, and "
    "arithmetic operation in LaTeX notation: \\(...\\) for inline math and "
    "$$...$$ for display equations. Leave all non-math prose unchanged. Braces "
    "used inside LaTeX math spans are allowed. Still avoid asterisk, number-sign, "
    "and square brackets unless they appear in the source."
)


def build_style_rules(latex_math: bool = False) -> str:
    if not latex_math:
        return STYLE_REMINDER
    return f"{STYLE_REMINDER}\n{LATEX_MATH_INSTRUCTION}\n"


def build_interpretation_prompt(page_range: str, *, latex_math: bool = False) -> str:
    math_line = LATEX_MATH_INSTRUCTION if latex_math else PLAIN_MATH_INSTRUCTION
    return (
        "Produce screen-reader-accessible text from these scanned textbook pages. "
        "Do not output braille, contractions, or braille ASCII.\n"
        "\n"
        "Follow the system instruction. Transcribe faithfully. If you cannot reliably "
        "make the content accessible, end with a CLARIFY block. Prefer a CLARIFY-only "
        "reply. Nested lists are "
        "allowed. Number or letter questions when they sit under a numbered item. Use "
        "paragraphs, bullet lists, numbered lists, tables, headings, and blank lines. "
        "Avoid square brackets, braces, asterisk, and number-sign unless they appear "
        "in the source. Do not use markdown hash headings. Preserve italic, bold, and "
        "underlined print as _italics_, __bold__, and <u>underlined</u>. Use (unclear) for unreadable "
        "words. Strip running headers, footers, and lone page numbers. Rejoin "
        "line-break hyphens. Read columns in order.\n"
        "\n"
        f"{math_line}\n"
        "\n"
        "Output markdown or plain text only when completing the batch. No preamble, no "
        "code fences.\n"
        f"Source pages in this batch: {page_range}."
    )


def parse_clarify_response(text: str) -> dict[str, str] | None:
    trimmed = (text or "").strip()
    if not trimmed:
        return None
    match = re.match(
        r"^(?:(?P<draft>[\s\S]*)\r?\n)?(?P<marker>CLARIFY|ACLARAR|توضيح):\s*(?P<question>[\s\S]*)$",
        trimmed,
        flags=re.I,
    )
    if not match:
        return None
    return {
        "question": (match.group("question") or "").strip(),
        "draft": (match.group("draft") or "").strip(),
        "marker": (match.group("marker") or "CLARIFY").strip(),
    }


def parse_clarify(text: str) -> str | None:
    parsed = parse_clarify_response(text)
    if parsed is None:
        return None
    return parsed["question"]


def format_clarify_needed(page_range: str, question: str) -> str:
    asked = question or "(no question text)"
    return (
        f"Gemini asked for clarification on pages {page_range}. "
        "The CLI has no chat; use the web adapter to answer, or retry after "
        f"inspecting the pages. Question: {asked}"
    )


def uses_gemini_3_thinking(model: str) -> bool:
    return bool(re.match(r"^gemini-3(\.|-)", (model or "").strip(), flags=re.I))


def build_generation_config(model: str) -> dict:
    if uses_gemini_3_thinking(model):
        return {"thinkingConfig": {"thinkingLevel": GEMINI_3_THINKING_LEVEL}}
    return {"temperature": 0.2}


REMAINING_NOT_SENT = "Remaining batches were not sent because of this failure."

RETRYABLE_MAX_RETRIES = 40
RETRY_CAP_SECONDS = 60
RATE_LIMIT_RETRYING = "Rate limited. Waiting, then retrying this batch."
RATE_LIMIT_EXHAUSTED = "This batch was rate limited after retries."
UNAVAILABLE_RETRYING = (
    "Gemini is temporarily unavailable. Waiting, then retrying this batch."
)
UNAVAILABLE_EXHAUSTED = "Gemini was temporarily unavailable after retries."


def _page_range(start: int, end: int) -> str:
    return f"{start:03d}-{end:03d}"


def format_stopped_batch_error(page_range: str, error: str) -> str:
    return f"Batch pages {page_range} failed: {error}\n{REMAINING_NOT_SENT}"


def is_retryable_http_status(status: int) -> bool:
    return status in (429, 503)


def is_non_retryable_resource_exhausted(payload: dict | None) -> bool:
    message = str(((payload or {}).get("error") or {}).get("message") or "")
    if re.search(r"prepayment credits are depleted", message, flags=re.I):
        return True
    if re.search(r"billing", message, flags=re.I) and re.search(
        r"ai\.studio|ai studio", message, flags=re.I
    ):
        return True
    return bool(re.search(r"quota", message, flags=re.I) and re.search(r"limit:\s*0", message, flags=re.I))


def retry_delay_seconds(attempt: int, cap: int = RETRY_CAP_SECONDS) -> int:
    n = max(0, int(attempt))
    return min(cap, 2**n)


def describe_retryable_http_error(status: int, *, exhausted: bool = False) -> str:
    if status == 503:
        return UNAVAILABLE_EXHAUSTED if exhausted else UNAVAILABLE_RETRYING
    return RATE_LIMIT_EXHAUSTED if exhausted else RATE_LIMIT_RETRYING


def format_retrying_status(page_range: str, wait_s: int, status: int = 429) -> str:
    seconds = max(1, int(wait_s) if wait_s else 1)
    reason = (
        "Gemini is temporarily unavailable" if status == 503 else "Rate limited"
    )
    return f"pages {page_range}: {reason}. Waiting {seconds}s, then retrying this batch."


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
    max_retries: int = RETRYABLE_MAX_RETRIES,
    *,
    latex_math: bool = False,
    sleep_fn=time.sleep,
    on_retry=None,
    urlopen_fn=None,
) -> str:
    prompt = build_interpretation_prompt(page_range, latex_math=latex_math)
    body = {
        "system_instruction": {"parts": [{"text": build_style_rules(latex_math)}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": "application/pdf",
                            "data": base64.b64encode(pdf_bytes).decode("ascii"),
                        }
                    },
                    {"text": prompt},
                ]
            }
        ],
        "generationConfig": build_generation_config(model),
    }
    url = f"{API_ROOT}/models/{model}:generateContent?key={api_key}"
    raw = json.dumps(body).encode("utf-8")
    opener = urlopen_fn or urllib.request.urlopen
    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        request = urllib.request.Request(
            url,
            data=raw,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            with opener(request, timeout=180) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            try:
                payload = json.loads(err.read().decode("utf-8") or "{}")
            except json.JSONDecodeError:
                payload = {}
            message = (payload.get("error") or {}).get("message") or f"HTTP {err.code}"
            if is_retryable_http_status(err.code) and not is_non_retryable_resource_exhausted(
                payload
            ):
                will_retry = attempt < max_retries
                last_error = RuntimeError(
                    describe_retryable_http_error(err.code, exhausted=not will_retry)
                )
                if will_retry:
                    wait_s = retry_delay_seconds(attempt)
                    if on_retry is not None:
                        on_retry(
                            {
                                "status": err.code,
                                "wait_s": wait_s,
                                "attempt": attempt + 1,
                                "message": format_retrying_status(
                                    page_range, wait_s, err.code
                                ),
                            }
                        )
                    sleep_fn(wait_s)
                    continue
                break
            raise RuntimeError(message) from err
        except urllib.error.URLError as err:
            will_retry = attempt < max_retries
            last_error = RuntimeError(f"Could not reach Gemini: {err.reason}")
            if will_retry:
                sleep_fn(attempt + 1)
                continue
            break
        text = _strip_fences(_extract_text(payload))
        if not text:
            raise RuntimeError("Gemini returned empty text for this batch.")
        question = parse_clarify(text)
        if question is not None:
            raise RuntimeError(format_clarify_needed(page_range, question))
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
    parser.add_argument(
        "--latex-math",
        action="store_true",
        help="Wrap math in LaTeX for later Nemeth (inline \\(...\\), display $$...$$)",
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
    latex_math: bool = False,
    transcribe_fn=None,
    log=None,
    err_log=None,
) -> int:
    """Transcribe batches sequentially. Stop on the first failure."""
    if log is None:

        def log(message: str) -> None:
            print(message, flush=True)

    if err_log is None:

        def err_log(message: str) -> None:
            print(message, file=sys.stderr, flush=True)

    if transcribe_fn is None:

        def transcribe_fn(pdf_bytes, page_range, key, model):
            def on_retry(info):
                log(f"  {info['message']}")

            return transcribe_pdf_bytes(
                pdf_bytes,
                page_range,
                key,
                model,
                latex_math=latex_math,
                on_retry=on_retry,
            )

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
        latex_math=args.latex_math,
    )


if __name__ == "__main__":
    raise SystemExit(main())
