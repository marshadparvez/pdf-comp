import type { CompareResponse } from "../api";

type ChangesReportProps = {
  report: CompareResponse;
  oldFileName: string;
  newFileName: string;
};

export default function ChangesReport({ report, oldFileName, newFileName }: ChangesReportProps) {
  const generateHTMLReport = () => {
    const totalAdded = report.pages.reduce((sum, p) => sum + p.added_boxes.length, 0);
    const totalRemoved = report.pages.reduce((sum, p) => sum + p.removed_boxes.length, 0);
    const totalVisual = report.pages.reduce((sum, p) => sum + p.visual_boxes.length, 0);
    const changedPages = report.pages.filter(p => p.status === "changed").length;
    const similarityPct = Math.round(report.similarity_score * 100);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Comparison Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #212529;
      background: #f8f9fa;
      padding: 40px 20px;
    }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { border-bottom: 3px solid #667eea; padding-bottom: 24px; margin-bottom: 32px; }
    h1 { font-size: 2.5rem; color: #667eea; margin-bottom: 8px; }
    .meta { color: #6c757d; font-size: 0.95rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 32px 0; }
    .stat-card { padding: 20px; border-radius: 8px; border: 2px solid #e9ecef; }
    .stat-label { font-size: 0.85rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .stat-value { font-size: 2rem; font-weight: 700; }
    .similarity { color: ${similarityPct >= 80 ? '#28a745' : similarityPct >= 50 ? '#ffc107' : '#dc3545'}; }
    .section { margin: 32px 0; }
    h2 { font-size: 1.5rem; margin-bottom: 16px; color: #212529; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e9ecef; }
    th { background: #f8f9fa; font-weight: 600; color: #495057; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; }
    .badge-changed { background: #fff3cd; color: #856404; }
    .badge-unchanged { background: #d4edda; color: #155724; }
    .badge-added { background: #d1ecf1; color: #0c5460; }
    .badge-removed { background: #f8d7da; color: #721c24; }
    .legend { display: flex; gap: 20px; flex-wrap: wrap; padding: 16px; background: #f8f9fa; border-radius: 8px; margin: 16px 0; }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .legend-box { width: 16px; height: 16px; border-radius: 4px; }
    .footer { margin-top: 40px; padding-top: 24px; border-top: 2px solid #e9ecef; color: #6c757d; font-size: 0.9rem; text-align: center; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 PDF Comparison Report</h1>
      <div class="meta">
        <strong>Original:</strong> ${oldFileName}<br>
        <strong>Updated:</strong> ${newFileName}<br>
        <strong>Mode:</strong> ${report.mode} — ${report.mode_explanation}<br>
        <strong>Generated:</strong> ${new Date().toLocaleString()}
      </div>
    </div>

    <div class="summary">
      <div class="stat-card">
        <div class="stat-label">Similarity Score</div>
        <div class="stat-value similarity">${similarityPct}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Pages</div>
        <div class="stat-value" style="color: #667eea;">${report.pages.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Changed Pages</div>
        <div class="stat-value" style="color: #ffc107;">${changedPages}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Items Added</div>
        <div class="stat-value" style="color: #28a745;">${totalAdded}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Items Removed</div>
        <div class="stat-value" style="color: #dc3545;">${totalRemoved}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Visual Changes</div>
        <div class="stat-value" style="color: #ffc107;">${totalVisual}</div>
      </div>
    </div>

    ${report.low_confidence ? `
    <div style="padding: 16px; background: #fff5f5; border: 2px solid #dc3545; border-radius: 8px; margin: 24px 0;">
      <strong style="color: #dc3545;">⚠️ Low Confidence Warning:</strong> These PDFs appear to be unrelated. Comparison results may not be meaningful.
    </div>
    ` : ''}

    <div class="section">
      <h2>Color Legend</h2>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-box" style="background: #dc3545;"></div>
          <span>Removed Content</span>
        </div>
        <div class="legend-item">
          <div class="legend-box" style="background: #28a745;"></div>
          <span>Added Content</span>
        </div>
        <div class="legend-item">
          <div class="legend-box" style="background: #ffc107;"></div>
          <span>Visual/Formatting Changes</span>
        </div>
      </div>
      <p style="color: #6c757d; font-size: 0.95rem;">
        The annotated PDFs use these colors to highlight differences. Red boxes indicate content removed from the original, 
        green boxes show newly added content, and yellow boxes mark areas with visual or formatting changes.
      </p>
    </div>

    <div class="section">
      <h2>Page-by-Page Changes</h2>
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th>Status</th>
            <th>Added</th>
            <th>Removed</th>
            <th>Visual</th>
          </tr>
        </thead>
        <tbody>
          ${report.pages.map(page => `
            <tr>
              <td><strong>Page ${page.page_index + 1}</strong></td>
              <td>
                <span class="badge badge-${page.status.replace('_', '-')}">
                  ${page.status.replace('_', ' ').toUpperCase()}
                </span>
              </td>
              <td style="color: #28a745; font-weight: 600;">+${page.added_boxes.length}</td>
              <td style="color: #dc3545; font-weight: 600;">-${page.removed_boxes.length}</td>
              <td style="color: #ffc107; font-weight: 600;">~${page.visual_boxes.length}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by PDF Comparison Tool</p>
      <p>This report provides a summary of differences between the two PDF documents.</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-report-${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={generateHTMLReport}
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
        display: "flex",
        alignItems: "center",
        gap: "10px",
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
      <span style={{ fontSize: "1.2em" }}>📄</span>
      <span>Download Summary Report</span>
    </button>
  );
}
