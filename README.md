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

## Usage

1. Open the web application in your browser
2. Upload two PDF files (old and new versions)
3. Select a comparison mode:
   - **Speed**: Fast comparison for large PDFs. Best for quick changes; may miss complex layout shifts.
   - **Accuracy**: Deeper layout-aware comparison. Slower but more reliable for complex or mixed PDFs.
4. Click "Compare" to generate the diff report
5. View the results and download annotated PDFs

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /compare` - Compare two PDFs
  - Form data:
    - `old_pdf`: First PDF file
    - `new_pdf`: Second PDF file
    - `mode`: "speed" or "accuracy" (default: "speed")

## Performance Targets

- **Speed mode**: ~60 pages/min per document
- **Accuracy mode**: ~20 pages/min per document

For very large files (e.g., 800+ pages), Speed mode is recommended by default.

## License

MIT
