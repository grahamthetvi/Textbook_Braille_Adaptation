"""Parse HEADINGS trailers, merge a running heading map, and format prompt context."""

from __future__ import annotations

import re

HEADINGS_MARKER = "HEADINGS"
HEADING_CONTEXT_LIMIT = 30
HEADING_CONTEXT_INTRO = (
    "Heading context from earlier batches (continue this hierarchy; "
    "match levels for the same titles):"
)

_HEADINGS_TRAILER = re.compile(
    r"^(?:(?P<body>[\s\S]*)\r?\n)?HEADINGS:\s*(?P<block>[\s\S]*)$",
    flags=re.I,
)
_HEADING_LINE = re.compile(r"^([1-6])\|(.*)$")
_UNDERLINE = re.compile(r"</?u>", flags=re.I)


def normalize_heading_title(text: str) -> str:
    value = _UNDERLINE.sub("", str(text or ""))
    return value.replace("__", "").replace("_", "").strip()


def parse_heading_lines(block: str) -> list[dict]:
    entries: list[dict] = []
    for raw in str(block or "").splitlines():
        trimmed = raw.strip()
        if not trimmed:
            continue
        match = _HEADING_LINE.match(trimmed)
        if not match:
            continue
        title = match.group(2).strip()
        if not title:
            continue
        entries.append({"level": int(match.group(1)), "title": title})
    return entries


def parse_headings_response(text: str) -> dict:
    trimmed = (text or "").strip()
    if not trimmed:
        return {"body": "", "headings": [], "has_trailer": False}
    match = _HEADINGS_TRAILER.match(trimmed)
    if not match:
        return {"body": trimmed, "headings": [], "has_trailer": False}
    return {
        "body": (match.group("body") or "").strip(),
        "headings": parse_heading_lines(match.group("block") or ""),
        "has_trailer": True,
    }


def _page_range(item: dict | None) -> tuple[int, int]:
    record = item or {}
    start = record.get("start_page", record.get("startPage", 0))
    end = record.get("end_page", record.get("endPage", 0))
    try:
        start_page = int(start)
    except (TypeError, ValueError):
        start_page = 0
    try:
        end_page = int(end)
    except (TypeError, ValueError):
        end_page = 0
    return start_page, end_page


def merge_heading_map(
    heading_map: list[dict] | None,
    start_page: int,
    end_page: int,
    entries: list[dict] | None,
) -> list[dict]:
    start = int(start_page)
    end = int(end_page)
    kept = [
        item
        for item in heading_map or []
        if _page_range(item) != (start, end)
    ]
    added = []
    for entry in entries or []:
        title = str(entry.get("title") or "").strip()
        if not title:
            continue
        try:
            level = int(entry.get("level"))
        except (TypeError, ValueError):
            continue
        added.append(
            {
                "level": level,
                "title": title,
                "start_page": start,
                "end_page": end,
            }
        )
    combined = kept + added
    combined.sort(
        key=lambda item: (
            _page_range(item)[0],
            _page_range(item)[1],
        )
    )
    return combined


def format_heading_context(
    heading_map: list[dict] | None,
    *,
    limit: int = HEADING_CONTEXT_LIMIT,
) -> str:
    entries = [item for item in heading_map or [] if item and item.get("title")]
    if not entries:
        return ""
    cap = limit if isinstance(limit, int) and limit > 0 else HEADING_CONTEXT_LIMIT
    selected = entries
    if len(entries) > cap:
        seen: set[str] = set()
        h1: list[dict] = []
        for item in entries:
            if int(item.get("level") or 0) != 1:
                continue
            key = str(item.get("title") or "").lower()
            if key in seen:
                continue
            seen.add(key)
            h1.append(item)
        tail = entries[-cap:]
        tail_keys = {f"{item.get('level')}|{item.get('title')}" for item in tail}
        extra = [
            item
            for item in h1
            if f"{item.get('level')}|{item.get('title')}" not in tail_keys
        ]
        selected = extra + tail
    lines = [f"H{item.get('level')} {item.get('title')}" for item in selected]
    return f"{HEADING_CONTEXT_INTRO}\n" + "\n".join(lines)


def heading_mismatch_warnings(
    body: str,
    headings: list[dict] | None,
    label: str = "output",
) -> list[str]:
    titles: set[str] = set()
    for line in str(body or "").splitlines():
        normalized = normalize_heading_title(line)
        if normalized:
            titles.add(normalized)
            titles.add(normalized.lower())
    warnings: list[str] = []
    for entry in headings or []:
        title = str(entry.get("title") or "").strip()
        if not title:
            continue
        normalized = normalize_heading_title(title)
        if normalized in titles or normalized.lower() in titles:
            continue
        warnings.append(
            f'{label}: heading "{title}" was listed but not found in the body'
        )
    return warnings


def missing_headings_warning(has_trailer: bool, body: str, label: str = "output") -> str:
    if has_trailer or not str(body or "").strip():
        return ""
    return f"{label}: no HEADINGS trailer"
