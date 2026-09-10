---
name: interpret-batch
description: Transcribe one PDF batch into accessible markdown using a Gemini Cursor subagent. Use when run_pipeline reports pending batches.
---

# Interpret Batch (Gemini Subagent)

Interpretation runs inside Cursor via a **foreground subagent** with a Gemini model. No `GEMINI_API_KEY` is required.

## When to use

- `python3 scripts/run_pipeline.py --status` shows pending batches
- User asks to process N pages, N batches, or continue the pipeline
- After `python3 scripts/run_pipeline.py` splits new PDFs

## Plan how much to process

Map user requests to pipeline flags:

| User says | Command |
| --- | --- |
| "process 4 batches" / "redo 4 md files" | `--manifest --batches 4 --spawn-prompt` |
| "process 20 pages" | `--manifest --pages 20 --spawn-prompt` |
| "continue the pipeline" | `--manifest --batches 3 --spawn-prompt` (default cap) |

```bash
python3 scripts/run_pipeline.py --status --json
python3 scripts/run_pipeline.py --manifest --batches 4 --spawn-prompt
```

## Launch interpretation subagents

1. Read `spawn.tasks[]` from the manifest JSON.
2. For each task (max 3 per turn), call the **Task** tool with:
   - `model`: task `model` field (`gemini-3.8-flash-medium` by default)
   - `run_in_background`: **false**
   - `prompt`: task `prompt` field (already minimal)
3. After all tasks finish:
   ```bash
   python3 scripts/run_pipeline.py --sync-state
   python3 scripts/validate_accessible.py accessible/pages-*.md
   ```

See `.cursor/rules/token-stewardship.mdc` for why background or parallel fan-out is forbidden.

## Resume and redo

- Completed ranges are skipped when the output file exists in `accessible/`.
- `scans/.pipeline-state.json` tracks completed batches (commit it).
- Redo one batch: `python3 scripts/run_pipeline.py --redo pages-001-005`

## Do not

- Call `google-genai` or require `GEMINI_API_KEY`.
- Combine multiple batch PDFs in one subagent call.
- Launch more than 3 interpretation subagents in one turn.
- Use background subagents for interpretation.
