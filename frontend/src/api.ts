export type PageDiff = {
  page_index: number;
  status: "changed" | "unchanged" | "added_page" | "removed_page";
  added_boxes: number[][];
  removed_boxes: number[][];
  visual_boxes: number[][];
};

export type CompareResponse = {
  job_id: string;
  mode: "speed" | "accuracy";
  mode_explanation: string;
  similarity_score: number;
  low_confidence: boolean;
  pages: PageDiff[];
  downloads: {
    annotated_old: string;
    annotated_new: string;
  };
};

const API_BASE = "http://localhost:8000";

export async function comparePdfs(
  oldFile: File,
  newFile: File,
  mode: "speed" | "accuracy"
): Promise<CompareResponse> {
  const formData = new FormData();
  formData.append("old_pdf", oldFile);
  formData.append("new_pdf", newFile);
  formData.append("mode", mode);

  const response = await fetch(`${API_BASE}/compare`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Comparison failed");
  }

  return response.json();
}
