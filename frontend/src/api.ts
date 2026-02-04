export { API_BASE };

export type PageDiff = {
  page_index: number;
  status: "changed" | "unchanged" | "added_page" | "removed_page";
  added_boxes: number[][];
  removed_boxes: number[][];
  visual_boxes: number[][];
  moved_boxes_old?: number[][];
  moved_boxes_new?: number[][];
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

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8010";
const COMPARE_REQUEST_TIMEOUT_MS = 130_000; // Slightly over backend 120s

export async function comparePdfs(
  oldFile: File,
  newFile: File,
  mode: "speed" | "accuracy"
): Promise<CompareResponse> {
  const formData = new FormData();
  formData.append("old_pdf", oldFile);
  formData.append("new_pdf", newFile);
  formData.append("mode", mode);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMPARE_REQUEST_TIMEOUT_MS);

  const response = await fetch(`${API_BASE}/compare`, {
    method: "POST",
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = typeof body?.detail === "string" ? body.detail : Array.isArray(body?.detail) ? body.detail.map((o: { msg?: string }) => o?.msg).filter(Boolean).join("; ") : null;
    throw new Error(detail ?? `Comparison failed (${response.status})`);
  }

  return response.json();
}
