// ExcelUploadModal.tsx

import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { IoCloudUploadOutline, IoDocumentOutline, IoCloseOutline, IoCheckmarkCircle, IoAlertCircleOutline } from "react-icons/io5";
import { createPortal } from "react-dom";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
}

// ─────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  if (!file.name.endsWith(".xlsx")) {
    return "Only .xlsx files are accepted.";
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // ── File selection ───────────────────────────────────────────

  function applyFile(selected: File) {
    const err = validateFile(selected);
    setValidationError(err);
    setFile(err ? null : selected);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) applyFile(selected);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) applyFile(dropped);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function clearFile() {
    setFile(null);
    setValidationError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── Submit ───────────────────────────────────────────────────

  function handleUpload() {
    if (!file) {
      setValidationError("Please select an .xlsx file before uploading.");
      return;
    }
    onUpload([file]);
    onClose();
  }

  // ── Render ───────────────────────────────────────────────────

  return createPortal(
    <div
      className="eum-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Upload Excel file"
    >
      <div className="eum-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="eum-header">
          <div className="eum-header-icon" aria-hidden>
            <IoCloudUploadOutline />
          </div>
          <div className="eum-header-text">
            <h3>Upload Excel File</h3>
            <p>One .xlsx file · 2 sheets required</p>
          </div>
          <button
            className="eum-close-btn"
            onClick={onClose}
            aria-label="Close upload modal"
          >
            <IoCloseOutline size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="eum-body">

          {/* Drop zone */}
          <div
            className={`eum-dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !file && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drop zone for Excel file"
            onKeyDown={(e) => e.key === "Enter" && !file && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              style={{ display: "none" }}
              aria-label="Excel file input"
            />

            {file ? (
              /* ── File selected state ── */
              <div className="eum-file-info">
                <div className="eum-file-icon">
                  <IoDocumentOutline size={22} />
                </div>
                <div className="eum-file-meta">
                  <span className="eum-file-name">{file.name}</span>
                  <span className="eum-file-size">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="eum-file-status">
                  <IoCheckmarkCircle size={18} className="eum-check-icon" />
                </div>
                <button
                  className="eum-remove-btn"
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  aria-label="Remove file"
                >
                  <IoCloseOutline size={14} />
                </button>
              </div>
            ) : (
              /* ── Empty state ── */
              <div className="eum-empty">
                <div className="eum-drop-icon" aria-hidden>
                  <IoCloudUploadOutline size={28} />
                </div>
                <p className="eum-drop-title">
                  Drop your file here
                  <span className="eum-drop-or"> or </span>
                  <span className="eum-drop-browse">browse</span>
                </p>
                <p className="eum-drop-hint">Accepts .xlsx · Must contain exactly 2 sheets</p>
              </div>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="eum-error" role="alert">
              <IoAlertCircleOutline size={14} className="eum-error-icon" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Sheet requirements callout */}
          <div className="eum-callout">
            <div className="eum-callout-row">
              <span className="eum-callout-dot" />
              <span><strong>Sheet 1</strong> — Parameters (num_vehicles, num_pickups, …)</span>
            </div>
            <div className="eum-callout-row">
              <span className="eum-callout-dot" />
              <span><strong>Sheet 2</strong> — Distance matrix <em>or</em> GPS coordinates</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="eum-footer">
          <button className="eum-btn eum-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`eum-btn eum-btn-upload ${!file ? "disabled" : ""}`}
            onClick={handleUpload}
            disabled={!file}
            aria-disabled={!file}
          >
            <IoCloudUploadOutline size={14} aria-hidden />
            Upload File
          </button>
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        @keyframes eumFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes eumPop {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }

        /* Overlay */
        .eum-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
          animation: eumFadeIn 0.2s ease both;
        }

        /* Panel */
        .eum-modal {
          width: 480px;
          max-width: 92vw;
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
          animation: eumPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        /* ── Header ─────────────────────────────────────── */
        .eum-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 20px 22px 18px;
          border-bottom: 1px solid #13213a;
          background: rgba(16,224,161,0.03);
          flex-shrink: 0;
        }
        .eum-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(16,224,161,0.12);
          border: 1px solid rgba(16,224,161,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--accent, #10e0a1);
        }
        .eum-header-icon svg { width: 18px; height: 18px; }
        .eum-header-text { flex: 1; }
        .eum-header-text h3 {
          font-size: 16px;
          font-weight: 800;
          color: var(--text, #e2e8f0);
          margin: 0 0 3px;
          letter-spacing: -0.01em;
        }
        .eum-header-text p {
          font-size: 11px;
          color: var(--text3, #4a6a8a);
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
          margin: 0;
        }
        .eum-close-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid var(--border2, #1e3a5f);
          background: rgba(255,255,255,0.03);
          color: var(--text2, #8aa4c0);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
          font-family: inherit;
        }
        .eum-close-btn:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text, #e2e8f0);
        }

        /* ── Body ───────────────────────────────────────── */
        .eum-body {
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* ── Drop zone ──────────────────────────────────── */
        .eum-dropzone {
          border: 1.5px dashed #1e3a5f;
          border-radius: 12px;
          background: rgba(255,255,255,0.015);
          padding: 28px 20px;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
          outline: none;
        }
        .eum-dropzone:hover,
        .eum-dropzone:focus-visible {
          border-color: rgba(16,224,161,0.35);
          background: rgba(16,224,161,0.03);
        }
        .eum-dropzone.dragging {
          border-color: var(--accent, #10e0a1);
          background: rgba(16,224,161,0.06);
          box-shadow: 0 0 20px rgba(16,224,161,0.1);
        }
        .eum-dropzone.has-file {
          border-style: solid;
          border-color: rgba(16,224,161,0.25);
          background: rgba(16,224,161,0.04);
          cursor: default;
          padding: 14px 16px;
        }

        /* Empty state */
        .eum-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }
        .eum-drop-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(16,224,161,0.08);
          border: 1px solid rgba(16,224,161,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent, #10e0a1);
          margin-bottom: 4px;
        }
        .eum-drop-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
          margin: 0;
        }
        .eum-drop-or { color: var(--text3, #4a6a8a); font-weight: 400; }
        .eum-drop-browse {
          color: var(--accent, #10e0a1);
          text-decoration: underline;
          text-underline-offset: 3px;
          font-weight: 700;
          cursor: pointer;
        }
        .eum-drop-hint {
          font-size: 11px;
          color: var(--text3, #4a6a8a);
          margin: 0;
          font-family: 'JetBrains Mono', monospace;
        }

        /* File selected state */
        .eum-file-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .eum-file-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(16,224,161,0.1);
          border: 1px solid rgba(16,224,161,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent, #10e0a1);
          flex-shrink: 0;
        }
        .eum-file-meta {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .eum-file-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: 'JetBrains Mono', monospace;
        }
        .eum-file-size {
          font-size: 10.5px;
          color: var(--text3, #4a6a8a);
          font-family: 'JetBrains Mono', monospace;
        }
        .eum-file-status { display: flex; align-items: center; }
        .eum-check-icon { color: var(--accent, #10e0a1); }
        .eum-remove-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: 1px solid var(--border2, #1e3a5f);
          background: rgba(255,255,255,0.04);
          color: var(--text3, #4a6a8a);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
          font-family: inherit;
        }
        .eum-remove-btn:hover {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.3);
          color: #f87171;
        }

        /* ── Validation error ───────────────────────────── */
        .eum-error {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          color: #f87171;
          padding: 9px 12px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
        }
        .eum-error-icon { flex-shrink: 0; }

        /* ── Sheet callout ──────────────────────────────── */
        .eum-callout {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 12px 14px;
          background: rgba(255,255,255,0.02);
          border: 1px solid #1e293b;
          border-radius: 10px;
        }
        .eum-callout-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 12px;
          color: var(--text3, #4a6a8a);
          line-height: 1.5;
        }
        .eum-callout-row strong { color: var(--text2, #8aa4c0); font-weight: 600; }
        .eum-callout-row em { font-style: italic; color: var(--text3, #4a6a8a); }
        .eum-callout-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent, #10e0a1);
          flex-shrink: 0;
          opacity: 0.6;
          margin-top: 1px;
          align-self: center;
        }

        /* ── Footer ─────────────────────────────────────── */
        .eum-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          padding: 16px 22px 20px;
          border-top: 1px solid #13213a;
          background: rgba(16,224,161,0.02);
        }
        .eum-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 40px;
          padding: 0 18px;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          font-family: inherit;
          white-space: nowrap;
        }
        .eum-btn-cancel {
          background: rgba(255,255,255,0.04);
          color: var(--text2, #8aa4c0);
          border: 1px solid var(--border2, #1e3a5f);
        }
        .eum-btn-cancel:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text, #e2e8f0);
        }
        .eum-btn-upload {
          background: linear-gradient(135deg, #10e0a1, #06c167);
          color: #04130d;
          border: none;
          box-shadow: 0 2px 10px rgba(16,224,161,0.2);
        }
        .eum-btn-upload:hover:not(.disabled) {
          filter: brightness(1.1);
          box-shadow: 0 4px 18px rgba(16,224,161,0.3);
          transform: translateY(-1px);
        }
        .eum-btn-upload.disabled {
          opacity: 0.35;
          cursor: not-allowed;
          filter: none;
          transform: none;
          box-shadow: none;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ExcelUploadModal;