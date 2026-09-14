# Textbook Adapter

Turn scanned textbook PDFs into screen-reader-accessible markdown. This app transcribes pages; it does not produce braille. Optional LaTeX wrapping supports a later Nemeth path.

The primary path is a static web app: choose a model, drop a PDF, split it into 5–8 page batches in the browser, and download markdown. Gemini 3.8 Flash is the default. Claude, OpenAI GPT-5.6, and local Ollama vision models are available from the same page.

## Connect a model

This site calls provider APIs, not Cursor’s model picker. **Model** and **Effort** are separate fields. Do not paste Cursor slugs such as `gemini-3.8-flash-medium`, `Sonnet 5 - high`, or `gpt-5.6-luna-high`.

Recommended effort (cheaper OCR defaults, marked in the UI):

| Provider | Models (API ids) | Recommended effort | API field |
| --- | --- | --- | --- |
| Gemini | `gemini-3.8-flash` (default), `gemini-3.1-pro-preview` | medium | `thinkingConfig.thinkingLevel` |
| Claude | `claude-sonnet-5`, `claude-opus-5` | medium | `output_config.effort` |
| OpenAI | `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol` | low | `reasoning.effort` (no `reasoning.mode: pro`) |
| Ollama | local vision tag such as `qwen2.5vl` | off | `think: false` |

**GitHub Pages can call Gemini directly.** Claude, OpenAI, and Ollama need the local server (`python3 scripts/serve_adapter.py`) so the page can use same-origin `/api/anthropic`, `/api/openai`, and `/api/ollama` proxies.

### Gemini 3.8 Flash

1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey) and sign in.
2. Create an API key in a Google Cloud project. If Google asks, enable the **Gemini API** (Generative Language API) for that project.
3. Serve the site (`python3 scripts/serve_adapter.py`) or open the GitHub Pages URL after deploy.
4. Paste the key. Leave **Model** on Gemini 3.8 Flash and **Effort** on medium (recommended).
5. Drop a PDF, plan batches, then Adapt book.

The Gemini key stays in the browser session. It is sent only to Google (`generativelanguage.googleapis.com`), or to an optional same-origin Gemini proxy. Vertex AI / Gemini Enterprise OAuth tokens are not supported here.

If the browser blocks Google, run the local server and set **Advanced: optional Gemini proxy URL** to `http://127.0.0.1:8000/api/gemini`.

### Claude and OpenAI

1. Run `python3 scripts/serve_adapter.py` and open `http://127.0.0.1:8000`.
2. Choose Claude Sonnet 5 (`claude-sonnet-5`) or GPT-5.6 Luna (`gpt-5.6-luna`).
3. Paste an [Anthropic](https://console.anthropic.com/settings/keys) or [OpenAI](https://platform.openai.com/api-keys) key. Keys are stored per provider in session storage.
4. Leave **Effort** on the recommended value (medium for Claude, low for OpenAI).

### Local Ollama

Ollama does not see PDFs the way Gemini does. The adapter rasterizes each page of the 5–8 page batch and sends PNGs. You need a **vision** model (`ollama pull qwen2.5vl` or `gemma4`). Quality is usually behind Gemini 3.8 Flash on two-column scans, small print, and math — spot-check the first batch.

1. Install Ollama and start it on port 11434.
2. Run `python3 scripts/serve_adapter.py` (GitHub Pages cannot reach Ollama on your PC).
3. Choose **Ollama (local vision)**. No API key.
4. Confirm the URL is loopback (`http://127.0.0.1:11434`), Refresh the model list, leave **Effort** off.

The local proxy only forwards to loopback Ollama URLs. It is not an open relay.

CLI equivalent (Gemini only):

```bash
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --out-dir accessible
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --model gemini-3.8-flash
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --latex-math
```

The CLI cannot answer clarification questions. If a batch ends with a `CLARIFY:` block, even after a draft transcription, that batch fails and prints the question; use the web adapter to continue the conversation.

The page vendors [pdf-lib](https://github.com/Hopding/pdf-lib), [pdf.js](https://github.com/mozilla/pdf.js), and [JSZip](https://github.com/Stuk/jszip) in `docs/vendor/`.

## Web app

Run it locally (no GitHub Pages setup required):

```bash
python3 scripts/serve_adapter.py
```

Then open the printed URL (`http://127.0.0.1:8000`).

After you merge to `main` and enable GitHub Pages, the same app is also at:

https://grahamthetvi.github.io/Textbook_Braille_Adaptation/

1. Paste a provider API key (or choose Ollama with no key). Gemini works from GitHub Pages; Claude, OpenAI, and Ollama need the local server.
2. Drop a PDF on the page.
3. Plan batches (5–8 pages each).
4. Optionally check **Wrap math in LaTeX (for Nemeth)**.
5. Adapt book.
6. If a clarification panel appears, answer the question and continue that batch.
7. If a blank-output panel appears, compare the original pages, then skip or retry that batch.
8. Download a Word document, combined markdown, or a zip of per-batch files.

### Enable GitHub Pages

Repo **Settings → Pages → GitHub Actions**. Pushes to `main` deploy the `docs/` site.

## CLI fallback

```bash
pip install -r scripts/requirements.txt

# Adapt a PDF without the browser (needs a Gemini API key)
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --out-dir accessible
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --skip-existing --max-batches 1
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --latex-math

# Split a PDF into 5–8 page batches
python3 scripts/run_pipeline.py --file scans/file.pdf --dry-run
python3 scripts/run_pipeline.py --file scans/file.pdf

# Check accessible markdown style
python3 scripts/validate_accessible.py accessible/pages-001-005.md
python3 scripts/validate_accessible.py --latex-math accessible/pages-001-005.md
```

`scripts/serve_adapter.py` proxies:

- `POST /api/gemini/models/<model>:generateContent`
- `POST /api/anthropic/v1/messages`
- `POST /api/openai/v1/responses`
- `GET|POST /api/ollama/api/tags` and `POST /api/ollama/api/chat` (loopback Ollama only)

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

- Preserve paragraphs and lesson content for screen readers.
- Use headings, lists (including nested lists), and tables. Number or letter questions under a numbered item.
- Keep italic, bold, and underlined print as `_italics_`, `__bold__`, and `<u>underlined</u>`. Headings are plain title lines, not `#` markdown.
- Format multi-digit numbers with commas when helpful; dates and phones with hyphens.
- Add transcriber notes only when a visual cannot be converted accessibly.
- Avoid `[]`, `{}`, `#`, `&`, and `*` unless they appear in the source. In LaTeX math mode, braces inside math spans are allowed.
- Mark an unreadable word as `(unclear)`, not a square-bracket token.

## What you still need

- A provider API key (Gemini from Google AI Studio, or Anthropic / OpenAI for those models), or a local Ollama vision model.
- Human review of math, diagrams, and `(unclear)` markers.
- GitHub Pages enabled if you want the public site URL after merge. The Pages URL is Gemini-only unless you run the local adapter.
