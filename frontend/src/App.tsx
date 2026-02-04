import { useState } from "react";
import UploadForm from "./components/UploadForm";
import DiffReport from "./components/DiffReport";
import LoadingProgress from "./components/LoadingProgress";
import { comparePdfs, type CompareResponse } from "./api";

export default function App() {
  const [report, setReport] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(true);
  const [fileNames, setFileNames] = useState<{ old: string; new: string }>({ old: "", new: "" });
  const [loadingMode, setLoadingMode] = useState<"speed" | "accuracy">("speed");
  const [darkMode, setDarkMode] = useState(false);

  const handleSubmit = async (oldFile: File, newFile: File, mode: "speed" | "accuracy") => {
    setShowContent(false);
    setLoadingComplete(false);
    setFileNames({ old: oldFile.name, new: newFile.name });
    setLoadingMode(mode);
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
      setReport(null);
      setShowContent(true);
    }, 300);

    try {
      const result = await comparePdfs(oldFile, newFile, mode);
      setLoadingComplete(true);
      // Small delay to show 100% completion
      setTimeout(() => {
        setReport(result);
        setIsLoading(false);
      }, 800);
    } catch (err) {
      let message = "Something went wrong";
      if (err instanceof Error) {
        message = err.name === "AbortError"
          ? "Request timed out. Try smaller PDFs or Speed mode."
          : err.message;
      }
      setError(message);
      setIsLoading(false);
      setLoadingComplete(false);
    }
  };

  const handleCompareAgain = () => {
    setShowContent(false);
    setTimeout(() => {
      setReport(null);
      setError(null);
      setShowContent(true);
    }, 300);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: darkMode ? "#1f2937" : "#f9fafb",
        position: "relative",
      }}
    >
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px 24px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "2.5rem", fontWeight: 700, color: darkMode ? "#f9fafb" : "#111827", letterSpacing: "-0.5px" }}>
              PDF Comparison
            </h1>
            <p style={{ margin: 0, color: darkMode ? "#9ca3af" : "#6b7280", fontSize: "1rem", fontWeight: 400 }}>
              Find and visualize changes between document versions
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            title={darkMode ? "Light mode" : "Dark mode"}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              padding: "8px 16px",
              background: darkMode ? "#374151" : "#e5e7eb",
              color: darkMode ? "#f9fafb" : "#374151",
              border: "1px solid #9ca3af",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "16px 20px",
              marginBottom: "24px",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
              <span style={{ fontSize: "1.2em" }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "2px" }}>Error</div>
                <div style={{ fontWeight: 400, fontSize: "0.9rem" }}>{error}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setError(null); setReport(null); }}
              aria-label="Dismiss error and try again"
              style={{
                padding: "8px 16px",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Content Area */}
        {!isLoading && !report && (
          <div
            style={{
              background: darkMode ? "#374151" : "white",
              borderRadius: "12px",
              border: `1px solid ${darkMode ? "#4b5563" : "#e5e7eb"}`,
              padding: "40px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <UploadForm onSubmit={handleSubmit} isLoading={isLoading} darkMode={darkMode} />
          </div>
        )}

        {isLoading && (
          <div
            style={{
              background: darkMode ? "#374151" : "white",
              borderRadius: "12px",
              border: `1px solid ${darkMode ? "#4b5563" : "#e5e7eb"}`,
              padding: "40px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <LoadingProgress 
              message={`Running ${loadingMode === "speed" ? "Speed" : "Accuracy"} mode — analyzing PDFs...`}
              isComplete={loadingComplete}
            />
          </div>
        )}

        {report && (
          <div
            style={{
              background: darkMode ? "#374151" : "white",
              borderRadius: "12px",
              border: `1px solid ${darkMode ? "#4b5563" : "#e5e7eb"}`,
              padding: "40px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <DiffReport 
              report={report} 
              onCompareAgain={handleCompareAgain}
              oldFileName={fileNames.old}
              newFileName={fileNames.new}
              darkMode={darkMode}
            />
          </div>
        )}
      </main>

    </div>
  );
}
