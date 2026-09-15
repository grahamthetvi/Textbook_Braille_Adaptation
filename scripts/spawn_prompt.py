"""Build minimal Task prompts for Gemini interpretation subagents."""

from __future__ import annotations

from config import DEFAULT_SUBAGENT_MODEL, INTERPRETATION_PROMPT, MAX_SUBAGENTS_PER_TURN
from headings import format_heading_context


def page_range_label(start_page: int, end_page: int) -> str:
    return f"{start_page:03d}-{end_page:03d}"


def build_subagent_prompt(batch: dict, heading_context: str = "") -> str:
    """Return a short Task prompt for one pending batch manifest entry."""
    start = batch["start_page"]
    end = batch["end_page"]
    page_range = page_range_label(start, end)
    context = (heading_context or "").strip()
    heading_block = f"{context}\n\n" if context else ""
    brief = INTERPRETATION_PROMPT.replace("{page_range}", page_range).replace(
        "{heading_context}", heading_block
    )

    return f"""You are an interpretation worker on the shared Cloud Agent VM. Do not spawn Task subagents.

Transcribe this textbook batch into accessible markdown.

Batch PDF: {batch["batch_pdf"]}
Output file: {batch["output_path"]}
Source pages: {start}-{end} (1-based, inclusive)

{brief}

Requirements:
- Read only the batch PDF above. Do not render extra page images.
- Write markdown only to the output file, including a HEADINGS trailer. No preamble or summary in chat.
- Run: python3 scripts/run_pipeline.py --sync-state
- Run: python3 scripts/validate_accessible.py {batch["output_path"]}
- Fix validation errors before finishing. --sync-state strips the HEADINGS trailer and stores levels for later batches.
"""


def build_spawn_manifest(pending: list[dict], heading_maps: dict | None = None) -> dict:
    """Attach spawn metadata for orchestrator Task tool calls."""
    maps = heading_maps or {}
    tasks = []
    for batch in pending:
        source_name = batch.get("source_pdf") or ""
        heading_context = format_heading_context(maps.get(source_name) or [])
        tasks.append(
            {
                "output_file": batch["output_file"],
                "start_page": batch["start_page"],
                "end_page": batch["end_page"],
                "page_count": batch["end_page"] - batch["start_page"] + 1,
                "model": DEFAULT_SUBAGENT_MODEL,
                "run_in_background": False,
                "prompt": build_subagent_prompt(batch, heading_context),
            }
        )
    return {
        "subagent_model": DEFAULT_SUBAGENT_MODEL,
        "launch_limit_per_turn": MAX_SUBAGENTS_PER_TURN,
        "task_count": len(tasks),
        "tasks": tasks,
    }
