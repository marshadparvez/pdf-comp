import { useState, useEffect } from "react";

type LoadingProgressProps = {
  message?: string;
  isComplete?: boolean;
};

const STAGES = [
  { name: "Extracting text from PDFs", duration: 3000, icon: "📄" },
  { name: "Running OCR on images", duration: 4000, icon: "🔍" },
  { name: "Computing differences", duration: 3000, icon: "⚖️" },
  { name: "Analyzing visual changes", duration: 2500, icon: "👁️" },
  { name: "Generating annotated PDFs", duration: 2500, icon: "✨" },
  { name: "Finalizing results", duration: 1000, icon: "🎯" },
];

export default function LoadingProgress({ message = "Comparing PDFs...", isComplete = false }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTotal] = useState(
    STAGES.reduce((sum, stage) => sum + stage.duration, 0)
  );

  useEffect(() => {
    // If complete, jump to 100%
    if (isComplete) {
      setProgress(100);
      setCurrentStage(STAGES.length - 1);
      return;
    }

    const startTime = Date.now();
    let currentProgress = 0;
    let stageIndex = 0;
    let stageStartTime = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedTime(elapsed);

      // Calculate progress based on stages
      if (stageIndex < STAGES.length) {
        const stageElapsed = now - stageStartTime;
        const stageDuration = STAGES[stageIndex].duration;
        const stageProgress = Math.min(stageElapsed / stageDuration, 1);

        // Calculate cumulative progress
        const previousStagesTotal = STAGES.slice(0, stageIndex).reduce(
          (sum, s) => sum + s.duration,
          0
        );
        currentProgress = Math.min(
          ((previousStagesTotal + stageElapsed) / estimatedTotal) * 100,
          99
        );

        setProgress(currentProgress);

        // Move to next stage when current one completes
        if (stageProgress >= 1 && stageIndex < STAGES.length - 1) {
          stageIndex++;
          stageStartTime = now;
          setCurrentStage(stageIndex);
        } else if (stageProgress >= 1 && stageIndex === STAGES.length - 1) {
          // If we're on the last stage and time is up, show "waiting for server"
          setCurrentStage(STAGES.length);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [estimatedTotal, isComplete]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const estimatedRemaining = isComplete ? 0 : Math.max(0, estimatedTotal - elapsedTime);
  const isWaitingForServer = currentStage >= STAGES.length;
  const displayStage = isWaitingForServer 
    ? { name: "Finalizing on server...", icon: "⏳" }
    : STAGES[currentStage];

  return (
    <div
      style={{
        padding: "64px 32px",
        textAlign: "center",
      }}
    >
      {/* Animated spinner with progress */}
      <div
        style={{
          margin: "0 auto 32px",
          width: "120px",
          height: "120px",
          position: "relative",
        }}
      >
        {/* Background circle */}
        <svg
          width="120"
          height="120"
          style={{
            transform: "rotate(-90deg)",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="rgba(102, 126, 234, 0.1)"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="url(#gradient)"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
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
          <div style={{ fontSize: "32px", animation: isComplete ? "scale 0.5s ease-out" : "pulse 2s ease-in-out infinite" }}>
            {isComplete ? "✅" : displayStage?.icon || "📊"}
          </div>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: isComplete ? "#28a745" : "#667eea",
              lineHeight: 1,
            }}
          >
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Current Stage */}
      <div style={{ marginBottom: "32px" }}>
        <h3
          style={{
            margin: "0 0 12px 0",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: isComplete ? "#28a745" : "#212529",
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          {isComplete ? "Complete! ✨" : displayStage?.name || "Processing..."}
        </h3>
        <p
          style={{
            margin: 0,
            color: "#6c757d",
            fontSize: "1.05rem",
            fontWeight: 500,
            animation: "fadeIn 0.5s ease-out 0.2s backwards",
          }}
        >
          {isComplete ? "Preparing your results..." : message}
        </p>
      </div>

      {/* Progress bar with percentage */}
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto 16px",
          animation: "fadeIn 0.5s ease-out 0.4s backwards",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "#495057",
          }}
        >
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div
          style={{
            width: "100%",
            height: "10px",
            background: "rgba(102, 126, 234, 0.1)",
            borderRadius: "5px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #667eea, #764ba2)",
              borderRadius: "5px",
              transition: "width 0.3s ease-out",
              boxShadow: "0 0 10px rgba(102, 126, 234, 0.5)",
            }}
          />
        </div>
      </div>

      {/* Time indicators */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "32px",
          marginBottom: "24px",
          animation: "fadeIn 0.5s ease-out 0.6s backwards",
        }}
      >
        <div
          style={{
            padding: "12px 20px",
            background: "rgba(102, 126, 234, 0.05)",
            borderRadius: "12px",
            border: "2px solid rgba(102, 126, 234, 0.1)",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#6c757d", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Elapsed
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#667eea" }}>
            {formatTime(elapsedTime)}
          </div>
        </div>
        <div
          style={{
            padding: "12px 20px",
            background: "rgba(102, 126, 234, 0.05)",
            borderRadius: "12px",
            border: "2px solid rgba(102, 126, 234, 0.1)",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#6c757d", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {isWaitingForServer ? "Status" : "Remaining"}
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#764ba2" }}>
            {isWaitingForServer ? "Processing..." : `~${formatTime(estimatedRemaining)}`}
          </div>
        </div>
      </div>

      {/* Stage indicators */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          flexWrap: "wrap",
          maxWidth: "600px",
          margin: "0 auto",
          animation: "fadeIn 0.5s ease-out 0.8s backwards",
        }}
      >
        {STAGES.map((stage, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "8px",
              background:
                i < currentStage
                  ? "rgba(40, 167, 69, 0.1)"
                  : i === currentStage
                    ? "rgba(102, 126, 234, 0.15)"
                    : "rgba(0, 0, 0, 0.03)",
              border: `2px solid ${
                i < currentStage
                  ? "#28a745"
                  : i === currentStage
                    ? "#667eea"
                    : "transparent"
              }`,
              transition: "all 0.3s ease-out",
              opacity: i <= currentStage ? 1 : 0.5,
              transform: i === currentStage ? "scale(1.05)" : "scale(1)",
            }}
          >
            <span style={{ fontSize: "1rem" }}>
              {i < currentStage ? "✅" : stage.icon}
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: i === currentStage ? 700 : 500,
                color: i < currentStage ? "#28a745" : i === currentStage ? "#667eea" : "#868e96",
              }}
            >
              {stage.name.split(" ")[0]}
            </span>
          </div>
        ))}
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

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
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

          @media (max-width: 768px) {
            div[style*="gap: 32px"] {
              gap: 16px !important;
            }
          }
        `}
      </style>
    </div>
  );
}
