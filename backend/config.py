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
