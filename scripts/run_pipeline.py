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
from split_pdf import PageBatch, describe_plan, source_sha256, split_pdf


def load_state() -> dict:
    if not STATE_FILE.exists():
        return {"completed": {}, "sources": {}}
    state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    state.setdefault("completed", {})
    state.setdefault("sources", {})
    return state


def save_state(state: dict) -> None:
    SCANS_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


def list_scan_pdfs(selected: Path | None = None) -> list[Path]:
    if selected:
        path = selected.resolve()
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        if path.suffix.lower() != ".pdf":
            raise ValueError(f"Expected a PDF file, got {path.suffix or 'no extension'}: {path}")
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


def batch_key(source_pdf: Path, batch: PageBatch, unit_prefix: str | None = None) -> str:
    prefix_part = f"{unit_prefix}:" if unit_prefix else ""
    return f"{prefix_part}{source_pdf.name}:{batch.start_page}-{batch.end_page}"


def prune_stale_state(state: dict, unit_prefix: str | None) -> int:
    """Remove completed entries whose output file no longer exists."""
    removed = 0
    completed = state.get("completed", {})
    stale_keys = [
        key
        for key, record in completed.items()
        if not (ACCESSIBLE_DIR.parent / record.get("output_file", "")).exists()
    ]
    for key in stale_keys:
        del completed[key]
        removed += 1
    return removed


def is_completed(state: dict, source_pdf: Path, batch: PageBatch, unit_prefix: str | None) -> bool:
    out_file = output_path(batch, unit_prefix)
    if out_file.exists():
        return True
    key = batch_key(source_pdf, batch, unit_prefix)
    if key in state.get("completed", {}):
        return False
    return False


def mark_completed(
    state: dict,
    source_pdf: Path,
    batch: PageBatch,
    output_file: Path,
    unit_prefix: str | None = None,
) -> None:
    state.setdefault("completed", {})[batch_key(source_pdf, batch, unit_prefix)] = {
        "source_pdf": source_pdf.name,
        "unit_prefix": unit_prefix,
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


def update_source_hash(state: dict, source_pdf: Path) -> list[str]:
    """Record source sha256 and return warnings when it changed."""
    warnings: list[str] = []
    digest = source_sha256(source_pdf)
    sources = state.setdefault("sources", {})
    previous = sources.get(source_pdf.name)
    if previous and previous.get("sha256") and previous["sha256"] != digest:
        warnings.append(
            f"{source_pdf.name}: source PDF changed since last run "
            f"(was {previous['sha256'][:12]}…, now {digest[:12]}…). "
            "Consider re-splitting affected batches."
        )
    sources[source_pdf.name] = {
        "sha256": digest,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    return warnings


def batch_stem(batch: PageBatch, unit_prefix: str | None = None) -> str:
    if unit_prefix:
        return f"{unit_prefix}_{batch.output_stem}"
    return batch.output_stem


def find_batch_by_stem(
    source_pdf: Path,
    stem: str,
    unit_prefix: str | None,
) -> PageBatch | None:
    for start, end in describe_plan(source_pdf):
        batch = make_batch(source_pdf, start, end)
        if batch_stem(batch, unit_prefix) == stem or batch.output_stem == stem:
            return batch
    return None


def reset_batch(
    state: dict,
    stem: str,
    *,
    selected_file: Path | None = None,
    unit_prefix: str | None = None,
    delete_output: bool = False,
) -> int:
    pdfs = list_scan_pdfs(selected_file)
    reset_count = 0
    for source_pdf in pdfs:
        batch = find_batch_by_stem(source_pdf, stem, unit_prefix)
        if batch is None:
            continue
        key = batch_key(source_pdf, batch, unit_prefix)
        if key in state.get("completed", {}):
            del state["completed"][key]
            reset_count += 1
        if delete_output:
            out_file = output_path(batch, unit_prefix)
            if out_file.exists():
                out_file.unlink()
                reset_count += 1
    return reset_count


def planned_batches(
    source_pdf: Path,
    state: dict,
    unit_prefix: str | None,
    *,
    pending_only: bool = False,
    max_batches: int | None = None,
) -> list[dict]:
    """Return batch metadata for one source PDF without splitting."""
    entries: list[dict] = []
    for start, end in describe_plan(source_pdf):
        batch = make_batch(source_pdf, start, end)
        done = is_completed(state, source_pdf, batch, unit_prefix)
        if pending_only and done:
            continue
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
        if max_batches is not None and len(entries) >= max_batches:
            break
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
        update_source_hash(state, source_pdf)
        for start, end in describe_plan(source_pdf):
            batch = make_batch(source_pdf, start, end)
            out_file = output_path(batch, unit_prefix)
            key = batch_key(source_pdf, batch, unit_prefix)
            if out_file.exists() and key not in state.get("completed", {}):
                mark_completed(state, source_pdf, batch, out_file, unit_prefix)
                synced += 1

    save_state(state)
    return synced


def build_status(
    *,
    selected_file: Path | None = None,
    unit_prefix: str | None = None,
    max_batches: int | None = None,
) -> dict:
    pdfs = list_scan_pdfs(selected_file)
    state = load_state()
    prune_stale_state(state, unit_prefix)
    save_state(state)

    sources: list[dict] = []
    total_batches = 0
    done_batches = 0
    pending_batches = 0
    pending: list[dict] = []
    warnings: list[str] = []

    for source_pdf in pdfs:
        warnings.extend(update_source_hash(state, source_pdf))
        batches = planned_batches(source_pdf, state, unit_prefix)
        done = sum(1 for batch in batches if batch["status"] == "done")
        batch_pending = len(batches) - done
        total_batches += len(batches)
        done_batches += done
        pending_batches += batch_pending
        for batch in batches:
            if batch["status"] == "pending":
                pending.append(batch)
                if max_batches is not None and len(pending) >= max_batches:
                    break
        sources.append(
            {
                "source_pdf": source_pdf.name,
                "batch_count": len(batches),
                "done": done,
                "pending": batch_pending,
                "batches": batches,
            }
        )
        if max_batches is not None and len(pending) >= max_batches:
            break

    save_state(state)

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
        "pending": pending[:max_batches] if max_batches else pending,
        "sources": sources,
        "warnings": warnings,
        "blockers": blockers,
    }


def print_status(status: dict, *, as_json: bool, manifest: bool = False) -> None:
    if as_json:
        payload = status
        if manifest:
            payload = {
                "pending_batches": status["pending_batches"],
                "pending": status["pending"],
                "warnings": status.get("warnings", []),
                "blockers": status.get("blockers", []),
            }
        print(json.dumps(payload, indent=2))
        return

    if status["source_count"] == 0:
        print(f"No PDFs found in {SCANS_DIR}. Drop source PDFs there first.")
        return

    print(
        f"Pipeline status: {status['done_batches']}/{status['total_batches']} batches done, "
        f"{status['pending_batches']} pending"
    )
    print(f"Interpretation mode: {status['interpretation_mode']} (no API key required)")
    for warning in status.get("warnings", []):
        print(f"Warning: {warning}")
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
    max_batches: int | None = None,
) -> int:
    pdfs = list_scan_pdfs(selected_file)
    if not pdfs:
        message = f"No PDFs found in {SCANS_DIR}. Drop source PDFs there first."
        if as_json:
            print(json.dumps({"error": message, "exit_code": 1}, indent=2))
        else:
            print(message, file=sys.stderr)
        return 1

    ACCESSIBLE_DIR.mkdir(parents=True, exist_ok=True)
    state = load_state()
    prune_stale_state(state, unit_prefix)
    planned = 0
    split_count = 0
    skipped = 0
    pending: list[dict] = []
    results: list[dict] = []
    warnings: list[str] = []

    for source_pdf in pdfs:
        warnings.extend(update_source_hash(state, source_pdf))
        ranges = describe_plan(source_pdf)
        if not as_json:
            print(f"\n{source_pdf.name}: {len(ranges)} batch(es)")
            for warning in warnings:
                print(f"  Warning: {warning}")

        pending_ranges: list[tuple[int, int]] = []
        batch_meta: list[tuple[PageBatch, str]] = []

        for start, end in ranges:
            batch = make_batch(source_pdf, start, end)
            out_file = output_path(batch, unit_prefix)
            status = "pending"
            if is_completed(state, source_pdf, batch, unit_prefix):
                status = "done"
                skipped += 1
            else:
                pending_ranges.append((start, end))
            batch_meta.append((batch, status))
            planned += 1

        batches: list[PageBatch] = []
        if not dry_run and pending_ranges:
            batches = split_pdf(
                source_pdf,
                only_ranges=pending_ranges,
                skip_existing=True,
            )
        elif not dry_run:
            batches = [batch for batch, _ in batch_meta]

        batch_by_range = {(b.start_page, b.end_page): b for b in batches}

        for batch, status in batch_meta:
            if (batch.start_page, batch.end_page) in batch_by_range:
                batch = batch_by_range[(batch.start_page, batch.end_page)]
            out_file = output_path(batch, unit_prefix)

            entry = {
                "source_pdf": source_pdf.name,
                "start_page": batch.start_page,
                "end_page": batch.end_page,
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
                if max_batches is not None and len(pending) >= max_batches:
                    break

            if not as_json:
                print(f"  {batch.start_page:03d}-{batch.end_page:03d} -> {out_file.name} [{status}]")
                if entry["action"] == "split":
                    print(f"    batch PDF: {entry['batch_pdf']}")

            results.append(entry)

        if max_batches is not None and len(pending) >= max_batches:
            break

    save_state(state)
    summary = {
        "interpretation_mode": "cursor_subagent",
        "planned": planned,
        "split": split_count,
        "skipped": skipped,
        "dry_run": dry_run,
        "pending_batches": len(pending),
        "pending": pending[:max_batches] if max_batches else pending,
        "results": results,
        "warnings": warnings,
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
        help="Print pending batches only as JSON",
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
    parser.add_argument(
        "--max-batches",
        type=int,
        metavar="N",
        help="Limit pending batches returned in manifest/status/run output",
    )
    parser.add_argument(
        "--reset-batch",
        metavar="STEM",
        help="Clear pipeline state for a batch stem (e.g. pages-001-005)",
    )
    parser.add_argument(
        "--redo",
        metavar="STEM",
        help="Reset batch state and delete its accessible output for reprocessing",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    selected = args.file
    if selected and not selected.is_absolute():
        selected = SCANS_DIR / selected

    try:
        if args.reset_batch:
            state = load_state()
            count = reset_batch(
                state,
                args.reset_batch,
                selected_file=selected,
                unit_prefix=args.unit_prefix,
                delete_output=False,
            )
            save_state(state)
            payload = {"reset": count, "stem": args.reset_batch, "exit_code": 0}
            if args.json:
                print(json.dumps(payload, indent=2))
            else:
                print(f"Reset {count} state entry/entries for {args.reset_batch}")
            return 0

        if args.redo:
            state = load_state()
            count = reset_batch(
                state,
                args.redo,
                selected_file=selected,
                unit_prefix=args.unit_prefix,
                delete_output=True,
            )
            save_state(state)
            payload = {"redo": count, "stem": args.redo, "exit_code": 0}
            if args.json:
                print(json.dumps(payload, indent=2))
            else:
                print(f"Redo prepared for {args.redo} ({count} change(s))")
            return 0

        if args.sync_state:
            synced = sync_state_from_outputs(selected_file=selected, unit_prefix=args.unit_prefix)
            payload = {"synced": synced, "exit_code": 0}
            if args.json:
                print(json.dumps(payload, indent=2))
            else:
                print(f"Synced {synced} completed batch(es) into {STATE_FILE}")
            return 0

        if args.status or args.manifest:
            status = build_status(
                selected_file=selected,
                unit_prefix=args.unit_prefix,
                max_batches=args.max_batches,
            )
            print_status(status, as_json=args.json or args.manifest, manifest=args.manifest)
            return 1 if status["source_count"] == 0 else 0

        return run(
            dry_run=args.dry_run,
            selected_file=selected,
            unit_prefix=args.unit_prefix,
            as_json=args.json,
            max_batches=args.max_batches,
        )
    except FileNotFoundError as exc:
        message = str(exc)
        if args.json:
            print(json.dumps({"error": message, "exit_code": 1}, indent=2))
        else:
            print(f"Error: {message}", file=sys.stderr)
        return 1
    except ValueError as exc:
        message = str(exc)
        if args.json:
            print(json.dumps({"error": message, "exit_code": 1}, indent=2))
        else:
            print(f"Error: {message}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
