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

  const handleSubmit = async (oldFile: File, newFile: File, mode: "speed" | "accuracy") => {
    setShowContent(false);
    setLoadingComplete(false);
    setFileNames({ old: oldFile.name, new: newFile.name });
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
      setError(err instanceof Error ? err.message : "Something went wrong");
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
        background: "#f9fafb",
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
        <div
          style={{
            marginBottom: "40px",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: "2.5rem",
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-0.5px",
            }}
          >
            PDF Comparison
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "1rem", fontWeight: 400 }}>
            Find and visualize changes between document versions
          </p>
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
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "1.2em" }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "2px" }}>Error</div>
              <div style={{ fontWeight: 400, fontSize: "0.9rem" }}>{error}</div>
            </div>
          </div>
        )}

        {/* Content Area */}
        {!isLoading && !report && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "40px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        )}

        {isLoading && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "40px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <LoadingProgress 
              message="Analyzing PDFs and computing differences..." 
              isComplete={loadingComplete}
            />
          </div>
        )}

        {report && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "40px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <DiffReport 
              report={report} 
              onCompareAgain={handleCompareAgain}
              oldFileName={fileNames.old}
              newFileName={fileNames.new}
            />
          </div>
        )}
      </main>

    </div>
  );
}
