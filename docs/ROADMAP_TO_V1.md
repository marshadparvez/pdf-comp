# Roadmap to v1.0 (deployable, usable software)

**Current:** v0.4 — moved content (blue), config, dark mode, export, filter, timeout, cleanup.

**Goal:** v1.0 = deployable and **accurate** — better results first, then make it easy to run anywhere.

---

## v0.5 — Accuracy & speed (core upgrades)

Focus on **better results and performance**: extraction, matching, and algorithms. No Docker yet.

### Accuracy improvements

| Area | Current | Options for v0.5 |
|------|--------|-------------------|
| **Text extraction (Speed)** | PyMuPDF `get_text("words")` only. | Try **pdfplumber** for words (often better on tables/columns); or PyMuPDF **layout mode** (`get_text("dict")` / blocks) for reading order; optional **fallback chain**: pdfplumber → PyMuPDF. |
| **Text extraction (Accuracy)** | Unstructured `partition_pdf` + OCR for &lt;10 words. | Tune Unstructured **strategy** (hi_res vs fast); add **language** for Tesseract (e.g. `lang='eng'`); optional **confidence** threshold to trigger OCR earlier (e.g. &lt;50 words or low confidence). |
| **Word/line matching** | Exact string match in SequenceMatcher. | **Normalize** before diff: lowercase, collapse whitespace, optional strip punctuation; or use **fuzzy** match (e.g. `rapidfuzz`) for line alignment so minor typos don’t break blocks. |
| **Move detection** | Jaccard (same-page), exact runs (cross-page). | **Tune** Jaccard/size ratio via config (already there); try **Levenshtein ratio** for near-moves; **longer run** for cross-page (e.g. min 4 words); optional “relaxed” mode (lower threshold) in UI. |
| **Edge cases** | Line-based; tables can fragment. | **Table detection**: if Unstructured gives tables, compare by cell or skip table lines in line-cursor; **multi-column**: sort blocks by reading order (x then y) where supported. |
| **Low confidence** | Flag set, minimal UX. | **Clear UI message**: “Some pages had little text; comparison may be incomplete.” Link to which pages. |

### Speed improvements

| Area | Current | Options for v0.5 |
|------|--------|-------------------|
| **Accuracy mode** | Unstructured per doc; OCR per low-text page. | **Parallelize** page extraction (e.g. `concurrent.futures` per page); **cache** Unstructured raw elements per hash of file (optional, for repeat runs). |
| **OCR** | Tesseract default config. | **Faster Tesseract**: `--oem 1` (LSTM only), lower DPI for big pages; or **skip** OCR for Speed and only recommend Accuracy for scanned PDFs. |
| **Visual diff** | OpenCV; only when OCR runs (Accuracy). | Keep as-is or make **optional** (config flag) so Speed never touches render/OpenCV. |
| **Memory** | Load full docs. | **Stream** page-by-page where possible (e.g. extract one page at a time in Accuracy); release fitz pages after use. |

### Suggested v0.5 scope (pick what to do first)

1. **Normalize text in diff** — Lowercase + collapse spaces (and optional strip punctuation) before `SequenceMatcher`. Fewer false add/remove from casing or spaces.
2. **Try pdfplumber for Speed** — Add pdfplumber as optional extractor; compare word boxes vs PyMuPDF on a few PDFs; choose default or fallback.
3. **Tune OCR / low-text** — Tesseract language config; optional env `PDF_OCR_LANG`; consider “low text” threshold (e.g. &lt;20 words) and document in README.
4. **Fuzzy line matching (optional)** — For line-level alignment, allow fuzzy match (e.g. ratio &gt; 0.9) so “Section 1” vs “Section 1.” still aligns.
5. **Cross-page move: longer runs** — Require minimum word count (e.g. 4) for a run to count as “moved” to reduce noise.
6. **Low-confidence UX** — Show explicit message when `low_confidence` is true; optionally list page numbers.
7. **Parallel page extraction (Accuracy)** — Use a thread pool to extract pages in parallel in Accuracy mode to reduce wall-clock time.

---

## v0.6 — Deployability & reliability

Make the app **runnable anywhere** and robust.

| Priority | Item |
|----------|------|
| **P0** | Docker (backend + frontend build) + `docker-compose.yml`. |
| **P0** | README: “Running with Docker”, env vars for production. |
| **P1** | Real progress (async compare + polling or SSE). |
| **P1** | Client-side file size check (max 100 MB before upload). |
| **P2** | Configurable limits (env: max size, timeout). |

---

## v0.7 — UX polish

| Item | Notes |
|------|--------|
| Responsive layout | Usable on tablet/small screens. |
| Keyboard shortcut help | e.g. `?` to show shortcuts. |
| Compare again | Reuse same files, switch mode without re-upload. |
| Better loading | Show real progress (page N of M) when available. |

---

## v0.8–v0.9 — Toward v1.0

| Item | Notes |
|------|--------|
| Health / readiness | Optional `/ready` for dependencies. |
| Structured logging | Request ID, timing, mode. |
| Consistent error shape | API error code + message; frontend copy. |
| Optional PDF validation | Reject encrypted/corrupted early. |

---

## v1.0 — Deployable release

- Core: v0.5 (accuracy/speed) + v0.6 (deploy) + v0.7 (UX) as far as done.
- README: one-line Docker run, configuration, limits.
- Tag **v1.0** as first stable, deployable release.

---

## Summary

- **v0.5** = **Software upgrades**: better extraction, matching, normalization, tuning, optional parallelization. No Docker.
- **v0.6** = Docker, README deploy, progress, file size check.
- **v0.7** = UX polish.
- **v0.8–1.0** = Ops and release.

Start with v0.5 items above; then move to deployability in v0.6.
