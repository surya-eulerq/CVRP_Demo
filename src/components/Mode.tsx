import { useState, useCallback, useRef } from "react";
import "../Styling/Mode.css";
import {
  RiTruckLine,
  RiAddLine,
  RiSubtractLine,
  RiFlashlightLine,
  RiAttachment2,
  RiPlayCircleLine,
  RiArrowDownSLine,
  RiUploadCloud2Line,
} from "react-icons/ri";
import {
  TbPackageImport,
  TbCar,
  TbBike,
  TbTruckDelivery,
} from "react-icons/tb";
import { IoAlertCircleOutline, IoCloseOutline } from "react-icons/io5";
import ExcelUploadModal from "./ExcelUploadModal";
import {
  parseLocationFile,
  buildInstanceFromLocations,
} from "../utils/excelParser";
import type { GenerateParams, ExcelParseResult } from "../types/cvrp";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_CAPACITY: Record<VehicleType, number> = {
  "two-wheeler": 5,
  "three-wheeler": 20,
};

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type VehicleType = "two-wheeler" | "three-wheeler";

type Props = {
  onGenerate: (params: GenerateParams) => void;
  onRunComparison: () => void;
  onUploadParsed: (result: ExcelParseResult) => void;
  hasGenerated: boolean;
  isRunning: boolean;
};

type VehicleRow = {
  id: number;
  capacity: string;
  error: string | null;
  clamped: boolean;
};

type PickupRow = {
  id: number;
  load: string;
  error: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Mode({
  onGenerate,
  onRunComparison,
  onUploadParsed,
  hasGenerated,
  isRunning,
}: Props) {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([
    { id: 1, capacity: "", error: null, clamped: false },
  ]);
  const [pickups, setPickups] = useState<PickupRow[]>([
    { id: 1, load: "", error: null },
  ]);

  const [vehicleType, setVehicleType] = useState<VehicleType>("two-wheeler");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  const [inputMode, setInputMode] = useState<"generate" | "upload">("generate");

  const lastVehicleInputRef = useRef<HTMLInputElement | null>(null);
  const lastPickupInputRef = useRef<HTMLInputElement | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Toast helpers
  // ─────────────────────────────────────────────────────────────────────────

  function showToast(message: string) {
    // Clear any existing timer so the new toast gets a fresh 8 s window
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastError(message);
    toastTimerRef.current = setTimeout(() => setToastError(null), 8000);
  }

  function dismissToast() {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastError(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle row actions
  // ─────────────────────────────────────────────────────────────────────────

  const addVehicle = useCallback(() => {
    setVehicles((prev) => [
      ...prev,
      { id: prev.length + 1, capacity: "", error: null, clamped: false },
    ]);
    setTimeout(() => lastVehicleInputRef.current?.focus(), 30);
  }, []);

  const updateVehicleCapacity = useCallback((id: number, value: string) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id !== id
          ? v
          : { ...v, capacity: value, error: null, clamped: false },
      ),
    );
  }, []);

  const clampVehicleCapacity = useCallback((id: number, type: VehicleType) => {
    const maxCap = MAX_CAPACITY[type];
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const num = parseInt(v.capacity, 10);
        if (!isNaN(num) && num > maxCap) {
          return { ...v, capacity: String(maxCap), error: null, clamped: true };
        }
        return { ...v, error: null, clamped: false };
      }),
    );
    setTimeout(() => {
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? { ...v, clamped: false } : v)),
      );
    }, 900);
  }, []);

  const removeVehicle = useCallback((id: number) => {
    setVehicles((prev) => {
      if (prev.length === 1) return prev;
      const filtered = prev.filter((v) => v.id !== id);
      return filtered.map((v, i) => ({ ...v, id: i + 1 }));
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Pickup row actions
  // ─────────────────────────────────────────────────────────────────────────

  const addPickup = useCallback(() => {
    setPickups((prev) => [
      ...prev,
      { id: prev.length + 1, load: "", error: null },
    ]);
    setTimeout(() => lastPickupInputRef.current?.focus(), 30);
  }, []);

  const updatePickupLoad = useCallback((id: number, value: string) => {
    setPickups((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        let error: string | null = null;
        if (value.trim() !== "") {
          const num = Number(value);
          if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
            error = "Must be a non-negative integer.";
          }
        }
        return { ...p, load: value, error };
      }),
    );
  }, []);

  const removePickup = useCallback((id: number) => {
    setPickups((prev) => {
      if (prev.length === 1) return prev;
      const filtered = prev.filter((p) => p.id !== id);
      return filtered.map((p, i) => ({ ...p, id: i + 1 }));
    });
  }, []);

  function buildAndValidate(): GenerateParams | null {
    let valid = true;
    setFormError(null);

    const maxCap = MAX_CAPACITY[vehicleType];

    // ── Validate vehicle capacities ────────────────────────────────────────
    const validatedVehicles = vehicles.map((v) => {
      let val = parseInt(v.capacity, 10);
      if (!v.capacity.trim() || isNaN(val) || val <= 0) {
        valid = false;
        return { ...v, error: "Must be a positive integer." };
      }
      if (val > maxCap) val = maxCap;
      return { ...v, capacity: String(val), error: null };
    });
    setVehicles(validatedVehicles);

    // ── Validate pickup loads ──────────────────────────────────────────────
    const validatedPickups = pickups.map((p) => {
      const val = parseInt(p.load, 10);
      if (!p.load.trim() || isNaN(val) || val < 0) {
        valid = false;
        return { ...p, error: "Must be a non-negative integer." };
      }
      return { ...p, error: null };
    });
    setPickups(validatedPickups);

    if (!valid) return null;

    const vehicleCapacities = validatedVehicles.map((v) =>
      parseInt(v.capacity, 10),
    );
    const pickupLoad = validatedPickups.map((p) => parseInt(p.load, 10));
    const vehicleCapacity: number[] = vehicleCapacities;

    // ── Infeasibility check ────────────────────────────────────────────────
    const totalLoad = pickupLoad.reduce((s, v) => s + v, 0);
    const totalCap = vehicleCapacities.reduce((s, v) => s + v, 0);
    if (totalLoad > totalCap) {
      setFormError(
        `Total pickup load (${totalLoad}) exceeds total fleet capacity (${totalCap}). Increase capacity or reduce load.`,
      );
      return null;
    }

    return {
      numVehicles: vehicles.length,
      numPickups: pickups.length,
      vehicleCapacity,
      pickupLoad,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate handler
  // ─────────────────────────────────────────────────────────────────────────

  function handleGenerate() {
    const params = buildAndValidate();
    if (!params) return;
    setInputMode("generate");
    onGenerate(params);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Run Comparison handler
  // ─────────────────────────────────────────────────────────────────────────

  function handleRunComparison() {
    if (inputMode === "upload") {
      onRunComparison();
      return;
    }
    const params = buildAndValidate();
    if (!params) return;
    onRunComparison();
  }

  async function handleFileUpload(file: File) {
    setIsParsing(true);
    setFormError(null);
    setToastError(null);

    try {
      const { depot, locations, warnings, fatalError } =
        await parseLocationFile(file);

      // ── Fatal parse error ────────────────────────────────────────────────
      if (fatalError) {
        setUploadModalOpen(false);
        showToast(fatalError);
        setIsParsing(false);
        return;
      }

      if (!depot || locations.length === 0) {
        setUploadModalOpen(false);
        showToast(
          warnings.length > 0
            ? `No valid locations found. ${warnings[0]}`
            : "No valid locations found in the file.",
        );
        setIsParsing(false);
        return;
      }

      const filePickupCount = locations.length;
      const sidebarPickupCount = pickups.length;

      if (filePickupCount !== sidebarPickupCount) {
        setUploadModalOpen(false);
        showToast(
          `Pick-Up load must be equal to the number of locations in the file.`,
        );
        setIsParsing(false);
        return;
      }

      // ── Validation 2: Capacity < total pickup load ─────────────────────────
      const validPickupLoads = pickups
        .map((p) => parseInt(p.load, 10))
        .filter((n) => !isNaN(n));
      const totalPickupLoad = validPickupLoads.reduce((s, v) => s + v, 0);

      const firstCap = parseInt(vehicles[0]?.capacity ?? "", 10);
      const effectiveCapPerVehicle =
        !isNaN(firstCap) && firstCap > 0 ? firstCap : MAX_CAPACITY[vehicleType];
      const totalFleetCapacity = vehicles.length * effectiveCapPerVehicle;

      if (validPickupLoads.length > 0 && totalPickupLoad > totalFleetCapacity) {
        setUploadModalOpen(false);
        showToast(`Pick-Up load must less than vehicle capacity.`);
        setIsParsing(false);
        return;
      }

      // Warn about skipped rows (non-fatal)
      if (warnings.length > 0) {
        console.warn("[Mode] Upload warnings:", warnings);
      }

      // ── Build instance ───────────────────────────────────────────────────
      const numVehicles = vehicles.length;
      const vehicleCapacity =
        !isNaN(firstCap) && firstCap > 0 ? firstCap : MAX_CAPACITY[vehicleType];

      const { nodes, instance } = buildInstanceFromLocations(
        locations,
        numVehicles,
        vehicleCapacity,
        depot,
      );

      const result: ExcelParseResult = { nodes, instance };
      onUploadParsed(result);
      setUploadedFile(file);
      setInputMode("upload");
      setUploadModalOpen(false);
    } catch (err) {
      console.error("[Mode] Upload parse error:", err);
      setUploadModalOpen(false);
      showToast(
        "Failed to parse the file. Please check the format and try again.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // canRun
  // ─────────────────────────────────────────────────────────────────────────

  const canRun =
    !isRunning &&
    ((inputMode === "generate" && hasGenerated) ||
      (inputMode === "upload" && uploadedFile !== null));

  // ─────────────────────────────────────────────────────────────────────────
  // Capacity hint
  // ─────────────────────────────────────────────────────────────────────────

  const capacityHint = (() => {
    if (vehicles.length < 2) return null;
    if (!vehicles.every((v) => v.capacity.trim() !== "")) return null;
    const caps = vehicles.map((v) => parseInt(v.capacity, 10));
    if (caps.some(isNaN)) return null;
    const allSame = caps.every((c) => c === caps[0]);
    return allSame
      ? `Uniform capacity: ${caps[0]} per vehicle`
      : `Per-vehicle: [${caps.join(", ")}]`;
  })();

  const maxCap = MAX_CAPACITY[vehicleType];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <ExcelUploadModal
        isOpen={uploadModalOpen}
        onClose={() => !isParsing && setUploadModalOpen(false)}
        onUpload={handleFileUpload}
        isParsing={isParsing}
      />

      {/* ── Top-RIGHT toast error ────────────────────────────────────────── */}
      {toastError && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 9999,
            maxWidth: "400px",
            backgroundColor: "#1a0a0a",
            border: "1px solid #c0392b",
            borderRadius: "8px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            animation: "fadeSlideIn 0.2s ease",
          }}
          role="alert"
        >
          <IoAlertCircleOutline
            size={18}
            style={{ color: "#e74c3c", flexShrink: 0, marginTop: "1px" }}
          />
          <span
            style={{
              color: "#f5a8a3",
              fontSize: "13px",
              lineHeight: "1.5",
              flex: 1,
            }}
          >
            {toastError}
          </span>
          <button
            onClick={dismissToast}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#e74c3c",
              padding: "0",
              flexShrink: 0,
              lineHeight: 1,
            }}
            aria-label="Dismiss error"
          >
            <IoCloseOutline size={16} />
          </button>
        </div>
      )}

      <aside className="mode-sidebar">
        <div className="sidebar-scroll-area">
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <div className="header-left">
                <TbCar className="card-icon" />
                <label className="sidebar-input-label">Vehicle Type</label>
              </div>
            </div>

            <div className="custom-select-wrapper">
              <button
                className="custom-select-trigger"
                onClick={() => setTypeDropdownOpen((o) => !o)}
                disabled={isRunning}
              >
                <span className="custom-select-selected">
                  {vehicleType === "two-wheeler" ? (
                    <>
                      <TbBike className="option-icon" /> Two-Wheeler
                    </>
                  ) : (
                    <>
                      <TbTruckDelivery className="option-icon" /> Three-Wheeler
                    </>
                  )}
                </span>
                <RiArrowDownSLine
                  className={`select-chevron${typeDropdownOpen ? " select-chevron--open" : ""}`}
                />
              </button>

              {typeDropdownOpen && (
                <div className="custom-select-dropdown">
                  <button
                    className={`custom-select-option${vehicleType === "two-wheeler" ? " custom-select-option--active" : ""}`}
                    onClick={() => {
                      setVehicleType("two-wheeler");
                      setTypeDropdownOpen(false);
                      setVehicles((prev) =>
                        prev.map((v) => {
                          if (!v.capacity.trim()) return { ...v, error: null };
                          const num = parseInt(v.capacity, 10);
                          if (
                            !isNaN(num) &&
                            num > MAX_CAPACITY["two-wheeler"]
                          ) {
                            return {
                              ...v,
                              capacity: String(MAX_CAPACITY["two-wheeler"]),
                              error: null,
                              clamped: true,
                            };
                          }
                          return { ...v, error: null };
                        }),
                      );
                    }}
                  >
                    <TbBike className="option-icon" />
                    Two-Wheeler
                    <span className="option-cap-hint">max cap: 5</span>
                  </button>
                  <button
                    className={`custom-select-option${vehicleType === "three-wheeler" ? " custom-select-option--active" : ""}`}
                    onClick={() => {
                      setVehicleType("three-wheeler");
                      setTypeDropdownOpen(false);
                      setVehicles((prev) =>
                        prev.map((v) => {
                          if (!v.capacity.trim()) return { ...v, error: null };
                          const num = parseInt(v.capacity, 10);
                          if (
                            !isNaN(num) &&
                            num > MAX_CAPACITY["three-wheeler"]
                          ) {
                            return {
                              ...v,
                              capacity: String(MAX_CAPACITY["three-wheeler"]),
                              error: null,
                              clamped: true,
                            };
                          }
                          return { ...v, error: null };
                        }),
                      );
                    }}
                  >
                    <TbTruckDelivery className="option-icon" />
                    Three-Wheeler
                    <span className="option-cap-hint">max cap: 20</span>
                  </button>
                </div>
              )}
            </div>

            {/* Max capacity bar */}
            <div className="vehicle-type-meta">
              <div className="type-meta-left">
                <span className="type-meta-label">Max capacity</span>
                <span className="type-meta-value">{maxCap} units</span>
              </div>
            </div>
          </div>

          {/* ── Vehicles card ──────────────────────────────────── */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <div className="header-left">
                <RiTruckLine className="card-icon" />
                <label className="sidebar-input-label">Vehicles</label>
                <span className="row-count-badge">{vehicles.length}</span>
              </div>
              <button
                className="btn-add-row"
                onClick={addVehicle}
                title="Add vehicle"
                disabled={isRunning}
              >
                <RiAddLine />
              </button>
            </div>

            <div className="row-column-labels">
              <span className="col-label col-label-id">ID</span>
              <span className="col-label col-label-value">Capacity</span>
            </div>

            <div className="sidebar-row-list">
              {vehicles.map((v, idx) => {
                const isLast = idx === vehicles.length - 1;
                const parsed = parseInt(v.capacity, 10);
                const fillPct =
                  !isNaN(parsed) && parsed > 0
                    ? Math.min((parsed / maxCap) * 100, 100)
                    : 0;
                void fillPct;

                return (
                  <div className="sidebar-dynamic-row" key={v.id}>
                    <input
                      className="sidebar-input sidebar-input-id"
                      type="number"
                      value={v.id}
                      readOnly
                      disabled
                    />
                    <div className="input-with-bar">
                      <input
                        ref={isLast ? lastVehicleInputRef : undefined}
                        className={`sidebar-input sidebar-input-value${v.error ? " sidebar-input--error" : ""}${v.clamped ? " sidebar-input--clamped" : ""}`}
                        type="number"
                        placeholder={`1 – ${maxCap}`}
                        value={v.capacity}
                        min={1}
                        max={maxCap}
                        disabled={isRunning}
                        onChange={(e) =>
                          updateVehicleCapacity(v.id, e.target.value)
                        }
                        onBlur={() => clampVehicleCapacity(v.id, vehicleType)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            clampVehicleCapacity(v.id, vehicleType);
                            addVehicle();
                          }
                        }}
                      />
                      {v.error && (
                        <span className="field-error-msg">{v.error}</span>
                      )}
                    </div>
                    {vehicles.length > 1 && (
                      <button
                        className="btn-remove-row"
                        onClick={() => removeVehicle(v.id)}
                        disabled={isRunning}
                        title="Remove vehicle"
                      >
                        <RiSubtractLine />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {capacityHint && <p className="capacity-hint">{capacityHint}</p>}
          </div>

          {/* ── Pickup card ─────────────────────────────────────── */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <div className="header-left">
                <TbPackageImport className="card-icon" />
                <label className="sidebar-input-label">Pickups</label>
                <span className="row-count-badge">{pickups.length}</span>
              </div>
              <button
                className="btn-add-row"
                onClick={addPickup}
                title="Add pickup"
                disabled={isRunning}
              >
                <RiAddLine />
              </button>
            </div>

            <div className="row-column-labels">
              <span className="col-label col-label-id">ID</span>
              <span className="col-label col-label-value">Load</span>
            </div>

            <div className="sidebar-row-list">
              {pickups.map((p, idx) => {
                const isLast = idx === pickups.length - 1;
                return (
                  <div className="sidebar-dynamic-row" key={p.id}>
                    <input
                      className="sidebar-input sidebar-input-id"
                      type="number"
                      value={p.id}
                      readOnly
                      disabled
                    />
                    <div className="input-with-error">
                      <input
                        ref={isLast ? lastPickupInputRef : undefined}
                        className={`sidebar-input sidebar-input-value${p.error ? " sidebar-input--error" : ""}`}
                        type="number"
                        placeholder="e.g. 2"
                        value={p.load}
                        min={0}
                        disabled={isRunning}
                        onChange={(e) => updatePickupLoad(p.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addPickup();
                          }
                        }}
                      />
                      {p.error && (
                        <span className="field-error-msg">{p.error}</span>
                      )}
                    </div>
                    {pickups.length > 1 && (
                      <button
                        className="btn-remove-row"
                        onClick={() => removePickup(p.id)}
                        disabled={isRunning}
                        title="Remove pickup"
                      >
                        <RiSubtractLine />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="depot-hint">
              Depot (node 0, load = 0) is prepended automatically.
            </p>
          </div>

          {formError && (
            <div className="form-error-banner">
              <span className="form-error-icon">⚠</span>
              <span>{formError}</span>
            </div>
          )}
        </div>

        <div className="sidebar-actions">
          <div className="action-row-top">
            <button
              className="btn-action btn-generate"
              onClick={handleGenerate}
              disabled={isRunning}
            >
              <RiFlashlightLine className="btn-icon" />
              <span>Generate</span>
            </button>

            <button
              className={`btn-action btn-upload${uploadedFile ? " btn-upload--active" : ""}`}
              onClick={() => setUploadModalOpen(true)}
              disabled={isRunning || isParsing}
              title={
                uploadedFile ? uploadedFile.name : "Upload an Excel or CSV file"
              }
            >
              {uploadedFile ? (
                <RiAttachment2 className="btn-icon" />
              ) : (
                <RiUploadCloud2Line className="btn-icon" />
              )}
              <span className="upload-label">
                {uploadedFile ? uploadedFile.name : "Upload"}
              </span>
            </button>
          </div>

          <button
            className={`btn-run-comparison${!canRun ? " btn-run--disabled" : ""}`}
            onClick={handleRunComparison}
            disabled={!canRun}
          >
            <RiPlayCircleLine className="run-icon" />
            Run Comparison
          </button>
        </div>
      </aside>

      {/* Keyframe for toast animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </>
  );
}
