---
name: interpret-batch
description: Transcribe one PDF batch into accessible markdown using a Gemini Cursor worker. Use when run_pipeline reports pending batches.
---

# Interpret Batch (Gemini Worker)

Interpretation runs inside Cursor via a **same-VM worker** with a Gemini model. No `GEMINI_API_KEY` is required.

## When to use

- `python3 scripts/run_pipeline.py --status` shows pending batches
- User asks to process N pages, N batches, or continue the pipeline
- After `python3 scripts/run_pipeline.py` splits new PDFs

## Plan how much to process

| User says | Command |
| --- | --- |
| "process 4 batches" / "redo 4 md files" | `--manifest --batches 4 --spawn-prompt` |
| "process 20 pages" | `--manifest --pages 20 --spawn-prompt` |
| "continue the pipeline" | `--manifest --batches 1 --spawn-prompt` on Cloud Agent |

```bash
python3 scripts/run_pipeline.py --status --json
python3 scripts/run_pipeline.py --manifest --batches 4 --spawn-prompt
```

## Launch one interpretation worker

**Cloud Agent:** process **one batch at a time** on this VM. Do not spawn nested Task subagents.

1. Read `spawn.tasks[0]` from the manifest (first pending batch only on Cloud Agent).
2. Run as a same-VM worker with model from task `model` (`gemini-3.8-flash-medium`).
3. Use task `prompt` — read batch PDF, write `accessible/*.md`, validate.
4. After finishing:
   ```bash
   python3 scripts/run_pipeline.py --sync-state
   python3 scripts/validate_accessible.py <output-path>
   ```

**Desktop Cursor:** may process up to 3 batches per turn via foreground Task subagents (`launch_limit_per_turn` in manifest).

See `.cursor/rules/token-stewardship.mdc` for why parallel Cloud Agent Tasks fail.

## Resume and redo

- Completed ranges are skipped when the output file exists in `accessible/`.
- `scans/.pipeline-state.json` tracks completed batches (commit it).
- Redo one batch: `python3 scripts/run_pipeline.py --redo pages-001-005`

## Do not

- Call `google-genai` or require `GEMINI_API_KEY`.
- Combine multiple batch PDFs in one worker call.
- Launch parallel Task subagents on Cloud Agent.
- Spawn nested Task subagents from an interpretation worker.
