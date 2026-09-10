# Textbook adapter

Turn scanned textbook PDFs into **accessible markdown** for later Grade 2 braille translation. This app transcribes pages; it does not produce braille.

## Web app

After you enable GitHub Pages, open:

https://grahamthetvi.github.io/Textbook_Braille_Adaptation/

Locally:

```bash
python3 scripts/serve_adapter.py
```

Then open the printed URL (`http://127.0.0.1:8000`).

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Drop a PDF on the page.
3. Plan batches (5–8 pages each).
4. Adapt book.
5. Download the markdown (single file or zip).

The key stays in your browser session. It is sent only to Google, or to an optional proxy if you set one (for example `http://127.0.0.1:8000/api/gemini` when using the local server). The page vendors [pdf-lib](https://github.com/Hopding/pdf-lib) and [JSZip](https://github.com/Stuk/jszip) in `docs/vendor/`.

### Enable GitHub Pages

Repo **Settings → Pages → GitHub Actions**. Pushes to `main` deploy the `docs/` site.

## Optional CLI helpers

```bash
pip install -r scripts/requirements.txt

# Non-browser fallback (needs a Gemini API key)
python3 scripts/adapt_pdf.py scans/file.pdf --key "$GEMINI_API_KEY" --out-dir accessible

# Split a PDF into 5–8 page batches
python3 scripts/run_pipeline.py --file scans/file.pdf --dry-run
python3 scripts/run_pipeline.py --file scans/file.pdf

# Check accessible markdown style
python3 scripts/validate_accessible.py accessible/pages-001-005.md
```

`scripts/serve_adapter.py` also exposes `POST /api/gemini/models/<model>:generateContent` so the page can use a same-origin proxy instead of calling Google directly.

## Layout

| Path | Purpose |
| --- | --- |
| `docs/` | Static web app (GitHub Pages) |
| `scans/` | Source PDFs |
| `accessible/` | Accessible markdown output |
| `scripts/` | Local server, split, validate, CLI adapt |
