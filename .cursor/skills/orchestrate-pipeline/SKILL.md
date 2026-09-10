---
name: orchestrate-pipeline
description: Run the full textbook adaptation loop — status, split, launch subagent batches, sync state, validate, and commit.
---

# Orchestrate Pipeline

Use this skill when the user asks to process scans, continue the pipeline, or run the full adaptation workflow.

## Full loop

1. **Status** — inspect pending work:
   ```bash
   python3 scripts/run_pipeline.py --status --json
   python3 scripts/run_pipeline.py --manifest --max-batches 3
   ```
2. **Split** — create batch PDFs for pending ranges only:
   ```bash
   python3 scripts/run_pipeline.py
   ```
3. **Launch subagents** — process **1–3 pending batches** per turn (use manifest output):
   - Model: `gemini-3.8-flash-high` (see `DEFAULT_SUBAGENT_MODEL` in `scripts/config.py`)
   - Follow `.cursor/skills/interpret-batch/SKILL.md` for each batch
4. **Sync state** — after subagents write output:
   ```bash
   python3 scripts/run_pipeline.py --sync-state
   ```
5. **Validate** — check new accessible files:
   ```bash
   python3 scripts/validate_accessible.py accessible/pages-001-005.md
   # or validate all:
   python3 scripts/validate_accessible.py
   ```
6. **Commit** — verify the **Task** tool was called for each batch before committing; commit new `accessible/*.md` and updated `scans/.pipeline-state.json` separately from script changes when possible.
7. **Repeat** until `--manifest` returns no pending batches.

## Flags

| Flag | Purpose |
| --- | --- |
| `--status --json` | Full pipeline progress |
| `--manifest` | Pending batches only (JSON) |
| `--max-batches N` | Cap pending work returned |
| `--redo pages-001-005` | Delete output and clear state for one batch |
| `--reset-batch pages-001-005` | Clear state only (keep output file) |
| `--sync-state` | Record batches whose output files exist |

## Resume and recovery

- `scans/.pipeline-state.json` is committed — reruns skip completed batches.
- If output is deleted but state remains, stale entries are ignored automatically.
- Source PDF changes are detected via sha256; warnings appear in status output.

## Do not

- Process an entire book in one subagent call.
- Transcribe batches inline in the orchestrator without launching a Task subagent.
- Skip validation after the first batch on a new book.
- Require `GEMINI_API_KEY` for the default workflow.
