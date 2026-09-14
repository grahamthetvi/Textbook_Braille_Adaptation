---
name: web-adapter
description: Serve the textbook adapter web app and help the user adapt a PDF with a Gemini API key.
---

# Web Adapter

Primary path for adapting a scanned textbook.

## Local

```bash
python3 scripts/serve_adapter.py
```

Open `http://127.0.0.1:8000`. Optional proxy URL on the page: `http://127.0.0.1:8000/api/gemini`.

## User steps

1. Create a Gemini API key in Google AI Studio (https://aistudio.google.com/apikey).
2. Paste it on the page. Leave the model on Gemini 3.8 Flash (`gemini-3.8-flash`, not Cursor slugs).
3. Drop a textbook PDF.
4. Plan batches (5–8 pages).
5. Adapt book.
6. If Gemini returns no text, compare the original pages, then skip as blank or retry.
7. Download combined markdown or a zip.

## CLI

```bash
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --out-dir accessible
python3 scripts/validate_accessible.py
```

Do not launch Cursor interpretation workers unless the user asks for the in-repo path.
