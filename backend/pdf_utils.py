from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Tuple

import fitz  # PyMuPDF
import numpy as np
import pytesseract
from PIL import Image
import cv2


@dataclass
class WordBox:
    text: str
    bbox: Tuple[float, float, float, float]


def render_page_image(page: fitz.Page, zoom: float = 2.0) -> Tuple[Image.Image, float]:
    matrix = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    return image, zoom


def extract_words_from_page(page: fitz.Page) -> List[WordBox]:
    words = []
    for x0, y0, x1, y1, text, *_ in page.get_text("words"):
        if not text.strip():
            continue
        words.append(WordBox(text=text, bbox=(x0, y0, x1, y1)))
    return words


def ocr_words_from_image(image: Image.Image) -> List[WordBox]:
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    words: List[WordBox] = []
    for i in range(len(data["text"])):
        text = data["text"][i].strip()
        if not text:
            continue
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        words.append(WordBox(text=text, bbox=(x, y, x + w, y + h)))
    return words


def normalize_text(words: Iterable[WordBox]) -> str:
    return " ".join(word.text.lower() for word in words if word.text.strip())


def merge_boxes(boxes: Iterable[Tuple[float, float, float, float]]) -> Tuple[float, float, float, float]:
    boxes = list(boxes)
    if not boxes:
        return (0.0, 0.0, 0.0, 0.0)
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes)
    y1 = max(b[3] for b in boxes)
    return (x0, y0, x1, y1)


def scale_boxes(
    boxes: Iterable[Tuple[float, float, float, float]], scale: float
) -> List[Tuple[float, float, float, float]]:
    return [(b[0] / scale, b[1] / scale, b[2] / scale, b[3] / scale) for b in boxes]


def compute_visual_diff_boxes(
    image_a: Image.Image, image_b: Image.Image, min_area: int = 200
) -> List[Tuple[float, float, float, float]]:
    # Convert to same size
    width = min(image_a.width, image_b.width)
    height = min(image_a.height, image_b.height)
    img_a = np.array(image_a.resize((width, height)))
    img_b = np.array(image_b.resize((width, height)))

    gray_a = cv2.cvtColor(img_a, cv2.COLOR_RGB2GRAY)
    gray_b = cv2.cvtColor(img_b, cv2.COLOR_RGB2GRAY)
    diff = cv2.absdiff(gray_a, gray_b)
    _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w * h < min_area:
            continue
        boxes.append((float(x), float(y), float(x + w), float(y + h)))
    return boxes


def compute_visual_similarity(image_a: Image.Image, image_b: Image.Image) -> float:
    width = min(image_a.width, image_b.width)
    height = min(image_a.height, image_b.height)
    img_a = np.array(image_a.resize((width, height)))
    img_b = np.array(image_b.resize((width, height)))

    gray_a = cv2.cvtColor(img_a, cv2.COLOR_RGB2GRAY)
    gray_b = cv2.cvtColor(img_b, cv2.COLOR_RGB2GRAY)
    diff = cv2.absdiff(gray_a, gray_b)
    diff_ratio = float(np.count_nonzero(diff)) / float(diff.size)
    return max(0.0, 1.0 - diff_ratio)


def add_highlights(
    page: fitz.Page,
    boxes: Iterable[Tuple[float, float, float, float]],
    color: Tuple[float, float, float],
) -> None:
    for box in boxes:
        rect = fitz.Rect(*box)
        annot = page.add_rect_annot(rect)
        annot.set_colors(stroke=color, fill=color)
        annot.set_opacity(0.3)
        annot.update()
