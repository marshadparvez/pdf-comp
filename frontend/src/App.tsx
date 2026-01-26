import { useState } from "react";
import UploadForm from "./components/UploadForm";
import DiffReport from "./components/DiffReport";
import LoadingProgress from "./components/LoadingProgress";
import { comparePdfs, type CompareResponse } from "./api";

export default function App() {
  const [report, setReport] = useState<CompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(true);
  const [fileNames, setFileNames] = useState<{ old: string; new: string }>({ old: "", new: "" });

  const handleSubmit = async (oldFile: File, newFile: File, mode: "speed" | "accuracy") => {
    setShowContent(false);
    setLoadingComplete(false);
    setFileNames({ old: oldFile.name, new: newFile.name });
    setTimeout(() => {
      setIsLoading(true);
      setError(null);
      setReport(null);
      setShowContent(true);
    }, 300);

    try {
      const result = await comparePdfs(oldFile, newFile, mode);
      setLoadingComplete(true);
      // Small delay to show 100% completion
      setTimeout(() => {
        setReport(result);
        setIsLoading(false);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
      setLoadingComplete(false);
    }
  };

  const handleCompareAgain = () => {
    setShowContent(false);
    setTimeout(() => {
      setReport(null);
      setError(null);
      setShowContent(true);
    }, 300);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          top: "-250px",
          right: "-100px",
          animation: "float 20s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          bottom: "-200px",
          left: "-100px",
          animation: "float 15s ease-in-out infinite reverse",
        }}
      />

      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
            padding: "48px",
            marginBottom: "32px",
            animation: "slideDown 0.6s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "16px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            >
              📊
            </div>
            <div>
              <h1
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "3rem",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.5px",
                }}
              >
                PDF Comparison
              </h1>
              <p style={{ margin: 0, color: "#6c757d", fontSize: "1.15rem", fontWeight: 500 }}>
                Intelligent document analysis with dual-pipeline technology
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              border: "2px solid #dc3545",
              borderRadius: "16px",
              padding: "20px 24px",
              marginBottom: "24px",
              color: "#dc3545",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              animation: "shake 0.5s ease-in-out, fadeIn 0.3s ease-out",
              boxShadow: "0 8px 24px rgba(220, 53, 69, 0.2)",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "rgba(220, 53, 69, 0.1)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
              }}
            >
              ⚠️
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "1.05rem", marginBottom: "4px" }}>Error</div>
              <div style={{ fontWeight: 500, opacity: 0.9 }}>{error}</div>
            </div>
          </div>
        )}

        {/* Content Area */}
        {!isLoading && !report && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              borderRadius: "20px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
              padding: "48px",
              animation: showContent ? "fadeInUp 0.5s ease-out" : "fadeOut 0.3s ease-out",
              opacity: showContent ? 1 : 0,
              transform: showContent ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.3s ease-out",
            }}
          >
            <UploadForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        )}

        {isLoading && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              borderRadius: "20px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
              padding: "48px",
              animation: showContent ? "fadeInUp 0.5s ease-out" : "none",
            }}
          >
            <LoadingProgress 
              message="Analyzing PDFs and computing differences..." 
              isComplete={loadingComplete}
            />
          </div>
        )}

        {report && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              borderRadius: "20px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
              padding: "48px",
              animation: showContent ? "fadeInUp 0.5s ease-out" : "fadeOut 0.3s ease-out",
              opacity: showContent ? 1 : 0,
              transform: showContent ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.3s ease-out",
            }}
          >
            <DiffReport 
              report={report} 
              onCompareAgain={handleCompareAgain}
              oldFileName={fileNames.old}
              newFileName={fileNames.new}
            />
          </div>
        )}
      </main>

      {/* Global Animations */}
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes fadeOut {
            from {
              opacity: 1;
            }
            to {
              opacity: 0;
            }
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }

          @keyframes shake {
            0%, 100% {
              transform: translateX(0);
            }
            10%, 30%, 50%, 70%, 90% {
              transform: translateX(-5px);
            }
            20%, 40%, 60%, 80% {
              transform: translateX(5px);
            }
          }

          @keyframes float {
            0%, 100% {
              transform: translate(0, 0) rotate(0deg);
            }
            33% {
              transform: translate(30px, -30px) rotate(120deg);
            }
            66% {
              transform: translate(-20px, 20px) rotate(240deg);
            }
          }

          @media (max-width: 768px) {
            body {
              font-size: 14px;
            }
          }
        `}
      </style>
    </div>
  );
}
