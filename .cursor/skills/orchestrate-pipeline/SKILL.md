---
name: orchestrate-pipeline
description: Run the full textbook adaptation loop — status, split, launch subagent batches, sync state, validate, and commit.
---

# Orchestrate Pipeline

Use when the user asks to process scans, continue the pipeline, or transcribe a specific number of pages or batches.

## Parse the user request

| Intent | Flags |
| --- | --- |
| "process 20 pages" | `--pages 20` |
| "redo 4 files" / "next 4 batches" | `--batches 4` |
| "continue" / "keep going" | `--batches 3` (default cap) |
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
3. **Launch subagents** from `spawn.tasks` (foreground, max 3 per turn).
4. **Sync and validate**
   ```bash
   python3 scripts/run_pipeline.py --sync-state
   python3 scripts/validate_accessible.py
   ```
5. **Commit** `accessible/*.md` and `scans/.pipeline-state.json`.
6. Repeat until manifest shows no pending batches.

## Token rules

See `.cursor/rules/token-stewardship.mdc`. Summary: no direct API, no background subagents, one batch per subagent, medium model, max 3 per turn.
