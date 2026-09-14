/** English UI catalog. Keys must stay in sync with es.js and ar.js. */

export const en = {
  "header.title": "Textbook Adapter",
  "header.eyebrow": "Accessible textbook prep",
  "header.lede":
    "Drop a scanned textbook PDF, paste a Gemini API key, and download screen-reader-accessible markdown. The key stays in this browser session and is sent only to Google Gemini, or to an optional proxy you set.",
  "header.skipLink": "Skip to main content",
  "header.toolbarLabel": "Language and display",
  "header.language": "Language",
  "header.languageHint":
    "Gemini asks clarification questions in this language and marks unreadable words in this language. Printed lesson text stays in the language of the book.",
  "header.themeDark": "Night mode",
  "header.themeLight": "Day mode",

  "form.geminiAccess": "Gemini access",
  "form.apiKey": "Gemini API key",
  "form.apiKeyHintHtml":
    'Create a Gemini API key in <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio</a>. Required to adapt. Not written to disk. Session storage is used only if you check the box below.',
  "form.setupSummary": "How to connect Gemini 3.8 Flash",
  "form.setupStep1Html":
    'Open <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio API keys</a> and sign in with the Google account that should be billed.',
  "form.setupStep2Html":
    "Create an API key in a Google Cloud project. If prompted, enable the <strong>Gemini API</strong> (Generative Language API) for that project.",
  "form.setupStep3Html":
    "Paste the key in the field above. Leave <strong>Model</strong> on Gemini 3.8 Flash. The Google API id is <code>gemini-3.8-flash</code>.",
  "form.setupStep4Html":
    "Do not type Cursor names such as <code>gemini-3.8-flash-medium</code> into Custom model. Those are not valid Google API ids.",
  "form.setupStep5Html":
    "If this page cannot reach Google from the browser, run <code>python3 scripts/serve_adapter.py</code> and set the proxy to <code>http://127.0.0.1:8000/api/gemini</code>.",
  "form.rememberKey": "Remember key this session",
  "form.model": "Model",
  "form.modelHint": "Use Gemini 3.8 Flash unless an older key cannot call that model.",
  "form.customModel": "Custom model",
  "form.batchSize": "Preferred batch size",
  "form.latexMath": "Wrap math in LaTeX (for Nemeth)",
  "form.latexHint":
    "Off by default: math is spoken plain text. When checked, Gemini wraps math in LaTeX so it can later be converted to Nemeth.",
  "form.advancedSummary": "Advanced: optional proxy URL",
  "form.proxyUrl": "Proxy URL",
  "form.proxyHint":
    "Leave blank to call Google Gemini from this browser. Set a proxy if this page cannot reach Google, using a host that forwards generateContent.",
  "form.pdfLegend": "Textbook PDF",
  "form.dropLead": "Drop a textbook PDF here",
  "form.dropOr": "or",
  "form.filePicker": "PDF file",
  "form.noFile": "No file loaded.",
  "form.planBatches": "Plan batches",
  "form.adaptBook": "Adapt book",
  "form.cancel": "Cancel",
  "form.fileMeta": "{fileName} · {pages}",
  "form.pageOne": "1 page",
  "form.pageMany": "{count} pages",

  "status.idle": "Load a PDF to plan batches. Gemini is not called until you adapt.",
  "status.plannedOne":
    "Planned 1 batch from {pageCount} pages. Gemini is not called until you adapt.",
  "status.plannedMany":
    "Planned {count} batches from {pageCount} pages. Gemini is not called until you adapt.",
  "status.splitting": "Splitting the PDF into batches…",
  "status.batchProgress": "Batch {index} of {total}: pages {pageRange}",
  "status.batchRetrying": "Batch {index} of {total}. {detail}",
  "status.pausedClarify":
    "Paused on pages {pageRange}. Gemini needs a clarification before that batch can finish.",
  "status.pausedBlank":
    "Paused on pages {pageRange}. Gemini returned no text. Compare the original pages, then skip if they are blank or retry if they have content.",
  "status.noPending": "No pending batches. Retry a failed row, or download what already completed.",
  "status.finishedFailed":
    "{done} of {total} batches completed. Retry failed rows or download what finished.",
  "status.finishedOk":
    "Finished {done} of {total} batches. You can download the accessible markdown.",
  "status.stopped": "Adaptation stopped.",
  "status.skippedContinue":
    "Skipped pages {pageRange} as blank. Continuing with remaining batches.",
  "status.skippedFinished":
    "Skipped pages {pageRange} as blank. Finished {done} of {total} batches.",

  "errors.choosePdfFirst": "Choose a PDF first, then plan batches.",
  "errors.choosePdfFile": "Choose a PDF file.",
  "errors.notPdf": "That file is not a PDF. Choose a textbook scan saved as PDF.",
  "errors.noPages": "This PDF has no pages to adapt.",
  "errors.readPdf": "Could not read that PDF. Try a different file.",
  "errors.needApiKey":
    "Paste a Gemini API key before adapting. The key is kept in this browser session only.",
  "errors.needModel": "Choose a model, or select Custom model and enter a model id.",
  "errors.needPdf": "Drop or choose a textbook PDF first.",
  "errors.splitPdf": "Could not split that PDF.",
  "errors.noBlankReview": "There is no batch waiting for a blank-page review.",
  "errors.noClarify": "There is no batch waiting for clarification.",
  "errors.needClarifyAnswer": "Type an answer so Gemini can finish this batch.",
  "errors.batchFailed": "This batch failed.",
  "errors.failedRow": "pages {pageRange}: {error}",
  "errors.heading": "Failed batches",
  "errors.hint":
    "A failed batch, a clarification question, or blank output stops the run. Remaining pending ranges are not sent. Rate limits wait and retry the current batch without stopping. Retry a failed row, answer a clarification, skip or retry blank output, or Adapt book to resume pending batches. Completed batches stay downloadable.",
  "errors.retry": "Retry",

  "blank.heading": "Blank output — check original pages",
  "blank.hint":
    "Gemini returned no text for this batch. That can mean the source pages are blank, or that the model missed printed content. Compare the original pages, then skip them if they are blank or retry if they have lesson text. Remaining pending batches wait until you choose.",
  "blank.skip": "Skip as blank",
  "blank.retry": "Retry this batch",
  "blank.sourcePage": "Source page {page}",
  "blank.downloadPage": "Download source page {page}",
  "blank.downloadSuffix": " if you want the original PDF.",
  "blank.ariaLabel": "Original scan of source page {page}",
  "blank.drawFail": "Could not draw this page. Use the download link to inspect it.",
  "blank.loading": "Loading original pages…",
  "blank.noPdf": "The original PDF is no longer available in this session.",
  "blank.renderFail":
    "Could not render original pages. Skip if they are blank, or retry if they have content.",
  "blank.emptyMessage": "Gemini returned empty text for this batch.",
  "blank.pages": "pages {pageRange}",

  "clarify.heading": "Clarification needed",
  "clarify.hint":
    "Gemini paused this batch. It may already have started a transcription. Answer the question to continue; the draft and your answer go back to Gemini. Remaining pending batches wait until this one finishes. You can also retry from scratch without answering.",
  "clarify.draftHeading": "Draft so far",
  "clarify.answer": "Your answer",
  "clarify.continue": "Continue this batch",
  "clarify.retry": "Retry from scratch",
  "clarify.missingQuestion": "Gemini asked a question but did not include the text.",
  "clarify.pages": "pages {pageRange}",

  "issues.heading": "Style issues",
  "issues.hint":
    "After a batch finishes, forbidden characters such as ampersand, asterisk, number-sign, square brackets, and braces are listed here. They do not stop the run. Click a count in Progress to jump to that range. Unreadable words appear as (unclear) in English, (poco claro) in Spanish, or (غير واضح) in Arabic, matching the site language.",

  "download.heading": "Download",
  "download.hint":
    "Downloads include completed batches only, even if some rows still need a retry.",
  "download.docx": "Download Word document",
  "download.markdown": "Download combined markdown",
  "download.zip": "Download zip",

  "progress.heading": "Progress",
  "progress.label": "Batches completed",
  "progress.batchListLabel": "Batch status",
  "progress.noBatches": "No batches planned yet.",
  "progress.pages": "pages {pageRange}",
  "progress.retrying": "retrying",
  "progress.clarify": "needs clarification",
  "progress.blank": "check original pages",
  "progress.pending": "pending",
  "progress.running": "running",
  "progress.done": "done",
  "progress.error": "error",
  "progress.skippedBlank": "skipped blank",
  "progress.issueOne": "1 issue",
  "progress.issueMany": "{count} issues",
  "progress.dash": "—",

  "gemini.modelFlash38": "Gemini 3.8 Flash (recommended)",
  "gemini.modelFlash25": "Gemini 2.5 Flash",
  "gemini.modelPro25": "Gemini 2.5 Pro",
  "gemini.modelFlash20": "Gemini 2.0 Flash",
  "gemini.rateLimitRetrying": "Rate limited. Waiting, then retrying this batch.",
  "gemini.rateLimitExhausted": "This batch was rate limited after retries.",
  "gemini.unavailableRetrying":
    "Gemini is temporarily unavailable. Waiting, then retrying this batch.",
  "gemini.unavailableExhausted": "Gemini was temporarily unavailable after retries.",
  "gemini.apiKeyRejected": "API key was rejected. Check the key and try again.",
  "gemini.blocked": "Gemini blocked this batch: {reason}",
  "gemini.requestFailed": "Gemini request failed (HTTP {status}).",
  "gemini.unreachable":
    "Could not reach Gemini. If this page is blocked from calling Google, run python3 scripts/serve_adapter.py and use that local address, or set a proxy URL.",
  "gemini.failedRetries": "Gemini request failed after retries.",
  "gemini.cancelled": "Adaptation cancelled",

  "runControl.remainingNotSent": "Remaining batches were not sent because of this failure.",
  "runControl.cancelled": "Cancelled. Completed batches are still available to download.",
  "runControl.failedAlert": "pages {pageRange} failed: {error} {remaining}",
  "runControl.stoppedStatus":
    "Stopped after pages {pageRange} failed. Retry that range, or Adapt book to resume remaining pending batches.",
  "runControl.retryingRateLimit":
    "pages {pageRange}: Rate limited. Waiting {seconds}s, then retrying this batch.",
  "runControl.retryingUnavailable":
    "pages {pageRange}: Gemini is temporarily unavailable. Waiting {seconds}s, then retrying this batch.",
};
