# How the PDF comparison works (Speed vs Accuracy)

Both modes use **the same comparison algorithm**. The only difference is **how text is extracted** from each page. After that, the pipeline is identical.

---

## 1. Word extraction (the only difference)

| Step | Speed | Accuracy |
|------|--------|----------|
| **Per-page words** | **pdfplumber** when installed (v0.5), else **PyMuPDF**. Fast, no rendering. Better on tables/columns with pdfplumber. | **Unstructured** first (`partition_pdf` with hi_res strategy). Layout-aware, better for complex PDFs. Both PDFs extracted **in parallel** (v0.5). |
| **Low-text pages** (< 10 words) | **No OCR.** Uses whatever was extracted (can be empty). | **OCR fallback:** render page to image → Tesseract → word boxes. Slower but works for scanned pages. |
| **When to use** | Normal digital PDFs, quick results. | Scanned PDFs, complex layouts, when you need best text recovery. |

So:

- **Speed:** `compare_pdfs_speed` → pdfplumber (or PyMuPDF) for both PDFs → `_compare_pdfs(..., use_ocr=False)`. No Unstructured, no OCR.
- **Accuracy:** `compare_pdfs_accuracy` → runs Unstructured on **both** PDFs **in parallel** → `_compare_pdfs(..., old_words_map, new_words_map)` with `use_ocr=True`. For any page with < 10 words it also runs render + OCR.

Everything below runs the same in both modes.

---

## 2. Shared pipeline (same algorithm)

Once you have **words per page** (with bounding boxes), the rest is one flow.

### 2.1 Page-level setup

- For each page index: if the page exists only in old or only in new, it’s marked **added_page** / **removed_page** and we still extract words for cross-page logic.
- For pages in both: we have `stored_old_words[page]` and `stored_new_words[page]` (and flat lists with page context for later).

### 2.2 Lines from words

- **`_build_line_boxes(words, page_index)`**  
  Words are sorted by (y, x), grouped into lines with a small y-tolerance, then each line becomes a `LineBox`: one text string and one bbox.  
  So we get **old_lines_by_page** and **new_lines_by_page**.

### 2.3 Header/footer filtering (v0.3.0)

- **`_detect_repeating_header_footer`** finds lines that repeat on many pages (e.g. page numbers, “Confidential”).
- **`_filter_header_footer_lines`** keeps those lines in the structure but they’re excluded from the alignment step so they don’t cause false “changed” blocks at the top/bottom of pages.

### 2.4 Line-level diff: streaming cursor (greedy)

- **New doc** is treated as one long stream: `all_new_lines` = concat of lines from page 0, 1, 2, …
- For each **old** page in order:
  - We maintain a **cursor** in `all_new_lines`.
  - For each **old line** we look for the **next matching line** in the new stream (from cursor up to a lookahead limit).
  - **Match:** advance cursor past that new line; no highlight.
  - **No match:** either:
    - **Multi-line replace (1–10 lines):** if the next k lines in old match the next k in new, we treat that as a replace block: old block → red (removed), new block → green (added). Cursor advances.
    - **Otherwise:** old line → red (delete); cursor stays.
  - **Resync:** if the first line of the old page doesn’t match at the current cursor, we search ahead for a “good” match (e.g. 2 of the first 5 lines matching within 30 lines) and move the cursor there to avoid one big insertion/deletion when content was reflowed.

- **`_merge_line_boxes_by_gap`** is used so we don’t get one highlight per line: only **adjacent** lines (within a small vertical gap) are merged into one box. That’s why you see fewer, cleaner green/red regions instead of full-page blocks.

- Any **remaining new lines** after the last old page are pure **additions** (green).

Result: **added_boxes_by_page** and **removed_boxes_by_page** (lists of bboxes per page).

### 2.5 Cross-page “moved content” cleanup

- We have **old_words_with_page** and **new_words_with_page** (flat list of (word, page_index)).
- **SequenceMatcher** on the two full word sequences finds **equal** stretches of 3+ words.
- If an equal stretch is on **different** pages (e.g. old page 2 vs new page 4), we mark those words as **moved**.
- Then we **filter** the added/removed boxes: if a box’s words are mostly “moved” (>30%), we **drop** that box so we don’t show red/green for content that just moved to another page.

### 2.6 Output

- **add_highlights** draws **red** on the old PDF for `removed_boxes` and **green** on the new PDF for `added_boxes`.
- PDFs are saved; the API returns job_id, pages (with status and box lists), and download URLs.

---

## 3. Summary

| Phase | Speed | Accuracy |
|-------|--------|----------|
| **Words** | PyMuPDF only, no OCR | Unstructured + OCR when &lt; 10 words/page |
| **Lines** | Same | Same |
| **Header/footer** | Same | Same |
| **Line alignment (streaming cursor)** | Same | Same |
| **Adjacent-line merging** | Same | Same |
| **Cross-page moved cleanup** | Same | Same |
| **Annotation** | Same | Same |

So: **Speed** and **Accuracy** are the same algorithm; only the **source of the words** (and whether we run OCR on low-text pages) changes.
