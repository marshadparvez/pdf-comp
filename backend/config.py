"""
Tunable thresholds for the comparison pipeline.
Override via environment variables.
"""
from __future__ import annotations

import os


def _float(key: str, default: float) -> float:
    val = os.environ.get(key)
    if val is None:
        return default
    try:
        return float(val)
    except ValueError:
        return default


def _int(key: str, default: int) -> int:
    val = os.environ.get(key)
    if val is None:
        return default
    try:
        return int(val)
    except ValueError:
        return default


# Same-page move: Jaccard threshold (0..1). Higher = stricter (edited stays red+green)
SAME_PAGE_MOVE_JACCARD_THRESHOLD = _float("PDF_DIFF_JACCARD_THRESHOLD", 0.95)

# Same-page move: min words in a box to consider for matching
SAME_PAGE_MOVE_MIN_WORDS = _int("PDF_DIFF_MIN_WORDS", 3)

# Same-page move: size ratio (min/max word count). Must be >= this to pair.
SAME_PAGE_MOVE_SIZE_RATIO = _float("PDF_DIFF_SIZE_RATIO", 0.5)

# Cross-page move: only treat runs of at least this many words as "moved" (reduces noise)
MIN_CROSS_PAGE_MOVE_WORDS = _int("PDF_DIFF_MIN_CROSS_PAGE_MOVE_WORDS", 4)

# Normalize text before diff: lowercase, collapse spaces, strip punctuation (fewer false changes)
NORMALIZE_TEXT_FOR_DIFF = os.environ.get("PDF_DIFF_NORMALIZE_TEXT", "true").strip().lower() in ("1", "true", "yes")

# Use pdfplumber for word extraction in Speed mode when available (often better on tables)
USE_PDFPLUMBER_SPEED = os.environ.get("PDF_DIFF_USE_PDFPLUMBER_SPEED", "true").strip().lower() in ("1", "true", "yes")
