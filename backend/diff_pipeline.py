from __future__ import annotations

import uuid
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz

from pdf_utils import (
    WordBox,
    add_highlights,
    compute_visual_diff_boxes,
    compute_visual_similarity,
    extract_words_from_page,
    merge_boxes,
    normalize_text,
    ocr_words_from_image,
    render_page_image,
    scale_boxes,
)

try:
    from unstructured.partition.pdf import partition_pdf
except Exception:  # pragma: no cover - optional dependency
    partition_pdf = None


@dataclass
class PageDiff:
    page_index: int
    added_boxes: List[Tuple[float, float, float, float]]
    removed_boxes: List[Tuple[float, float, float, float]]
    visual_boxes: List[Tuple[float, float, float, float]]
    status: str


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
) -> Dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    old_doc = fitz.open(old_path)
    new_doc = fitz.open(new_path)

    max_pages = max(old_doc.page_count, new_doc.page_count)
    pages: List[PageDiff] = []

    all_old_words: List[WordBox] = []
    all_new_words: List[WordBox] = []
    visual_scores: List[float] = []

    old_words_map = old_words_map or {}
    new_words_map = new_words_map or {}

    for page_index in range(max_pages):
        has_old = page_index < old_doc.page_count
        has_new = page_index < new_doc.page_count

        if not has_old or not has_new:
            if has_old:
                page = old_doc.load_page(page_index)
                width, height = page.rect.width, page.rect.height
                pages.append(
                    PageDiff(
                        page_index=page_index,
                        added_boxes=[],
                        removed_boxes=[(0.0, 0.0, width, height)],
                        visual_boxes=[],
                        status="removed_page",
                    )
                )
            else:
                page = new_doc.load_page(page_index)
                width, height = page.rect.width, page.rect.height
                pages.append(
                    PageDiff(
                        page_index=page_index,
                        added_boxes=[(0.0, 0.0, width, height)],
                        removed_boxes=[],
                        visual_boxes=[],
                        status="added_page",
                    )
                )
            continue

        old_page = old_doc.load_page(page_index)
        new_page = new_doc.load_page(page_index)

        old_image, old_scale = render_page_image(old_page)
        new_image, new_scale = render_page_image(new_page)

        old_words = old_words_map.get(page_index) or extract_words_from_page(old_page)
        new_words = new_words_map.get(page_index) or extract_words_from_page(new_page)

        if len(old_words) < 10:
            old_words = _scale_ocr_words(ocr_words_from_image(old_image), old_scale)
        if len(new_words) < 10:
            new_words = _scale_ocr_words(ocr_words_from_image(new_image), new_scale)

        all_old_words.extend(old_words)
        all_new_words.extend(new_words)

        added_boxes, removed_boxes = diff_word_boxes(old_words, new_words)

        visual_boxes = compute_visual_diff_boxes(old_image, new_image)
        visual_boxes = scale_boxes(visual_boxes, min(old_scale, new_scale))
        visual_scores.append(compute_visual_similarity(old_image, new_image))

        pages.append(
            PageDiff(
                page_index=page_index,
                added_boxes=added_boxes,
                removed_boxes=removed_boxes,
                visual_boxes=visual_boxes,
                status="changed" if (added_boxes or removed_boxes or visual_boxes) else "unchanged",
            )
        )

    text_similarity = SequenceMatcher(
        a=normalize_text(all_old_words), b=normalize_text(all_new_words)
    ).ratio()
    visual_similarity = sum(visual_scores) / len(visual_scores) if visual_scores else 0.0
    similarity_score = 0.6 * text_similarity + 0.4 * visual_similarity
    low_confidence = similarity_score < 0.5

    job_id = uuid.uuid4().hex
    annotated_old = output_dir / f"{job_id}_old_annotated.pdf"
    annotated_new = output_dir / f"{job_id}_new_annotated.pdf"

    old_doc_annot = fitz.open(old_path)
    new_doc_annot = fitz.open(new_path)

    for page in pages:
        if page.page_index < old_doc_annot.page_count:
            old_page = old_doc_annot.load_page(page.page_index)
            add_highlights(old_page, page.removed_boxes, color=(1, 0, 0))
            add_highlights(old_page, page.visual_boxes, color=(1, 1, 0))
        if page.page_index < new_doc_annot.page_count:
            new_page = new_doc_annot.load_page(page.page_index)
            add_highlights(new_page, page.added_boxes, color=(0, 1, 0))
            add_highlights(new_page, page.visual_boxes, color=(1, 1, 0))

    old_doc_annot.save(annotated_old)
    new_doc_annot.save(annotated_new)
    old_doc_annot.close()
    new_doc_annot.close()
    old_doc.close()
    new_doc.close()

    report_pages = [
        {
            "page_index": p.page_index,
            "status": p.status,
            "added_boxes": p.added_boxes,
            "removed_boxes": p.removed_boxes,
            "visual_boxes": p.visual_boxes,
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
    return _compare_pdfs(old_path, new_path, output_dir)


def compare_pdfs_accuracy(old_path: Path, new_path: Path, output_dir: Path) -> Dict:
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
        "Speed mode uses fast text extraction with OCR fallback for large PDFs."
    )
    return report
