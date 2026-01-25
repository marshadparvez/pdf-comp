from __future__ import annotations

import logging
import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from diff_pipeline import compare_pdfs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

MAX_PDF_BYTES = 100 * 1024 * 1024  # 100 MB

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/results", StaticFiles(directory=RESULTS_DIR), name="results")


def _is_pdf_filename(name: str | None) -> bool:
    if not name or not name.strip():
        return False
    return name.lower().rstrip().endswith(".pdf")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/compare")
async def compare(
    old_pdf: UploadFile = File(...),
    new_pdf: UploadFile = File(...),
    mode: str = Form("speed"),
) -> JSONResponse:
    if not _is_pdf_filename(old_pdf.filename):
        raise HTTPException(400, "Original file must be a PDF.")
    if not _is_pdf_filename(new_pdf.filename):
        raise HTTPException(400, "Updated file must be a PDF.")
    normalized_mode = (mode or "speed").strip().lower()
    if normalized_mode not in ("speed", "accuracy"):
        raise HTTPException(400, "mode must be 'speed' or 'accuracy'.")

    job_dir = RESULTS_DIR / "uploads" / uuid.uuid4().hex
    job_dir.mkdir(parents=True, exist_ok=True)
    old_path = job_dir / "old.pdf"
    new_path = job_dir / "new.pdf"

    try:
        with old_path.open("wb") as f:
            shutil.copyfileobj(old_pdf.file, f)
        with new_path.open("wb") as f:
            shutil.copyfileobj(new_pdf.file, f)

        for label, path in [("original", old_path), ("updated", new_path)]:
            size = path.stat().st_size
            if size > MAX_PDF_BYTES:
                raise HTTPException(
                    413,
                    f"{label.capitalize()} PDF exceeds max size ({(MAX_PDF_BYTES // (1024 * 1024))} MB).",
                )

        report = compare_pdfs(old_path, new_path, RESULTS_DIR, normalized_mode)

        logger.info(
            "compare job_id=%s mode=%s similarity=%.4f low_confidence=%s",
            report["job_id"],
            report["mode"],
            report["similarity_score"],
            report["low_confidence"],
        )

        return JSONResponse(
            {
                "job_id": report["job_id"],
                "mode": report["mode"],
                "mode_explanation": report["mode_explanation"],
                "similarity_score": report["similarity_score"],
                "low_confidence": report["low_confidence"],
                "pages": report["pages"],
                "downloads": {
                    "annotated_old": f"/results/{report['annotated_old']}",
                    "annotated_new": f"/results/{report['annotated_new']}",
                },
            }
        )
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)
