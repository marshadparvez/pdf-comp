# PDF Comparison Tool

A dual-pipeline PDF comparison web application that supports both speed and accuracy modes for comparing PDF documents.

## Features

- **Dual Pipeline Support**:
  - **Speed Mode**: Fast comparison using pdfplumber + OCR + OpenCV for quick processing
  - **Accuracy Mode**: Layout-aware comparison using Docling + Unstructured + OCR for better structure fidelity

- **Comparison Capabilities**:
  - Text diffs (added/removed/changed words)
  - Visual diffs (layout/format changes)
  - Automatic OCR fallback for pages with little/no extractable text
  - Similarity scoring with low-confidence warnings
  - Annotated PDF downloads

## Architecture

```
User -> WebUI -> API -> Router -> SpeedPipeline/AccuracyPipeline -> DiffEngine -> Report + AnnotatedPDF -> WebUI
```

## Project Structure

```
pdf/
├── backend/          # FastAPI backend
│   ├── app.py       # Main API server
│   ├── diff_pipeline.py  # Pipeline router and comparison logic
│   ├── pdf_utils.py      # PDF utilities
│   └── requirements.txt  # Python dependencies
├── frontend/        # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadForm.tsx
│   │   │   └── DiffReport.tsx
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
uvicorn app:app --reload
```

The API will be available at `http://localhost:8000`

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

### Frontend configuration

Create `frontend/.env` (see `frontend/.env.example`) and optionally set:

- `VITE_API_BASE` — API root URL (default: `http://localhost:8000`)

## Usage

1. Open the web application in your browser
2. Upload two PDF files (old and new versions)
3. Select a comparison mode:
   - **Speed**: Fast comparison for large PDFs. Best for quick changes; may miss complex layout shifts.
   - **Accuracy**: Deeper layout-aware comparison. Slower but more reliable for complex or mixed PDFs.
4. Click "Compare" to generate the diff report
5. View the results and download annotated PDFs

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

## Recent improvements

- **Frontend**: Configurable API base URL (`VITE_API_BASE`), clearer error messages from the API, similarity shown as %, highlight legend (removed/added/visual), "Compare again" button, selected filenames and mode explanations in the upload form.
- **Backend**: PDF-only and `mode` validation, 100 MB max file size, upload directory cleanup after each compare, structured logging of job_id, mode, similarity, and low_confidence.

## License

MIT
