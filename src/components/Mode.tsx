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
import "../Styling/Mode.css";

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
  hasGenerated: boolean;
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
  hasGenerated: boolean;
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
  hasGenerated,
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
        <button
          className={`btn-demo btn-solve ${!hasGenerated ? "btn-solve-disabled" : ""}`}
          onClick={onRunComparison}
          disabled={!hasGenerated}
        >
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
  hasGenerated,
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
            hasGenerated={hasGenerated}
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
    </>
  );
}