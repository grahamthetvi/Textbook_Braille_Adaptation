---
name: interpret-batch
description: Optional Cursor fallback to transcribe one PDF batch. Prefer the web adapter for a full book.
---

# Interpret Batch (optional Cursor worker)

Prefer `python3 scripts/serve_adapter.py` or `python3 scripts/adapt_pdf.py` for adapting a scanned book. Those paths send PDF bytes to Gemini with the user's API key.

Use this skill only when the user asks to process pending `scans/` batches inside Cursor.

## When to use

- User explicitly asks for the in-repo Cursor path
- `python3 scripts/run_pipeline.py --status` shows pending batches **and** they do not want the web app

## Launch one interpretation worker

**Cloud Agent:** process **one batch at a time** on this VM. Do not spawn nested Task subagents.

1. Read `spawn.tasks[0]` from `python3 scripts/run_pipeline.py --manifest --batches 1 --spawn-prompt`.
2. Run as a same-VM worker with model from task `model` (`gemini-3.8-flash-medium`).
3. Read the batch PDF and write `accessible/*.md`, including a `HEADINGS:` trailer (`level|title`).
4. After finishing:
   ```bash
   python3 scripts/run_pipeline.py --sync-state
   python3 scripts/validate_accessible.py <output-path>
   ```
   `--sync-state` strips the trailer and stores heading levels for later batches.

## Do not

- Use this path as the default adapter for a full scanned book.
- Combine multiple batch PDFs in one worker call.
- Launch parallel Task subagents on Cloud Agent.
