# Textbook Braille Adaptation

Turn scanned textbook PDFs into accessible plain-text markdown for later Grade 2 braille translation. Drop PDFs in `scans/`, run the pipeline to split them into 5-8 page batches, and delegate each batch to a **Gemini Cursor subagent** for transcription into `accessible/`. No API key is required.

## Quick start

```bash
pip install -r scripts/requirements.txt
```

Drop source PDFs in `scans/`, then ask a Cursor agent to process them — or run the planning tools yourself:

```bash
python3 scripts/run_pipeline.py --dry-run
python3 scripts/run_pipeline.py --status
python3 scripts/run_pipeline.py              # split into batch PDFs
python3 scripts/run_pipeline.py --manifest   # list pending batches (JSON)
```

Process one file:

```bash
python3 scripts/run_pipeline.py --file scans/unit-01.pdf --unit-prefix adjectives
```

## Workflow

1. User drops PDFs in `scans/`.
2. Agent checks `scans/` for unprocessed files (`run_pipeline.py --status`).
3. `scripts/run_pipeline.py` splits each PDF into 5-8 page batches under `scans/.batches/`.
4. For each pending batch, the orchestrating agent launches a **foreground Cursor subagent** (model `gemini-3.8-flash-medium`) that reads the batch PDF and writes accessible markdown.
5. Output lands in `accessible/` as `pages-001-007.md` or `<unit>_pages-001-007.md`.
6. Agent runs `--sync-state`, then reviews output against `.cursor/rules/`.

See `.cursor/skills/interpret-batch/SKILL.md` for the subagent prompt and checklist.

## Repository layout

| Path | Purpose |
| --- | --- |
| `scans/` | Incoming PDFs (PDF only for now) |
| `scans/.batches/` | Generated batch PDFs (gitignored) |
| `accessible/` | Accessible markdown output |
| `scripts/` | Pipeline Python tools (split + status only) |
| `.cursor/rules/` | Style and agent workflow rules |
| `.cursor/skills/interpret-batch/` | How to run interpretation subagents |
| `.cursor/skills/orchestrate-pipeline/` | Full orchestration loop |

## Running in Cursor Cloud Agents

This repo includes `.cursor/environment.json` so Cloud Agents install Python dependencies automatically (`pypdf` only). After merging environment changes, open the environment in Cursor and **Save** the proposed configuration when prompted.

### Drop a scan and ask the agent

1. Upload or commit a PDF under `scans/` (for example `scans/Grammar Workbook.pdf`).
2. Start a Cloud Agent on this repo and ask it to **process the scan**.
3. The agent should run `python3 scripts/run_pipeline.py --status --json`, split PDFs, then launch Gemini subagents for pending batches (often one batch first).
4. Review the PR or commits for new files in `accessible/`.

### Agent commands

```bash
python3 scripts/run_pipeline.py --status --json
python3 scripts/run_pipeline.py --manifest --batches 4 --spawn-prompt   # "process 4 batches"
python3 scripts/run_pipeline.py --manifest --pages 20 --spawn-prompt    # "process 20 pages"
python3 scripts/run_pipeline.py                                       # split PDFs
python3 scripts/run_pipeline.py --sync-state
python3 scripts/run_pipeline.py --redo pages-001-005
python3 scripts/validate_accessible.py
```

See `.cursor/rules/token-stewardship.mdc` for why this repo avoids direct Gemini API calls and caps subagents per turn.

Pipeline state is tracked in `scans/.pipeline-state.json` so completed page ranges are skipped on reruns. See `.cursor/rules/agentic-pipeline.mdc` for the full agent checklist.

## Style rules

Accessible files follow `.cursor/rules/accessible-document-style.mdc`:

- Preserve paragraphs and lesson content.
- Use headings, lists, and tables appropriately — no nested numbered or lettered lists.
- Format multi-digit numbers with commas when helpful; dates and phones with hyphens.
- Add transcriber notes only when a visual cannot be converted accessibly.
- Avoid `[]`, `#`, `&`, and `*` unless they appear in the source.

## What you still need

- **Sample PDFs**: add real textbook scans to `scans/` to validate end-to-end quality.
- **Human review**: spot-check math, diagrams, and `[unclear]` markers before braille translation.
- **CI optional**: add a dry-run or split-only check on PRs when sample fixtures exist.
