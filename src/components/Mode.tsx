import { useState } from "react";
import { InputMode } from "../types/cvrp";
import { createPortal } from "react-dom";
import {
  IoInformationCircleOutline,
  IoDocumentTextOutline,
  IoCloudUploadOutline,
  IoWarningOutline,
} from "react-icons/io5";
import ExcelUploadModal from "./ExcelUploadModal";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Props = {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;

  numVehicles: number;
  numPickups: number;
  rawCapacity: string;
  rawPickupLoad: string;
  fieldErrors: Record<string, string>;

  onNumVehiclesChange: (v: number) => void;
  onNumPickupsChange: (v: number) => void;
  onCapacityChange: (v: string) => void;
  onPickupLoadChange: (v: string) => void;

  onGenerate: () => void;
  onRunComparison: () => void;
  onUpload: (files: File[]) => void;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SHEET_TABS = [
  "Sheet 1 — Parameters",
  "Sheet 2 — Distance Matrix or Coordinates",
] as const;

const PARAM_ROWS: [string, string][] = [
  ["num_vehicles", "3"],
  ["num_pickups", "5"],
  ["vehicle_capacity", "100"],
  ["pickup_load", "20, 30, 15, 25, 10"],
];

const MATRIX_ROWS = [
  [0, 18, 25],
  [14, 0, 9],
  [7, 9, 0],
];

const COORD_ROWS: [string, string, boolean][] = [
  ["12.9716", "77.5946", true],
  ["12.9352", "77.6245", false],
  ["13.0012", "77.5765", false],
  ["12.9602", "77.6408", false],
];

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function XlIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <rect width="13" height="13" rx="2.5" fill="#1d6f42" />
      <path d="M3 4h7M3 6.5h7M3 9h5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ── Spreadsheet wrapper ────────────────────────────────────────
interface SpreadsheetProps {
  label: string;
  children: React.ReactNode;
}

function Spreadsheet({ label, children }: SpreadsheetProps) {
  return (
    <div className="xl-wrap">
      <div className="xl-topbar">
        <XlIcon />
        <span>{label}</span>
      </div>
      <div className="xl-scroll">{children}</div>
    </div>
  );
}

// ── Rule callout ───────────────────────────────────────────────
interface RuleProps {
  icon?: string;
  children: React.ReactNode;
}

function Rule({ icon = "▸", children }: RuleProps) {
  return (
    <div className="rule-row">
      <span className="rule-icon">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ── Section divider with label ─────────────────────────────────
function OrDivider() {
  return (
    <div className="or-divider">
      <div className="or-line" />
      <span className="or-label">OR</span>
      <div className="or-line" />
    </div>
  );
}

// ── Sheet 1 preview ────────────────────────────────────────────
function Sheet1Preview() {
  return (
    <>
      <p className="info-description sheet1-description">
        This sheet holds all key settings for your problem. Each row is one
        parameter — put the <strong>name</strong> in column A and its{" "}
        <strong>value</strong> in column B.
      </p>
      <p></p>

      <Spreadsheet label="Sheet1 — Parameters">
        <table className="xl-table">
          <thead>
            <tr>
              <th className="xl-row-num-head" />
              <th>A — Parameter</th>
              <th>B — Value</th>
            </tr>
          </thead>
          <tbody>
            {PARAM_ROWS.map(([key, val], i) => (
              <tr key={key}>
                <td className="xl-row-num">{i + 1}</td>
                <td className="xl-key">{key}</td>
                <td className="xl-val">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Spreadsheet>

      <div className="info-note">
        <IoWarningOutline className="info-note-icon" />
        <span>
          For <strong>pickup_load</strong>, enter one value per pickup,
          separated by commas. The count must match <strong>num_pickups</strong>.
        </span>
      </div>
    </>
  );
}

// ── Sheet 2 preview ────────────────────────────────────────────
function Sheet2Preview() {
  return (
    <>
      {/* ── Distance Matrix section ── */}
      <div className="preview-section">
        <div className="section-label">
          <span className="section-badge">Option A</span>
          <span className="section-title">Distance Matrix</span>
        </div>
        <p className="info-description">
          An N×N grid where <strong>N = 1 + num_pickups</strong>. Row and
          column headers are Node_0, Node_1, … The first node (Node_0) is
          always the <strong>depot</strong>. All diagonal cells must be{" "}
          <strong>0</strong>.
        </p>

        <div className="rule-group">
          <Rule>Matrix must be <strong>N×N</strong> (square)</Rule>
          <Rule>Diagonal cells must all be <strong>0</strong></Rule>
          <Rule><strong>Node_0</strong> (row 1 / col A) represents the depot</Rule>
        </div>

        <Spreadsheet label="Sheet2 — Distance Matrix">
          <table className="xl-table xl-matrix">
            <thead>
              <tr>
                <th className="xl-row-num-head" />
                <th>A </th>
                <th>B</th>
                <th>C</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROWS.map((row, ri) => (
                <tr key={ri}>
                  <td className="xl-row-num">{ri + 1}</td>
                  {row.map((val, ci) => (
                    <td key={ci} className={ri === ci ? "xl-diag" : "xl-num"}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Spreadsheet>
      </div>

      <OrDivider />

      {/* ── Coordinates section ── */}
      <div className="preview-section">
        <div className="section-label">
          <span className="section-badge section-badge-alt">Option B</span>
          <span className="section-title">GPS Coordinates</span>
        </div>
        <p className="info-description">
          One row per node with its GPS coordinates. Distances are computed
          automatically — no manual distance matrix needed.{" "}
          <strong>Node_0 must always be the first row</strong> (the depot).
        </p>

        <div className="rule-group">
          <Rule>First row is always the depot (Node_0)</Rule>
          <Rule>Columns: <strong>A = latitude</strong>, <strong>B = longitude</strong></Rule>
          <Rule>Decimal degrees format (e.g. 12.9716, 77.5946)</Rule>
        </div>

        <Spreadsheet label="Sheet2 — Coordinates">
          <table className="xl-table">
            <thead>
              <tr>
                <th className="xl-row-num-head" />
                <th>A — Latitude</th>
                <th>B — Longitude</th>
              </tr>
            </thead>
            <tbody>
              {COORD_ROWS.map(([lat, lng, isDepot], i) => (
                <tr key={i} className={isDepot ? "xl-depot-row" : ""}>
                  <td className="xl-row-num">{i + 1}</td>
                  <td className="xl-num">
                    {lat}

                  </td>
                  <td className="xl-num">{lng}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Spreadsheet>
      </div>
    </>
  );
}

// ── Info Modal ─────────────────────────────────────────────────
interface InfoModalProps {
  onClose: () => void;
}

function InfoModal({ onClose }: InfoModalProps) {
  const [activeSheet, setActiveSheet] = useState(0);

  return createPortal(
    <div
      className="info-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Excel Upload Format Guide"
    >
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="info-header">
          <div className="info-header-icon" aria-hidden>
            <IoDocumentTextOutline />
          </div>
          <div className="info-header-text">
            <h3>Excel Upload Format</h3>
            <p>Required structure for CVRP dataset — 1 file with 2 sheets</p>
          </div>
          <button
            className="info-close-btn"
            onClick={onClose}
            aria-label="Close format guide"
          >
            ✕
          </button>
        </div>

        {/* Sheet Tabs */}
        <div className="info-sheet-tabs" role="tablist">
          {SHEET_TABS.map((label, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={activeSheet === i}
              className={`info-sheet-tab ${activeSheet === i ? "active" : ""}`}
              onClick={() => setActiveSheet(i)}
            >
              <span className="sheet-tab-dot" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="info-content" role="tabpanel">
          {activeSheet === 0 && <Sheet1Preview />}
          {activeSheet === 1 && <Sheet2Preview />}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────
// Generate Mode fields
// ─────────────────────────────────────────────────────────────

interface GenerateModeProps {
  numVehicles: number;
  numPickups: number;
  rawCapacity: string;
  rawPickupLoad: string;
  fieldErrors: Record<string, string>;
  onNumVehiclesChange: (v: number) => void;
  onNumPickupsChange: (v: number) => void;
  onCapacityChange: (v: string) => void;
  onPickupLoadChange: (v: string) => void;
  onGenerate: () => void;
  onRunComparison: () => void;
}

function GenerateMode({
  numVehicles,
  numPickups,
  rawCapacity,
  rawPickupLoad,
  fieldErrors,
  onNumVehiclesChange,
  onNumPickupsChange,
  onCapacityChange,
  onPickupLoadChange,
  onGenerate,
  onRunComparison,
}: GenerateModeProps) {
  return (
    <>
      <div className="field-group">
        <label className="field-label" htmlFor="field-vehicles">Vehicles</label>
        <input
          id="field-vehicles"
          type="number"
          min={1}
          max={20}
          value={numVehicles}
          onChange={(e) =>
            onNumVehiclesChange(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))
          }
          className="field-input"
          style={{ width: 72 }}
        />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="field-pickups">Pickups</label>
        <input
          id="field-pickups"
          type="number"
          min={1}
          max={30}
          value={numPickups}
          onChange={(e) =>
            onNumPickupsChange(Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 1)))
          }
          className="field-input"
          style={{ width: 72 }}
        />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="field-capacity">Vehicle Capacity</label>
        <input
          id="field-capacity"
          type="text"
          placeholder="10  or  10,12,8"
          value={rawCapacity}
          onChange={(e) => onCapacityChange(e.target.value)}
          className={`field-input ${fieldErrors["vehicle_capacity"] ? "has-error" : ""}`}
          style={{ width: 160 }}
        />
        {fieldErrors["vehicle_capacity"] && (
          <span className="field-error" role="alert">{fieldErrors["vehicle_capacity"]}</span>
        )}
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="field-load">Pickup Load</label>
        <input
          id="field-load"
          type="text"
          placeholder="2,3,1,4,2,1,3,2"
          value={rawPickupLoad}
          onChange={(e) => onPickupLoadChange(e.target.value)}
          className={`field-input ${fieldErrors["pickup_load"] ? "has-error" : ""}`}
          style={{ width: 220 }}
        />
        {fieldErrors["pickup_load"] && (
          <span className="field-error" role="alert">{fieldErrors["pickup_load"]}</span>
        )}
      </div>

      <div className="ctrl-sep" />

      <div className="action-buttons">
        <button className="btn-demo btn-generate" onClick={onGenerate}>
          ⚡ Generate
        </button>
        <button className="btn-demo btn-solve" onClick={onRunComparison}>
          ▶ Run Comparison
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Upload Mode panel
// ─────────────────────────────────────────────────────────────

interface UploadModeProps {
  onInfoOpen: () => void;
  onModalOpen: () => void;
  onRunComparison: () => void;
}

function UploadMode({ onInfoOpen, onModalOpen, onRunComparison }: UploadModeProps) {
  return (
    <div className="upload-mode-container">
      <div className="upload-actions">
        <button
          className="info-btn"
          onClick={onInfoOpen}
          aria-label="View Excel format guide"
          title="View Excel format guide"
        >
          <IoInformationCircleOutline size={16} aria-hidden />
        </button>
        <button className="btn-demo btn-upload" onClick={onModalOpen}>
          <IoCloudUploadOutline size={15} aria-hidden />
          Upload Excel
        </button>
      </div>
      <button className="btn-demo btn-solve" onClick={onRunComparison}>
        ▶ Run Comparison
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────

export default function Mode({
  inputMode,
  setInputMode,
  numVehicles,
  numPickups,
  rawCapacity,
  rawPickupLoad,
  fieldErrors,
  onNumVehiclesChange,
  onNumPickupsChange,
  onCapacityChange,
  onPickupLoadChange,
  onGenerate,
  onRunComparison,
  onUpload,
}: Props) {
  const [showUploadInfo, setShowUploadInfo] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  return (
    <>
      {/* ─── Mode Switch ───────────────────── */}
      <div className="mode-switch-wrapper">
        <div className="mode-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={inputMode === "generate"}
            className={`mode-tab ${inputMode === "generate" ? "active" : ""}`}
            onClick={() => setInputMode("generate")}
          >
            Generate Mode
          </button>
          <button
            role="tab"
            aria-selected={inputMode === "upload"}
            className={`mode-tab ${inputMode === "upload" ? "active" : ""}`}
            onClick={() => setInputMode("upload")}
          >
            Upload Mode
          </button>
        </div>
      </div>

      {/* ─── Controls Bar ───────────────────── */}
      <div className="controls">
        {inputMode === "generate" && (
          <GenerateMode
            numVehicles={numVehicles}
            numPickups={numPickups}
            rawCapacity={rawCapacity}
            rawPickupLoad={rawPickupLoad}
            fieldErrors={fieldErrors}
            onNumVehiclesChange={onNumVehiclesChange}
            onNumPickupsChange={onNumPickupsChange}
            onCapacityChange={onCapacityChange}
            onPickupLoadChange={onPickupLoadChange}
            onGenerate={onGenerate}
            onRunComparison={onRunComparison}
          />
        )}

        {inputMode === "upload" && (
          <UploadMode
            onInfoOpen={() => setShowUploadInfo(true)}
            onModalOpen={() => setShowExcelModal(true)}
            onRunComparison={onRunComparison}
          />
        )}
      </div>

      {/* ─── Excel Upload Modal ───────────────────── */}
      {showExcelModal && (
        <ExcelUploadModal
          isOpen={showExcelModal}
          onClose={() => setShowExcelModal(false)}
          onUpload={onUpload}
        />
      )}

      {/* ─── Info Modal ───────────────────── */}
      {showUploadInfo && (
        <InfoModal onClose={() => setShowUploadInfo(false)} />
      )}

      {/* ─── Styles ───────────────────── */}
      <style>{`

        /* ── Mode switch ──────────────────────────────── */
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
          transition: all 0.2s ease;
          font-family: inherit;
          font-size: 13px;
        }
        .mode-tab:hover:not(.active) {
          color: var(--text2);
          border-color: var(--border);
          background: rgba(255,255,255,0.03);
        }
        .mode-tab.active {
          background: linear-gradient(135deg, #10e0a1, #06c167);
          color: #04130d;
          border-color: transparent;
          box-shadow: 0 2px 12px rgba(16,224,161,0.25);
        }

        /* ── Controls bar ─────────────────────────────── */
        .controls {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 10px 16px;
          width: fit-content;
          margin: 0 auto 20px;
        }

        /* ── Shared button base ───────────────────────── */
        .btn-demo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 42px;
          padding: 0 20px;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          font-family: inherit;
        }
        .btn-generate {
          background: rgba(139, 150, 146, 0.1);
          color: grey;
          border: 1px solid rgba(16,224,161,0.25);
        }
        .btn-generate:hover {
          background: rgba(162, 170, 168, 0.18);
          border-color: rgba(16,224,161,0.45);
          box-shadow: 0 0 16px rgba(16,224,161,0.15);
        }
        .btn-solve {
          background: linear-gradient(135deg, #10e0a1, #06c167);
          color: #04130d;
          border: none;
        }
        .btn-solve:hover {
          filter: brightness(1.1);
          box-shadow: 0 4px 18px rgba(16,224,161,0.3);
          transform: translateY(-1px);
        }
        .btn-upload {
          background: rgba(255,255,255,0.05);
          color: var(--text2);
          border: 1px solid var(--border2);
        }
        .btn-upload:hover {
          background: rgba(255,255,255,0.09);
          color: var(--text);
          border-color: var(--border);
        }

        /* ── Upload mode layout ───────────────────────── */
        .upload-mode-container {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .upload-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .info-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border2);
          background: rgba(16,224,161,0.05);
          color: var(--text2);
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .info-btn:hover {
          background: rgba(16,224,161,0.15);
          border-color: var(--accent);
          color: var(--accent);
          box-shadow: 0 0 8px rgba(16,224,161,0.2);
          transform: scale(1.08);
        }

        /* ── Field group (generate mode) ──────────────── */
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .field-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text3);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          user-select: none;
        }
        .field-input {
          height: 36px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid var(--border2);
          background: rgba(255,255,255,0.03);
          color: var(--text);
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field-input:focus {
          border-color: rgba(16,224,161,0.4);
          box-shadow: 0 0 0 3px rgba(16,224,161,0.08);
        }
        .field-input.has-error {
          border-color: rgba(239,68,68,0.5);
        }
        .field-error {
          font-size: 10.5px;
          color: #f87171;
          margin-top: 2px;
        }
        .ctrl-sep {
          width: 1px;
          height: 42px;
          background: var(--border);
          align-self: center;
          flex-shrink: 0;
          margin: 0 4px;
        }
        .action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
          align-self: flex-end;
          padding-bottom: 2px;
        }

        /* ────────────────────────────────────────────── */
        /* ── Info Modal ──────────────────────────────── */
        /* ────────────────────────────────────────────── */

        .info-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
          animation: fadeIn 0.2s ease both;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }

        .info-modal {
          width: 660px;
          max-width: 92vw;
          /* Fixed height — modal never resizes when switching tabs */
          height: 550px;
          max-height: 90vh;
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
          animation: modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        /* Header */
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
          flex-shrink: 0;
          color: var(--accent);
        }
        .info-header-icon svg { width: 18px; height: 18px; }
        .info-header-text { flex: 1; }
        .info-header-text h3 {
          font-size: 16px;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 3px;
          letter-spacing: -0.01em;
        }
        .info-header-text p {
          font-size: 11px;
          color: var(--text3);
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
          margin: 0;
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
          font-family: inherit;
        }
        .info-close-btn:hover {
          background: rgba(255,255,255,0.08);
          color: var(--text);
        }

        /* Sheet tabs */
        .info-sheet-tabs {
          display: flex;
          gap: 0;
          background: rgba(16,224,161,0.02);
          border-bottom: 1px solid #13213a;
          padding: 0 22px;
          flex-shrink: 0;
          overflow-x: auto;
        }
        .info-sheet-tabs::-webkit-scrollbar { display: none; }
        .info-sheet-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          font-size: 11.5px;
          color: var(--text3);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.15s ease;
          font-family: inherit;
        }
        .info-sheet-tab:hover { color: var(--text2); }
        .info-sheet-tab.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
          font-weight: 700;
        }
        .sheet-tab-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #1e3a2e;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .info-sheet-tab.active .sheet-tab-dot { background: var(--accent); }

        /* Modal body — fills remaining height, scrolls internally */
        .info-content {
          padding: 24px 24px 28px;
          overflow-y: auto;
          overflow-x: hidden;
          flex: 1;
          min-height: 0;        /* critical: lets flexbox child shrink below content size */
          display: flex;
          flex-direction: column;
          gap: 0;
          scroll-behavior: smooth;
        }
        .info-content::-webkit-scrollbar { width: 4px; }
        .info-content::-webkit-scrollbar-track { background: transparent; }
        .info-content::-webkit-scrollbar-thumb {
          background: var(--border2);
          border-radius: 2px;
        }
        .info-content::-webkit-scrollbar-thumb:hover {
          background: #2a4060;
        }

        /* Description */
        .info-description {
          font-size: 12.5px;
          color: var(--text2);
          line-height: 1.7;
          margin: 0;           /* spacing handled by parent gap */
        }
        .info-description strong { color: var(--text); font-weight: 600; }

        /* Note row */
        .info-note {
          display: flex;
          gap: 7px;
          align-items: flex-start;
          margin-top: 16px;
          font-size: 11.5px;
          color: var(--text3);
          line-height: 1.6;
          padding: 10px 12px;
          background: rgba(250,204,21,0.05);
          border: 1px solid rgba(250,204,21,0.12);
          border-radius: 8px;
        }
        .info-note strong { color: var(--text2); font-weight: 600; }
        .info-note-icon {
          color: #facc15;
          flex-shrink: 0;
          font-size: 14px;
          margin-top: 1px;
        }

        /* ── Preview section container ────────────────── */
        .preview-section {
          display: flex;
          flex-direction: column;
          gap: 12px;           /* breathing room between description → rules → table */
          padding: 4px 0;      /* top/bottom micro-padding so first section isn't flush */
        }
        .section-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .section-badge {
          display: inline-flex;
          align-items: center;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 20px;
          background: rgba(16,224,161,0.1);
          color: var(--accent);
          border: 1px solid rgba(16,224,161,0.22);
        }
        .section-badge-alt {
          background: rgba(99,179,237,0.1);
          color: #63b3ed;
          border-color: rgba(99,179,237,0.22);
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
        }

        /* ── Rule group ───────────────────────────────── */
        .rule-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-bottom: 0;    /* parent gap handles spacing */
          padding: 10px 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid #1e293b;
          border-radius: 8px;
        }
        .rule-row {
          display: flex;
          align-items: baseline;
          gap: 7px;
          font-size: 11.5px;
          color: var(--text3);
          line-height: 1.5;
        }
        .rule-row strong { color: var(--text2); font-weight: 600; }
        .rule-icon {
          color: var(--accent);
          font-size: 11px;
          flex-shrink: 0;
          opacity: 0.7;
        }

        /* ── OR divider ───────────────────────────────── */
        .or-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 28px 0;      /* generous vertical separation between Option A and B */
        }
        .or-line {
          flex: 1;
          height: 1px;
          background: #1e293b;
        }
        .or-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text3);
          padding: 3px 10px;
          border: 1px solid #1e293b;
          border-radius: 20px;
          background: rgba(255,255,255,0.02);
        }

        /* ────────────────────────────────────────────── */
        /* ── Spreadsheet preview ─────────────────────── */
        /* ────────────────────────────────────────────── */
        .sheet1-description {
  margin-bottom: 18px;
}



        .xl-wrap {
          border: 1px solid #1e293b;
          border-radius: 10px;
          overflow: hidden;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          margin-top: 18px;

          margin-bottom: 18px;

          

        }
        .xl-topbar {
          display: flex;
          align-items: center;
          gap: 7px;
          background: #1a4a2e;
          color: rgba(255,255,255,0.85);
          font-size: 11px;
          font-family: inherit;
          padding: 6px 11px;
          letter-spacing: 0.01em;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .xl-topbar svg { flex-shrink: 0; }
        .xl-scroll { overflow-x: auto; }
        .xl-scroll::-webkit-scrollbar { height: 4px; }
        .xl-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }

        table.xl-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          padding: 10px 16px;
        }
        table.xl-table th {
          background: #0d1f35;
          border: 1px solid #1e293b;
          padding: 6px 10px;
          font-size: 10.5px;
          font-weight: 600;
          color: #4a6a8a;
          text-align: center;
          white-space: nowrap;
        }
        th.xl-row-num-head,
        td.xl-row-num {
          width: 32px;
          min-width: 32px;
          background: #0d1f35;
          color: #4a6a8a;
          font-size: 10.5px;
          text-align: center;
          border: 1px solid #1e293b;
          padding: 5px 6px;
          user-select: none;
        }
        th.xl-depot-head {
          background: rgba(161,120,0,0.15) !important;
          color: #c9a227 !important;
        }
        table.xl-table td {
          border: 1px solid #1a2a3f;
          padding: 6px 10px;
          white-space: nowrap;
        }

        /* Cell types */
        td.xl-key {
          background: rgba(16,224,161,0.06);
          color: #10e0a1;
          font-weight: 600;
          text-align: left;
          min-width: 160px;
        }
        td.xl-val {
          color: var(--text2);
          text-align: left;
          min-width: 140px;
        }
        td.xl-num {
          color: var(--text2);
          text-align: right;
          min-width: 88px;
          position: relative;
        }
        td.xl-depot {
          background: rgba(161,120,0,0.12);
          color: #c9a227;
          font-weight: 600;
          text-align: left;
        }
        td.xl-diag {
          background: rgba(255,255,255,0.03);
          color: #2a4060;
          text-align: right;
          font-weight: 600;
        }
        tr.xl-depot-row td {
          background: rgba(161,120,0,0.07);
        }
        tr.xl-depot-row td.xl-row-num {
          background: #0d1f35;
        }

      
      `}</style>
    </>
  );
}