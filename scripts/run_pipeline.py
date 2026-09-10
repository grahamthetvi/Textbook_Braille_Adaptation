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

from config import ACCESSIBLE_DIR, API_KEY_ENV_VARS, SCANS_DIR, STATE_FILE
from gemini_interpret import MissingApiKeyError, interpret_pdf_batch, resolve_api_key
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


def api_key_configured() -> bool:
    try:
        resolve_api_key()
        return True
    except MissingApiKeyError:
        return False


def planned_batches(
    source_pdf: Path,
    state: dict,
    unit_prefix: str | None,
) -> list[dict]:
    """Return batch metadata for one source PDF without splitting."""
    entries: list[dict] = []
    for start, end in describe_plan(source_pdf):
        batch = PageBatch(
            source_pdf=source_pdf,
            start_page=start,
            end_page=end,
            batch_pdf=Path(f"batch-{start:03d}-{end:03d}.pdf"),
        )
        done = is_completed(state, source_pdf, batch, unit_prefix)
        entries.append(
            {
                "source_pdf": source_pdf.name,
                "start_page": start,
                "end_page": end,
                "output_file": output_path(batch, unit_prefix).name,
                "status": "done" if done else "pending",
            }
        )
    return entries


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

    for source_pdf in pdfs:
        batches = planned_batches(source_pdf, state, unit_prefix)
        done = sum(1 for batch in batches if batch["status"] == "done")
        pending = len(batches) - done
        total_batches += len(batches)
        done_batches += done
        pending_batches += pending
        sources.append(
            {
                "source_pdf": source_pdf.name,
                "batch_count": len(batches),
                "done": done,
                "pending": pending,
                "batches": batches,
            }
        )

    blockers: list[str] = []
    if not pdfs:
        blockers.append(f"No PDFs found in {SCANS_DIR}")
    if pending_batches > 0 and not api_key_configured():
        blockers.append(
            f"Set {' or '.join(API_KEY_ENV_VARS)} before live interpretation"
        )

    return {
        "scans_dir": str(SCANS_DIR),
        "accessible_dir": str(ACCESSIBLE_DIR),
        "state_file": str(STATE_FILE),
        "api_key_configured": api_key_configured(),
        "source_count": len(pdfs),
        "total_batches": total_batches,
        "done_batches": done_batches,
        "pending_batches": pending_batches,
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
    print(f"API key configured: {'yes' if status['api_key_configured'] else 'no'}")
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
    if status["blockers"]:
        print("\nBlockers:")
        for blocker in status["blockers"]:
            print(f"  - {blocker}")


def run(
    *,
    dry_run: bool = False,
    selected_file: Path | None = None,
    unit_prefix: str | None = None,
    skip_interpret: bool = False,
    max_batches: int | None = None,
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
    processed = 0
    skipped = 0
    stopped_early = False
    results: list[dict] = []

    for source_pdf in pdfs:
        ranges = describe_plan(source_pdf)
        if not as_json:
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

            entry = {
                "source_pdf": source_pdf.name,
                "start_page": start,
                "end_page": end,
                "output_file": out_file.name,
                "status": status,
                "action": "none",
            }

            if not as_json:
                print(f"  {start:03d}-{end:03d} -> {out_file.name} [{status}]")

            if dry_run or status == "done":
                results.append(entry)
                continue

            if skip_interpret:
                entry["action"] = "split_only"
                if not as_json:
                    print("    split only (--skip-interpret)")
                results.append(entry)
                continue

            if max_batches is not None and processed >= max_batches:
                stopped_early = True
                entry["action"] = "deferred"
                results.append(entry)
                continue

            try:
                markdown = interpret_pdf_batch(
                    batch.batch_pdf,
                    batch.start_page,
                    batch.end_page,
                )
            except MissingApiKeyError as exc:
                entry["action"] = "blocked"
                entry["error"] = str(exc)
                results.append(entry)
                save_state(state)
                if as_json:
                    print(
                        json.dumps(
                            {
                                "planned": planned,
                                "processed": processed,
                                "skipped": skipped,
                                "dry_run": dry_run,
                                "stopped_early": stopped_early,
                                "blocker": str(exc),
                                "results": results,
                                "exit_code": 2,
                            },
                            indent=2,
                        )
                    )
                else:
                    print(f"\nBlocker: {exc}")
                    print(
                        "PDFs were split; re-run without --skip-interpret after setting the API key."
                    )
                return 2

            out_file.write_text(markdown + "\n", encoding="utf-8")
            mark_completed(state, source_pdf, batch, out_file)
            processed += 1
            entry["status"] = "done"
            entry["action"] = "interpreted"
            results.append(entry)
            if not as_json:
                print(f"    wrote {out_file}")

    save_state(state)
    summary = {
        "planned": planned,
        "processed": processed,
        "skipped": skipped,
        "dry_run": dry_run,
        "stopped_early": stopped_early,
        "max_batches": max_batches,
        "results": results,
        "exit_code": 0,
    }
    if as_json:
        print(json.dumps(summary, indent=2))
    else:
        print(
            f"\nSummary: planned={planned}, processed={processed}, skipped={skipped}, "
            f"dry_run={dry_run}"
        )
        if stopped_early:
            print(f"Stopped after {processed} batch(es) (--max-batches {max_batches})")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned batches without writing accessible output",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show pipeline progress without running interpretation",
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
    parser.add_argument(
        "--max-batches",
        type=int,
        metavar="N",
        help="Interpret at most N pending batches, then stop",
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

    if args.status:
        status = build_status(selected_file=selected, unit_prefix=args.unit_prefix)
        print_status(status, as_json=args.json)
        return 0

    return run(
        dry_run=args.dry_run,
        selected_file=selected,
        unit_prefix=args.unit_prefix,
        skip_interpret=args.skip_interpret,
        max_batches=args.max_batches,
        as_json=args.json,
    )


if __name__ == "__main__":
    raise SystemExit(main())
