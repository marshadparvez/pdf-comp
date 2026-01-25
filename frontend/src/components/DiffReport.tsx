import type { CompareResponse } from "../api";
import { API_BASE } from "../api";

type DiffReportProps = {
  report: CompareResponse;
  onCompareAgain?: () => void;
};

export default function DiffReport({ report, onCompareAgain }: DiffReportProps) {
  const base = API_BASE.replace(/\/$/, "");
  const similarityPct = Math.round(report.similarity_score * 100);

  return (
    <section style={{ display: "grid", gap: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "24px",
          borderBottom: "2px solid #e9ecef",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "2rem", fontWeight: 700, color: "#212529" }}>
            Comparison Results
          </h2>
          <div style={{ display: "grid", gap: "8px" }}>
            <p style={{ margin: 0, color: "#6c757d" }}>
              Mode: <strong style={{ color: "#212529" }}>{report.mode}</strong> — {report.mode_explanation}
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: similarityPct >= 80 ? "#d4edda" : similarityPct >= 50 ? "#fff3cd" : "#f8d7da",
                borderRadius: "8px",
                width: "fit-content",
              }}
            >
              <span style={{ fontSize: "1.2em" }}>{similarityPct >= 80 ? "✅" : similarityPct >= 50 ? "⚠️" : "❌"}</span>
              <span style={{ fontWeight: 600, color: "#212529" }}>Similarity: {similarityPct}%</span>
            </div>
            {report.low_confidence && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "12px 16px",
                  background: "#fff5f5",
                  border: "1px solid #feb2b2",
                  borderRadius: "8px",
                  color: "#c53030",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>⚠️</span>
                <span>These PDFs look unrelated. Diff results may be low-confidence.</span>
              </div>
            )}
          </div>
        </div>
        {onCompareAgain && (
          <button
            type="button"
            onClick={onCompareAgain}
            style={{
              padding: "10px 20px",
              background: "white",
              border: "2px solid #667eea",
              borderRadius: "8px",
              color: "#667eea",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#667eea";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.color = "#667eea";
            }}
          >
            Compare again
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "16px",
          background: "#f8f9fa",
          borderRadius: "8px",
        }}
      >
        <span style={{ fontWeight: 600, color: "#495057", fontSize: "0.95em" }}>Highlights:</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "16px",
              height: "16px",
              background: "#dc3545",
              opacity: 0.8,
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
          <span style={{ color: "#495057", fontSize: "0.9em" }}>Removed</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "16px",
              height: "16px",
              background: "#28a745",
              opacity: 0.8,
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
          <span style={{ color: "#495057", fontSize: "0.9em" }}>Added</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "16px",
              height: "16px",
              background: "#ffc107",
              opacity: 0.8,
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
          <span style={{ color: "#495057", fontSize: "0.9em" }}>Visual changes</span>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <a
          href={`${base}${report.downloads.annotated_old}`}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: 600,
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
          }}
        >
          📥 Download annotated original
        </a>
        <a
          href={`${base}${report.downloads.annotated_new}`}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: 600,
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
          }}
        >
          📥 Download annotated updated
        </a>
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#212529" }}>Page Summary</h3>
        <div
          style={{
            display: "grid",
            gap: "12px",
            background: "#f8f9fa",
            padding: "20px",
            borderRadius: "12px",
          }}
        >
          {report.pages.map((page) => (
            <div
              key={page.page_index}
              style={{
                padding: "16px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e9ecef";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ color: "#212529", fontSize: "1.05em" }}>Page {page.page_index + 1}</strong>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "0.85em",
                    fontWeight: 600,
                    background:
                      page.status === "unchanged"
                        ? "#d4edda"
                        : page.status === "changed"
                          ? "#fff3cd"
                          : page.status === "added_page"
                            ? "#d1ecf1"
                            : "#f8d7da",
                    color:
                      page.status === "unchanged"
                        ? "#155724"
                        : page.status === "changed"
                          ? "#856404"
                          : page.status === "added_page"
                            ? "#0c5460"
                            : "#721c24",
                  }}
                >
                  {page.status.replace("_", " ")}
                </span>
              </div>
              <div style={{ display: "flex", gap: "16px", fontSize: "0.9em", color: "#6c757d" }}>
                <span>
                  <strong style={{ color: "#28a745" }}>+{page.added_boxes.length}</strong> added
                </span>
                <span>
                  <strong style={{ color: "#dc3545" }}>-{page.removed_boxes.length}</strong> removed
                </span>
                <span>
                  <strong style={{ color: "#ffc107" }}>~{page.visual_boxes.length}</strong> visual
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#212529" }}>Annotated PDFs</h3>
        <div
          style={{
            display: "grid",
            gap: "20px",
            gridTemplateColumns: "1fr 1fr",
            background: "#f8f9fa",
            padding: "20px",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ padding: "12px", background: "#f8f9fa", borderBottom: "1px solid #e9ecef" }}>
              <strong style={{ color: "#212529" }}>Original</strong>
            </div>
            <embed
              src={`${base}${report.downloads.annotated_old}`}
              type="application/pdf"
              width="100%"
              height="600px"
              title="Annotated original"
              style={{ display: "block" }}
            />
          </div>
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ padding: "12px", background: "#f8f9fa", borderBottom: "1px solid #e9ecef" }}>
              <strong style={{ color: "#212529" }}>Updated</strong>
            </div>
            <embed
              src={`${base}${report.downloads.annotated_new}`}
              type="application/pdf"
              width="100%"
              height="600px"
              title="Annotated updated"
              style={{ display: "block" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
