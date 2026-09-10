---
name: interpret-batch
description: Transcribe one PDF batch into accessible markdown using a Gemini Cursor subagent. Use when run_pipeline reports pending batches.
---

# Interpret Batch (Gemini Subagent)

Interpretation runs inside Cursor via a **subagent** with a Gemini model. No `GEMINI_API_KEY` is required.

## When to use

- `python3 scripts/run_pipeline.py --status` shows pending batches
- User asks to process scans, interpret batches, or continue the pipeline
- After `python3 scripts/run_pipeline.py` splits new PDFs

## Orchestrator workflow

1. Split and inspect:
   ```bash
   python3 scripts/run_pipeline.py --json
   python3 scripts/run_pipeline.py --manifest
   ```
2. Process pending batches **one at a time** (or `--max-batches N` at the orchestrator level — not a script flag).
3. After each batch, or after a batch group, sync state:
   ```bash
   python3 scripts/run_pipeline.py --sync-state
   ```
4. Re-run `--status` before large jobs; spot-check the first output against `.cursor/rules/accessible-document-style.mdc`.

## Launch one interpretation subagent

Use the **Task** tool with model `gemini-3.8-flash-high` (or the closest available Gemini flash model with high thinking).

Pass a prompt like:

```
Transcribe the scanned textbook pages in this batch PDF into accessible markdown.

Read the batch PDF at: scans/.batches/<source-stem>/batch-001-006.pdf
Write output to: accessible/<output-filename>.md

Follow .cursor/rules/accessible-document-style.mdc and this transcription brief:

<paste INTERPRETATION_PROMPT from scripts/config.py with page_range filled in>

Requirements:
- Output markdown only — no preamble or explanation.
- Write the file to accessible/ with the exact filename above.
- Do not change lesson content; use [unclear] for unreadable words.
- After writing, confirm the output path.
```

Replace paths and page range from the manifest entry (`batch_pdf`, `output_path`, `start_page`, `end_page`).

## Resume semantics

- Completed ranges are skipped when output exists or `scans/.pipeline-state.json` records them.
- Re-run `run_pipeline.py` to re-split; existing accessible files are not overwritten automatically.
- To redo a batch: delete its `accessible/*.md` entry and remove its key from `.pipeline-state.json`, then re-run.

## Do not

- Call `google-genai` or require `GEMINI_API_KEY` for the default workflow.
- Process more than one batch in a single subagent call when starting a new book — verify the first batch first.
- Nest numbered or lettered lists; guess unreadable lesson words.
