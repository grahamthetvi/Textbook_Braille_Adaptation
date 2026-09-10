---
name: orchestrate-pipeline
description: Run textbook adaptation — prefer the web adapter; optional in-repo split and Cursor workers.
---

# Orchestrate Pipeline

Use when the user asks to process scans, continue the pipeline, or transcribe a specific number of pages or batches.

## Default: web adapter

If the user wants to adapt a book (especially a scanned PDF), start the web app rather than Cursor workers:

```bash
python3 scripts/serve_adapter.py
```

Open `http://127.0.0.1:8000`. The user pastes a Gemini API key, drops the PDF, and downloads markdown.

CLI equivalent when a key is available:

```bash
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --out-dir accessible
python3 scripts/validate_accessible.py
```

## Optional in-repo Cursor path

Only when the user asks to process `scans/` inside Cursor without the web app.

| Intent | Flags |
| --- | --- |
| "process 20 pages" | `--pages 20` |
| "redo 4 files" / "next 4 batches" | `--batches 4` |
| "continue" / "keep going" | `--batches 1` on Cloud Agent |
| "redo pages-006-010" | `--redo pages-006-010` then `--batches 1` |

1. **Status**
   ```bash
   python3 scripts/run_pipeline.py --status --json
   python3 scripts/run_pipeline.py --manifest --batches 1 --spawn-prompt
   ```
2. **Split** pending ranges only: `python3 scripts/run_pipeline.py`
3. **Interpret** using `spawn.tasks` — **one batch at a time on Cloud Agent**.
4. **Sync and validate** after each batch.
5. **Commit** `accessible/*.md` and `scans/.pipeline-state.json`.

## Cloud Agent

On **Cloud Agent**, nested Task subagents run on **separate VMs** that cannot write to this run's `/workspace`. Do not launch parallel Task subagents for file-writing work.

## Token rules

See `.cursor/rules/token-stewardship.mdc`. Prefer the web adapter. If using Cursor workers: no parallel Cloud Agent Tasks, one batch per worker, medium model.
