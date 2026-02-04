# Manual check

1. Generate sample PDFs:
   - `python backend/tests/generate_samples.py`
2. Start the backend:
   - `uvicorn app:app --reload --port 8010`
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

## Sharing results for analysis

To have someone (or an AI) analyze a run for errors or improvements:

**Option A — Backend logs**  
Run the backend in a terminal (not in the background). After a compare, copy the terminal output from the request start to the "Comparison complete" line and paste it. Logs include: page counts, OCR fallback, line-level cursor, same-page/cross-page move, similarity, duration, word counts.

**Option B — API response (diagnostics)**  
1. Open browser DevTools (F12) → **Network** tab.  
2. Run a compare.  
3. Click the `compare` request → **Response** tab.  
4. Copy the JSON (or at least `diagnostics`, `similarity_score`, `low_confidence`, `low_confidence_pages`).  
5. Paste that for analysis.

The response now includes a **diagnostics** object:
- `old_pages`, `new_pages` — page counts  
- `total_old_words`, `total_new_words` — words extracted per document  
- `low_confidence_pages` — page indices with very few words  
- `duration_seconds` — time taken for the compare (added in app layer)
