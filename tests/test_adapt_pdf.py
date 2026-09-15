#!/usr/bin/env python3
"""Unit tests for Gemini 3.8 request config used by the CLI adapter."""

from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from adapt_pdf import (  # noqa: E402
    DEFAULT_MODEL,
    LATEX_MATH_INSTRUCTION,
    PLAIN_MATH_INSTRUCTION,
    RATE_LIMIT_EXHAUSTED,
    RATE_LIMIT_RETRYING,
    REMAINING_NOT_SENT,
    RETRYABLE_MAX_RETRIES,
    STYLE_REMINDER,
    UNAVAILABLE_EXHAUSTED,
    _extract_text,
    build_generation_config,
    build_interpretation_prompt,
    build_style_rules,
    describe_retryable_http_error,
    format_clarify_needed,
    format_retrying_status,
    format_stopped_batch_error,
    is_non_retryable_resource_exhausted,
    is_retryable_http_status,
    parse_args,
    parse_clarify,
    parse_clarify_response,
    retry_delay_seconds,
    run_transcriptions,
    transcribe_pdf_bytes,
)
from split_pdf import PageBatch  # noqa: E402


class AdaptPdfGeminiConfigTests(unittest.TestCase):
    def test_default_model_is_gemini_3_8_flash(self):
        self.assertEqual(DEFAULT_MODEL, "gemini-3.8-flash")

    def test_gemini_3_omits_temperature(self):
        self.assertEqual(
            build_generation_config("gemini-3.8-flash"),
            {"thinkingConfig": {"thinkingLevel": "medium"}},
        )

    def test_gemini_2_keeps_temperature(self):
        self.assertEqual(build_generation_config("gemini-2.5-flash"), {"temperature": 0.2})

    def test_extract_text_skips_thought_parts(self):
        payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"thought": True, "text": "internal reasoning"},
                            {"text": "Lesson title"},
                        ]
                    }
                }
            ]
        }
        self.assertEqual(_extract_text(payload), "Lesson title")


class AdaptPdfPromptTests(unittest.TestCase):
    def test_style_reminder_is_screen_reader_not_grade_2_primary(self):
        self.assertIn("screen-reader-accessible", STYLE_REMINDER)
        self.assertIn("CLARIFY:", STYLE_REMINDER)
        self.assertIn("(unclear)", STYLE_REMINDER)
        self.assertIn("Do not return an empty reply when printed lesson text is visible", STYLE_REMINDER)
        self.assertIn("_italics_", STYLE_REMINDER)
        self.assertIn("HEADINGS:", STYLE_REMINDER)
        self.assertIn("1|MODULE 2: PARTS OF SPEECH", STYLE_REMINDER)
        self.assertIn("__bold__", STYLE_REMINDER)
        self.assertIn("<u>underlined</u>", STYLE_REMINDER)
        self.assertNotIn("later Grade 2 braille", STYLE_REMINDER)
        self.assertNotIn("Grade 2 braille translation", STYLE_REMINDER)
        self.assertNotIn("[unclear]", STYLE_REMINDER)

    def test_interpretation_prompt_default_is_plain_math(self):
        prompt = build_interpretation_prompt("001-005")
        self.assertIn("screen-reader-accessible", prompt)
        self.assertIn("CLARIFY", prompt)
        self.assertIn("Nested lists are allowed", prompt)
        self.assertIn(PLAIN_MATH_INSTRUCTION, prompt)
        self.assertIn("HEADINGS trailer", prompt)
        self.assertNotIn(LATEX_MATH_INSTRUCTION, prompt)
        self.assertNotIn("Grade 2 braille translation", prompt)

    def test_latex_math_swaps_in_latex_instruction(self):
        prompt = build_interpretation_prompt("006-010", latex_math=True)
        self.assertIn(LATEX_MATH_INSTRUCTION, prompt)
        self.assertNotIn(PLAIN_MATH_INSTRUCTION, prompt)
        self.assertIn(r"\(...\)", prompt)
        self.assertIn("$$...$$", prompt)
        self.assertIn(LATEX_MATH_INSTRUCTION, build_style_rules(True))
        self.assertEqual(build_style_rules(False), STYLE_REMINDER)

    def test_heading_context_is_injected_into_the_user_prompt(self):
        context = (
            "Heading context from earlier batches (continue this hierarchy; "
            "match levels for the same titles):\nH1 MODULE 1: THE SENTENCE"
        )
        prompt = build_interpretation_prompt("006-010", heading_context=context)
        self.assertIn("H1 MODULE 1: THE SENTENCE", prompt)
        self.assertIn("HEADINGS trailer", prompt)
        self.assertNotIn("H1 MODULE 1", build_interpretation_prompt("006-010"))

    def test_style_constants_lockstep_with_js(self):
        import json
        import subprocess

        script = (
            "import { STYLE_RULES, PLAIN_MATH_INSTRUCTION, LATEX_MATH_INSTRUCTION } "
            "from './docs/js/prompt.js'; "
            "process.stdout.write(JSON.stringify({"
            "STYLE_RULES, PLAIN_MATH_INSTRUCTION, LATEX_MATH_INSTRUCTION"
            "}))"
        )
        raw = subprocess.check_output(
            ["node", "--input-type=module", "-e", script],
            cwd=ROOT,
            text=True,
        )
        js = json.loads(raw)
        self.assertEqual(js["STYLE_RULES"], STYLE_REMINDER)
        self.assertEqual(js["PLAIN_MATH_INSTRUCTION"], PLAIN_MATH_INSTRUCTION)
        self.assertEqual(js["LATEX_MATH_INSTRUCTION"], LATEX_MATH_INSTRUCTION)

    def test_parse_clarify_detects_only_clarify_blocks(self):
        self.assertEqual(parse_clarify("CLARIFY:\nIs the figure a pie chart?"), "Is the figure a pie chart?")
        self.assertEqual(parse_clarify("clarify:\nWhat is the printed fraction?"), "What is the printed fraction?")
        self.assertIsNone(parse_clarify("Lesson title\n\n1. Identify adjectives"))
        self.assertEqual(parse_clarify("Lesson title\n\nCLARIFY:\nIs this a map?"), "Is this a map?")
        self.assertEqual(parse_clarify("CLARIFY:"), "")
        self.assertEqual(
            parse_clarify_response("Lesson title\n\nCLARIFY:\nIs this a map?"),
            {"question": "Is this a map?", "draft": "Lesson title", "marker": "CLARIFY"},
        )
        self.assertEqual(parse_clarify("Título\n\nACLARAR:\n¿Es un mapa?"), "¿Es un mapa?")
        self.assertEqual(
            parse_clarify_response("العنوان\n\nتوضيح:\nهل هذه خريطة؟")["question"],
            "هل هذه خريطة؟",
        )

    def test_latex_math_cli_flag(self):
        self.assertTrue(parse_args(["book.pdf", "--latex-math"]).latex_math)
        self.assertFalse(parse_args(["book.pdf"]).latex_math)

    def test_format_clarify_needed_mentions_cli_has_no_chat(self):
        message = format_clarify_needed("001-005", "Is the figure a pie chart?")
        self.assertIn("001-005", message)
        self.assertIn("CLI has no chat", message)
        self.assertIn("Is the figure a pie chart?", message)


class AdaptPdfStopOnErrorTests(unittest.TestCase):
    def test_format_includes_range_and_remaining_note(self):
        message = format_stopped_batch_error("006-010", "Gemini request failed (HTTP 500).")
        self.assertEqual(
            message,
            "Batch pages 006-010 failed: Gemini request failed (HTTP 500).\n"
            "Remaining batches were not sent because of this failure.",
        )
        self.assertEqual(
            REMAINING_NOT_SENT,
            "Remaining batches were not sent because of this failure.",
        )

    def test_first_failure_stops_later_batches(self):
        with tempfile.TemporaryDirectory() as raw:
            tmp = Path(raw)
            out_dir = tmp / "accessible"
            out_dir.mkdir()
            source = tmp / "book.pdf"
            source.write_bytes(b"%PDF-1.4\n")
            batches = []
            for start, end in ((1, 5), (6, 10), (11, 15)):
                pdf = tmp / f"batch-{start:03d}-{end:03d}.pdf"
                pdf.write_bytes(b"%PDF-fake\n")
                batches.append(
                    PageBatch(
                        source_pdf=source,
                        start_page=start,
                        end_page=end,
                        batch_pdf=pdf,
                    )
                )

            called: list[str] = []

            def transcribe(pdf_bytes, page_range, key, model):
                called.append(page_range)
                if page_range == "006-010":
                    raise RuntimeError("RESOURCE_EXHAUSTED: quota exceeded")
                return "First batch markdown"

            errors: list[str] = []
            code = run_transcriptions(
                batches,
                key="test-key",
                model="gemini-3.8-flash",
                out_dir=out_dir,
                transcribe_fn=transcribe,
                log=lambda _message: None,
                err_log=errors.append,
            )

            self.assertEqual(code, 1)
            self.assertEqual(called, ["001-005", "006-010"])
            self.assertTrue((out_dir / "pages-001-005.md").exists())
            self.assertFalse((out_dir / "pages-006-010.md").exists())
            self.assertFalse((out_dir / "pages-011-015.md").exists())
            self.assertEqual(len(errors), 1)
            self.assertIn("Batch pages 006-010 failed: RESOURCE_EXHAUSTED: quota exceeded", errors[0])
            self.assertIn(REMAINING_NOT_SENT, errors[0])

    def test_headings_trailer_is_stripped_before_writing(self):
        with tempfile.TemporaryDirectory() as raw:
            tmp = Path(raw)
            out_dir = tmp / "accessible"
            out_dir.mkdir()
            source = tmp / "book.pdf"
            source.write_bytes(b"%PDF-1.4\n")
            pdf = tmp / "batch-001-005.pdf"
            pdf.write_bytes(b"%PDF-fake\n")
            batches = [
                PageBatch(
                    source_pdf=source,
                    start_page=1,
                    end_page=5,
                    batch_pdf=pdf,
                )
            ]

            def transcribe(pdf_bytes, page_range, key, model):
                return "MODULE 2: PARTS OF SPEECH\n\nNOUNS\n\nHEADINGS:\n1|MODULE 2: PARTS OF SPEECH\n2|NOUNS\n"

            code = run_transcriptions(
                batches,
                key="test-key",
                model="gemini-3.8-flash",
                out_dir=out_dir,
                transcribe_fn=transcribe,
                log=lambda _message: None,
            )
            self.assertEqual(code, 0)
            written = (out_dir / "pages-001-005.md").read_text(encoding="utf-8")
            self.assertEqual(written, "MODULE 2: PARTS OF SPEECH\n\nNOUNS\n")
            self.assertNotIn("HEADINGS:", written)


class AdaptPdfRateLimitRetryTests(unittest.TestCase):
    def test_429_and_503_are_retryable(self):
        self.assertTrue(is_retryable_http_status(429))
        self.assertTrue(is_retryable_http_status(503))
        self.assertFalse(is_retryable_http_status(400))
        self.assertFalse(is_retryable_http_status(401))
        self.assertGreater(RETRYABLE_MAX_RETRIES, 4)

    def test_prepayment_429_is_not_retryable(self):
        payload = {
            "error": {
                "message": (
                    "Your prepayment credits are depleted. Please go to AI Studio "
                    "at https://ai.studio/projects to manage your project and billing."
                )
            }
        }
        self.assertTrue(is_non_retryable_resource_exhausted(payload))
        self.assertFalse(
            is_non_retryable_resource_exhausted({"error": {"message": "RESOURCE_EXHAUSTED"}})
        )

    def test_retrying_copy_vs_exhausted_copy(self):
        self.assertEqual(describe_retryable_http_error(429), RATE_LIMIT_RETRYING)
        self.assertIn("Waiting, then retrying this batch", RATE_LIMIT_RETRYING)
        self.assertEqual(
            describe_retryable_http_error(429, exhausted=True),
            RATE_LIMIT_EXHAUSTED,
        )
        self.assertNotIn("Waiting, then retrying", RATE_LIMIT_EXHAUSTED)
        self.assertNotIn("Waiting, then retrying", UNAVAILABLE_EXHAUSTED)
        self.assertIn("rate limited after retries", RATE_LIMIT_EXHAUSTED.lower())

    def test_retry_delay_is_capped_exponential(self):
        self.assertEqual(retry_delay_seconds(0), 1)
        self.assertEqual(retry_delay_seconds(3), 8)
        self.assertEqual(retry_delay_seconds(10), 60)
        self.assertEqual(retry_delay_seconds(40), 60)

    def test_retrying_status_is_not_failure_copy(self):
        message = format_retrying_status("001-005", 8, 429)
        self.assertEqual(
            message,
            "pages 001-005: Rate limited. Waiting 8s, then retrying this batch.",
        )
        self.assertNotIn("failed", message)

    def test_transcribe_retries_429_in_place_then_succeeds(self):
        calls = {"n": 0}
        waits: list[int] = []
        retries: list[dict] = []

        def fake_urlopen(request, timeout=180):
            calls["n"] += 1
            if calls["n"] < 3:
                raise urllib.error.HTTPError(
                    "https://example.test",
                    429,
                    "Too Many Requests",
                    None,
                    io.BytesIO(b'{"error":{"message":"RESOURCE_EXHAUSTED"}}'),
                )
            payload = {
                "candidates": [{"content": {"parts": [{"text": "Lesson title"}]}}]
            }
            return _FakeResponse(json.dumps(payload).encode("utf-8"))

        text = transcribe_pdf_bytes(
            b"%PDF-fake",
            "001-005",
            "test-key",
            "gemini-3.8-flash",
            max_retries=8,
            sleep_fn=waits.append,
            on_retry=retries.append,
            urlopen_fn=fake_urlopen,
        )
        self.assertEqual(text, "Lesson title")
        self.assertEqual(calls["n"], 3)
        self.assertEqual(waits, [1, 2])
        self.assertEqual(len(retries), 2)
        self.assertIn("Rate limited", retries[0]["message"])
        self.assertIn("Waiting", retries[0]["message"])
        self.assertNotIn("failed", retries[0]["message"])

    def test_exhausted_429_does_not_claim_it_is_retrying(self):
        def always_429(request, timeout=180):
            raise urllib.error.HTTPError(
                "https://example.test",
                429,
                "Too Many Requests",
                None,
                io.BytesIO(b"{}"),
            )

        with self.assertRaises(RuntimeError) as raised:
            transcribe_pdf_bytes(
                b"%PDF-fake",
                "001-005",
                "test-key",
                "gemini-3.8-flash",
                max_retries=2,
                sleep_fn=lambda _seconds: None,
                urlopen_fn=always_429,
            )
        self.assertEqual(str(raised.exception), RATE_LIMIT_EXHAUSTED)
        self.assertNotIn("Waiting, then retrying", str(raised.exception))

    def test_prepayment_429_stops_without_retry(self):
        calls = {"n": 0}

        def depleted(request, timeout=180):
            calls["n"] += 1
            raise urllib.error.HTTPError(
                "https://example.test",
                429,
                "Too Many Requests",
                None,
                io.BytesIO(
                    b'{"error":{"message":"Your prepayment credits are depleted. Please go to AI Studio."}}'
                ),
            )

        def do_not_sleep(_seconds):
            raise AssertionError("should not wait on billing exhaustion")

        with self.assertRaises(RuntimeError) as raised:
            transcribe_pdf_bytes(
                b"%PDF-fake",
                "001-005",
                "test-key",
                "gemini-3.8-flash",
                max_retries=8,
                sleep_fn=do_not_sleep,
                urlopen_fn=depleted,
            )
        self.assertIn("prepayment credits are depleted", str(raised.exception))
        self.assertEqual(calls["n"], 1)

    def test_hard_400_stops_without_retry(self):
        calls = {"n": 0}

        def always_400(request, timeout=180):
            calls["n"] += 1
            raise urllib.error.HTTPError(
                "https://example.test",
                400,
                "Bad Request",
                None,
                io.BytesIO(b'{"error":{"message":"API key not valid"}}'),
            )

        with self.assertRaises(RuntimeError) as raised:
            transcribe_pdf_bytes(
                b"%PDF-fake",
                "001-005",
                "test-key",
                "gemini-3.8-flash",
                max_retries=8,
                sleep_fn=lambda _seconds: self.fail("should not wait on a hard error"),
                urlopen_fn=always_400,
            )
        self.assertIn("API key not valid", str(raised.exception))
        self.assertEqual(calls["n"], 1)


class AdaptPdfClarifyAndLatexRequestTests(unittest.TestCase):
    def test_clarify_response_fails_the_batch_with_the_question(self):
        def clarify(request, timeout=180):
            payload = {
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": "CLARIFY:\nIs the figure a pie chart?"}]
                        }
                    }
                ]
            }
            return _FakeResponse(json.dumps(payload).encode("utf-8"))

        with self.assertRaises(RuntimeError) as raised:
            transcribe_pdf_bytes(
                b"%PDF-fake",
                "001-005",
                "test-key",
                "gemini-3.8-flash",
                urlopen_fn=clarify,
            )
        self.assertIn("CLI has no chat", str(raised.exception))
        self.assertIn("Is the figure a pie chart?", str(raised.exception))
        self.assertIn("001-005", str(raised.exception))

    def test_clarify_after_draft_transcription_also_fails_the_batch(self):
        def mixed(request, timeout=180):
            payload = {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": "Lesson title\n\nCLARIFY:\nIs this a map?"
                                }
                            ]
                        }
                    }
                ]
            }
            return _FakeResponse(json.dumps(payload).encode("utf-8"))

        with self.assertRaises(RuntimeError) as raised:
            transcribe_pdf_bytes(
                b"%PDF-fake",
                "001-005",
                "test-key",
                "gemini-3.8-flash",
                urlopen_fn=mixed,
            )
        self.assertIn("CLI has no chat", str(raised.exception))
        self.assertIn("Is this a map?", str(raised.exception))

    def test_latex_math_includes_wrapping_instruction_in_request(self):
        captured = {}

        def capture(request, timeout=180):
            captured["body"] = json.loads(request.data.decode("utf-8"))
            payload = {
                "candidates": [{"content": {"parts": [{"text": "Lesson title"}]}}]
            }
            return _FakeResponse(json.dumps(payload).encode("utf-8"))

        text = transcribe_pdf_bytes(
            b"%PDF-fake",
            "001-005",
            "test-key",
            "gemini-3.8-flash",
            latex_math=True,
            urlopen_fn=capture,
        )
        self.assertEqual(text, "Lesson title")
        system = captured["body"]["system_instruction"]["parts"][0]["text"]
        user = captured["body"]["contents"][0]["parts"][1]["text"]
        self.assertIn(LATEX_MATH_INSTRUCTION, system)
        self.assertIn(LATEX_MATH_INSTRUCTION, user)
        self.assertNotIn(PLAIN_MATH_INSTRUCTION, user)

    def test_default_request_uses_plain_math_only(self):
        captured = {}

        def capture(request, timeout=180):
            captured["body"] = json.loads(request.data.decode("utf-8"))
            payload = {
                "candidates": [{"content": {"parts": [{"text": "Lesson title"}]}}]
            }
            return _FakeResponse(json.dumps(payload).encode("utf-8"))

        transcribe_pdf_bytes(
            b"%PDF-fake",
            "001-005",
            "test-key",
            "gemini-3.8-flash",
            urlopen_fn=capture,
        )
        system = captured["body"]["system_instruction"]["parts"][0]["text"]
        user = captured["body"]["contents"][0]["parts"][1]["text"]
        self.assertEqual(system, STYLE_REMINDER)
        self.assertIn(PLAIN_MATH_INSTRUCTION, user)
        self.assertNotIn("Math LaTeX mode is on", system)
        self.assertNotIn("Math LaTeX mode is on", user)


class _FakeResponse:
    def __init__(self, payload: bytes):
        self._payload = payload

    def read(self) -> bytes:
        return self._payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


if __name__ == "__main__":
    unittest.main()

