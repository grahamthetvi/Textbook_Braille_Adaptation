"""Send PDF batches to Gemini for OCR and accessible transcription."""

from __future__ import annotations

import os
from pathlib import Path

from google import genai
from google.genai import types

from config import (
    API_KEY_ENV_VARS,
    DEFAULT_MODEL,
    DEFAULT_THINKING_LEVEL,
    INTERPRETATION_PROMPT,
)


class MissingApiKeyError(RuntimeError):
    """Raised when no Gemini API key is configured."""


def resolve_api_key() -> str:
    for name in API_KEY_ENV_VARS:
        value = os.environ.get(name, "").strip()
        if value:
            return value
    joined = " or ".join(API_KEY_ENV_VARS)
    raise MissingApiKeyError(
        f"Set {joined} before running live interpretation."
    )


def build_client(api_key: str | None = None) -> genai.Client:
    key = api_key or resolve_api_key()
    return genai.Client(api_key=key)


def interpret_pdf_batch(
    batch_pdf: Path,
    start_page: int,
    end_page: int,
    *,
    model: str = DEFAULT_MODEL,
    thinking_level: str = DEFAULT_THINKING_LEVEL,
    api_key: str | None = None,
) -> str:
    """Return accessible markdown transcription for a PDF batch."""
    client = build_client(api_key)
    uploaded = client.files.upload(file=str(batch_pdf))

    page_range = f"{start_page:03d}-{end_page:03d}"
    prompt = INTERPRETATION_PROMPT.format(page_range=page_range)

    response = client.models.generate_content(
        model=model,
        contents=[uploaded, prompt],
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                thinking_level=thinking_level,
            ),
        ),
    )

    text = (response.text or "").strip()
    if not text:
        raise RuntimeError(f"Gemini returned empty text for {batch_pdf.name}")
    return text
