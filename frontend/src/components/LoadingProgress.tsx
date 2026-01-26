type LoadingProgressProps = {
  message?: string;
};

export default function LoadingProgress({ message = "Comparing PDFs..." }: LoadingProgressProps) {
  return (
    <div
      style={{
        padding: "64px 32px",
        textAlign: "center",
      }}
    >
      {/* Animated spinner */}
      <div
        style={{
          margin: "0 auto 32px",
          width: "80px",
          height: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            border: "4px solid transparent",
            borderTopColor: "#667eea",
            borderRightColor: "#764ba2",
            borderRadius: "50%",
            animation: "spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            border: "4px solid transparent",
            borderTopColor: "#764ba2",
            borderRadius: "50%",
            animation: "spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite",
            animationDelay: "-0.3s",
            transform: "scale(0.7)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            animation: "pulse 2s ease-in-out infinite",
          }}
        >
          📊
        </div>
      </div>

      {/* Message */}
      <div style={{ marginBottom: "32px" }}>
        <h3
          style={{
            margin: "0 0 12px 0",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#212529",
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          Processing...
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
          {message}
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          maxWidth: "400px",
          margin: "0 auto",
          animation: "fadeIn 0.5s ease-out 0.4s backwards",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "6px",
            background: "rgba(102, 126, 234, 0.1)",
            borderRadius: "3px",
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
              width: "40%",
              background: "linear-gradient(90deg, #667eea, #764ba2)",
              borderRadius: "3px",
              animation: "progress 2s ease-in-out infinite",
              boxShadow: "0 0 10px rgba(102, 126, 234, 0.5)",
            }}
          />
        </div>
      </div>

      {/* Loading dots */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "24px",
          animation: "fadeIn 0.5s ease-out 0.6s backwards",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "8px",
              height: "8px",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              borderRadius: "50%",
              animation: `bounce 1.4s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          @keyframes progress {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(350%);
            }
            100% {
              transform: translateX(-100%);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(0.9);
            }
          }

          @keyframes bounce {
            0%, 80%, 100% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
            40% {
              transform: translateY(-12px) scale(1.1);
              opacity: 0.8;
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
        `}
      </style>
    </div>
  );
}
