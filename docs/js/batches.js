/** Page-range planner. Must match scripts/split_pdf.py. */

export const MIN_PAGES_PER_BATCH = 5;
export const MAX_PAGES_PER_BATCH = 8;
export const DEFAULT_BATCH_SIZE = 6;

export function chooseBatchSize(totalPages, preferred = DEFAULT_BATCH_SIZE) {
  preferred = Math.max(MIN_PAGES_PER_BATCH, Math.min(MAX_PAGES_PER_BATCH, preferred));
  if (totalPages <= MAX_PAGES_PER_BATCH) {
    return totalPages;
  }

  let batchSize = preferred;
  while (batchSize >= MIN_PAGES_PER_BATCH) {
    const remainder = totalPages % batchSize;
    if (remainder === 0 || remainder >= MIN_PAGES_PER_BATCH) {
      return batchSize;
    }
    batchSize -= 1;
  }

  return MIN_PAGES_PER_BATCH;
}

export function planBatches(totalPages, preferred = DEFAULT_BATCH_SIZE) {
  if (totalPages <= 0) {
    return [];
  }

  const batchSize = chooseBatchSize(totalPages, preferred);
  const ranges = [];
  let start = 1;
  while (start <= totalPages) {
    let end = Math.min(start + batchSize - 1, totalPages);
    const remaining = totalPages - end;
    if (remaining > 0 && remaining < MIN_PAGES_PER_BATCH) {
      end = Math.min(totalPages, end + (MIN_PAGES_PER_BATCH - remaining));
    }
    ranges.push({ startPage: start, endPage: end });
    start = end + 1;
  }
  return ranges;
}

export function padPage(n) {
  return String(n).padStart(3, "0");
}

export function batchFileStem(startPage, endPage) {
  return `pages-${padPage(startPage)}-${padPage(endPage)}`;
}

export function batchPdfName(startPage, endPage) {
  return `batch-${padPage(startPage)}-${padPage(endPage)}.pdf`;
}
