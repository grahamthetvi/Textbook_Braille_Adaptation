"""Split PDFs into 5-8 page batches for subagent interpretation."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader, PdfWriter

from config import BATCHES_DIR, MAX_PAGES_PER_BATCH, MIN_PAGES_PER_BATCH


@dataclass(frozen=True)
class PageBatch:
    source_pdf: Path
    start_page: int  # 1-based inclusive
    end_page: int  # 1-based inclusive
    batch_pdf: Path

    @property
    def page_count(self) -> int:
        return self.end_page - self.start_page + 1

    @property
    def output_stem(self) -> str:
        return f"pages-{self.start_page:03d}-{self.end_page:03d}"


def choose_batch_size(total_pages: int, preferred: int = 6) -> int:
    """Pick a batch size between MIN and MAX that divides work evenly enough."""
    preferred = max(MIN_PAGES_PER_BATCH, min(MAX_PAGES_PER_BATCH, preferred))
    if total_pages <= MAX_PAGES_PER_BATCH:
        return total_pages

    batch_size = preferred
    while batch_size >= MIN_PAGES_PER_BATCH:
        remainder = total_pages % batch_size
        if remainder == 0 or remainder >= MIN_PAGES_PER_BATCH:
            return batch_size
        batch_size -= 1

    return MIN_PAGES_PER_BATCH


def plan_batches(total_pages: int, preferred: int = 6) -> list[tuple[int, int]]:
    """Return inclusive 1-based (start, end) page ranges covering the PDF."""
    if total_pages <= 0:
        return []

    batch_size = choose_batch_size(total_pages, preferred)
    ranges: list[tuple[int, int]] = []
    start = 1
    while start <= total_pages:
        end = min(start + batch_size - 1, total_pages)
        remaining = total_pages - end
        if remaining > 0 and remaining < MIN_PAGES_PER_BATCH:
            # Borrow pages from the current batch so the tail is not too small.
            end = min(total_pages, end + (MIN_PAGES_PER_BATCH - remaining))
        ranges.append((start, end))
        start = end + 1
    return ranges


def split_pdf(
    source_pdf: Path,
    output_dir: Path | None = None,
    preferred_batch_size: int = 6,
) -> list[PageBatch]:
    """Write batch PDFs and return metadata for each batch."""
    source_pdf = source_pdf.resolve()
    reader = PdfReader(str(source_pdf))
    total_pages = len(reader.pages)
    if total_pages == 0:
        raise ValueError(f"{source_pdf} has no pages")

    batch_root = output_dir or (BATCHES_DIR / source_pdf.stem)
    batch_root.mkdir(parents=True, exist_ok=True)

    batches: list[PageBatch] = []
    for start, end in plan_batches(total_pages, preferred_batch_size):
        writer = PdfWriter()
        for page_index in range(start - 1, end):
            writer.add_page(reader.pages[page_index])

        batch_name = f"batch-{start:03d}-{end:03d}.pdf"
        batch_pdf = batch_root / batch_name
        with batch_pdf.open("wb") as handle:
            writer.write(handle)

        batches.append(
            PageBatch(
                source_pdf=source_pdf,
                start_page=start,
                end_page=end,
                batch_pdf=batch_pdf,
            )
        )
    return batches


def describe_plan(source_pdf: Path, preferred_batch_size: int = 6) -> list[tuple[int, int]]:
    reader = PdfReader(str(source_pdf))
    return plan_batches(len(reader.pages), preferred_batch_size)
