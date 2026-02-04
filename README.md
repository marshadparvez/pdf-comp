# PDF Comparison Tool

**v0.4** — A dual-pipeline PDF comparison web application that supports both speed and accuracy modes for comparing PDF documents.

## Features

- **Dual Pipeline Support**:
  - **Speed Mode**: Fast comparison using pdfplumber; OCR only when needed. Best for large PDFs.
  - **Accuracy Mode**: Layout-aware comparison using Docling + Unstructured + OCR for better structure fidelity

- **Comparison Capabilities**:
  - Text diffs: **added** (green), **removed** (red), **moved** (blue), **edited** (red on old + green on new)
  - **Moved content**: Same text in a new position (same page or across pages) is highlighted in blue on both PDFs
  - Same-page move detection via Jaccard similarity; cross-page move detection via exact matching
  - Visual diffs (layout/format changes)
  - Automatic OCR fallback for pages with little/no extractable text
  - Similarity score (0–1) with low-confidence warnings
  - Annotated PDF downloads

- **Frontend**:
  - Dark mode toggle, export report (HTML), filter pages by change type (added/removed/moved)
  - Compact legend (removed / added / moved), per-page change counts, keyboard shortcuts (arrows, Page Up/Down)
  - Request timeout (130s) with retry on failure; clearer error messages

## Architecture

```
User -> WebUI -> API -> Router -> SpeedPipeline/AccuracyPipeline -> DiffEngine -> Report + AnnotatedPDF -> WebUI
```

## Project Structure

```
pdf/
├── backend/              # FastAPI backend
│   ├── app.py             # Main API server
│   ├── config.py          # Tunable thresholds (env overrides)
│   ├── diff_pipeline.py   # Pipeline router and comparison logic
│   ├── pdf_utils.py       # PDF utilities
│   ├── requirements.txt
│   └── tests/
├── docs/                  # Documentation
│   └── HOW_COMPARISON_WORKS.md
├── frontend/              # React + TypeScript (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadForm.tsx
│   │   │   ├── DiffReport.tsx
│   │   │   ├── ChangesReport.tsx
│   │   │   └── LoadingProgress.tsx
│   │   ├── api.ts
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## Setup

### System dependencies (required for Accuracy mode)

**Accuracy** mode uses Unstructured’s layout-aware PDF parsing, which needs **poppler** (and its `pdfinfo` tool) installed on your system. **Speed** mode works without it.

| OS | Install command |
|----|------------------|
| **macOS** (Homebrew) | `brew install poppler` |
| **Ubuntu / Debian** | `sudo apt install poppler-utils` |
| **Fedora** | `sudo dnf install poppler-utils` |
| **Windows** | [Poppler for Windows](https://github.com/oschwartz10612/poppler-windows/releases) — add the `bin` folder to your PATH |

If poppler is missing and you use Accuracy mode, the compare request will fail with an error about `pdfinfo` or “Is poppler installed and in PATH?”.

### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the server:
```bash
uvicorn app:app --reload --port 8010
```

The API will be available at `http://localhost:8010`

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port shown in the terminal)

### Backend configuration (optional)

Set environment variables to tune comparison behavior:

- `PDF_DIFF_JACCARD_THRESHOLD` — Same-page move threshold 0–1 (default: 0.95). Higher = stricter (edited stays red+green).
- `PDF_DIFF_MIN_WORDS` — Min words in a box to consider for same-page move (default: 3).
- `PDF_DIFF_SIZE_RATIO` — Min size ratio (min/max word count) for pairing (default: 0.5).

### Frontend configuration

Create `frontend/.env` (see `frontend/.env.example`) and optionally set:

- `VITE_API_BASE` — API root URL (default: `http://localhost:8010`)

## Usage

1. Open the web application in your browser.
2. Upload two PDF files (old and new versions).
3. Select a comparison mode:
   - **Speed**: Fast comparison for large PDFs. Best for quick changes; may miss complex layout shifts.
   - **Accuracy**: Deeper layout-aware comparison. Slower but more reliable for complex or mixed PDFs.
4. Click **Compare** to generate the diff report.
5. View the results (per-page stats, filter by change type), use the legend (red = removed, green = added, blue = moved), and download annotated PDFs or export the report as HTML.

## API Endpoints

- `GET /health` — Health check endpoint
- `POST /compare` — Compare two PDFs
  - Form data:
    - `old_pdf`: First PDF file (must be PDF, max 100 MB)
    - `new_pdf`: Second PDF file (must be PDF, max 100 MB)
    - `mode`: `"speed"` or `"accuracy"` (default: `"speed"`)
  - Validation: PDF filename required; file size limit 100 MB. Invalid requests return 400/413 with a clear error message.

## Performance Targets

- **Speed mode**: ~60 pages/min per document
- **Accuracy mode**: ~20 pages/min per document

For very large files (e.g., 800+ pages), Speed mode is recommended by default.

## Changelog / v0.4

- **Backend**: Moved content (blue) on both PDFs for same-page (Jaccard) and cross-page moves; tunable thresholds via `config.py` and env vars; real similarity score (SequenceMatcher); bounds checks for differing page counts; Speed mode skips OCR when not needed to avoid hangs.
- **Frontend**: Moved-content legend and per-page stats; filter pages by change type (added/removed/moved); dark mode; export report (HTML); keyboard shortcuts (arrows, Page Up/Down); 130s request timeout with retry; accessibility (aria-labels); compact legend and loading state with mode.

## License

MIT
