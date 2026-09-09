# Textbook Braille Adaptation

Turn scanned textbook PDFs into accessible plain-text markdown for later Grade 2 braille translation. A Cloud Agent (or local operator) watches `scans/`, splits PDFs into 5-8 page batches, and uses Gemini 3.8 Flash with high thinking to transcribe each batch into `accessible/`.

## Quick start

```bash
pip install -r scripts/requirements.txt
export GEMINI_API_KEY="your-key"   # or GOOGLE_API_KEY
```

Drop source PDFs in `scans/`, then:

```bash
python3 scripts/run_pipeline.py --dry-run
python3 scripts/run_pipeline.py
```

Process one file:

```bash
python3 scripts/run_pipeline.py --file scans/unit-01.pdf --unit-prefix adjectives
```

Split only (no API key needed):

```bash
python3 scripts/run_pipeline.py --skip-interpret
```

## Workflow

1. User drops PDFs in `scans/`.
2. Agent checks `scans/` for unprocessed files.
3. `scripts/run_pipeline.py` splits each PDF into 5-8 page batches under `scans/.batches/`.
4. Each batch is sent to Gemini (`gemini-3.8-flash`, `thinking_level=high`) for OCR and accessible transcription.
5. Output lands in `accessible/` as `pages-001-007.md` or `<unit>_pages-001-007.md`.
6. Agent or human reviews output against `.cursor/rules/`.

## Model and pricing

- Default model: `gemini-3.8-flash` with `thinking_level=high`.
- Override with `GEMINI_MODEL` and `GEMINI_THINKING_LEVEL` if needed.
- Gemini 3.8 Flash is the recommended cost/quality default through **Dec 31, 2026**; verify [current Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) before large jobs.

## Repository layout

| Path | Purpose |
| --- | --- |
| `scans/` | Incoming PDFs and images |
| `scans/.batches/` | Generated batch PDFs (gitignored) |
| `accessible/` | Accessible markdown output |
| `scripts/` | Pipeline Python tools |
| `.cursor/rules/` | Style and agent workflow rules |

## Cloud Agent operation

See `.cursor/rules/agentic-pipeline.mdc` for the agent checklist. Typical loop:

1. List new files in `scans/`.
2. Run `python3 scripts/run_pipeline.py --dry-run` and report planned batches.
3. Run the pipeline when `GEMINI_API_KEY` is available.
4. Spot-check one output file against style rules.
5. Commit `accessible/*.md` separately from tooling changes when possible.

Pipeline state is tracked in `scans/.pipeline-state.json` so completed page ranges are skipped on reruns.

## Style rules

Accessible files follow `.cursor/rules/accessible-document-style.mdc`:

- Preserve paragraphs and lesson content.
- Use headings, lists, and tables appropriately — no nested numbered or lettered lists.
- Format multi-digit numbers with commas when helpful; dates and phones with hyphens.
- Add transcriber notes only when a visual cannot be converted accessibly.
- Avoid `[]`, `#`, `&`, and `*` unless they appear in the source.

## What you still need

- **API key**: set `GEMINI_API_KEY` or `GOOGLE_API_KEY` in the agent environment or local shell.
- **Sample PDFs**: add real textbook scans to `scans/` to validate end-to-end quality.
- **Human review**: spot-check math, diagrams, and `[unclear]` markers before braille translation.
- **Cost monitoring**: log batch counts and token usage for large books.
- **CI optional**: add a dry-run or split-only check on PRs when sample fixtures exist.
