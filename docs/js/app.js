/**
 * Textbook Adapter UI. Imports the existing split, Gemini, validate,
 * download, and batch-planning modules. No framework.
 */

import { splitPdfBytes, inspectPdf } from "./pdf-split.js";
import { transcribeBatch, MODEL_OPTIONS, DEFAULT_MODEL } from "./gemini.js";
import { validateMarkdown } from "./validate.js";
import { downloadCombined, downloadZip } from "./download.js";
import { planBatches } from "./batches.js";
import { applyTranscriptionError, formatPageRange, formatRetryingStatus } from "./run-control.js";

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
  els.downloadMdBtn = document.getElementById("download-md-btn");
  els.downloadZipBtn = document.getElementById("download-zip-btn");
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
  els.cancelBtn.disabled = !running;
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
    status.textContent = batch.status === "retrying" ? "retrying" : batch.status;

    const issues = document.createElement("span");
    issues.className = "batch-issues";
    if (batch.status === "done") {
      const count = batch.issues.length;
      issues.textContent = count === 1 ? "1 issue" : `${count} issues`;
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

function renderDownloads() {
  const ready = completedBatches().length > 0 && !state.running;
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
          batch.markdown = markdown;
          batch.issues = validateMarkdown(markdown, `pages-${pageRange}`);
          batch.status = "done";
          batch.error = "";
          break;
        } catch (err) {
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
  render();
  runAdaptation({ retryOnly: batch });
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
      (batch) => batch.status === "done" || batch.status === "error"
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
