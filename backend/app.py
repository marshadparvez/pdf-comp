from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from diff_pipeline import compare_pdfs

BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/results", StaticFiles(directory=RESULTS_DIR), name="results")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/compare")
async def compare(
    old_pdf: UploadFile = File(...),
    new_pdf: UploadFile = File(...),
    mode: str = Form("speed"),
) -> JSONResponse:
    job_dir = RESULTS_DIR / "uploads" / uuid.uuid4().hex
    job_dir.mkdir(parents=True, exist_ok=True)

    old_path = job_dir / "old.pdf"
    new_path = job_dir / "new.pdf"

    with old_path.open("wb") as old_file:
        shutil.copyfileobj(old_pdf.file, old_file)
    with new_path.open("wb") as new_file:
        shutil.copyfileobj(new_pdf.file, new_file)

    report = compare_pdfs(old_path, new_path, RESULTS_DIR, mode)

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
