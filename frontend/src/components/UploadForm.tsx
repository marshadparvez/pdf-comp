import { useState } from "react";

type UploadFormProps = {
  onSubmit: (oldFile: File, newFile: File, mode: "speed" | "accuracy") => void;
  isLoading: boolean;
};

const MODE_HELP: Record<"speed" | "accuracy", string> = {
  speed: "Fast comparison for large PDFs. Best for quick changes; may miss complex layout shifts.",
  accuracy: "Deeper layout-aware comparison. Slower but more reliable for complex or mixed PDFs.",
};

export default function UploadForm({ onSubmit, isLoading }: UploadFormProps) {
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"speed" | "accuracy">("speed");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!oldFile || !newFile) return;
    onSubmit(oldFile, newFile, mode);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "24px" }}>
      <label
        style={{
          display: "grid",
          gap: "8px",
        }}
      >
        <span style={{ fontWeight: 600, color: "#212529", fontSize: "0.95em" }}>Original PDF</span>
        <div
          style={{
            position: "relative",
            border: "2px dashed #dee2e6",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            background: "#f8f9fa",
            transition: "all 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#667eea";
            e.currentTarget.style.background = "#f0f4ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#dee2e6";
            e.currentTarget.style.background = "#f8f9fa";
          }}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setOldFile(e.target.files?.[0] ?? null)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
            }}
            disabled={isLoading}
          />
          <div>
            <span style={{ fontSize: "2em", display: "block", marginBottom: "8px" }}>📄</span>
            <span style={{ color: "#6c757d", fontSize: "0.9em" }}>
              {oldFile ? oldFile.name : "Click to select or drag PDF here"}
            </span>
          </div>
        </div>
      </label>

      <label
        style={{
          display: "grid",
          gap: "8px",
        }}
      >
        <span style={{ fontWeight: 600, color: "#212529", fontSize: "0.95em" }}>Updated PDF</span>
        <div
          style={{
            position: "relative",
            border: "2px dashed #dee2e6",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            background: "#f8f9fa",
            transition: "all 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#667eea";
            e.currentTarget.style.background = "#f0f4ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#dee2e6";
            e.currentTarget.style.background = "#f8f9fa";
          }}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
            }}
            disabled={isLoading}
          />
          <div>
            <span style={{ fontSize: "2em", display: "block", marginBottom: "8px" }}>📄</span>
            <span style={{ color: "#6c757d", fontSize: "0.9em" }}>
              {newFile ? newFile.name : "Click to select or drag PDF here"}
            </span>
          </div>
        </div>
      </label>

      <div style={{ display: "grid", gap: "8px" }}>
        <label htmlFor="mode" style={{ fontWeight: 600, color: "#212529", fontSize: "0.95em" }}>
          Comparison mode
        </label>
        <select
          id="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as "speed" | "accuracy")}
          disabled={isLoading}
          style={{
            padding: "12px 16px",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            fontSize: "1em",
            background: "white",
            cursor: "pointer",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#667eea")}
          onBlur={(e) => (e.target.style.borderColor = "#dee2e6")}
        >
          <option value="speed">⚡ Speed — fast for large PDFs</option>
          <option value="accuracy">🎯 Accuracy — best for mixed/scanned</option>
        </select>
        <p
          style={{
            fontSize: "0.85em",
            color: "#6c757d",
            margin: 0,
            padding: "8px 12px",
            background: "#f8f9fa",
            borderRadius: "6px",
          }}
        >
          {MODE_HELP[mode]}
        </p>
      </div>

      <button
        type="submit"
        disabled={!oldFile || !newFile || isLoading}
        style={{
          padding: "14px 24px",
          fontSize: "1.05em",
          fontWeight: 600,
          color: "white",
          background: isLoading
            ? "#adb5bd"
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          borderRadius: "8px",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          boxShadow: isLoading ? "none" : "0 4px 12px rgba(102, 126, 234, 0.4)",
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.5)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
          }
        }}
      >
        {isLoading ? "⏳ Comparing…" : "🚀 Compare PDFs"}
      </button>
    </form>
  );
}
