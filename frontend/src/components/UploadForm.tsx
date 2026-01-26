import { useState } from "react";

type UploadFormProps = {
  onSubmit: (oldFile: File, newFile: File, mode: "speed" | "accuracy") => void;
  isLoading: boolean;
};

const MODE_HELP: Record<"speed" | "accuracy", string> = {
  speed: "Fast comparison for large PDFs. Best for quick changes; may miss complex layout shifts.",
  accuracy: "Deeper layout-aware comparison. Slower but more reliable for complex or mixed PDFs.",
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function UploadForm({ onSubmit, isLoading }: UploadFormProps) {
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"speed" | "accuracy">("speed");
  const [dragOver, setDragOver] = useState<"old" | "new" | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!oldFile || !newFile) return;
    onSubmit(oldFile, newFile, mode);
  };

  const handleDragOver = (e: React.DragEvent, type: "old" | "new") => {
    e.preventDefault();
    setDragOver(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, type: "old" | "new") => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      if (type === "old") setOldFile(file);
      else setNewFile(file);
    }
  };

  const FileUploadBox = ({ 
    file, 
    onChange, 
    type, 
    label 
  }: { 
    file: File | null; 
    onChange: (file: File | null) => void; 
    type: "old" | "new"; 
    label: string;
  }) => {
    const isDragActive = dragOver === type;
    const hasFile = !!file;

    return (
      <div style={{ display: "grid", gap: "12px" }}>
        <label style={{ fontWeight: 700, color: "#212529", fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ 
            width: "8px", 
            height: "8px", 
            borderRadius: "50%", 
            background: hasFile ? "#28a745" : "#dee2e6",
            transition: "all 0.3s",
            boxShadow: hasFile ? "0 0 8px rgba(40, 167, 69, 0.4)" : "none",
          }} />
          {label}
        </label>
        <div
          style={{
            position: "relative",
            border: `2px dashed ${isDragActive ? "#3b82f6" : hasFile ? "#10b981" : "#d1d5db"}`,
            borderRadius: "8px",
            padding: hasFile ? "24px" : "32px",
            textAlign: "center",
            background: isDragActive ? "#eff6ff" : hasFile ? "#f0fdf4" : "#f9fafb",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: "pointer",
            transform: isDragActive ? "scale(1.02)" : "scale(1)",
            boxShadow: isDragActive 
              ? "0 8px 24px rgba(102, 126, 234, 0.2)" 
              : hasFile 
                ? "0 4px 12px rgba(40, 167, 69, 0.1)"
                : "0 2px 8px rgba(0, 0, 0, 0.05)",
          }}
          onDragOver={(e) => handleDragOver(e, type)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, type)}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
            }}
            disabled={isLoading}
          />
          <div>
            <div
              style={{
                fontSize: "3em",
                marginBottom: "12px",
                animation: hasFile ? "none" : "float 3s ease-in-out infinite",
                display: "inline-block",
              }}
            >
              {hasFile ? "✅" : "📄"}
            </div>
            {hasFile ? (
              <div style={{ animation: "fadeInUp 0.3s ease-out" }}>
                <div style={{ 
                  fontWeight: 600, 
                  color: "#155724", 
                  fontSize: "1.05rem", 
                  marginBottom: "8px",
                  wordBreak: "break-word",
                }}>
                  {file.name}
                </div>
                <div style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "12px",
                  padding: "8px 16px",
                  background: "rgba(40, 167, 69, 0.1)",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  color: "#155724",
                }}>
                  <span>📏 {formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>📅 {new Date(file.lastModified).toLocaleDateString()}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  style={{
                    marginTop: "12px",
                    padding: "6px 16px",
                    background: "transparent",
                    border: "2px solid #dc3545",
                    borderRadius: "8px",
                    color: "#dc3545",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#dc3545";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#dc3545";
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div style={{ color: "#495057", fontSize: "1.05rem", fontWeight: 600, marginBottom: "8px" }}>
                  {isDragActive ? "Drop your PDF here!" : "Drag & drop your PDF here"}
                </div>
                <div style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                  or click to browse
                </div>
                <div style={{ 
                  marginTop: "12px", 
                  fontSize: "0.85rem", 
                  color: "#adb5bd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}>
                  <span>Max 100 MB</span>
                  <span>•</span>
                  <span>PDF only</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "32px" }}>
      <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "1fr 1fr" }}>
        <FileUploadBox file={oldFile} onChange={setOldFile} type="old" label="Original PDF" />
        <FileUploadBox file={newFile} onChange={setNewFile} type="new" label="Updated PDF" />
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        <label htmlFor="mode" style={{ fontWeight: 700, color: "#212529", fontSize: "1rem" }}>
          ⚙️ Comparison Mode
        </label>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {(["speed", "accuracy"] as const).map((m) => (
            <div
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "20px",
                border: `2px solid ${mode === m ? "#3b82f6" : "#e5e7eb"}`,
                borderRadius: "8px",
                background: mode === m ? "#eff6ff" : "white",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: mode === m ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "none",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (mode !== m) {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.background = "#f9fafb";
                }
              }}
              onMouseLeave={(e) => {
                if (mode !== m) {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "white";
                }
              }}
            >
              {mode === m && (
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    width: "24px",
                    height: "24px",
                    background: "#3b82f6",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  ✓
                </div>
              )}
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                {m === "speed" ? "⚡" : "🎯"}
              </div>
              <div style={{ fontWeight: 700, color: "#212529", fontSize: "1.1rem", marginBottom: "4px" }}>
                {m === "speed" ? "Speed" : "Accuracy"}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#6c757d", lineHeight: "1.5" }}>
                {MODE_HELP[m]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!oldFile || !newFile || isLoading}
        style={{
          padding: "18px 32px",
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "white",
          background: (!oldFile || !newFile || isLoading)
            ? "#9ca3af"
            : "#3b82f6",
          border: "none",
          borderRadius: "8px",
          cursor: (!oldFile || !newFile || isLoading) ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          boxShadow: (!oldFile || !newFile || isLoading) 
            ? "none" 
            : "0 1px 3px rgba(0, 0, 0, 0.1)",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          if (oldFile && newFile && !isLoading) {
            e.currentTarget.style.background = "#2563eb";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
          }
        }}
        onMouseLeave={(e) => {
          if (oldFile && newFile && !isLoading) {
            e.currentTarget.style.background = "#3b82f6";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
          }
        }}
      >
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <span style={{ fontSize: "1.3em" }}>
            {isLoading ? "⏳" : "🚀"}
          </span>
          <span>
            {isLoading ? "Comparing…" : "Start Comparison"}
          </span>
        </span>
      </button>

      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (max-width: 768px) {
            form > div:first-child {
              grid-template-columns: 1fr !important;
            }
            form > div:nth-child(2) > div {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </form>
  );
}
