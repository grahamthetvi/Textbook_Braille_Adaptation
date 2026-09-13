# Textbook Adapter

Turn scanned textbook PDFs into accessible markdown for later Grade 2 braille translation. This app transcribes pages; it does not produce braille.

The primary path is a static web app: paste a Gemini API key, drop a PDF, split it into 5–8 page batches in the browser, send each batch to Gemini 3.8 Flash, and download markdown.

## Connect Gemini 3.8 Flash

This site calls the **Google Gemini API**, not Cursor’s model picker. The model id is `gemini-3.8-flash`. Do not use Cursor slugs such as `gemini-3.8-flash-medium` or `gemini-3.8-flash-high`.

1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey) and sign in.
2. Create an API key in a Google Cloud project. If Google asks, enable the **Gemini API** (Generative Language API) for that project.
3. Confirm the key can use Gemini 3.8 Flash (GA). Older keys or projects that only allow 2.x models will fail until 3.8 is available on that project.
4. Serve the site (`python3 scripts/serve_adapter.py`) or open the GitHub Pages URL after deploy.
5. Paste the key into **Gemini API key**. Leave **Model** on Gemini 3.8 Flash.
6. Drop a PDF, plan batches, then Adapt book.

The key stays in the browser session. It is sent only to Google (`generativelanguage.googleapis.com`), or to an optional same-origin proxy. Vertex AI / Gemini Enterprise OAuth tokens are not supported here.

If the browser blocks Google (common on some locked-down networks), run the local server and set **Advanced: optional proxy URL** to `http://127.0.0.1:8000/api/gemini`.

CLI equivalent:

```bash
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --out-dir accessible
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --model gemini-3.8-flash
```

The page vendors [pdf-lib](https://github.com/Hopding/pdf-lib) and [JSZip](https://github.com/Stuk/jszip) in `docs/vendor/`.

## Web app

Run it locally (no GitHub Pages setup required):

```bash
python3 scripts/serve_adapter.py
```

Then open the printed URL (`http://127.0.0.1:8000`).

After you merge to `main` and enable GitHub Pages, the same app is also at:

https://grahamthetvi.github.io/Textbook_Braille_Adaptation/

1. Paste the Gemini API key from the steps above.
2. Drop a PDF on the page.
3. Plan batches (5–8 pages each).
4. Adapt book.
5. Download a Word document, combined markdown, or a zip of per-batch files.

### Enable GitHub Pages

Repo **Settings → Pages → GitHub Actions**. Pushes to `main` deploy the `docs/` site.

## CLI fallback

```bash
pip install -r scripts/requirements.txt

# Adapt a PDF without the browser (needs a Gemini API key)
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --out-dir accessible
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --skip-existing --max-batches 1

# Split a PDF into 5–8 page batches
python3 scripts/run_pipeline.py --file scans/file.pdf --dry-run
python3 scripts/run_pipeline.py --file scans/file.pdf

# Check accessible markdown style
python3 scripts/validate_accessible.py accessible/pages-001-005.md
```

`scripts/serve_adapter.py` also exposes `POST /api/gemini/models/<model>:generateContent` so the page can use a same-origin proxy instead of calling Google directly.

## Optional Cursor in-repo path

If you are already in Cursor and want workers to write `accessible/` without a Google API key, the older split-and-subagent tools still work:

```bash
python3 scripts/run_pipeline.py --status --json
python3 scripts/run_pipeline.py --manifest --batches 1 --spawn-prompt
python3 scripts/run_pipeline.py
python3 scripts/run_pipeline.py --sync-state
```

Prefer the web app or `adapt_pdf.py` for a full book. Cursor workers cannot read PDF pixels reliably, and parallel Cloud Agent Tasks cannot write back to this workspace. See `.cursor/rules/token-stewardship.mdc`.

## Layout

| Path | Purpose |
| --- | --- |
| `docs/` | Static web app (GitHub Pages and local server) |
| `scans/` | Source PDFs |
| `accessible/` | Accessible markdown output |
| `scripts/` | Local server, CLI adapt, split, validate, optional agent status |
| `.cursor/rules/` | Accessible style and workflow rules |
| `.cursor/skills/` | Agent skills for serving the adapter or optional in-repo batches |

## Style rules

Accessible files follow `.cursor/rules/accessible-document-style.mdc`:

- Preserve paragraphs and lesson content.
- Use headings, lists, and tables appropriately — no nested numbered or lettered lists.
- Format multi-digit numbers with commas when helpful; dates and phones with hyphens.
- Add transcriber notes only when a visual cannot be converted accessibly.
- Avoid `[]`, `#`, `&`, and `*` unless they appear in the source.

## What you still need

- A Gemini API key from Google AI Studio that can call `gemini-3.8-flash`.
- Human review of math, diagrams, and `[unclear]` markers before braille translation.
- GitHub Pages enabled if you want the public site URL after merge.
