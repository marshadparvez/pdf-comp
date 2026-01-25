type LoadingProgressProps = {
  message?: string;
};

export default function LoadingProgress({ message = "Comparing PDFs..." }: LoadingProgressProps) {
  return (
    <div
      style={{
        padding: "32px",
        textAlign: "center",
        background: "#f8f9fa",
        borderRadius: "12px",
        border: "1px solid #e9ecef",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            width: "100%",
            height: "8px",
            background: "#e9ecef",
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: "30%",
              background: "linear-gradient(90deg, #0066ff, #0052cc)",
              borderRadius: "4px",
              animation: "progress 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
      <p style={{ margin: 0, color: "#495057", fontSize: "0.95em", fontWeight: 500 }}>{message}</p>
      <style>
        {`
          @keyframes progress {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(400%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
        `}
      </style>
    </div>
  );
}
