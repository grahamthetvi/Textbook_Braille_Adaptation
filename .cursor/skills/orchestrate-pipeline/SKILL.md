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

## Cloud Agent

On **Cloud Agent**, nested Task subagents are unreliable and parallel Task subagents run on **separate VMs** that cannot write to this run's `/workspace`. Do not assume desktop Cursor's shared-filesystem subagent model.

**Correct workflow on Cloud Agent:**

1. Top-level orchestrator runs on the shared VM — split, status, sync, validate, and commit from here.
2. Process pending batches **sequentially** — one batch at a time per orchestrator turn.
3. For each batch, launch **one interpretation worker on this same VM** with model `gemini-3.8-flash-high`. The worker reads the batch PDF and writes `accessible/*.md` locally. It must **not** spawn nested Task subagents.
4. After each batch (or small group), run `--sync-state`, validate, and commit before the next batch.

**Do not** on Cloud Agent:

- Launch parallel Task subagents for batches that need to write files.
- Rely on nested Task spawns from an interpretation worker.
- Transcribe batches inline in the orchestrator (same rule as desktop).

Example prompt for a same-VM interpretation worker (use manifest paths):

```
You are an interpretation worker on the shared Cloud Agent VM. Do not spawn Task subagents.

Transcribe the scanned textbook pages in this batch PDF into accessible markdown.

Read the batch PDF at: scans/.batches/<source-stem>/batch-001-006.pdf
Write output to: accessible/<output-filename>.md

Follow .cursor/rules/accessible-document-style.mdc and .cursor/skills/interpret-batch/SKILL.md.

Requirements:
- Use model gemini-3.8-flash-high on this VM.
- Output markdown only — no preamble.
- Write the file to accessible/ with the exact filename above.
- Do not change lesson content; use [unclear] for unreadable words.
- After writing, run: python3 scripts/validate_accessible.py <output-path>
- Fix any validation errors before finishing.
```

## Do not

- Process an entire book in one subagent call.
- Transcribe batches inline in the orchestrator without launching a Task subagent (desktop) or same-VM worker (Cloud Agent).
- Launch parallel Task subagents for file-writing work on Cloud Agent.
- Skip validation after the first batch on a new book.
- Require `GEMINI_API_KEY` for the default workflow.
