#!/usr/bin/env python3
"""Orchestrate PDF splitting and Gemini interpretation for scans/."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from config import ACCESSIBLE_DIR, SCANS_DIR, STATE_FILE
from gemini_interpret import MissingApiKeyError, interpret_pdf_batch
from split_pdf import PageBatch, describe_plan, split_pdf


def load_state() -> dict:
    if not STATE_FILE.exists():
        return {"completed": {}}
    return json.loads(STATE_FILE.read_text(encoding="utf-8"))


def save_state(state: dict) -> None:
    SCANS_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


def list_scan_pdfs(selected: Path | None = None) -> list[Path]:
    if selected:
        path = selected.resolve()
        if not path.exists():
            raise FileNotFoundError(path)
        if path.suffix.lower() != ".pdf":
            raise ValueError(f"Expected a PDF file: {path}")
        return [path]

    pdfs = sorted(
        path
        for path in SCANS_DIR.glob("*.pdf")
        if path.is_file() and not path.name.startswith(".")
    )
    return pdfs


def output_path(batch: PageBatch, unit_prefix: str | None = None) -> Path:
    stem = batch.output_stem
    if unit_prefix:
        filename = f"{unit_prefix}_{stem}.md"
    else:
        filename = f"{stem}.md"
    return ACCESSIBLE_DIR / filename


def batch_key(source_pdf: Path, batch: PageBatch) -> str:
    return f"{source_pdf.name}:{batch.start_page}-{batch.end_page}"


def is_completed(state: dict, source_pdf: Path, batch: PageBatch, unit_prefix: str | None) -> bool:
    key = batch_key(source_pdf, batch)
    if key in state.get("completed", {}):
        return True
    return output_path(batch, unit_prefix).exists()


def mark_completed(state: dict, source_pdf: Path, batch: PageBatch, output_file: Path) -> None:
    state.setdefault("completed", {})[batch_key(source_pdf, batch)] = {
        "source_pdf": source_pdf.name,
        "start_page": batch.start_page,
        "end_page": batch.end_page,
        "output_file": str(output_file.relative_to(ACCESSIBLE_DIR.parent)),
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }


def run(
    *,
    dry_run: bool = False,
    selected_file: Path | None = None,
    unit_prefix: str | None = None,
    skip_interpret: bool = False,
) -> int:
    pdfs = list_scan_pdfs(selected_file)
    if not pdfs:
        print(f"No PDFs found in {SCANS_DIR}. Drop source files there first.")
        return 0

    ACCESSIBLE_DIR.mkdir(parents=True, exist_ok=True)
    state = load_state()
    planned = 0
    processed = 0
    skipped = 0

    for source_pdf in pdfs:
        ranges = describe_plan(source_pdf)
        print(f"\n{source_pdf.name}: {len(ranges)} batch(es)")
        batches = split_pdf(source_pdf) if not dry_run else []

        for index, page_range in enumerate(ranges):
            start, end = page_range
            batch = batches[index] if batches else PageBatch(
                source_pdf=source_pdf,
                start_page=start,
                end_page=end,
                batch_pdf=Path(f"batch-{start:03d}-{end:03d}.pdf"),
            )
            out_file = output_path(batch, unit_prefix)
            status = "pending"
            if is_completed(state, source_pdf, batch, unit_prefix):
                status = "done"
                skipped += 1
            planned += 1
            print(f"  {start:03d}-{end:03d} -> {out_file.name} [{status}]")

            if dry_run or status == "done":
                continue

            if skip_interpret:
                print("    split only (--skip-interpret)")
                continue

            try:
                markdown = interpret_pdf_batch(
                    batch.batch_pdf,
                    batch.start_page,
                    batch.end_page,
                )
            except MissingApiKeyError as exc:
                print(f"\nBlocker: {exc}")
                print("PDFs were split; re-run without --skip-interpret after setting the API key.")
                save_state(state)
                return 2

            out_file.write_text(markdown + "\n", encoding="utf-8")
            mark_completed(state, source_pdf, batch, out_file)
            processed += 1
            print(f"    wrote {out_file}")

    save_state(state)
    print(
        f"\nSummary: planned={planned}, processed={processed}, skipped={skipped}, dry_run={dry_run}"
    )
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned batches without writing accessible output",
    )
    parser.add_argument(
        "--file",
        type=Path,
        help="Process one PDF under scans/ or an absolute path",
    )
    parser.add_argument(
        "--unit-prefix",
        help="Prefix accessible filenames, e.g. adjectives",
    )
    parser.add_argument(
        "--skip-interpret",
        action="store_true",
        help="Split PDFs only; do not call Gemini",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    selected = args.file
    if selected and not selected.is_absolute():
        selected = SCANS_DIR / selected
    return run(
        dry_run=args.dry_run,
        selected_file=selected,
        unit_prefix=args.unit_prefix,
        skip_interpret=args.skip_interpret,
    )


if __name__ == "__main__":
    raise SystemExit(main())
