/**
 * Textbook Adapter UI. Imports the existing split, Gemini, validate,
 * download, and batch-planning modules. No framework.
 */

import { splitPdfBytes, inspectPdf, extractPagePdfs } from "./pdf-split.js";
import { renderPageCanvas } from "./pdf-preview.js";
import { transcribeBatch, MODEL_OPTIONS, DEFAULT_MODEL } from "./gemini.js";
import { parseClarify } from "./prompt.js";
import { validateMarkdown } from "./validate.js";
import { downloadCombined, downloadDocx, downloadZip } from "./download.js";
import { planBatches, padPage } from "./batches.js";
import { applyTranscriptionError, formatPageRange, formatRetryingStatus } from "./run-control.js";
import {
  isBlankBatchError,
  isBlankTranscription,
  pagePreviewFileName,
  skippedBlankMarkdown,
} from "./blank-pages.js";

const SESSION_KEY = "textbook-adapter-api-key";
const CUSTOM_MODEL_VALUE = "__custom__";

const els = {};
const state = {
  fileName: "",
  pageCount: 0,
  sourceBytes: null,
  batches: [],
  running: false,
  abortController: null,
  dragDepth: 0,
  lastSplitPreferred: null,
  lastClarifyKey: "",
  lastBlankKey: "",
  blankPreviewUrls: [],
  blankPreviewToken: 0,
};

function cacheElements() {
  els.form = document.getElementById("adapter-form");
  els.apiKey = document.getElementById("api-key");
  els.rememberKey = document.getElementById("remember-key");
  els.model = document.getElementById("model");
  els.customModelWrap = document.getElementById("custom-model-wrap");
  els.customModel = document.getElementById("custom-model");
  els.batchSize = document.getElementById("batch-size");
  els.proxyUrl = document.getElementById("proxy-url");
  els.dropZone = document.getElementById("drop-zone");
  els.pdfFile = document.getElementById("pdf-file");
  els.fileMeta = document.getElementById("file-meta");
  els.planBtn = document.getElementById("plan-btn");
  els.adaptBtn = document.getElementById("adapt-btn");
  els.cancelBtn = document.getElementById("cancel-btn");
  els.formAlert = document.getElementById("form-alert");
  els.status = document.getElementById("status");
  els.progressBar = document.getElementById("progress-bar");
  els.batchList = document.getElementById("batch-list");
  els.errorSection = document.getElementById("error-section");
  els.errorList = document.getElementById("error-list");
  els.downloadDocxBtn = document.getElementById("download-docx-btn");
  els.downloadMdBtn = document.getElementById("download-md-btn");
  els.downloadZipBtn = document.getElementById("download-zip-btn");
  els.latexMath = document.getElementById("latex-math");
  els.clarifySection = document.getElementById("clarify-section");
  els.clarifyMeta = document.getElementById("clarify-meta");
  els.clarifyQuestion = document.getElementById("clarify-question");
  els.clarifyAnswer = document.getElementById("clarify-answer");
  els.clarifyContinueBtn = document.getElementById("clarify-continue-btn");
  els.clarifyRetryBtn = document.getElementById("clarify-retry-btn");
  els.blankSection = document.getElementById("blank-section");
  els.blankMeta = document.getElementById("blank-meta");
  els.blankPages = document.getElementById("blank-pages");
  els.blankSkipBtn = document.getElementById("blank-skip-btn");
  els.blankRetryBtn = document.getElementById("blank-retry-btn");
}

function getPreferredBatchSize() {
  const value = Number(els.batchSize.value);
  const size = Number.isFinite(value) ? Math.round(value) : 6;
  return Math.max(5, Math.min(8, size));
}

function getModel() {
  if (els.model.value === CUSTOM_MODEL_VALUE) {
    return els.customModel.value.trim();
  }
  return (els.model.value || "").trim();
}

function getApiKey() {
  return els.apiKey.value.trim();
}

function setStatus(message) {
  els.status.textContent = message;
}

function setAlert(message) {
  if (!message) {
    els.formAlert.hidden = true;
    els.formAlert.textContent = "";
    return;
  }
  els.formAlert.hidden = false;
  els.formAlert.textContent = message;
}

function completedBatches() {
  return state.batches.filter((batch) => batch.status === "done" && batch.markdown);
}

function populateModelSelect() {
  els.model.replaceChildren();
  for (const option of MODEL_OPTIONS) {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    if (option.value === DEFAULT_MODEL) {
      node.selected = true;
    }
    els.model.append(node);
  }
  const custom = document.createElement("option");
  custom.value = CUSTOM_MODEL_VALUE;
  custom.textContent = "Custom model";
  els.model.append(custom);
  syncCustomModelField();
}

function syncCustomModelField() {
  const showCustom = els.model.value === CUSTOM_MODEL_VALUE;
  els.customModelWrap.hidden = !showCustom;
  els.customModel.disabled = !showCustom;
}

function persistApiKey() {
  if (els.rememberKey.checked && getApiKey()) {
    sessionStorage.setItem(SESSION_KEY, getApiKey());
    return;
  }
  sessionStorage.removeItem(SESSION_KEY);
}

function restoreApiKey() {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (!saved) {
    return;
  }
  els.apiKey.value = saved;
  els.rememberKey.checked = true;
}

function setRunning(running) {
  state.running = running;
  els.adaptBtn.disabled = running;
  els.planBtn.disabled = running;
  els.pdfFile.disabled = running;
  els.batchSize.disabled = running;
  els.model.disabled = running;
  els.customModel.disabled = running || els.model.value !== CUSTOM_MODEL_VALUE;
  els.latexMath.disabled = running;
  els.cancelBtn.disabled = !running;
  els.clarifyContinueBtn.disabled = running;
  els.clarifyRetryBtn.disabled = running;
  els.clarifyAnswer.disabled = running;
  els.blankSkipBtn.disabled = running;
  els.blankRetryBtn.disabled = running;
  els.form.setAttribute("aria-busy", running ? "true" : "false");
}

function renderProgress() {
  const total = state.batches.length || 1;
  const done = state.batches.filter((batch) => batch.status === "done").length;
  els.progressBar.max = total;
  els.progressBar.value = state.batches.length ? done : 0;
}

function renderBatchList() {
  els.batchList.replaceChildren();
  if (!state.batches.length) {
    const empty = document.createElement("li");
    empty.className = "batch-row";
    empty.textContent = "No batches planned yet.";
    els.batchList.append(empty);
    return;
  }

  for (const batch of state.batches) {
    const row = document.createElement("li");
    row.className = "batch-row";
    row.dataset.status = batch.status;

    const range = document.createElement("span");
    range.className = "batch-range";
    range.textContent = `pages ${formatPageRange(batch.startPage, batch.endPage)}`;

    const status = document.createElement("span");
    status.className = "batch-status";
    if (batch.status === "retrying") {
      status.textContent = "retrying";
    } else if (batch.status === "clarify") {
      status.textContent = "needs clarification";
    } else if (batch.status === "blank") {
      status.textContent = "check original pages";
    } else {
      status.textContent = batch.status;
    }

    const issues = document.createElement("span");
    issues.className = "batch-issues";
    if (batch.status === "done") {
      issues.textContent = batch.skippedBlank
        ? "skipped blank"
        : batch.issues.length === 1
          ? "1 issue"
          : `${batch.issues.length} issues`;
    } else {
      issues.textContent = "—";
    }

    row.append(range, status, issues);
    els.batchList.append(row);
  }
}

function renderErrors() {
  const failed = state.batches.filter((batch) => batch.status === "error");
  els.errorList.replaceChildren();
  els.errorSection.hidden = failed.length === 0;

  for (const batch of failed) {
    const item = document.createElement("li");
    item.className = "error-item";

    const text = document.createElement("p");
    text.textContent = `pages ${formatPageRange(batch.startPage, batch.endPage)}: ${batch.error || "This batch failed."}`;

    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry";
    retry.disabled = state.running;
    retry.addEventListener("click", () => retryBatch(batch));

    item.append(text, retry);
    els.errorList.append(item);
  }
}

function renderClarify() {
  const batch = state.batches.find((item) => item.status === "clarify");
  if (!batch) {
    els.clarifySection.hidden = true;
    state.lastClarifyKey = "";
    return;
  }

  const pageRange = formatPageRange(batch.startPage, batch.endPage);
  els.clarifySection.hidden = false;
  els.clarifyMeta.textContent = `pages ${pageRange}`;
  els.clarifyQuestion.textContent =
    batch.clarifyQuestion || "Gemini asked a question but did not include the text.";

  const key = `${batch.startPage}-${batch.endPage}-${batch.clarifyQuestion}`;
  if (key !== state.lastClarifyKey) {
    state.lastClarifyKey = key;
    els.clarifyAnswer.value = "";
    queueMicrotask(() => els.clarifyAnswer.focus());
  }
}

function revokeBlankPreviews() {
  for (const url of state.blankPreviewUrls) {
    URL.revokeObjectURL(url);
  }
  state.blankPreviewUrls = [];
}

async function appendBlankPagePreview(pageNumber, bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  state.blankPreviewUrls.push(url);

  const figure = document.createElement("figure");
  figure.className = "blank-page";

  const caption = document.createElement("figcaption");
  caption.textContent = `Source page ${padPage(pageNumber)}`;

  const fallback = document.createElement("p");
  fallback.className = "blank-page-fallback hint";
  const link = document.createElement("a");
  link.href = url;
  link.download = pagePreviewFileName(pageNumber);
  link.textContent = `Download source page ${padPage(pageNumber)}`;
  fallback.append(link, " if you want the original PDF.");

  figure.append(caption);
  try {
    const canvas = await renderPageCanvas(bytes);
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `Original scan of source page ${pageNumber}`);
    figure.append(canvas, fallback);
  } catch {
    const missing = document.createElement("p");
    missing.className = "hint";
    missing.textContent = "Could not draw this page. Use the download link to inspect it.";
    figure.append(missing, fallback);
  }
  els.blankPages.append(figure);
}

async function loadBlankPreviews(batch) {
  const token = ++state.blankPreviewToken;
  revokeBlankPreviews();
  els.blankPages.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "hint";
  loading.textContent = "Loading original pages…";
  els.blankPages.append(loading);

  try {
    const pdfBytes = batch.bytes || state.sourceBytes;
    if (!pdfBytes) {
      throw new Error("The original PDF is no longer available in this session.");
    }
    const pages = await extractPagePdfs(pdfBytes, batch.startPage, batch.endPage);
    if (token !== state.blankPreviewToken) {
      return;
    }
    els.blankPages.replaceChildren();
    for (const page of pages) {
      if (token !== state.blankPreviewToken) {
        return;
      }
      await appendBlankPagePreview(page.pageNumber, page.bytes);
    }
    if (!state.running) {
      queueMicrotask(() => els.blankSkipBtn.focus());
    }
  } catch (err) {
    if (token !== state.blankPreviewToken) {
      return;
    }
    els.blankPages.replaceChildren();
    const fail = document.createElement("p");
    fail.className = "hint";
    fail.textContent =
      err?.message ||
      "Could not render original pages. Skip if they are blank, or retry if they have content.";
    els.blankPages.append(fail);
  }
}

function hideBlankReview() {
  const alreadyHidden =
    els.blankSection.hidden && !state.lastBlankKey && state.blankPreviewUrls.length === 0;
  if (alreadyHidden) {
    return;
  }
  els.blankSection.hidden = true;
  state.lastBlankKey = "";
  state.blankPreviewToken += 1;
  revokeBlankPreviews();
  els.blankPages.replaceChildren();
}

function renderBlankReview() {
  const batch = state.batches.find((item) => item.status === "blank");
  if (!batch) {
    hideBlankReview();
    return;
  }

  const pageRange = formatPageRange(batch.startPage, batch.endPage);
  els.blankSection.hidden = false;
  els.blankMeta.textContent = `pages ${pageRange}`;

  const key = `${batch.startPage}-${batch.endPage}`;
  if (key !== state.lastBlankKey) {
    state.lastBlankKey = key;
    loadBlankPreviews(batch);
  }
}

function pauseForBlankReview(batch, pageRange) {
  batch.markdown = "";
  batch.issues = [];
  batch.status = "blank";
  batch.error = "";
  batch.clarifyQuestion = "";
  batch.skippedBlank = false;
  setAlert("");
  setStatus(
    `Paused on pages ${pageRange}. Gemini returned no text. Compare the original pages, then skip if they are blank or retry if they have content.`
  );
  render();
}

function renderDownloads() {
  const ready = completedBatches().length > 0 && !state.running;
  els.downloadDocxBtn.disabled = !ready;
  els.downloadMdBtn.disabled = !ready;
  els.downloadZipBtn.disabled = !ready;
}

function render() {
  if (state.fileName) {
    const pages = state.pageCount === 1 ? "1 page" : `${state.pageCount} pages`;
    els.fileMeta.textContent = `${state.fileName} · ${pages}`;
  } else {
    els.fileMeta.textContent = "No file loaded.";
  }
  renderProgress();
  renderBatchList();
  renderBlankReview();
  renderClarify();
  renderErrors();
  renderDownloads();
}

function resetBatchesFromRanges(ranges) {
  state.lastSplitPreferred = null;
  state.batches = ranges.map((range) => ({
    startPage: range.startPage,
    endPage: range.endPage,
    pageCount: range.endPage - range.startPage + 1,
    bytes: null,
    status: "pending",
    markdown: "",
    issues: [],
    error: "",
    clarifyQuestion: "",
    clarifyHistory: [],
    skippedBlank: false,
  }));
}

function planFromLoadedPdf() {
  if (!state.sourceBytes || !state.pageCount) {
    setAlert("Choose a PDF first, then plan batches.");
    return false;
  }
  const preferred = getPreferredBatchSize();
  els.batchSize.value = String(preferred);
  resetBatchesFromRanges(planBatches(state.pageCount, preferred));
  const count = state.batches.length;
  setAlert("");
  setStatus(
    count === 1
      ? `Planned 1 batch from ${state.pageCount} pages. Gemini is not called until you adapt.`
      : `Planned ${count} batches from ${state.pageCount} pages. Gemini is not called until you adapt.`
  );
  render();
  return true;
}

async function loadPdfFile(file) {
  if (!file) {
    setAlert("Choose a PDF file.");
    return;
  }
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    setAlert("That file is not a PDF. Choose a textbook scan saved as PDF.");
    return;
  }

  try {
    const info = await inspectPdf(file);
    state.fileName = info.fileName || file.name;
    state.pageCount = info.pageCount;
    state.sourceBytes = info.bytes;
    if (!state.pageCount) {
      setAlert("This PDF has no pages to adapt.");
      state.batches = [];
      render();
      return;
    }
    planFromLoadedPdf();
  } catch (err) {
    setAlert(err?.message || "Could not read that PDF. Try a different file.");
  }
}

function mergeSplitBatches(split) {
  state.batches = split.map((item) => {
    const previous = state.batches.find(
      (batch) => batch.startPage === item.startPage && batch.endPage === item.endPage
    );
    const inFlight = previous?.status === "running" || previous?.status === "retrying";
    const status = previous?.status && !inFlight ? previous.status : "pending";
    return {
      startPage: item.startPage,
      endPage: item.endPage,
      pageCount: item.pageCount,
      bytes: item.bytes,
      status,
      markdown: previous?.markdown || "",
      issues: previous?.issues || [],
      error: previous?.error || "",
      clarifyQuestion: previous?.clarifyQuestion || "",
      clarifyHistory: previous?.clarifyHistory || [],
      skippedBlank: Boolean(previous?.skippedBlank),
    };
  });
}

async function ensureBatchBytes() {
  const preferred = getPreferredBatchSize();
  const needsSplit =
    state.lastSplitPreferred !== preferred || state.batches.some((batch) => !batch.bytes);
  if (!needsSplit) {
    return;
  }
  setStatus("Splitting the PDF into batches…");
  const { pageCount, batches } = await splitPdfBytes(state.sourceBytes, preferred);
  state.pageCount = pageCount;
  state.lastSplitPreferred = preferred;
  mergeSplitBatches(batches);
  render();
}

async function runAdaptation({ retryOnly = null } = {}) {
  if (state.running) {
    return;
  }

  const apiKey = getApiKey();
  const model = getModel();
  if (!apiKey) {
    setAlert("Paste a Gemini API key before adapting. The key is kept in this browser session only.");
    els.apiKey.focus();
    return;
  }
  if (!model) {
    setAlert("Choose a model, or select Custom model and enter a model id.");
    (els.model.value === CUSTOM_MODEL_VALUE ? els.customModel : els.model).focus();
    return;
  }
  if (!state.sourceBytes) {
    setAlert("Drop or choose a textbook PDF first.");
    return;
  }

  persistApiKey();
  setAlert("");
  state.abortController = new AbortController();
  const latexMath = Boolean(els.latexMath.checked);
  setRunning(true);

  try {
    await ensureBatchBytes();
    if (retryOnly) {
      const target = state.batches.find(
        (batch) => batch.startPage === retryOnly.startPage && batch.endPage === retryOnly.endPage
      );
      if (target) {
        target.status = "pending";
        target.error = "";
      }
    }

    const queue = state.batches.filter((batch) => batch.status === "pending");
    if (!queue.length) {
      setStatus("No pending batches. Retry a failed row, or download what already completed.");
      render();
      return;
    }

    const total = state.batches.length;
    for (let index = 0; index < state.batches.length; index += 1) {
      const batch = state.batches[index];
      if (batch.status !== "pending") {
        continue;
      }

      batch.status = "running";
      batch.error = "";
      const pageRange = formatPageRange(batch.startPage, batch.endPage);
      setStatus(`Batch ${index + 1} of ${total}: pages ${pageRange}`);
      render();

      for (;;) {
        try {
          const markdown = await transcribeBatch({
            apiKey,
            model,
            startPage: batch.startPage,
            endPage: batch.endPage,
            pdfBytes: batch.bytes,
            proxyUrl: els.proxyUrl.value.trim(),
            signal: state.abortController.signal,
            latexMath,
            clarifyHistory: batch.clarifyHistory || [],
            onRetry({ waitMs, httpStatus }) {
              batch.status = "retrying";
              batch.error = "";
              setAlert("");
              setStatus(
                `Batch ${index + 1} of ${total}. ${formatRetryingStatus(pageRange, waitMs, httpStatus)}`
              );
              render();
            },
          });
          const clarifyQuestion = parseClarify(markdown);
          if (clarifyQuestion !== null) {
            batch.markdown = "";
            batch.issues = [];
            batch.clarifyQuestion = clarifyQuestion;
            batch.status = "clarify";
            batch.error = "";
            setAlert("");
            setStatus(
              `Paused on pages ${pageRange}. Gemini needs a clarification before that batch can finish.`
            );
            render();
            return;
          }
          if (isBlankTranscription(markdown)) {
            pauseForBlankReview(batch, pageRange);
            return;
          }
          batch.markdown = markdown;
          batch.issues = validateMarkdown(markdown, `pages-${pageRange}`, { latexMath });
          batch.status = "done";
          batch.error = "";
          batch.clarifyQuestion = "";
          batch.skippedBlank = false;
          break;
        } catch (err) {
          if (isBlankBatchError(err)) {
            pauseForBlankReview(batch, pageRange);
            return;
          }
          const outcome = applyTranscriptionError(batch, err);
          if (outcome.kind === "retry") {
            batch.status = "retrying";
            batch.error = "";
            setAlert("");
            setStatus(`Batch ${index + 1} of ${total}. ${outcome.statusMessage}`);
            render();
            continue;
          }
          batch.status = outcome.batchStatus;
          batch.error = outcome.error;
          if (outcome.kind === "cancel") {
            setAlert("");
            setStatus(outcome.statusMessage);
            render();
            return;
          }
          setAlert(outcome.alertMessage);
          setStatus(outcome.statusMessage);
          render();
          return;
        }
      }
      render();
    }

    const done = completedBatches().length;
    const failed = state.batches.filter((batch) => batch.status === "error").length;
    if (failed) {
      setStatus(`${done} of ${total} batches completed. Retry failed rows or download what finished.`);
    } else {
      setStatus(`Finished ${done} of ${total} batches. You can download the accessible markdown.`);
    }
    render();
  } catch (err) {
    setAlert(err?.message || "Could not split that PDF.");
    setStatus("Adaptation stopped.");
  } finally {
    state.abortController = null;
    setRunning(false);
    render();
  }
}

function retryBatch(batch) {
  if (state.running) {
    return;
  }
  batch.status = "pending";
  batch.error = "";
  batch.clarifyQuestion = "";
  batch.clarifyHistory = [];
  batch.skippedBlank = false;
  hideBlankReview();
  render();
  runAdaptation({ retryOnly: batch });
}

function skipBlankBatch() {
  if (state.running) {
    return;
  }
  const batch = state.batches.find((item) => item.status === "blank");
  if (!batch) {
    setAlert("There is no batch waiting for a blank-page review.");
    return;
  }
  const pageRange = formatPageRange(batch.startPage, batch.endPage);
  const latexMath = Boolean(els.latexMath.checked);
  batch.markdown = skippedBlankMarkdown(batch.startPage, batch.endPage);
  batch.issues = validateMarkdown(batch.markdown, `pages-${pageRange}`, { latexMath });
  batch.status = "done";
  batch.error = "";
  batch.skippedBlank = true;
  hideBlankReview();
  setAlert("");
  const pending = state.batches.some((item) => item.status === "pending");
  if (pending) {
    setStatus(`Skipped pages ${pageRange} as blank. Continuing with remaining batches.`);
    render();
    runAdaptation();
    return;
  }
  const done = completedBatches().length;
  const total = state.batches.length;
  setStatus(`Skipped pages ${pageRange} as blank. Finished ${done} of ${total} batches.`);
  render();
}

function retryBlankBatch() {
  const batch = state.batches.find((item) => item.status === "blank");
  if (!batch) {
    return;
  }
  retryBatch(batch);
}

function continueClarify() {
  if (state.running) {
    return;
  }
  const batch = state.batches.find((item) => item.status === "clarify");
  if (!batch) {
    setAlert("There is no batch waiting for clarification.");
    return;
  }
  const answer = els.clarifyAnswer.value.trim();
  if (!answer) {
    setAlert("Type an answer so Gemini can finish this batch.");
    els.clarifyAnswer.focus();
    return;
  }
  batch.clarifyHistory = [
    ...(batch.clarifyHistory || []),
    { question: batch.clarifyQuestion, answer },
  ];
  batch.status = "pending";
  batch.error = "";
  batch.clarifyQuestion = "";
  els.clarifyAnswer.value = "";
  setAlert("");
  runAdaptation({ retryOnly: batch });
}

function retryClarifyFromScratch() {
  const batch = state.batches.find((item) => item.status === "clarify");
  if (!batch) {
    return;
  }
  retryBatch(batch);
}

function cancelAdaptation() {
  state.abortController?.abort();
}

function onDrop(event) {
  event.preventDefault();
  state.dragDepth = 0;
  els.dropZone.classList.remove("is-dragover");
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    els.pdfFile.files = event.dataTransfer.files;
    loadPdfFile(file);
  }
}

function bindEvents() {
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    runAdaptation();
  });
  els.planBtn.addEventListener("click", () => {
    planFromLoadedPdf();
  });
  els.cancelBtn.addEventListener("click", cancelAdaptation);
  els.clarifyContinueBtn.addEventListener("click", continueClarify);
  els.clarifyRetryBtn.addEventListener("click", retryClarifyFromScratch);
  els.blankSkipBtn.addEventListener("click", skipBlankBatch);
  els.blankRetryBtn.addEventListener("click", retryBlankBatch);
  els.model.addEventListener("change", syncCustomModelField);
  els.apiKey.addEventListener("input", persistApiKey);
  els.rememberKey.addEventListener("change", persistApiKey);
  els.pdfFile.addEventListener("change", () => {
    const file = els.pdfFile.files?.[0];
    if (file) {
      loadPdfFile(file);
    }
  });
  els.batchSize.addEventListener("change", () => {
    if (state.running || !state.sourceBytes) {
      return;
    }
    const hasWork = state.batches.some(
      (batch) =>
        batch.status === "done" ||
        batch.status === "error" ||
        batch.status === "clarify" ||
        batch.status === "blank"
    );
    if (!hasWork) {
      planFromLoadedPdf();
    }
  });

  els.dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    state.dragDepth += 1;
    els.dropZone.classList.add("is-dragover");
  });
  els.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  els.dropZone.addEventListener("dragleave", () => {
    state.dragDepth -= 1;
    if (state.dragDepth <= 0) {
      state.dragDepth = 0;
      els.dropZone.classList.remove("is-dragover");
    }
  });
  els.dropZone.addEventListener("drop", onDrop);

  els.downloadDocxBtn.addEventListener("click", async () => {
    const results = completedBatches();
    if (results.length) {
      await downloadDocx(results, state.fileName || "textbook.pdf");
    }
  });
  els.downloadMdBtn.addEventListener("click", () => {
    const results = completedBatches();
    if (results.length) {
      downloadCombined(results, state.fileName || "textbook.pdf");
    }
  });
  els.downloadZipBtn.addEventListener("click", async () => {
    const results = completedBatches();
    if (results.length) {
      await downloadZip(results, state.fileName || "textbook.pdf");
    }
  });
}

cacheElements();
populateModelSelect();
restoreApiKey();
bindEvents();
render();
