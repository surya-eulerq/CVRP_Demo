import { useState } from "react";
import { createPortal } from "react-dom";
import {
    IoInformationCircleOutline,
    IoDocumentTextOutline
} from "react-icons/io5";

type Props = {
    inputMode: string;
    setInputMode: (mode: string) => void;
};

export default function Mode({ inputMode, setInputMode }: Props) {
    const [showUploadInfo, setShowUploadInfo] = useState(false);

    return (
        <>
            {/* ─── Mode Switch ───────────────────── */}
            <div className="mode-switch-wrapper">
                <div className="mode-tabs">
                    <button
                        className={`mode-tab ${inputMode === "generate" ? "active" : ""}`}
                        onClick={() => setInputMode("generate")}
                    >
                        Generate Mode
                    </button>

                    <button
                        className={`mode-tab ${inputMode === "upload" ? "active" : ""}`}
                        onClick={() => setInputMode("upload")}
                    >
                        Upload Mode
                    </button>
                </div>
            </div>

            {/* ─── Controls Bar ───────────────────── */}
            <div className="controls">
                {/* Generate Mode */}
                {inputMode === 'generate' && (
                    <>
                        <div className="field-group">
                            <span className="field-label">Vehicles</span>
                            <input type="number" min={1} max={20} defaultValue={3} className="field-input" style={{ width: 72 }} />
                        </div>
                        <div className="field-group">
                            <span className="field-label">Pickups</span>
                            <input type="number" min={1} max={30} defaultValue={8} className="field-input" style={{ width: 72 }} />
                        </div>
                        <div className="field-group">
                            <span className="field-label">Vehicle Capacity</span>
                            <input type="text" placeholder="10  or  10,12,8" className="field-input" style={{ width: 160 }} />
                        </div>
                        <div className="field-group">
                            <span className="field-label">Pickup Load</span>
                            <input type="text" placeholder="2,3,1,4,2,1,3,2" className="field-input" style={{ width: 220 }} />
                        </div>
                        <div className="ctrl-sep" />
                        <button className="btn-demo btn-generate">⚡ Generate</button>
                        <button className="btn-demo btn-solve">▶ Run Comparison</button>
                    </>
                )}
                {inputMode === "upload" && (
                    <div className="upload-mode-container">
                        <div className="upload-actions">
                            <button
                                className="info-btn"
                                onClick={() => setShowUploadInfo(true)}
                            >
                                <IoInformationCircleOutline size={16} />
                            </button>

                            <button className="btn-demo btn-upload">
                                ↑ Upload Excel
                            </button>
                        </div>

                        <button className="btn-demo btn-solve">
                            ▶ Run Comparison
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Info Modal ───────────────────── */}
            {showUploadInfo &&
                createPortal(
                    <div
                        className="info-overlay"
                        onClick={() => setShowUploadInfo(false)}
                    >
                        <div
                            className="info-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="info-header">
                                <div className="info-header-icon">
                                    <IoDocumentTextOutline />
                                </div>

                                <div className="info-header-text">
                                    <h3>Excel Upload Format</h3>
                                    <p>Required structure for CVRP dataset upload</p>
                                </div>

                                <button
                                    className="info-close-btn"
                                    onClick={() => setShowUploadInfo(false)}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Body */}
                            <div className="info-content">
                                <p className="info-description">
                                    The uploaded Excel file should contain all routing and
                                    capacity information required for solving the CVRP problem.
                                </p>

                                <div className="info-card">
                                    <h4>Required Parameters</h4>

                                    <div className="info-list">
                                        {[
                                            { key: "num_vehicles", desc: "Number of vehicles." },
                                            { key: "num_pickups", desc: "Pickup locations." },
                                            { key: "vehicle_capacity", desc: "Vehicle capacity." },
                                            { key: "distances", desc: "Distance matrix." },
                                            { key: "pickup_load", desc: "Demand per pickup." },
                                            { key: "backend", desc: "Solver backend." },
                                            { key: "force_backend_use", desc: "Force backend usage." }
                                        ].map(({ key, desc }) => (
                                            <div className="info-item" key={key}>
                                                <strong>{key}</strong>
                                                <span>{desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>


                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {/* ─── CSS ───────────────────── */}
            <style>{`
        .mode-switch-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-top: 32px;
          margin-bottom: 18px;
        }

        .mode-tabs {
          display: flex;
          gap: 8px;
          padding: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
        }

        .mode-tab {
          min-width: 160px;
          height: 48px;
          border-radius: 12px;
          border: 1px solid var(--border2);
          background: transparent;
          color: var(--text3);
          font-weight: 700;
          cursor: pointer;
        }

        .mode-tab.active {
          background: linear-gradient(135deg, #10e0a1, #06c167);
          color: #04130d;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 10px 16px;
           width: fit-content;
          margin: 0 auto 20px;
        }

        .upload-mode-container {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;   /* ✅ FIX */
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  width: auto;   /* ✅ FIX */
}

        .info-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid var(--border2);
          background: rgba(16,224,161,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* ─── Info button ────────────────────────────────────────────────────── */
        .info-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid var(--border2);
          background: rgba(16,224,161,0.05);
          color: var(--text2);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          flex-shrink: 0;
        }
        .info-btn:hover {
          background: rgba(16,224,161,0.15);
          border-color: var(--accent);
          color: var(--accent);
          box-shadow: 0 0 8px rgba(16,224,161,0.2);
          transform: scale(1.08);
        }

        /* ─── Info modal overlay ─────────────────────────────────────────────── */
        .info-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease both;
          padding: 24px;
        }

        /* ─── Info modal panel ───────────────────────────────────────────────── */
        .info-modal {
          width: 640px;
          max-width: 92vw;
          max-height: 82vh;
          background: #081225;
          border: 1px solid #1b2a47;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 0 0 1px rgba(16,224,161,0.06),
            0 24px 64px rgba(0,0,0,0.55),
            0 0 40px rgba(16,224,161,0.05);
          animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        /* ─── Info modal header ──────────────────────────────────────────────── */
        .info-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 20px 22px 18px;
          border-bottom: 1px solid #13213a;
          background: rgba(16,224,161,0.03);
          flex-shrink: 0;
        }

        .info-header-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(16,224,161,0.12);
  border: 1px solid rgba(16,224,161,0.22);
  display: flex;
  align-items: center;
  justify-content: center;
}

        .info-header-text { flex: 1; }

        .info-header-text h3 {
          font-size: 16px;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 3px;
          letter-spacing: -0.01em;
        }

        .info-header-text p {
          font-size: 11px;
          color: var(--text3);
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
        }

        .info-close-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid var(--border2);
          background: rgba(255,255,255,0.03);
          color: var(--text2);
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .info-close-btn:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text);
          border-color: var(--border2);
        }

        /* ─── Info modal body ────────────────────────────────────────────────── */
        .info-header-icon svg {
  width: 18px;
  height: 18px;
  color: var(--accent); /* or #10e0a1 */
}
        .info-content {
          padding: 20px 22px 22px;
          color: var(--text2);
          line-height: 1.65;
          overflow-y: auto;
          flex: 1;
        }
        .info-content::-webkit-scrollbar { width: 4px; }
        .info-content::-webkit-scrollbar-track { background: transparent; }
        .info-content::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        .info-description {
          font-size: 12.5px;
          color: var(--text2);
          line-height: 1.7;
          margin-bottom: 16px;
        }

        /* ─── Info card (parameters block) ──────────────────────────────────── */
        .info-card {
          margin-bottom: 16px;
          padding: 16px 18px;
          border-radius: 14px;
          background: rgba(255,255,255,0.025);
          border: 1px solid #1e293b;
        }

        .info-card h4 {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 14px;
        }

        /* ─── Info list ──────────────────────────────────────────────────────── */
        .info-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .info-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 9px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .info-item:last-child { border-bottom: none; padding-bottom: 0; }

        .info-item strong {
          font-size: 11.5px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: var(--accent);
          min-width: 148px;
          flex-shrink: 0;
          padding-top: 1px;
        }

        .info-item span {
          font-size: 12px;
          color: var(--text2);
          line-height: 1.6;
        }

        /* ─── JSON preview ───────────────────────────────────────────────────── */
        .json-section h4 {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 10px;
        }

        .json-preview {
          padding: 14px 16px;
          border-radius: 12px;
          background: #020817;
          border: 1px solid #1e293b;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
          color: #94a3b8;
        }
      `}</style>
        </>
    );
}