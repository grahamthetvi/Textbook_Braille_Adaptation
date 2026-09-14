---
name: web-adapter
description: Serve the textbook adapter web app and help the user adapt a PDF with Gemini, Claude, OpenAI, or local Ollama.
---

# Web Adapter

Primary path for adapting a scanned textbook.

## Local

```bash
python3 scripts/serve_adapter.py
```

Open `http://127.0.0.1:8000`. Gemini can also run from GitHub Pages. Claude, OpenAI, and Ollama need this local server.

Optional Gemini-only proxy URL on the page: `http://127.0.0.1:8000/api/gemini`.

## User steps

1. Choose a model. Default is Gemini 3.8 Flash (`gemini-3.8-flash`). Other API ids: `gemini-3.1-pro-preview`, `claude-sonnet-5`, `claude-opus-5`, `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`, or a local Ollama vision tag such as `qwen2.5vl`.
2. Paste the matching API key (none for Ollama). Keys stay per provider in session storage. Do not type Cursor slugs; Model and Effort are separate.
3. Leave Effort on the recommended value: Gemini/Claude medium, OpenAI low, Ollama off.
4. Drop a textbook PDF.
5. Plan batches (5–8 pages).
6. Adapt book.
7. If the model returns no text, compare the original pages, then skip as blank or retry.
8. Download combined markdown or a zip.

Ollama: `ollama pull qwen2.5vl` (or `gemma4`), then Refresh the model list. Spot-check the first batch.

## CLI

```bash
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --out-dir accessible
python3 scripts/validate_accessible.py
```

The CLI stays Gemini-only.

Do not launch Cursor interpretation workers unless the user asks for the in-repo path.
