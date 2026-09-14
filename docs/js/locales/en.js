/** English UI catalog for the textbook adapter. */

export const en = {
  "header.title": "Textbook Adapter",
  "header.skip": "Skip to main content",
  "header.eyebrow": "Accessible textbook prep",
  "header.lede":
    "Drop a scanned textbook PDF, choose a model, and download screen-reader-accessible markdown. Cloud keys stay in this browser session. Gemini can run from this page; Claude, OpenAI, and Ollama need the local adapter server.",

  "toolbar.displayOptions": "Display options",
  "toolbar.language": "Language",
  "toolbar.darkMode": "Dark mode",
  "header.languageHint":
    "Clarification questions and unreadable-word marks use this language. Printed lesson text stays in the language of the book.",

  "form.modelAccess": "Model access",
  "form.rememberKey": "Remember key this session",
  "form.model": "Model",
  "form.effort": "Effort",
  "form.customModel": "Custom model",
  "form.batchSize": "Preferred batch size",
  "form.latexMath": "Wrap math in LaTeX (for Nemeth)",
  "form.latexHint":
    "Off by default: math is spoken plain text. When checked, the model wraps math in LaTeX so it can later be converted to Nemeth.",
  "form.advanced": "Advanced: optional Gemini proxy URL",
  "form.proxyUrl": "Proxy URL",
  "form.proxyHint":
    "Gemini only. Leave blank to call Google from this browser. Set a proxy if this page cannot reach Google, using a host that forwards generateContent. Claude, OpenAI, and Ollama always use the local adapter routes.",

  "form.gemini.apiKey": "Gemini API key",
  "form.gemini.apiKeyHint":
    'Create a Gemini API key in <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio</a>. Required to adapt. Not written to disk. Session storage is used only if you check the box below.',
  "form.gemini.setupSummary": "How to connect Gemini 3.8 Flash",
  "form.gemini.setupStep1":
    'Open <a href="https://aistudio.google.com/apikey" rel="noopener noreferrer">Google AI Studio API keys</a> and sign in with the Google account that should be billed.',
  "form.gemini.setupStep2":
    "Create an API key in a Google Cloud project. If prompted, enable the <strong>Gemini API</strong> (Generative Language API) for that project.",
  "form.gemini.setupStep3":
    "Paste the key in the field above. Leave <strong>Model</strong> on Gemini 3.8 Flash. The Google API id is <code>gemini-3.8-flash</code>. Leave <strong>Effort</strong> on medium (recommended).",
  "form.gemini.setupStep4":
    "Do not type Cursor names such as <code>gemini-3.8-flash-medium</code> into Custom model. Those are not valid Google API ids; pick the model and effort separately.",
  "form.gemini.setupStep5":
    "If this page cannot reach Google from the browser, run <code>python3 scripts/serve_adapter.py</code> and set the proxy to <code>http://127.0.0.1:8000/api/gemini</code>.",
  "form.gemini.modelHint":
    "Use Gemini 3.8 Flash unless you need another provider. Cursor slugs are not API ids.",
  "form.gemini.effortHint": "Gemini thinking level. Medium is recommended for this OCR job.",

  "form.anthropic.apiKey": "Anthropic API key",
  "form.anthropic.apiKeyHint":
    'Create an Anthropic API key in <a href="https://console.anthropic.com/settings/keys" rel="noopener noreferrer">Anthropic Console</a>. Required to adapt. Not written to disk. Session storage is used only if you check the box below.',
  "form.anthropic.setupSummary": "How to connect Claude",
  "form.anthropic.setupStep1":
    'Open <a href="https://console.anthropic.com/settings/keys" rel="noopener noreferrer">Anthropic API keys</a> and sign in with the account that should be billed.',
  "form.anthropic.setupStep2":
    "Create an API key. The web adapter sends it only to the local server, which forwards to <code>api.anthropic.com</code>.",
  "form.anthropic.setupStep3":
    "Paste the key above. Recommended Claude model: Sonnet 5 (<code>claude-sonnet-5</code>). Leave <strong>Effort</strong> on medium (recommended). The API default is high; medium is cheaper for this OCR job.",
  "form.anthropic.setupStep4":
    "Do not type Cursor names such as <code>Sonnet 5 - high</code>. Model and effort are separate fields. Real API ids are <code>claude-sonnet-5</code> and <code>claude-opus-5</code>.",
  "form.anthropic.setupStep5":
    "Claude needs the local adapter. Run <code>python3 scripts/serve_adapter.py</code> and open that address. GitHub Pages cannot call Anthropic from the browser.",
  "form.anthropic.modelHint": "Claude needs the local adapter server. Medium effort is recommended.",
  "form.anthropic.effortHint":
    "Claude output effort. Medium is recommended; the API default is high.",

  "form.openai.apiKey": "OpenAI API key",
  "form.openai.apiKeyHint":
    'Create an OpenAI API key in <a href="https://platform.openai.com/api-keys" rel="noopener noreferrer">OpenAI platform</a>. Required to adapt. Not written to disk. Session storage is used only if you check the box below.',
  "form.openai.setupSummary": "How to connect GPT-5.6",
  "form.openai.setupStep1":
    'Open <a href="https://platform.openai.com/api-keys" rel="noopener noreferrer">OpenAI API keys</a> and sign in with the account that should be billed.',
  "form.openai.setupStep2":
    "Create an API key. The web adapter sends it only to the local server, which forwards to <code>api.openai.com</code>.",
  "form.openai.setupStep3":
    "Paste the key above. Recommended OpenAI model: GPT-5.6 Luna (<code>gpt-5.6-luna</code>). Leave <strong>Effort</strong> on low (recommended). The API default is medium.",
  "form.openai.setupStep4":
    "Do not type Cursor names such as <code>gpt-5.6-luna-high</code>. Model and effort are separate fields. Real API ids are <code>gpt-5.6-luna</code>, <code>gpt-5.6-terra</code>, and <code>gpt-5.6-sol</code>. Do not send a Pro reasoning mode.",
  "form.openai.setupStep5":
    "OpenAI needs the local adapter. Run <code>python3 scripts/serve_adapter.py</code> and open that address. GitHub Pages cannot call OpenAI from the browser.",
  "form.openai.modelHint": "GPT-5.6 needs the local adapter server. Low effort is recommended.",
  "form.openai.effortHint":
    "GPT-5.6 reasoning effort. Low is recommended; the API default is medium.",

  "form.ollama.apiKey": "Ollama does not use an API key",
  "form.ollama.apiKeyHint": "Ollama runs on this computer. No cloud API key is sent.",
  "form.ollama.setupSummary": "How to connect local Ollama",
  "form.ollama.setupStep1":
    "Install Ollama from <a href=\"https://ollama.com\" rel=\"noopener noreferrer\">ollama.com</a> and start it so it listens on port 11434.",
  "form.ollama.setupStep2":
    "Pull a <strong>vision</strong> model. Recommended for page text: <code>ollama pull qwen2.5vl</code>. Ollama’s current vision example is <code>gemma4</code>. A text-only model will ignore the page images.",
  "form.ollama.setupStep3":
    "Run <code>python3 scripts/serve_adapter.py</code> and open that local address. GitHub Pages cannot reach Ollama on your PC.",
  "form.ollama.setupStep4":
    "Choose <strong>Ollama (local vision)</strong>, confirm the URL is loopback (<code>http://127.0.0.1:11434</code>), then Refresh the model list. Leave <strong>Effort</strong> off. Local vision OCR does not benefit from extra thinking.",
  "form.ollama.setupStep5":
    "Quality is usually behind Gemini 3.8 Flash on two-column scans, small print, and math. Spot-check the first batch. Need enough RAM or VRAM for the vision checkpoint.",
  "form.ollama.modelHint": "Local vision models only. Refresh the list after you pull a tag.",
  "form.ollama.effortHint":
    "Local vision OCR does not benefit from extra thinking. Off is recommended.",
  "form.ollama.url": "Ollama URL",
  "form.ollama.urlHint":
    "Loopback only. The local adapter forwards to this address. GitHub Pages cannot reach Ollama on your PC.",
  "form.ollama.modelList": "Ollama vision model",
  "form.ollama.refresh": "Refresh",
  "form.ollama.customTag": "Custom Ollama tag",
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
    "Gemini paused this batch. It may already have started a transcription. Answer the question to continue; the draft and your answer go back to Gemini. Remaining pending batches wait until this one finishes. You can also retry from scratch without answering.",
  "clarify.draftHeading": "Draft so far",
  "clarify.answer": "Your answer",
  "clarify.continue": "Continue this batch",
  "clarify.retry": "Retry from scratch",
  "clarify.pages": "pages {range}",
  "clarify.missingQuestion": "Gemini asked a question but did not include the text.",

  "blank.heading": "Blank output — check original pages",
  "blank.hint":
    "Gemini returned no text for this batch. That can mean the source pages are blank, or that the model missed printed content. Compare the original pages, then skip them if they are blank or retry if they have lesson text. Retry tells Gemini a reviewer confirmed printed text, so it must transcribe these pages instead of returning empty. Remaining pending batches wait until you choose.",
  "blank.skip": "Skip as blank",
  "blank.retry": "Retry — pages have text",
  "blank.pages": "pages {range}",
  "blank.sourcePage": "Source page {page}",
  "blank.downloadPage": "Download source page {page}",
  "blank.downloadSuffix": " if you want the original PDF.",
  "blank.couldNotDraw": "Could not draw this page. Use the download link to inspect it.",
  "blank.loading": "Loading original pages…",
  "blank.scanAria": "Original scan of source page {page}",
  "blank.pdfGone": "The original PDF is no longer available in this session.",
  "blank.renderFailed":
    "Could not render original pages. Skip if they are blank, or retry if they have content.",

  "progress.heading": "Progress",
  "progress.batchesCompleted": "Batches completed",
  "progress.batchStatus": "Batch status",

  "status.loadPdf": "Load a PDF to plan batches. The model is not called until you adapt.",
  "status.raw": "{raw}",
  "status.plannedOne":
    "Planned 1 batch from {count} pages. The model is not called until you adapt.",
  "status.plannedMany":
    "Planned {batches} batches from {count} pages. The model is not called until you adapt.",
  "status.splitting": "Splitting the PDF into batches…",
  "status.noPending": "No pending batches. Retry a failed row, or download what already completed.",
  "status.batchProgress": "Batch {index} of {total}: pages {range}",
  "status.batchProgressEmptyRetry":
    "Batch {index} of {total}: pages {range}. Retrying after a reviewer confirmed printed text.",
  "status.batchRetry": "Batch {index} of {total}. {message}",
  "status.pausedClarify":
    "Paused on pages {range}. Gemini needs a clarification before that batch can finish.",
  "status.pausedBlank":
    "Paused on pages {range}. Gemini returned no text. Compare the original pages, then skip if they are blank or retry if they have content. Retry tells Gemini these pages have printed text.",
  "status.skippedBlankContinue":
    "Skipped pages {range} as blank. Continuing with remaining batches.",
  "status.skippedBlankFinished":
    "Skipped pages {range} as blank. Finished {done} of {total} batches.",
  "status.completedWithErrors":
    "{done} of {total} batches completed. Retry failed rows or download what finished.",
  "status.finished":
    "Finished {done} of {total} batches. You can download the accessible markdown.",
  "status.stopped": "Adaptation stopped.",

  "errors.heading": "Failed batches",
  "errors.hint":
    "A failed batch, a clarification question, or blank output stops the run. Remaining pending ranges are not sent. Rate limits wait and retry the current batch without stopping. Retry a failed row, answer a clarification, skip or retry blank output, or Adapt book to resume pending batches. Completed batches stay downloadable.",
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
  "batch.blank": "check original pages",
  "batch.skippedBlank": "skipped blank",
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
    "Paste an API key for this provider before adapting. The key is kept in this browser session only.",
  "alert.needModel": "Choose a model, or select Custom model and enter a model id.",
  "alert.needOllamaModel": "Choose or enter an Ollama vision model tag, such as qwen2.5vl.",
  "alert.needLocalServer":
    "Claude, OpenAI, and Ollama need the local adapter. Run python3 scripts/serve_adapter.py and open that address.",
  "alert.needPdf": "Drop or choose a textbook PDF first.",
  "alert.couldNotSplit": "Could not split that PDF.",
  "alert.noClarify": "There is no batch waiting for clarification.",
  "alert.noBlankReview": "There is no batch waiting for a blank-page review.",
  "alert.typeAnswer": "Type an answer so Gemini can finish this batch.",
  "alert.raw": "{raw}",

  "models.groupGemini": "Gemini",
  "models.groupClaude": "Claude",
  "models.groupOpenAI": "OpenAI",
  "models.groupOllama": "Ollama",
  "effort.none": "None",
  "effort.low": "Low",
  "effort.medium": "Medium",
  "effort.high": "High",
  "effort.xhigh": "Extra high",
  "effort.max": "Max",
  "effort.off": "Off",
  "effort.on": "On",
  "effort.recommended": "{label} (recommended)",

  "gemini.modelFlash38": "Gemini 3.8 Flash (recommended)",
  "gemini.model31Pro": "Gemini 3.1 Pro",
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

  "claude.modelSonnet5": "Claude Sonnet 5 (recommended)",
  "claude.modelOpus5": "Claude Opus 5",
  "anthropic.keyRejected": "Anthropic API key was rejected. Check the key and try again.",
  "anthropic.requestFailed": "Claude request failed (HTTP {status}).",
  "anthropic.unavailableRetrying":
    "Claude is temporarily unavailable. Waiting, then retrying this batch.",
  "anthropic.unavailableExhausted": "Claude was temporarily unavailable after retries.",
  "anthropic.failedAfterRetries": "Claude request failed after retries.",

  "openai.modelLuna": "GPT-5.6 Luna (recommended)",
  "openai.modelTerra": "GPT-5.6 Terra",
  "openai.modelSol": "GPT-5.6 Sol",
  "openai.keyRejected": "OpenAI API key was rejected. Check the key and try again.",
  "openai.requestFailed": "OpenAI request failed (HTTP {status}).",
  "openai.unavailableRetrying":
    "OpenAI is temporarily unavailable. Waiting, then retrying this batch.",
  "openai.unavailableExhausted": "OpenAI was temporarily unavailable after retries.",
  "openai.failedAfterRetries": "OpenAI request failed after retries.",

  "ollama.localVision": "Ollama (local vision)",
  "ollama.notLocal":
    "Ollama only works through the local adapter on this computer. GitHub Pages cannot reach Ollama on your PC. Run python3 scripts/serve_adapter.py.",
  "ollama.loopbackOnly":
    "The adapter only forwards to a loopback Ollama URL such as http://127.0.0.1:11434.",
  "ollama.requestFailed": "Ollama request failed (HTTP {status}).",
  "ollama.unavailableRetrying":
    "Ollama is temporarily unavailable. Waiting, then retrying this batch.",
  "ollama.unavailableExhausted": "Ollama was temporarily unavailable after retries.",
  "ollama.failedAfterRetries": "Ollama request failed after retries.",
  "ollama.noPages": "Could not rasterize PDF pages for Ollama.",
  "ollama.refreshFailed":
    "Could not list Ollama models. Confirm the local adapter is running and a vision model is pulled.",

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
