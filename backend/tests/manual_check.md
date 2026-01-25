# Manual check

1. Generate sample PDFs:
   - `python backend/tests/generate_samples.py`
2. Start the backend:
   - `uvicorn app:app --reload --port 8000`
3. Start the frontend:
   - `npm install`
   - `npm run dev`
4. Upload `backend/tests/sample_old.pdf` and `backend/tests/sample_new.pdf` in the UI.
5. Run once with **Speed** mode and once with **Accuracy** mode.
6. Verify:
   - Similarity score is high.
   - Added/removed text is highlighted.
   - Mode and explanation match the selected pipeline.
   - Annotated PDFs download and open.
