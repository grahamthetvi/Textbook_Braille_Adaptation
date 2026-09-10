---
name: interpret-batch
description: Transcribe one PDF batch into accessible markdown using a Gemini Cursor subagent. Use when run_pipeline reports pending batches.
---

# Interpret Batch (Gemini Subagent)

Interpretation runs inside Cursor via a **subagent** with a Gemini model. No `GEMINI_API_KEY` is required.

## Critical: Orchestrator MUST NOT transcribe inline

- **The orchestrator MUST NOT transcribe batches itself.** Zero inline transcription by the orchestrator.
- The orchestrator **MUST launch a separate Task subagent** per batch with model `gemini-3.8-flash-high`.
- **Failure mode to avoid:** orchestrator reading the batch PDF directly and writing the markdown file inline without delegating to a Gemini subagent.

## When to use

- `python3 scripts/run_pipeline.py --status` shows pending batches
- User asks to process scans, transcribe batches, or continue the pipeline
- After `python3 scripts/run_pipeline.py` splits new PDFs

## Orchestrator workflow

1. Split and inspect:
   ```bash
   python3 scripts/run_pipeline.py --json
   python3 scripts/run_pipeline.py --manifest --max-batches 3
   ```
2. Process pending batches **one at a time** (or up to 3 per orchestrator turn via `--max-batches`).
3. After each batch, or after a batch group, sync state:
   ```bash
   python3 scripts/run_pipeline.py --sync-state
   ```
4. Validate output:
   ```bash
   python3 scripts/validate_accessible.py <output-path>
   ```
5. Re-run `--status` before large jobs; spot-check the first output against `.cursor/rules/accessible-document-style.mdc`.

See `.cursor/skills/orchestrate-pipeline/SKILL.md` for the full loop.

## Launch one interpretation subagent

Use the **Task** tool with model `gemini-3.8-flash-high` (or `DEFAULT_SUBAGENT_MODEL` from `scripts/config.py`).

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
- After writing, run: python3 scripts/validate_accessible.py <output-path>
- Fix any validation errors before finishing.
```

Replace paths and page range from the manifest entry (`batch_pdf`, `output_path`, `start_page`, `end_page`).

## Resume semantics

- Completed ranges are skipped when the output file exists in `accessible/`.
- `scans/.pipeline-state.json` tracks completed batches and is committed to the repo.
- Stale state entries (file deleted) are ignored automatically.
- To redo a batch: `python3 scripts/run_pipeline.py --redo pages-001-005`
- To clear state only: `python3 scripts/run_pipeline.py --reset-batch pages-001-005`

## Do not

- Call `google-genai` or require `GEMINI_API_KEY` for the default workflow.
- Process more than one batch in a single subagent call when starting a new book — verify the first batch first.
- Nest numbered or lettered lists; guess unreadable lesson words.
