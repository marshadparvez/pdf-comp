from __future__ import annotations

import logging
import re
import uuid
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz

from pdf_utils import (
    WordBox,
    add_highlights,
    extract_words_from_page,
    merge_boxes,
    ocr_words_from_image,
    render_page_image,
)

try:
    from unstructured.partition.pdf import partition_pdf
except Exception:  # pragma: no cover - optional dependency
    partition_pdf = None

try:
    from config import (
        SAME_PAGE_MOVE_JACCARD_THRESHOLD,
        SAME_PAGE_MOVE_MIN_WORDS,
        SAME_PAGE_MOVE_SIZE_RATIO,
    )
except ImportError:
    SAME_PAGE_MOVE_JACCARD_THRESHOLD = 0.95
    SAME_PAGE_MOVE_MIN_WORDS = 3
    SAME_PAGE_MOVE_SIZE_RATIO = 0.5

logger = logging.getLogger(__name__)


@dataclass
class PageDiff:
    page_index: int
    added_boxes: List[Tuple[float, float, float, float]]
    removed_boxes: List[Tuple[float, float, float, float]]
    visual_boxes: List[Tuple[float, float, float, float]]
    moved_boxes_old: List[Tuple[float, float, float, float]]  # blue on original PDF
    moved_boxes_new: List[Tuple[float, float, float, float]]  # blue on new PDF
    status: str


@dataclass
class LineBox:
    text: str
    bbox: Tuple[float, float, float, float]
    page_index: int
    line_index: int


def diff_word_boxes(
    old_words: List[WordBox], new_words: List[WordBox]
) -> Tuple[List[Tuple[float, float, float, float]], List[Tuple[float, float, float, float]]]:
    old_tokens = [w.text for w in old_words]
    new_tokens = [w.text for w in new_words]
    matcher = SequenceMatcher(a=old_tokens, b=new_tokens)

    removed_boxes: List[Tuple[float, float, float, float]] = []
    added_boxes: List[Tuple[float, float, float, float]] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        if tag in ("delete", "replace"):
            boxes = [w.bbox for w in old_words[i1:i2]]
            if boxes:
                removed_boxes.append(merge_boxes(boxes))
        if tag in ("insert", "replace"):
            boxes = [w.bbox for w in new_words[j1:j2]]
            if boxes:
                added_boxes.append(merge_boxes(boxes))

    return added_boxes, removed_boxes


def _build_line_boxes(
    words: List[WordBox], page_index: int, y_tolerance: float = 3.0
) -> List[LineBox]:
    if not words:
        return []

    sorted_words = sorted(words, key=lambda w: (w.bbox[1], w.bbox[0]))
    lines: List[List[WordBox]] = []
    current: List[WordBox] = []
    current_y: Optional[float] = None

    for word in sorted_words:
        y_center = (word.bbox[1] + word.bbox[3]) / 2.0
        if current and current_y is not None and abs(y_center - current_y) > y_tolerance:
            lines.append(current)
            current = [word]
            current_y = y_center
        else:
            current.append(word)
            if current_y is None:
                current_y = y_center
            else:
                current_y = (current_y * (len(current) - 1) + y_center) / len(current)

    if current:
        lines.append(current)

    line_boxes: List[LineBox] = []
    for line_index, line_words in enumerate(lines):
        line_words_sorted = sorted(line_words, key=lambda w: w.bbox[0])
        text = " ".join(w.text for w in line_words_sorted)
        bbox = merge_boxes(w.bbox for w in line_words_sorted)
        line_boxes.append(LineBox(text=text, bbox=bbox, page_index=page_index, line_index=line_index))

    return line_boxes


def _merge_line_boxes_by_gap(
    items: List[object], max_gap: float = 6.0
) -> List[Tuple[float, float, float, float]]:
    if not items:
        return []

    def to_bbox(item: object) -> Tuple[float, float, float, float]:
        if isinstance(item, LineBox):
            return item.bbox
        return item  # assume it's already a bbox tuple

    bboxes = [to_bbox(item) for item in items]
    bboxes = [b for b in bboxes if len(b) == 4]
    if not bboxes:
        return []
    sorted_boxes = sorted(bboxes, key=lambda b: (b[1], b[0]))
    merged: List[Tuple[float, float, float, float]] = []
    current: List[Tuple[float, float, float, float]] = [sorted_boxes[0]]
    last_bottom = sorted_boxes[0][3]

    for box in sorted_boxes[1:]:
        gap = box[1] - last_bottom
        if gap <= max_gap:
            current.append(box)
        else:
            merged.append(merge_boxes(current))
            current = [box]
        last_bottom = box[3]

    if current:
        merged.append(merge_boxes(current))
    return merged


def _words_in_box(
    words: List[WordBox], box: Tuple[float, float, float, float]
) -> List[WordBox]:
    """Return words whose center falls inside the given box."""
    x0, y0, x1, y1 = box
    result: List[WordBox] = []
    for w in words:
        cx = (w.bbox[0] + w.bbox[2]) / 2
        cy = (w.bbox[1] + w.bbox[3]) / 2
        if x0 <= cx <= x1 and y0 <= cy <= y1:
            result.append(w)
    return result


def _filter_same_page_moves(
    pages: List[PageDiff],
    stored_old_words: Dict[int, List[WordBox]],
    stored_new_words: Dict[int, List[WordBox]],
    min_words: Optional[int] = None,
    overlap_threshold: Optional[float] = None,
) -> None:
    """
    Match removed (red) boxes to added (green) boxes by Jaccard similarity: |R∩A|/|R∪A|.
    Jaccard penalizes any differing words (e.g. "checking" vs "browsing") so edited
    content stays red+green. Only near-identical text (95%+ Jaccard) → blue (moved).
    Cross-page moves are handled separately (exact equal runs).
    """
    min_words = min_words if min_words is not None else SAME_PAGE_MOVE_MIN_WORDS
    overlap_threshold = overlap_threshold if overlap_threshold is not None else SAME_PAGE_MOVE_JACCARD_THRESHOLD
    size_ratio_min = SAME_PAGE_MOVE_SIZE_RATIO
    for page_diff in pages:
        if page_diff.status in ("added_page", "removed_page"):
            continue
        if not page_diff.removed_boxes and not page_diff.added_boxes:
            continue
        page_index = page_diff.page_index
        old_words = stored_old_words.get(page_index, [])
        new_words = stored_new_words.get(page_index, [])
        if not old_words or not new_words:
            continue

        removed = page_diff.removed_boxes
        added = page_diff.added_boxes
        removed_sets: List[frozenset] = []
        for box in removed:
            ws = _words_in_box(old_words, box)
            if len(ws) >= min_words:
                removed_sets.append(frozenset(w.text.strip().lower() for w in ws))
            else:
                removed_sets.append(frozenset())
        added_sets: List[frozenset] = []
        for box in added:
            ws = _words_in_box(new_words, box)
            if len(ws) >= min_words:
                added_sets.append(frozenset(w.text.strip().lower() for w in ws))
            else:
                added_sets.append(frozenset())

        # Use Jaccard similarity: |R ∩ A| / |R ∪ A| — penalizes any differing words
        # (e.g. "checking" vs "browsing" in a long block reduces score more than "common/min")
        pairs: List[Tuple[int, int, float]] = []
        for ri, rset in enumerate(removed_sets):
            if not rset:
                continue
            for ai, aset in enumerate(added_sets):
                if not aset:
                    continue
                common = len(rset & aset)
                union = len(rset | aset)
                if union == 0 or common == 0:
                    continue
                jaccard = common / union
                if jaccard < overlap_threshold:
                    continue
                # Size ratio: both regions must be similar length (avoid "one sentence" vs "whole paragraph")
                size_ratio = min(len(rset), len(aset)) / max(len(rset), len(aset))
                if size_ratio < size_ratio_min:
                    continue
                pairs.append((ri, ai, jaccard))
        pairs.sort(key=lambda p: -p[2])

        removed_matched: set = set()
        added_matched: set = set()
        for ri, ai, score in pairs:
            if ri in removed_matched or ai in added_matched:
                continue
            removed_matched.add(ri)
            added_matched.add(ai)

        if removed_matched or added_matched:
            page_diff.moved_boxes_old = [removed[i] for i in sorted(removed_matched)]
            page_diff.moved_boxes_new = [added[i] for i in sorted(added_matched)]
            page_diff.removed_boxes = [b for i, b in enumerate(removed) if i not in removed_matched]
            page_diff.added_boxes = [b for i, b in enumerate(added) if i not in added_matched]
            page_diff.status = (
                "changed"
                if (page_diff.added_boxes or page_diff.removed_boxes or page_diff.moved_boxes_old or page_diff.moved_boxes_new or page_diff.visual_boxes)
                else "unchanged"
            )
            logger.info(
                "Page %d: same-page move → %d blue (old), %d blue (new)",
                page_index + 1,
                len(page_diff.moved_boxes_old),
                len(page_diff.moved_boxes_new),
            )


def _normalize_header_footer_line(text: str) -> str:
    # Replace digit runs so page numbers/timestamps don't block header/footer detection.
    return re.sub(r"\d+", "<#>", text.strip())


def _detect_repeating_header_footer(
    lines_by_page: Dict[int, List[LineBox]],
    page_count: int,
    sample_lines: int = 3,
    threshold_ratio: float = 0.6,
) -> set:
    counts: Dict[str, int] = {}
    for page_index in range(page_count):
        lines = lines_by_page.get(page_index, [])
        if not lines:
            continue
        head = lines[:sample_lines]
        tail = lines[-sample_lines:] if len(lines) > sample_lines else lines
        for line in head + tail:
            key = _normalize_header_footer_line(line.text)
            counts[key] = counts.get(key, 0) + 1
    threshold = max(2, int(page_count * threshold_ratio))
    return {key for key, count in counts.items() if count >= threshold}


def _filter_header_footer_lines(
    lines_by_page: Dict[int, List[LineBox]],
    page_count: int,
    header_footer_keys: set,
    sample_lines: int = 3,
) -> Dict[int, List[LineBox]]:
    filtered: Dict[int, List[LineBox]] = {}
    for page_index in range(page_count):
        lines = lines_by_page.get(page_index, [])
        if not lines:
            continue
        head = lines[:sample_lines]
        tail = lines[-sample_lines:] if len(lines) > sample_lines else []
        mid = lines[sample_lines:len(lines) - sample_lines] if len(lines) > sample_lines * 2 else []

        def keep(line: LineBox) -> bool:
            return _normalize_header_footer_line(line.text) not in header_footer_keys

        kept = [line for line in head if keep(line)] + mid + [line for line in tail if keep(line)]
        # Reindex line_index for consistency
        for idx, line in enumerate(kept):
            line.line_index = idx
        filtered[page_index] = kept
    return filtered


def _scale_ocr_words(words: List[WordBox], scale: float) -> List[WordBox]:
    return [
        WordBox(
            text=word.text,
            bbox=(
                word.bbox[0] / scale,
                word.bbox[1] / scale,
                word.bbox[2] / scale,
                word.bbox[3] / scale,
            ),
        )
        for word in words
    ]


def _extract_bbox_from_metadata(metadata: object) -> Optional[Tuple[float, float, float, float]]:
    if metadata is None:
        return None
    bbox = getattr(metadata, "bbox", None)
    if bbox and len(bbox) == 4:
        return tuple(float(value) for value in bbox)
    coordinates = getattr(metadata, "coordinates", None)
    if coordinates is None:
        return None
    if hasattr(coordinates, "points"):
        points = coordinates.points
    else:
        points = coordinates
    if not points:
        return None
    if isinstance(points, (list, tuple)) and len(points) == 4 and all(
        isinstance(value, (int, float)) for value in points
    ):
        return (float(points[0]), float(points[1]), float(points[2]), float(points[3]))
    if isinstance(points, (list, tuple)) and isinstance(points[0], (list, tuple)):
        xs = [float(point[0]) for point in points if len(point) >= 2]
        ys = [float(point[1]) for point in points if len(point) >= 2]
        if not xs or not ys:
            return None
        return (min(xs), min(ys), max(xs), max(ys))
    return None


def _extract_unstructured_words(pdf_path: Path) -> Dict[int, List[WordBox]]:
    if partition_pdf is None:
        return {}
    
    # Open PDF to get page dimensions for coordinate conversion
    doc = fitz.open(pdf_path)
    page_dims = {}
    for i in range(doc.page_count):
        page = doc.load_page(i)
        page_dims[i] = (page.rect.width, page.rect.height)
    doc.close()
    
    elements = partition_pdf(
        filename=str(pdf_path),
        infer_table_structure=True,
        strategy="hi_res",
    )
    words_by_page: Dict[int, List[WordBox]] = {}
    for element in elements:
        text = getattr(element, "text", None)
        if not text:
            continue
        metadata = getattr(element, "metadata", None)
        page_number = getattr(metadata, "page_number", None)
        if page_number is None:
            continue
        bbox = _extract_bbox_from_metadata(metadata)
        if bbox is None:
            continue
        page_index = int(page_number) - 1
        
        # Unstructured may return bboxes in image coordinates (pixels) or PDF coordinates
        # Try to detect and convert if needed. Unstructured typically uses image coordinates
        # with a default DPI of 200, so we need to scale down
        # However, coordinates might already be in PDF space, so we check the scale
        page_width, page_height = page_dims.get(page_index, (612, 792))  # Default letter size
        
        # If bbox coordinates are much larger than page dimensions, they're likely in image coords
        # Typical PDF page is ~612x792 points, image at 200 DPI for letter is ~1700x2200 pixels
        if bbox[2] > page_width * 2 or bbox[3] > page_height * 2:
            # Likely image coordinates, convert to PDF coordinates
            # Assume image was rendered at 200 DPI (common for hi_res strategy)
            # PDF points = pixels / (DPI / 72)
            scale_factor = 200.0 / 72.0
            bbox = (bbox[0] / scale_factor, bbox[1] / scale_factor, 
                   bbox[2] / scale_factor, bbox[3] / scale_factor)
        
        # Split text into words and create individual word boxes
        # For now, use the element's bbox for each word (not ideal but better than nothing)
        words = text.split()
        if words:
            # Distribute words across the bbox width
            word_width = (bbox[2] - bbox[0]) / len(words) if len(words) > 0 else (bbox[2] - bbox[0])
            for i, word in enumerate(words):
                word_x0 = bbox[0] + (i * word_width)
                word_x1 = bbox[0] + ((i + 1) * word_width)
                word_bbox = (word_x0, bbox[1], word_x1, bbox[3])
                words_by_page.setdefault(page_index, []).append(WordBox(text=word, bbox=word_bbox))
    return words_by_page


def _compare_pdfs(
    old_path: Path,
    new_path: Path,
    output_dir: Path,
    old_words_map: Optional[Dict[int, List[WordBox]]] = None,
    new_words_map: Optional[Dict[int, List[WordBox]]] = None,
    use_ocr: bool = True,
) -> Dict:
    logger.info("Starting PDF comparison")
    output_dir.mkdir(parents=True, exist_ok=True)
    old_doc = fitz.open(old_path)
    new_doc = fitz.open(new_path)
    logger.info("Opened PDFs: old_pages=%d new_pages=%d", old_doc.page_count, new_doc.page_count)

    max_pages = max(old_doc.page_count, new_doc.page_count)
    pages: List[PageDiff] = []

    all_old_words: List[WordBox] = []
    all_new_words: List[WordBox] = []

    old_words_map = old_words_map or {}
    new_words_map = new_words_map or {}

    added_boxes_by_page: Dict[int, List[Tuple[float, float, float, float]]] = {}
    removed_boxes_by_page: Dict[int, List[Tuple[float, float, float, float]]] = {}
    old_lines_by_page: Dict[int, List[LineBox]] = {}
    new_lines_by_page: Dict[int, List[LineBox]] = {}

    # First pass: collect all words with page context for cross-page matching
    old_words_with_page: List[Tuple[WordBox, int]] = []
    new_words_with_page: List[Tuple[WordBox, int]] = []
    
    # Store actual word lists per page for later reference
    stored_old_words: Dict[int, List[WordBox]] = {}
    stored_new_words: Dict[int, List[WordBox]] = {}

    for page_index in range(max_pages):
        has_old = page_index < old_doc.page_count
        has_new = page_index < new_doc.page_count

        if not has_old or not has_new:
            logger.info("Page %d: %s", page_index + 1, "removed" if has_old else "added")
            if has_new:
                new_page = new_doc.load_page(page_index)
                new_words = new_words_map.get(page_index) or extract_words_from_page(new_page)
                if use_ocr and len(new_words) < 10:
                    new_image, new_scale = render_page_image(new_page)
                    logger.info("Page %d: OCR fallback for new PDF (word_count=%d)", page_index + 1, len(new_words))
                    new_words = _scale_ocr_words(ocr_words_from_image(new_image), new_scale)
                stored_new_words[page_index] = new_words
                new_words_with_page.extend([(w, page_index) for w in new_words])
                all_new_words.extend(new_words)
            if has_old:
                old_page = old_doc.load_page(page_index)
                old_words = old_words_map.get(page_index) or extract_words_from_page(old_page)
                if use_ocr and len(old_words) < 10:
                    old_image, old_scale = render_page_image(old_page)
                    logger.info("Page %d: OCR fallback for old PDF (word_count=%d)", page_index + 1, len(old_words))
                    old_words = _scale_ocr_words(ocr_words_from_image(old_image), old_scale)
                stored_old_words[page_index] = old_words
                old_words_with_page.extend([(w, page_index) for w in old_words])
                all_old_words.extend(old_words)
            pages.append(
                PageDiff(
                    page_index=page_index,
                    added_boxes=[],
                    removed_boxes=[],
                    visual_boxes=[],
                    moved_boxes_old=[],
                    moved_boxes_new=[],
                    status="removed_page" if has_old else "added_page",
                )
            )
            continue

        old_page = old_doc.load_page(page_index)
        new_page = new_doc.load_page(page_index)

        old_words = old_words_map.get(page_index) or extract_words_from_page(old_page)
        new_words = new_words_map.get(page_index) or extract_words_from_page(new_page)

        if use_ocr and len(old_words) < 10:
            old_image, old_scale = render_page_image(old_page)
            logger.info("Page %d: OCR fallback for old PDF (word_count=%d)", page_index + 1, len(old_words))
            old_words = _scale_ocr_words(ocr_words_from_image(old_image), old_scale)
        if use_ocr and len(new_words) < 10:
            new_image, new_scale = render_page_image(new_page)
            logger.info("Page %d: OCR fallback for new PDF (word_count=%d)", page_index + 1, len(new_words))
            new_words = _scale_ocr_words(ocr_words_from_image(new_image), new_scale)

        # Store words for later reference
        stored_old_words[page_index] = old_words
        stored_new_words[page_index] = new_words

        # Store words with page context for cross-page matching
        old_words_with_page.extend([(w, page_index) for w in old_words])
        new_words_with_page.extend([(w, page_index) for w in new_words])

        all_old_words.extend(old_words)
        all_new_words.extend(new_words)

        visual_boxes: List[Tuple[float, float, float, float]] = []

        pages.append(
            PageDiff(
                page_index=page_index,
                added_boxes=[],
                removed_boxes=[],
                visual_boxes=visual_boxes,
                moved_boxes_old=[],
                moved_boxes_new=[],
                status="unchanged",
            )
        )
        logger.info(
            "Page %d: status=%s added=%d removed=%d visual=%d",
            page_index + 1,
            pages[-1].status,
            0,
            0,
            len(visual_boxes),
        )

    # Build line boxes for line-level alignment
    for page_index in range(max_pages):
        if page_index < old_doc.page_count:
            old_lines_by_page[page_index] = _build_line_boxes(
                stored_old_words.get(page_index, []), page_index
            )
        if page_index < new_doc.page_count:
            new_lines_by_page[page_index] = _build_line_boxes(
                stored_new_words.get(page_index, []), page_index
            )

    # Detect repeating header/footer lines and filter them out before alignment
    header_footer_old = _detect_repeating_header_footer(old_lines_by_page, old_doc.page_count)
    header_footer_new = _detect_repeating_header_footer(new_lines_by_page, new_doc.page_count)
    if header_footer_old or header_footer_new:
        logger.info(
            "Header/footer detection: old=%d new=%d",
            len(header_footer_old),
            len(header_footer_new),
        )
    old_lines_by_page = _filter_header_footer_lines(
        old_lines_by_page, old_doc.page_count, header_footer_old
    )
    new_lines_by_page = _filter_header_footer_lines(
        new_lines_by_page, new_doc.page_count, header_footer_new
    )

    # Line-level alignment using a greedy streaming cursor in the new PDF
    logger.info("Running line-level alignment (streaming cursor)")
    all_new_lines: List[LineBox] = []
    for new_page_idx in range(new_doc.page_count):
        page_lines = new_lines_by_page.get(new_page_idx, [])
        logger.info("New page %d lines=%d", new_page_idx + 1, len(page_lines))
        all_new_lines.extend(page_lines)
    logger.info("New stream total lines=%d", len(all_new_lines))

    new_cursor = 0
    for page_index in range(old_doc.page_count):
        old_lines = old_lines_by_page.get(page_index, [])
        if not old_lines:
            continue
        logger.info("Page %d: stream cursor start=%d", page_index + 1, new_cursor)

        if new_cursor >= len(all_new_lines):
            removed_boxes_by_page.setdefault(page_index, []).append(
                merge_boxes([line.bbox for line in old_lines])
            )
            continue

        logged_mismatch = False

        insert_blocks: Dict[int, List[LineBox]] = {}
        delete_block: List[LineBox] = []

        old_idx = 0
        max_lookahead = max(20, len(old_lines) * 2)
        # Guarded resync: snap to a nearby match for the first line if it
        # preserves at least 2 of the first 5 lines within 30 lines.
        if old_lines:
            anchor_lines = [line.text for line in old_lines[:5]]
            anchor_first = anchor_lines[0]
            search_end = min(len(all_new_lines), new_cursor + max_lookahead)
            try:
                candidate = next(
                    i
                    for i in range(new_cursor, search_end)
                    if all_new_lines[i].text == anchor_first
                )
            except StopIteration:
                candidate = None
            if candidate is not None:
                matches = 1
                probe_idx = candidate + 1
                for anchor in anchor_lines[1:]:
                    while probe_idx < len(all_new_lines) and probe_idx <= candidate + 30:
                        if all_new_lines[probe_idx].text == anchor:
                            matches += 1
                            probe_idx += 1
                            break
                        probe_idx += 1
                if matches >= 2 and candidate != new_cursor:
                    logger.info(
                        "Page %d: resync cursor from %d to %d (matches=%d)",
                        page_index + 1,
                        new_cursor,
                        candidate,
                        matches,
                    )
                    new_cursor = candidate
        while old_idx < len(old_lines):
            old_line = old_lines[old_idx]
            match_index = None
            search_end = min(len(all_new_lines), new_cursor + max_lookahead)
            for j in range(new_cursor, search_end):
                if all_new_lines[j].text == old_line.text:
                    match_index = j
                    break

            if match_index is None:
                # Multi-line replace: if the next k lines align, treat as replace block.
                replace_span = 0
                for k in range(1, 11):
                    if old_idx + k >= len(old_lines):
                        break
                    if new_cursor + k >= len(all_new_lines):
                        break
                    if old_lines[old_idx + k].text == all_new_lines[new_cursor + k].text:
                        replace_span = k
                        break
                if replace_span:
                    if delete_block:
                        removed_boxes_by_page.setdefault(page_index, []).extend(
                            _merge_line_boxes_by_gap(delete_block)
                        )
                        delete_block = []
                    removed_boxes_by_page.setdefault(page_index, []).extend(
                        _merge_line_boxes_by_gap(old_lines[old_idx:old_idx + replace_span])
                    )
                    for line in all_new_lines[new_cursor:new_cursor + replace_span]:
                        insert_blocks.setdefault(line.page_index, []).append(line)
                    new_cursor += replace_span
                    old_idx += replace_span
                    continue

                if not logged_mismatch:
                    logged_mismatch = True
                delete_block.append(old_line)
                old_idx += 1
                continue

            if delete_block:
                removed_boxes_by_page.setdefault(page_index, []).extend(
                    _merge_line_boxes_by_gap(delete_block)
                )
                delete_block = []

            for j in range(new_cursor, match_index):
                new_line = all_new_lines[j]
                insert_blocks.setdefault(new_line.page_index, []).append(new_line)

            new_cursor = match_index + 1
            old_idx += 1
        logger.info("Page %d: stream cursor end=%d", page_index + 1, new_cursor)

        if delete_block:
            removed_boxes_by_page.setdefault(page_index, []).extend(
                _merge_line_boxes_by_gap(delete_block)
            )

        for page_idx, lines in insert_blocks.items():
            if lines:
                added_boxes_by_page.setdefault(page_idx, []).extend(
                    _merge_line_boxes_by_gap(lines)
                )

    # Any remaining new lines after the last old page are pure additions.
    if new_cursor < len(all_new_lines):
        logger.info(
            "Stream tail: remaining_new_lines=%d from cursor=%d",
            len(all_new_lines) - new_cursor,
            new_cursor,
        )
        remaining_by_page: Dict[int, List[Tuple[float, float, float, float]]] = {}
        for line in all_new_lines[new_cursor:]:
            remaining_by_page.setdefault(line.page_index, []).append(line)
        for page_idx, lines in remaining_by_page.items():
            added_boxes_by_page.setdefault(page_idx, []).extend(
                _merge_line_boxes_by_gap(lines)
            )

    # Apply line-level diff results to pages
    for page_diff in pages:
        if page_diff.status in ("added_page", "removed_page"):
            continue
        page_index = page_diff.page_index
        page_diff.added_boxes = added_boxes_by_page.get(page_index, [])
        page_diff.removed_boxes = removed_boxes_by_page.get(page_index, [])
        page_diff.status = (
            "changed"
            if (page_diff.added_boxes or page_diff.removed_boxes or page_diff.visual_boxes)
            else "unchanged"
        )

    # Same-page move detection: suppress red+green when content only moved within the page
    logger.info("Running same-page move detection")
    _filter_same_page_moves(pages, stored_old_words, stored_new_words)

    # Second pass: Cross-page matching to detect moved content
    # This identifies when content moved from one page to another
    if old_words_with_page and new_words_with_page:
        logger.info("Running cross-page moved-content cleanup")
        # Build word-to-box mappings for each page to track which boxes contain which words
        old_page_word_indices: Dict[int, List[int]] = {}  # page -> list of global word indices
        new_page_word_indices: Dict[int, List[int]] = {}
        
        for idx, (_, page_idx) in enumerate(old_words_with_page):
            old_page_word_indices.setdefault(page_idx, []).append(idx)
        for idx, (_, page_idx) in enumerate(new_words_with_page):
            new_page_word_indices.setdefault(page_idx, []).append(idx)
        
        # Create a global diff to find moved content
        old_tokens = [w.text for w, _ in old_words_with_page]
        new_tokens = [w.text for w, _ in new_words_with_page]
        global_matcher = SequenceMatcher(a=old_tokens, b=new_tokens)
        
        # Track which words were matched across different pages (moved content)
        moved_old_word_indices: Dict[int, set] = {}  # old_page -> set of word indices that moved
        moved_new_word_indices: Dict[int, set] = {}  # new_page -> set of word indices that moved from elsewhere
        
        n_old = len(old_words_with_page)
        n_new = len(new_words_with_page)
        for tag, i1, i2, j1, j2 in global_matcher.get_opcodes():
            if tag != "equal" or (i2 - i1) < 3:
                continue
            if i1 >= n_old or j1 >= n_new or i2 > n_old or j2 > n_new:
                continue
            old_page = old_words_with_page[i1][1]
            new_page = new_words_with_page[j1][1]

            if old_page != new_page:
                    # Content moved between pages - mark all words in this sequence
                    for old_idx in range(i1, i2):
                        moved_old_word_indices.setdefault(old_page, set()).add(old_idx)
                    for new_idx in range(j1, j2):
                        moved_new_word_indices.setdefault(new_page, set()).add(new_idx)
        
        # Now filter out moved content from deleted/added boxes
        # We need to map word indices back to boxes
        for page_index in range(max_pages):
            if page_index >= len(pages):
                continue
                
            page_diff = pages[page_index]
            
            # Get words for this page (use stored words from first pass)
            old_page_words = stored_old_words.get(page_index, [])
            new_page_words = stored_new_words.get(page_index, [])
            
            # Find which boxes correspond to moved words
            moved_old_words = moved_old_word_indices.get(page_index, set())
            moved_new_words = moved_new_word_indices.get(page_index, set())
            
            # Calculate global word start indices for this page
            old_start_idx = sum(len(stored_old_words.get(i, [])) for i in range(page_index))
            new_start_idx = sum(len(stored_new_words.get(i, [])) for i in range(page_index))
            
            # Cross-page moved: put into blue (moved_boxes) instead of dropping
            moved_removed: List[Tuple[float, float, float, float]] = []
            filtered_removed = []
            for removed_box in page_diff.removed_boxes:
                box_contains_moved = False
                if old_page_words and moved_old_words:
                    words_in_box = []
                    for local_idx, word in enumerate(old_page_words):
                        global_idx = old_start_idx + local_idx
                        word_center_x = (word.bbox[0] + word.bbox[2]) / 2
                        word_center_y = (word.bbox[1] + word.bbox[3]) / 2
                        if (removed_box[0] <= word_center_x <= removed_box[2] and
                            removed_box[1] <= word_center_y <= removed_box[3]):
                            words_in_box.append((local_idx, global_idx, word))
                    if words_in_box:
                        moved_in_box = sum(1 for _, gidx, _ in words_in_box if gidx in moved_old_words)
                        if moved_in_box / len(words_in_box) > 0.3:
                            box_contains_moved = True
                if box_contains_moved:
                    moved_removed.append(removed_box)
                else:
                    filtered_removed.append(removed_box)

            moved_added: List[Tuple[float, float, float, float]] = []
            filtered_added = []
            for added_box in page_diff.added_boxes:
                box_contains_moved = False
                if new_page_words and moved_new_words:
                    words_in_box = []
                    for local_idx, word in enumerate(new_page_words):
                        global_idx = new_start_idx + local_idx
                        word_center_x = (word.bbox[0] + word.bbox[2]) / 2
                        word_center_y = (word.bbox[1] + word.bbox[3]) / 2
                        if (added_box[0] <= word_center_x <= added_box[2] and
                            added_box[1] <= word_center_y <= added_box[3]):
                            words_in_box.append((local_idx, global_idx, word))
                    if words_in_box:
                        moved_in_box = sum(1 for _, gidx, _ in words_in_box if gidx in moved_new_words)
                        if moved_in_box / len(words_in_box) > 0.3:
                            box_contains_moved = True
                if box_contains_moved:
                    moved_added.append(added_box)
                else:
                    filtered_added.append(added_box)

            page_diff.removed_boxes = filtered_removed
            page_diff.added_boxes = filtered_added
            page_diff.moved_boxes_old = list(page_diff.moved_boxes_old) + moved_removed
            page_diff.moved_boxes_new = list(page_diff.moved_boxes_new) + moved_added
            
            # Update status
            if (page_diff.moved_boxes_old or page_diff.moved_boxes_new or
                page_diff.removed_boxes or page_diff.added_boxes or page_diff.visual_boxes):
                page_diff.status = "changed"
            else:
                page_diff.status = "unchanged"
        logger.info("Cross-page cleanup complete")

    # Compute real similarity: word-level match ratio via SequenceMatcher
    old_tokens = [w.text for w, _ in old_words_with_page] if old_words_with_page else []
    new_tokens = [w.text for w, _ in new_words_with_page] if new_words_with_page else []
    if old_tokens or new_tokens:
        matcher = SequenceMatcher(a=old_tokens, b=new_tokens)
        similarity_score = matcher.ratio()  # 0..1
    else:
        similarity_score = 1.0 if not old_tokens and not new_tokens else 0.0
    low_confidence = similarity_score < 0.3
    logger.info("Similarity computed: %.4f (word-level)", similarity_score)

    job_id = uuid.uuid4().hex
    annotated_old = output_dir / f"{job_id}_old_annotated.pdf"
    annotated_new = output_dir / f"{job_id}_new_annotated.pdf"

    old_doc_annot = fitz.open(old_path)
    new_doc_annot = fitz.open(new_path)
    logger.info("Annotating PDFs")

    BLUE_MOVED = (0.2, 0.45, 0.9)  # bluish for moved content
    for page in pages:
        if page.page_index < old_doc_annot.page_count:
            old_page = old_doc_annot.load_page(page.page_index)
            add_highlights(old_page, page.removed_boxes, color=(1, 0, 0))
            add_highlights(old_page, page.moved_boxes_old, color=BLUE_MOVED)
        if page.page_index < new_doc_annot.page_count:
            new_page = new_doc_annot.load_page(page.page_index)
            add_highlights(new_page, page.added_boxes, color=(0, 1, 0))
            add_highlights(new_page, page.moved_boxes_new, color=BLUE_MOVED)

    old_doc_annot.save(annotated_old)
    new_doc_annot.save(annotated_new)
    old_doc_annot.close()
    new_doc_annot.close()
    old_doc.close()
    new_doc.close()
    logger.info("Comparison complete: job_id=%s", job_id)

    report_pages = [
        {
            "page_index": p.page_index,
            "status": p.status,
            "added_boxes": p.added_boxes,
            "removed_boxes": p.removed_boxes,
            "visual_boxes": p.visual_boxes,
            "moved_boxes_old": p.moved_boxes_old,
            "moved_boxes_new": p.moved_boxes_new,
        }
        for p in pages
    ]

    return {
        "job_id": job_id,
        "similarity_score": round(similarity_score, 4),
        "low_confidence": low_confidence,
        "pages": report_pages,
        "annotated_old": annotated_old.name,
        "annotated_new": annotated_new.name,
    }


def compare_pdfs_speed(old_path: Path, new_path: Path, output_dir: Path) -> Dict:
    logger.info("Mode: speed (OCR disabled)")
    return _compare_pdfs(old_path, new_path, output_dir, use_ocr=False)


def compare_pdfs_accuracy(old_path: Path, new_path: Path, output_dir: Path) -> Dict:
    logger.info("Mode: accuracy (unstructured=%s)", "enabled" if partition_pdf else "missing")
    old_words_map = _extract_unstructured_words(old_path)
    new_words_map = _extract_unstructured_words(new_path)
    return _compare_pdfs(old_path, new_path, output_dir, old_words_map, new_words_map)


def compare_pdfs(old_path: Path, new_path: Path, output_dir: Path, mode: str) -> Dict:
    normalized_mode = (mode or "speed").lower()
    if normalized_mode == "accuracy":
        report = compare_pdfs_accuracy(old_path, new_path, output_dir)
        report["mode"] = "accuracy"
        report["mode_explanation"] = (
            "Accuracy mode uses layout-aware extraction (Docling/Unstructured) with OCR fallback."
        )
        if partition_pdf is None:
            report["mode_explanation"] += " Unstructured is not installed, so results may be similar to Speed mode."
        return report

    report = compare_pdfs_speed(old_path, new_path, output_dir)
    report["mode"] = "speed"
    report["mode_explanation"] = (
        "Speed mode uses fast text extraction only (no OCR) for quick results; use Accuracy for scanned PDFs."
    )
    return report
