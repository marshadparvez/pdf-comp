import type { CompareResponse } from "../api";

type DiffReportProps = {
  report: CompareResponse;
};

export default function DiffReport({ report }: DiffReportProps) {
  return (
    <section style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
      <div>
        <h2>Results</h2>
        <p>
          Mode: {report.mode} — {report.mode_explanation}
        </p>
        <p>Similarity score: {report.similarity_score}</p>
        {report.low_confidence && (
          <p style={{ color: "#b42318" }}>
            These PDFs look unrelated. Diff results may be low-confidence.
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <a href={`http://localhost:8000${report.downloads.annotated_old}`} target="_blank" rel="noreferrer">
          Download annotated original
        </a>
        <a href={`http://localhost:8000${report.downloads.annotated_new}`} target="_blank" rel="noreferrer">
          Download annotated updated
        </a>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <h3>Page summary</h3>
        {report.pages.map((page) => (
          <div key={page.page_index} style={{ borderBottom: "1px solid #ddd", paddingBottom: "8px" }}>
            <strong>Page {page.page_index + 1}:</strong> {page.status}
            <div>
              Added: {page.added_boxes.length}, Removed: {page.removed_boxes.length}, Visual:{" "}
              {page.visual_boxes.length}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        <h3>Annotated PDFs</h3>
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr" }}>
          <embed
            src={`http://localhost:8000${report.downloads.annotated_old}`}
            type="application/pdf"
            width="100%"
            height="500px"
          />
          <embed
            src={`http://localhost:8000${report.downloads.annotated_new}`}
            type="application/pdf"
            width="100%"
            height="500px"
          />
        </div>
      </div>
    </section>
  );
}
