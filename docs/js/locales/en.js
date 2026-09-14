/** English UI catalog for the textbook adapter. */

export const en = {
  "header.title": "Textbook Adapter",
  "header.skip": "Skip to main content",
  "header.eyebrow": "Accessible textbook prep",
  "header.lede":
    "Drop a scanned textbook PDF, paste a Gemini API key, and download screen-reader-accessible markdown. The key stays in this browser session and is sent only to Google Gemini, or to an optional proxy you set.",

  "toolbar.displayOptions": "Display options",
  "toolbar.language": "Language",
  "toolbar.darkMode": "Dark mode",

  "form.geminiAccess": "Gemini access",
  "form.apiKey": "Gemini API key",
  "form.apiKeyHint":
    'Create a Gemini API key in <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio</a>. Required to adapt. Not written to disk. Session storage is used only if you check the box below.',
  "form.setupSummary": "How to connect Gemini 3.8 Flash",
  "form.setupStep1":
    'Open <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio API keys</a> and sign in with the Google account that should be billed.',
  "form.setupStep2":
    "Create an API key in a Google Cloud project. If prompted, enable the <strong>Gemini API</strong> (Generative Language API) for that project.",
  "form.setupStep3":
    "Paste the key in the field above. Leave <strong>Model</strong> on Gemini 3.8 Flash. The Google API id is <code>gemini-3.8-flash</code>.",
  "form.setupStep4":
    "Do not type Cursor names such as <code>gemini-3.8-flash-medium</code> into Custom model. Those are not valid Google API ids.",
  "form.setupStep5":
    "If this page cannot reach Google from the browser, run <code>python3 scripts/serve_adapter.py</code> and set the proxy to <code>http://127.0.0.1:8000/api/gemini</code>.",
  "form.rememberKey": "Remember key this session",
  "form.model": "Model",
  "form.modelHint": "Use Gemini 3.8 Flash unless an older key cannot call that model.",
  "form.customModel": "Custom model",
  "form.batchSize": "Preferred batch size",
  "form.latexMath": "Wrap math in LaTeX (for Nemeth)",
  "form.latexHint":
    "Off by default: math is spoken plain text. When checked, Gemini wraps math in LaTeX so it can later be converted to Nemeth.",
  "form.advanced": "Advanced: optional proxy URL",
  "form.proxyUrl": "Proxy URL",
  "form.proxyHint":
    "Leave blank to call Google Gemini from this browser. Set a proxy if this page cannot reach Google, using a host that forwards generateContent.",
  "form.pdfLegend": "Textbook PDF",
  "form.dropLead": "Drop a textbook PDF here",
  "form.dropOr": "or",
  "form.pdfFile": "PDF file",
  "form.noFile": "No file loaded.",
  "form.planBatches": "Plan batches",
  "form.adaptBook": "Adapt book",
  "form.cancel": "Cancel",

  "clarify.heading": "Clarification needed",
  "clarify.hint":
    "Gemini paused this batch. Answer the question to continue. Remaining pending batches wait until this one finishes. You can also retry from scratch without answering.",
  "clarify.answer": "Your answer",
  "clarify.continue": "Continue this batch",
  "clarify.retry": "Retry from scratch",
  "clarify.pages": "pages {range}",
  "clarify.missingQuestion": "Gemini asked a question but did not include the text.",

  "progress.heading": "Progress",
  "progress.batchesCompleted": "Batches completed",
  "progress.batchStatus": "Batch status",

  "status.loadPdf": "Load a PDF to plan batches. Gemini is not called until you adapt.",
  "status.raw": "{raw}",
  "status.plannedOne":
    "Planned 1 batch from {count} pages. Gemini is not called until you adapt.",
  "status.plannedMany":
    "Planned {batches} batches from {count} pages. Gemini is not called until you adapt.",
  "status.splitting": "Splitting the PDF into batches…",
  "status.noPending": "No pending batches. Retry a failed row, or download what already completed.",
  "status.batchProgress": "Batch {index} of {total}: pages {range}",
  "status.batchRetry": "Batch {index} of {total}. {message}",
  "status.pausedClarify":
    "Paused on pages {range}. Gemini needs a clarification before that batch can finish.",
  "status.completedWithErrors":
    "{done} of {total} batches completed. Retry failed rows or download what finished.",
  "status.finished":
    "Finished {done} of {total} batches. You can download the accessible markdown.",
  "status.stopped": "Adaptation stopped.",

  "errors.heading": "Failed batches",
  "errors.hint":
    "A failed batch or a clarification question stops the run. Remaining pending ranges are not sent. Rate limits wait and retry the current batch without stopping. Retry a failed row, answer a clarification, or Adapt book to resume pending batches. Completed batches stay downloadable.",
  "errors.raw": "{raw}",
  "errors.pagesFailed": "pages {range}: {error}",
  "errors.batchFailed": "This batch failed.",
  "errors.retry": "Retry",

  "download.heading": "Download",
  "download.hint": "Downloads include completed batches only, even if some rows still need a retry.",
  "download.docx": "Download Word document",
  "download.md": "Download combined markdown",
  "download.zip": "Download zip",

  "batch.noBatches": "No batches planned yet.",
  "batch.pages": "pages {range}",
  "batch.pending": "pending",
  "batch.running": "running",
  "batch.done": "done",
  "batch.error": "error",
  "batch.retrying": "retrying",
  "batch.clarify": "needs clarification",
  "batch.issueOne": "1 issue",
  "batch.issues": "{count} issues",
  "batch.emDash": "—",

  "file.onePage": "{fileName} · 1 page",
  "file.pages": "{fileName} · {count} pages",

  "alert.choosePdfFirst": "Choose a PDF first, then plan batches.",
  "alert.choosePdf": "Choose a PDF file.",
  "alert.notPdf": "That file is not a PDF. Choose a textbook scan saved as PDF.",
  "alert.noPages": "This PDF has no pages to adapt.",
  "alert.couldNotRead": "Could not read that PDF. Try a different file.",
  "alert.needKey":
    "Paste a Gemini API key before adapting. The key is kept in this browser session only.",
  "alert.needModel": "Choose a model, or select Custom model and enter a model id.",
  "alert.needPdf": "Drop or choose a textbook PDF first.",
  "alert.couldNotSplit": "Could not split that PDF.",
  "alert.noClarify": "There is no batch waiting for clarification.",
  "alert.typeAnswer": "Type an answer so Gemini can finish this batch.",
  "alert.raw": "{raw}",

  "gemini.modelFlash38": "Gemini 3.8 Flash (recommended)",
  "gemini.model25Flash": "Gemini 2.5 Flash",
  "gemini.model25Pro": "Gemini 2.5 Pro",
  "gemini.model20Flash": "Gemini 2.0 Flash",
  "gemini.rateLimitRetrying": "Rate limited. Waiting, then retrying this batch.",
  "gemini.rateLimitExhausted": "This batch was rate limited after retries.",
  "gemini.unavailableRetrying":
    "Gemini is temporarily unavailable. Waiting, then retrying this batch.",
  "gemini.unavailableExhausted": "Gemini was temporarily unavailable after retries.",
  "gemini.cancelled": "Adaptation cancelled",
  "gemini.keyRejected": "API key was rejected. Check the key and try again.",
  "gemini.blocked": "Gemini blocked this batch: {reason}",
  "gemini.requestFailed": "Gemini request failed (HTTP {status}).",
  "gemini.unreachable":
    "Could not reach Gemini. If this page is blocked from calling Google, run python3 scripts/serve_adapter.py and use that local address, or set a proxy URL.",
  "gemini.empty": "Gemini returned empty text for this batch.",
  "gemini.failedAfterRetries": "Gemini request failed after retries.",

  "runControl.remainingNotSent": "Remaining batches were not sent because of this failure.",
  "runControl.cancelled": "Cancelled. Completed batches are still available to download.",
  "runControl.pagesFailed": "pages {range} failed: {error} {remaining}",
  "runControl.stopped":
    "Stopped after pages {range} failed. Retry that range, or Adapt book to resume remaining pending batches.",
  "runControl.retryingRateLimit":
    "pages {range}: Rate limited. Waiting {seconds}s, then retrying this batch.",
  "runControl.retryingUnavailable":
    "pages {range}: Gemini is temporarily unavailable. Waiting {seconds}s, then retrying this batch.",

  "pdf.libFailed": "pdf-lib failed to load. Check docs/vendor/pdf-lib.min.js.",
  "pdf.jszipFailed": "JSZip failed to load. Check docs/vendor/jszip.min.js.",
};
