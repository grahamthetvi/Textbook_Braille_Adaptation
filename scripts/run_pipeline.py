#!/usr/bin/env python3
"""Orchestrate PDF splitting and pipeline state for scans/.

Interpretation is performed by Cursor subagents (Gemini model), not direct API
calls. Run this script to split PDFs and inspect pending work; delegate each
batch to a subagent per .cursor/skills/interpret-batch/SKILL.md.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from config import ACCESSIBLE_DIR, BATCHES_DIR, SCANS_DIR, STATE_FILE
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


def batch_pdf_path(source_pdf: Path, batch: PageBatch) -> Path:
    return BATCHES_DIR / source_pdf.stem / batch.batch_pdf.name


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


def make_batch(source_pdf: Path, start: int, end: int) -> PageBatch:
    return PageBatch(
        source_pdf=source_pdf,
        start_page=start,
        end_page=end,
        batch_pdf=Path(f"batch-{start:03d}-{end:03d}.pdf"),
    )


def planned_batches(
    source_pdf: Path,
    state: dict,
    unit_prefix: str | None,
) -> list[dict]:
    """Return batch metadata for one source PDF without splitting."""
    entries: list[dict] = []
    for start, end in describe_plan(source_pdf):
        batch = make_batch(source_pdf, start, end)
        done = is_completed(state, source_pdf, batch, unit_prefix)
        entries.append(
            {
                "source_pdf": source_pdf.name,
                "start_page": start,
                "end_page": end,
                "batch_pdf": str(batch_pdf_path(source_pdf, batch)),
                "output_file": output_path(batch, unit_prefix).name,
                "output_path": str(output_path(batch, unit_prefix)),
                "status": "done" if done else "pending",
            }
        )
    return entries


def sync_state_from_outputs(
    *,
    selected_file: Path | None = None,
    unit_prefix: str | None = None,
) -> int:
    """Update pipeline state for batches whose accessible output already exists."""
    pdfs = list_scan_pdfs(selected_file)
    state = load_state()
    synced = 0

    for source_pdf in pdfs:
        for start, end in describe_plan(source_pdf):
            batch = make_batch(source_pdf, start, end)
            out_file = output_path(batch, unit_prefix)
            key = batch_key(source_pdf, batch)
            if out_file.exists() and key not in state.get("completed", {}):
                mark_completed(state, source_pdf, batch, out_file)
                synced += 1

    save_state(state)
    return synced


def build_status(
    *,
    selected_file: Path | None = None,
    unit_prefix: str | None = None,
) -> dict:
    pdfs = list_scan_pdfs(selected_file)
    state = load_state()
    sources: list[dict] = []
    total_batches = 0
    done_batches = 0
    pending_batches = 0
    pending: list[dict] = []

    for source_pdf in pdfs:
        batches = planned_batches(source_pdf, state, unit_prefix)
        done = sum(1 for batch in batches if batch["status"] == "done")
        batch_pending = len(batches) - done
        total_batches += len(batches)
        done_batches += done
        pending_batches += batch_pending
        for batch in batches:
            if batch["status"] == "pending":
                pending.append(batch)
        sources.append(
            {
                "source_pdf": source_pdf.name,
                "batch_count": len(batches),
                "done": done,
                "pending": batch_pending,
                "batches": batches,
            }
        )

    blockers: list[str] = []
    if not pdfs:
        blockers.append(f"No PDFs found in {SCANS_DIR}")

    return {
        "interpretation_mode": "cursor_subagent",
        "scans_dir": str(SCANS_DIR),
        "accessible_dir": str(ACCESSIBLE_DIR),
        "batches_dir": str(BATCHES_DIR),
        "state_file": str(STATE_FILE),
        "source_count": len(pdfs),
        "total_batches": total_batches,
        "done_batches": done_batches,
        "pending_batches": pending_batches,
        "pending": pending,
        "sources": sources,
        "blockers": blockers,
    }


def print_status(status: dict, *, as_json: bool) -> None:
    if as_json:
        print(json.dumps(status, indent=2))
        return

    if status["source_count"] == 0:
        print(f"No PDFs found in {SCANS_DIR}. Drop source files there first.")
        return

    print(
        f"Pipeline status: {status['done_batches']}/{status['total_batches']} batches done, "
        f"{status['pending_batches']} pending"
    )
    print(f"Interpretation mode: {status['interpretation_mode']} (no API key required)")
    for source in status["sources"]:
        print(
            f"\n{source['source_pdf']}: {source['batch_count']} batch(es) "
            f"({source['done']} done, {source['pending']} pending)"
        )
        for batch in source["batches"]:
            print(
                f"  {batch['start_page']:03d}-{batch['end_page']:03d} -> "
                f"{batch['output_file']} [{batch['status']}]"
            )
    if status["pending_batches"] > 0:
        print(
            "\nNext step: launch a Gemini subagent for each pending batch "
            "(see .cursor/skills/interpret-batch/SKILL.md)."
        )
    if status["blockers"]:
        print("\nBlockers:")
        for blocker in status["blockers"]:
            print(f"  - {blocker}")


def run(
    *,
    dry_run: bool = False,
    selected_file: Path | None = None,
    unit_prefix: str | None = None,
    as_json: bool = False,
) -> int:
    pdfs = list_scan_pdfs(selected_file)
    if not pdfs:
        message = f"No PDFs found in {SCANS_DIR}. Drop source files there first."
        if as_json:
            print(json.dumps({"error": message, "exit_code": 0}, indent=2))
        else:
            print(message)
        return 0

    ACCESSIBLE_DIR.mkdir(parents=True, exist_ok=True)
    state = load_state()
    planned = 0
    split_count = 0
    skipped = 0
    pending: list[dict] = []
    results: list[dict] = []

    for source_pdf in pdfs:
        ranges = describe_plan(source_pdf)
        if not as_json:
            print(f"\n{source_pdf.name}: {len(ranges)} batch(es)")
        batches = split_pdf(source_pdf) if not dry_run else []

        for index, page_range in enumerate(ranges):
            start, end = page_range
            batch = batches[index] if batches else make_batch(source_pdf, start, end)
            out_file = output_path(batch, unit_prefix)
            status = "pending"
            if is_completed(state, source_pdf, batch, unit_prefix):
                status = "done"
                skipped += 1
            planned += 1

            entry = {
                "source_pdf": source_pdf.name,
                "start_page": start,
                "end_page": end,
                "batch_pdf": str(batch_pdf_path(source_pdf, batch)),
                "output_file": out_file.name,
                "output_path": str(out_file),
                "status": status,
                "action": "none",
            }

            if not dry_run and status == "pending":
                split_count += 1
                entry["action"] = "split"

            if status == "pending":
                pending.append(entry)

            if not as_json:
                print(f"  {start:03d}-{end:03d} -> {out_file.name} [{status}]")
                if entry["action"] == "split":
                    print(f"    batch PDF: {entry['batch_pdf']}")

            results.append(entry)

    save_state(state)
    summary = {
        "interpretation_mode": "cursor_subagent",
        "planned": planned,
        "split": split_count,
        "skipped": skipped,
        "dry_run": dry_run,
        "pending_batches": len(pending),
        "pending": pending,
        "results": results,
        "exit_code": 0,
    }
    if as_json:
        print(json.dumps(summary, indent=2))
    else:
        print(
            f"\nSummary: planned={planned}, split={split_count}, skipped={skipped}, "
            f"pending={len(pending)}, dry_run={dry_run}"
        )
        if pending:
            print(
                "Interpretation is agent-driven. Launch a Gemini subagent per pending batch "
                "(see .cursor/skills/interpret-batch/SKILL.md), then run "
                "`python3 scripts/run_pipeline.py --sync-state`."
            )
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned batches without writing batch PDFs",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show pipeline progress without splitting",
    )
    parser.add_argument(
        "--manifest",
        action="store_true",
        help="Print pending batches as JSON (alias for --status --json)",
    )
    parser.add_argument(
        "--sync-state",
        action="store_true",
        help="Record completed batches whose accessible output already exists",
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
        "--json",
        action="store_true",
        help="Emit machine-readable JSON on stdout",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    selected = args.file
    if selected and not selected.is_absolute():
        selected = SCANS_DIR / selected

    if args.sync_state:
        synced = sync_state_from_outputs(selected_file=selected, unit_prefix=args.unit_prefix)
        payload = {"synced": synced, "exit_code": 0}
        if args.json:
            print(json.dumps(payload, indent=2))
        else:
            print(f"Synced {synced} completed batch(es) into {STATE_FILE}")
        return 0

    if args.status or args.manifest:
        status = build_status(selected_file=selected, unit_prefix=args.unit_prefix)
        print_status(status, as_json=args.json or args.manifest)
        return 0

    return run(
        dry_run=args.dry_run,
        selected_file=selected,
        unit_prefix=args.unit_prefix,
        as_json=args.json,
    )


if __name__ == "__main__":
    raise SystemExit(main())
