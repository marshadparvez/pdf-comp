import { useState } from "react";
import UploadForm from "./components/UploadForm";
import DiffReport from "./components/DiffReport";
import { comparePdfs, type CompareResponse } from "./api";

export default function App() {
  const [report, setReport] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (oldFile: File, newFile: File, mode: "speed" | "accuracy") => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await comparePdfs(oldFile, newFile, mode);
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "24px" }}>
      <h1>PDF Diff</h1>
      <p>Upload two PDFs to compare text and visual changes.</p>
      <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      {report && <DiffReport report={report} />}
    </main>
  );
}
