import type { CompareResponse } from "../api";
import { API_BASE } from "../api";
import { useState, useRef, useEffect } from "react";

type DiffReportProps = {
  report: CompareResponse;
  onCompareAgain?: () => void;
  oldFileName: string;
  newFileName: string;
};

export default function DiffReport({ report, onCompareAgain, oldFileName, newFileName }: DiffReportProps) {
  const base = API_BASE.replace(/\/$/, "");
  const similarityPct = Math.round(report.similarity_score * 100);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const oldPdfRef = useRef<HTMLIFrameElement>(null);
  const newPdfRef = useRef<HTMLIFrameElement>(null);

  // Calculate statistics
  const totalAdded = report.pages.reduce((sum, p) => sum + p.added_boxes.length, 0);
  const totalRemoved = report.pages.reduce((sum, p) => sum + p.removed_boxes.length, 0);
  const changedPages = report.pages.filter(p => p.status === "changed").length;
  const unchangedPages = report.pages.filter(p => p.status === "unchanged").length;

  const handlePageClick = (pageIndex: number) => {
    setSelectedPage(pageIndex);
    // Scroll to PDF preview section
    const pdfSection = document.getElementById("pdf-preview-section");
    if (pdfSection) {
      pdfSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // Try to navigate PDFs to the page (works with PDF.js viewers)
    // Note: This may not work with all PDF viewers, but provides visual feedback
    setTimeout(() => {
      const oldIframe = oldPdfRef.current;
      const newIframe = newPdfRef.current;
      if (oldIframe?.contentWindow) {
        try {
          oldIframe.contentWindow.postMessage({ type: "goToPage", page: pageIndex }, "*");
        } catch (e) {
          // Fallback: just highlight the selection
        }
      }
      if (newIframe?.contentWindow) {
        try {
          newIframe.contentWindow.postMessage({ type: "goToPage", page: pageIndex }, "*");
        } catch (e) {
          // Fallback: just highlight the selection
        }
      }
    }, 500);
  };

  return (
    <section style={{ display: "grid", gap: "40px" }}>
      {/* Header with Stats */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div>
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "2rem",
                fontWeight: 700,
                color: "#111827",
                letterSpacing: "-0.5px",
              }}
            >
              Comparison Results
            </h2>
            <div style={{ marginTop: "12px", padding: "12px 16px", background: "#f3f4f6", borderRadius: "8px", fontSize: "0.9rem" }}>
              <div style={{ marginBottom: "8px" }}>
                <strong style={{ color: "#111827" }}>Mode:</strong> <span style={{ color: "#3b82f6", fontWeight: 600 }}>{report.mode === "speed" ? "Speed" : "Accuracy"}</span>
              </div>
              <div style={{ color: "#6b7280", lineHeight: "1.5" }}>
                {report.mode === "speed" ? (
                  <>
                    <strong>Speed mode</strong> uses fast text extraction (pdfplumber) with OCR fallback. 
                    Best for large PDFs and quick comparisons. May miss complex layout changes.
                  </>
                ) : (
                  <>
                    <strong>Accuracy mode</strong> uses layout-aware extraction (Unstructured/Docling) with OCR fallback. 
                    Better for scanned PDFs, complex layouts, and mixed content. Slower but more reliable.
                  </>
                )}
              </div>
            </div>
          </div>
          {onCompareAgain && (
            <button
              type="button"
              onClick={onCompareAgain}
              style={{
                padding: "14px 28px",
                background: "white",
                border: "2px solid #667eea",
                borderRadius: "12px",
                color: "#667eea",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                fontSize: "1rem",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.15)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
                e.currentTarget.style.color = "white";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(102, 126, 234, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#667eea";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.15)";
              }}
            >
              🔄 Compare Again
            </button>
          )}
        </div>

        {/* Similarity Score Card */}
        <div
          style={{
            padding: "32px",
            background: `linear-gradient(135deg, ${similarityPct >= 80 ? "rgba(40, 167, 69, 0.05)" : similarityPct >= 50 ? "rgba(255, 193, 7, 0.05)" : "rgba(220, 53, 69, 0.05)"}, white)`,
            border: `2px solid ${similarityPct >= 80 ? "#28a745" : similarityPct >= 50 ? "#ffc107" : "#dc3545"}`,
            borderRadius: "16px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
            marginBottom: "24px",
          }}
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#6c757d", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Document Similarity
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                  <span style={{ fontSize: "4rem", fontWeight: 800, color: similarityPct >= 80 ? "#28a745" : similarityPct >= 50 ? "#ffc107" : "#dc3545", lineHeight: 1 }}>
                    {similarityPct}%
                  </span>
                  <span style={{ fontSize: "2rem", color: "#adb5bd" }}>
                    {similarityPct >= 80 ? "✅" : similarityPct >= 50 ? "⚠️" : "❌"}
                  </span>
                </div>
              </div>
              
              {/* Progress Circle */}
              <div style={{ position: "relative", width: "120px", height: "120px" }}>
                <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="#e9ecef"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke={similarityPct >= 80 ? "#28a745" : similarityPct >= 50 ? "#ffc107" : "#dc3545"}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - similarityPct / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                  />
                </svg>
              </div>
            </div>
          </div>

          {report.low_confidence && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px 20px",
                background: "rgba(220, 53, 69, 0.05)",
                border: "2px solid #dc3545",
                borderRadius: "12px",
                color: "#dc3545",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                animation: "shake 0.5s ease-in-out",
              }}
            >
              <span style={{ fontSize: "1.5em", flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>Low Confidence Warning</div>
                <div style={{ fontSize: "0.95rem", opacity: 0.9 }}>
                  These PDFs appear to be unrelated. Comparison results may not be meaningful.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          {[
            { icon: "📄", label: "Total Pages", value: report.pages.length, color: "#667eea" },
            { icon: "🔴", label: "Removed", value: totalRemoved, color: "#dc3545" },
            { icon: "🟢", label: "Added", value: totalAdded, color: "#28a745" },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                padding: "20px",
                background: "white",
                border: "2px solid #f1f3f5",
                borderRadius: "12px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: `fadeInUp 0.5s ease-out ${i * 0.1}s backwards`,
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = stat.color;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#f1f3f5";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "2em" }}>{stat.icon}</span>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#868e96", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {stat.label}
                </div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: stat.color }}>
                {stat.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Highlight Colors Guide removed per request */}

      {/* Download Buttons removed per request */}

      {/* Page Summary */}
      <div style={{ display: "grid", gap: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, color: "#212529", letterSpacing: "-0.5px" }}>
          📑 Page-by-Page Analysis
        </h3>
        
        <div
          style={{
            display: "grid",
            gap: "12px",
            maxHeight: "600px",
            overflowY: "auto",
            padding: "4px",
          }}
        >
          {report.pages.map((page, idx) => (
            <div
              key={page.page_index}
              onClick={() => handlePageClick(page.page_index)}
              style={{
                padding: "16px 20px",
                background: selectedPage === page.page_index ? "#eff6ff" : "white",
                borderRadius: "8px",
                border: selectedPage === page.page_index ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                transition: "all 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (selectedPage !== page.page_index) {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.background = "#f9fafb";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPage !== page.page_index) {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "white";
                }
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      background: selectedPage === page.page_index ? "#3b82f6" : "#f3f4f6",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: selectedPage === page.page_index ? "white" : "#6b7280",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      border: selectedPage === page.page_index ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                      transition: "all 0.2s",
                    }}
                  >
                    {page.page_index + 1}
                  </div>
                  <strong style={{ color: "#111827", fontSize: "1rem", fontWeight: 600 }}>
                    Page {page.page_index + 1}
                  </strong>
                  {selectedPage === page.page_index && (
                    <span style={{ fontSize: "0.85rem", color: "#3b82f6", fontWeight: 500 }}>
                      (viewing in PDFs below)
                    </span>
                  )}
                </div>
                <span
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    background:
                      page.status === "unchanged"
                        ? "linear-gradient(135deg, #d4edda, #c3e6cb)"
                        : page.status === "changed"
                          ? "linear-gradient(135deg, #fff3cd, #ffeaa7)"
                          : page.status === "added_page"
                            ? "linear-gradient(135deg, #d1ecf1, #bee5eb)"
                            : "linear-gradient(135deg, #f8d7da, #f5c6cb)",
                    color:
                      page.status === "unchanged"
                        ? "#155724"
                        : page.status === "changed"
                          ? "#856404"
                          : page.status === "added_page"
                            ? "#0c5460"
                            : "#721c24",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  {page.status.replace("_", " ")}
                </span>
              </div>
              <div style={{ display: "flex", gap: "20px", fontSize: "0.95rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ 
                    width: "32px", 
                    height: "32px", 
                    background: "rgba(40, 167, 69, 0.1)", 
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#28a745",
                  }}>
                    +{page.added_boxes.length}
                  </div>
                  <span style={{ color: "#6c757d", fontWeight: 600 }}>Added</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ 
                    width: "32px", 
                    height: "32px", 
                    background: "rgba(220, 53, 69, 0.1)", 
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#dc3545",
                  }}>
                    {page.removed_boxes.length}
                  </div>
                  <span style={{ color: "#6c757d", fontWeight: 600 }}>Removed</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Annotated PDFs Preview */}
      <div id="pdf-preview-section" style={{ display: "grid", gap: "20px" }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
          Preview Annotated PDFs
        </h3>
        {selectedPage !== null && (
          <div style={{ padding: "12px 16px", background: "#eff6ff", borderRadius: "8px", fontSize: "0.9rem", color: "#1e40af", marginBottom: "8px" }}>
            📍 Viewing Page {selectedPage + 1} — Click any page above to jump to it
          </div>
        )}
        <div
          style={{
            display: "grid",
            gap: "24px",
            gridTemplateColumns: "1fr 1fr",
            width: "94vw",
            marginLeft: "calc(50% - 47vw)",
            marginRight: "calc(50% - 47vw)",
            boxSizing: "border-box",
          }}
        >
          {[
            { src: report.downloads.annotated_old, title: "Original PDF", icon: "📄" },
            { src: report.downloads.annotated_new, title: "Updated PDF", icon: "📝" },
          ].map((pdf, i) => (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                border: "2px solid #f1f3f5",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.2)";
                e.currentTarget.style.borderColor = "#667eea";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                e.currentTarget.style.borderColor = "#f1f3f5";
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))",
                  borderBottom: "2px solid #f1f3f5",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "1.5em" }}>{pdf.icon}</span>
                <strong style={{ color: "#212529", fontSize: "1.05rem", fontWeight: 700 }}>{pdf.title}</strong>
              </div>
              <iframe
                ref={i === 0 ? oldPdfRef : newPdfRef}
                src={`${base}${pdf.src}#page=${selectedPage !== null ? selectedPage + 1 : 1}`}
                width="100%"
                height="880px"
                title={pdf.title}
                style={{ border: "none", display: "block" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Global styles */}
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes shake {
            0%, 100% {
              transform: translateX(0);
            }
            10%, 30%, 50%, 70%, 90% {
              transform: translateX(-5px);
            }
            20%, 40%, 60%, 80% {
              transform: translateX(5px);
            }
          }

          @media (max-width: 1024px) {
            section > div:last-child > div {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 768px) {
            section > div:first-child > div:last-child {
              grid-template-columns: 1fr !important;
            }
          }

          /* Custom scrollbar */
          div::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          div::-webkit-scrollbar-track {
            background: #f1f3f5;
            border-radius: 4px;
          }

          div::-webkit-scrollbar-thumb {
            background: #3b82f6;
            border-radius: 4px;
          }

          div::-webkit-scrollbar-thumb:hover {
            background: #2563eb;
          }
        `}
      </style>
    </section>
  );
}
