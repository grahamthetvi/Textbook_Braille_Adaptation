---
name: orchestrate-pipeline
description: Run the full textbook adaptation loop — status, split, launch workers, sync state, validate, and commit.
---

# Orchestrate Pipeline

Use when the user asks to process scans, continue the pipeline, or transcribe a specific number of pages or batches.

## Parse the user request

| Intent | Flags |
| --- | --- |
| "process 20 pages" | `--pages 20` |
| "redo 4 files" / "next 4 batches" | `--batches 4` |
| "continue" / "keep going" | `--batches 1` on Cloud Agent |
| "redo pages-006-010" | `--redo pages-006-010` then `--batches 1` |

## Full loop

1. **Status**
   ```bash
   python3 scripts/run_pipeline.py --status --json
   python3 scripts/run_pipeline.py --manifest --batches 4 --spawn-prompt
   ```
2. **Split** pending ranges only:
   ```bash
   python3 scripts/run_pipeline.py
   ```
3. **Interpret** using `spawn.tasks` — **one batch at a time on Cloud Agent**.
4. **Sync and validate** after each batch:
   ```bash
   python3 scripts/run_pipeline.py --sync-state
   python3 scripts/validate_accessible.py
   ```
5. **Commit** `accessible/*.md` and `scans/.pipeline-state.json`.
6. Repeat until manifest shows no pending batches.

## Cloud Agent

On **Cloud Agent**, nested Task subagents run on **separate VMs** that cannot write to this run's `/workspace`.

**Correct workflow:**

1. Top-level orchestrator runs on the shared VM — split, status, sync, validate, commit.
2. Process pending batches **sequentially** — one batch per orchestrator turn.
3. For each batch, run **one interpretation worker on this same VM** with `gemini-3.8-flash-medium`. The worker reads the batch PDF and writes `accessible/*.md` locally. It must **not** spawn nested Task subagents.
4. After each batch, run `--sync-state`, validate, and commit before the next.

Use `spawn.tasks[0].prompt` from `--manifest --spawn-prompt` as the worker brief.

**Do not** on Cloud Agent:

- Launch parallel Task subagents for batches that need to write files.
- Rely on nested Task spawns from an interpretation worker.
- Transcribe batches inline in the orchestrator.

## Token rules

See `.cursor/rules/token-stewardship.mdc`. Summary: no direct API, no parallel Cloud Agent Tasks, one batch per worker, medium model.
