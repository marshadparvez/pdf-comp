import { useState } from "react";

type UploadFormProps = {
  onSubmit: (oldFile: File, newFile: File, mode: "speed" | "accuracy") => void;
  isLoading: boolean;
};

export default function UploadForm({ onSubmit, isLoading }: UploadFormProps) {
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"speed" | "accuracy">("speed");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!oldFile || !newFile) {
      return;
    }
    onSubmit(oldFile, newFile, mode);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
      <label>
        Original PDF
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => setOldFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <label>
        Updated PDF
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => setNewFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <label>
        Comparison mode
        <select value={mode} onChange={(event) => setMode(event.target.value as "speed" | "accuracy")}>
          <option value="speed">Speed (fast for large PDFs)</option>
          <option value="accuracy">Accuracy (best for mixed/scanned)</option>
        </select>
      </label>
      <button type="submit" disabled={!oldFile || !newFile || isLoading}>
        {isLoading ? "Comparing..." : "Compare PDFs"}
      </button>
    </form>
  );
}
