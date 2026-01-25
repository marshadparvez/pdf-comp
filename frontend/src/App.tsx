import { useState } from "react";
import UploadForm from "./components/UploadForm";
import DiffReport from "./components/DiffReport";
import LoadingProgress from "./components/LoadingProgress";
import { comparePdfs, type CompareResponse } from "./api";

export default function App() {
  const [report, setReport] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (oldFile: File, newFile: File, mode: "speed" | "accuracy") => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await comparePdfs(oldFile, newFile, mode);
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareAgain = () => {
    setReport(null);
    setError(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px 24px",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
            padding: "40px",
            marginBottom: "24px",
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            <h1
              style={{
                margin: "0 0 8px 0",
                fontSize: "2.5rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              PDF Diff
            </h1>
            <p style={{ margin: 0, color: "#6c757d", fontSize: "1.1rem" }}>
              Upload two PDFs to compare text and visual changes
            </p>
          </div>
        </div>

        {!isLoading && !report && (
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
              padding: "40px",
            }}
          >
            <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        )}

        {isLoading && (
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
              padding: "40px",
            }}
          >
            <LoadingProgress message="Analyzing PDFs and computing differences..." />
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #feb2b2",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "24px",
              color: "#c53030",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "1.2em" }}>⚠️</span>
            <span style={{ fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {report && (
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
              padding: "40px",
            }}
          >
            <DiffReport report={report} onCompareAgain={handleCompareAgain} />
          </div>
        )}
      </main>
    </div>
  );
}
