import { useState, useEffect } from "react";

type LoadingProgressProps = {
  message?: string;
  isComplete?: boolean;
};

export default function LoadingProgress({ message = "Comparing PDFs...", isComplete = false }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // If complete, jump to 100%
    if (isComplete) {
      setProgress(100);
      return;
    }

    const startTime = Date.now();
    
    // Start progress at 5% to show something immediately
    setProgress(5);

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedTime(elapsed);

      // Gradually increase progress, but cap at 95% until backend completes
      // This prevents the stuck-at-99% issue
      const estimatedDuration = 30000; // 30 seconds as baseline
      const calculatedProgress = Math.min(5 + (elapsed / estimatedDuration) * 90, 95);
      setProgress(calculatedProgress);
    }, 100);

    return () => clearInterval(interval);
  }, [isComplete]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div
      style={{
        padding: "64px 32px",
        textAlign: "center",
      }}
    >
      {/* Simple spinner with progress */}
      <div
        style={{
          margin: "0 auto 32px",
          width: "100px",
          height: "100px",
          position: "relative",
        }}
      >
        {/* Circular progress */}
        <svg
          width="100"
          height="100"
          style={{
            transform: "rotate(-90deg)",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={isComplete ? "#10b981" : "#3b82f6"}
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
          />
        </svg>

        {/* Center percentage */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <div style={{ fontSize: "24px", animation: isComplete ? "scale 0.5s ease-out" : "pulse 2s ease-in-out infinite" }}>
            {isComplete ? "✅" : "⏳"}
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: isComplete ? "#10b981" : "#3b82f6",
              lineHeight: 1,
            }}
          >
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Status message */}
      <div style={{ marginBottom: "32px" }}>
        <h3
          style={{
            margin: "0 0 12px 0",
            fontSize: "1.25rem",
            fontWeight: 600,
            color: isComplete ? "#10b981" : "#111827",
          }}
        >
          {isComplete ? "Complete!" : "Processing..."}
        </h3>
        <p
          style={{
            margin: 0,
            color: "#6b7280",
            fontSize: "0.95rem",
            fontWeight: 400,
          }}
        >
          {isComplete ? "Preparing your results..." : message}
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          maxWidth: "400px",
          margin: "0 auto 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "8px",
            background: "#e5e7eb",
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
              width: `${progress}%`,
              background: isComplete ? "#10b981" : "#3b82f6",
              borderRadius: "4px",
              transition: "width 0.3s ease-out",
            }}
          />
        </div>
      </div>

      {/* Elapsed time only */}
      <div
        style={{
          display: "inline-flex",
          padding: "10px 20px",
          background: "#f3f4f6",
          borderRadius: "8px",
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginRight: "8px", fontWeight: 500 }}>
          Elapsed:
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
          {formatTime(elapsedTime)}
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(0.95);
            }
          }

          @keyframes scale {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.2);
            }
            100% {
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
}
