// src/pages/CompareDashboard.tsx
import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import Topbar from "../components/Topbar";
import AboutModal from "../components/AboutModal";
import SolverMap from "../components/SolverMap";
import Mode from "../components/Mode";
import AssignmentsList from "../components/AssignmentsList";
import { useComparisonStore } from "../state/useComparisonStore";
import { generateInstance } from "../utils/generator";

// ─────────────────────────────────────────────────────────────
// Toast style helpers
// ─────────────────────────────────────────────────────────────
const T = {
  base: { background: "#020D24", color: "#F8FAFC", border: "1px solid #1E293B" },
  success: { background: "#020D24", color: "#F8FAFC", border: "1px solid #10E0A1", boxShadow: "0 0 20px rgba(16,224,161,0.2)" },
  error: { background: "#020D24", color: "#F8FAFC", border: "1px solid #EF4444" },
  warn: { background: "#020D24", color: "#F8FAFC", border: "1px solid #F59E0B" },
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function CompareDashboard() {
  const {
    inputMode,
    baselineSolver,
    hasResults,
    metrics,
    nodes,
    baselineRoutes,
    eulerqRoutes,
    setInputMode,
    setBaselineSolver,
    setNodes,
    setInstance,
    resetAll,
  } = useComparisonStore();

  // ── Modal / overlay state ────────────────────────────────────
  const [showAbout, setShowAbout] = useState(false);
  const [showSmallScreen, setShowSmallScreen] = useState(false);

  // ── Active vehicle highlight (per pane) ─────────────────────
  const [activeBaselineVehicle, setActiveBaselineVehicle] = useState<number | null>(null);
  const [activeEulerqVehicle, setActiveEulerqVehicle] = useState<number | null>(null);

  // ── Generate mode field state ────────────────────────────────
  const [numVehicles, setNumVehicles] = useState(3);
  const [numPickups, setNumPickups] = useState(8);
  const [rawCapacity, setRawCapacity] = useState("10");
  const [rawPickupLoad, setRawPickupLoad] = useState("1,1,1,1,1,1,1,1");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Small-screen warning ─────────────────────────────────────
  useEffect(() => {
    const check = () => setShowSmallScreen(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // ⚡ Generate handler
  // ─────────────────────────────────────────────────────────────
  function handleGenerate() {
    const result = generateInstance({ numVehicles, numPickups, rawCapacity, rawPickupLoad });

    const errs: Record<string, string> = {};
    result.errors.forEach((e) => { errs[e.field] = e.message; });
    setFieldErrors(errs);

    if (result.errors.some((e) => !e.message.startsWith("Warning"))) {
      toast.error("Fix the input errors before generating.", { style: T.error });
      return;
    }

    result.errors
      .filter((e) => e.message.startsWith("Warning"))
      .forEach((e) => toast(e.message, { style: T.warn, icon: "⚠️" }));

    setNodes(result.nodes);
    setInstance(result.instance);

    setActiveBaselineVehicle(null);
    setActiveEulerqVehicle(null);

    toast.success(
      `Generated ${numPickups} pickup nodes across Bengaluru.`,
      { style: T.success }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ↑ Upload handler
  // ─────────────────────────────────────────────────────────────
  function handleUpload(files: File[]) {
    // TODO: parse the uploaded Excel files and populate the store
    toast(`${files.length} file(s) received — backend integration coming soon.`, { style: T.base });
  }

  // ─────────────────────────────────────────────────────────────
  // ▶ Run Comparison handler
  // ─────────────────────────────────────────────────────────────
  function handleRunComparison() {
    if (!nodes || nodes.length === 0) {
      toast.error("Generate or upload data first.", { style: T.error });
      return;
    }
    // TODO: call api.ts + naive.ts + greedy.ts → push routes/metrics to store
    toast("Run Comparison — backend integration coming soon.", { style: T.base });
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: T.base }} />

      {/* ── About modal ─────────────────────────────────────────── */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* ── Small-screen warning overlay ────────────────────────── */}
      {showSmallScreen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(2,13,36,0.92)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
          animation: "fadeIn 0.3s ease both",
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border2)",
            borderRadius: "16px",
            padding: "32px 28px",
            maxWidth: "380px", width: "100%",
            textAlign: "center",
            boxShadow: "0 0 60px rgba(16,224,161,0.08)",
            animation: "modalPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
              Best viewed on a larger screen
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 24, fontFamily: "JetBrains Mono, monospace" }}>
              This demo compares two solvers side-by-side with live maps.
              A screen width of at least 1024 px is recommended.
            </div>
            <button
              onClick={() => setShowSmallScreen(false)}
              style={{
                background: "var(--accent)", color: "#020D24",
                border: "none", borderRadius: "8px",
                padding: "10px 24px", fontWeight: 700, fontSize: 13,
                cursor: "pointer", width: "100%",
              }}
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* ── Global CSS ──────────────────────────────────────────── */}
      <style>{`
        /* ─── Design tokens ───────────────────────────────────── */
        :root {
          --bg:       #020D24;
          --surface:  #070F1F;
          --surface2: #0A1628;
          --border:   #0E2040;
          --border2:  #162A4A;
          --accent:   #10E0A1;
          --blue:     #1A6EFF;
          --muted:    #2A4060;
          --text:     #F0F6FF;
          --text2:    #8BAFD4;
          --text3:    #4A6A8A;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--text); }

        /* ─── Shell ───────────────────────────────────────────── */
        .demo-shell {
          min-height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--bg);
          background-image:
            radial-gradient(ellipse 60% 40% at 50% -10%, rgba(16,224,161,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 80% 50%,  rgba(26,110,255,0.04) 0%, transparent 60%);
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        /* ─── Field labels & inputs ───────────────────────────── */
        .field-group { display: flex; flex-direction: column; gap: 4px; }
        .field-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--text3);
          font-family: "JetBrains Mono", monospace; white-space: nowrap;
        }
        .field-input {
          height: 34px; border-radius: 7px;
          border: 1px solid var(--border2);
          background: var(--surface2); color: var(--text);
          padding: 0 10px; font-size: 12px;
          font-family: "JetBrains Mono", monospace;
          outline: none; transition: border-color 0.15s;
        }
        .field-input:focus        { border-color: rgba(16,224,161,0.4); }
        .field-input::placeholder { color: var(--text3); }
        .field-input.has-error    { border-color: rgba(239,68,68,0.6); }
        .field-error {
          font-size: 10px; color: #EF4444;
          font-family: "JetBrains Mono", monospace; margin-top: 2px;
        }

        /* ─── Separator ───────────────────────────────────────── */
        .ctrl-sep { width: 1px; height: 26px; background: var(--border); flex-shrink: 0; }

        /* ─── Buttons ─────────────────────────────────────────── */
        .btn-demo {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px; border: none;
          font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap; font-family: inherit;
        }
        .btn-generate {
          background: var(--surface2); color: var(--text2);
          border: 1px solid var(--border2);
        }
        .btn-generate:hover:not(:disabled) { color: var(--text); border-color: var(--muted); }
        .btn-upload {
          background: var(--surface2); color: var(--text2);
          border: 1px solid var(--border2);
        }
        .btn-upload:hover:not(:disabled)   { color: var(--blue); border-color: rgba(26,110,255,0.4); }
        .btn-template {
          background: var(--surface2); color: var(--text3);
          border: 1px solid var(--border2);
        }
        .btn-template:hover                { color: var(--text2); border-color: var(--muted); }
        .btn-solve                         { background: var(--accent); color: #020D24; }
        .btn-solve:hover:not(:disabled)    { filter: brightness(1.1); }
        .btn-demo:disabled                 { opacity: 0.4; cursor: not-allowed; }

        /* ─── Summary banner ──────────────────────────────────── */
        .summary-banner {
          display: flex; align-items: stretch; gap: 0;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 12px 18px;
          margin: 10px 28px 0; overflow: hidden;
          animation: expandIn 0.45s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-8px) scaleY(0.92); transform-origin: top; }
          to   { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        .summary-card {
          flex: 1; min-width: 120px; padding: 0 16px;
          border-right: 1px solid var(--border);
        }
        .summary-card:first-child { padding-left: 0; }
        .summary-card:last-child  { border-right: none; padding-right: 0; }
        .summary-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--text3);
          font-family: "JetBrains Mono", monospace;
        }
        .summary-val {
          font-size: 18px; font-weight: 800;
          font-family: "JetBrains Mono", monospace; margin-top: 3px;
          animation: valPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes valPop {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ─── Solver section ──────────────────────────────────── */
        .solver-section {
          flex: 1; padding: 8px 24px 14px; min-height: 0;
          display: flex; flex-direction: column;
          width: 80%; margin: 0 auto;
        }
        .solver-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 12px; height: 100%; max-height: 460px;
          animation: fadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── Solver card ─────────────────────────────────────── */
        .solver-card {
          display: flex; flex-direction: column;
          border-radius: 12px; border: 1px solid var(--border);
          background: var(--surface2); overflow: hidden; min-height: 0;
        }
        .solver-card-header {
          flex-shrink: 0; height: 44px;
          border-bottom: 1px solid var(--border);
          padding: 0 12px; display: flex;
          align-items: center; justify-content: space-between;
        }
        .solver-card-title { display: flex; align-items: center; gap: 7px; }
        .solver-name       { font-size: 12px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; }
        .solver-map        { flex: 1; min-height: 0; overflow: hidden; max-height: 320px; }

        /* ─── Solver dot — state-driven ───────────────────────── */
        .solver-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          transition: background 0.4s ease, box-shadow 0.4s ease, opacity 0.4s ease;
        }
        /* Before results: dim / muted */
        .solver-dot.inactive {
          background: var(--muted) !important;
          box-shadow: none;
          opacity: 0.45;
        }
        /* After results: bright with glow */
        .solver-dot.active-orange {
          background: #f97316 !important;
          box-shadow: 0 0 6px rgba(249,115,22,0.7);
          opacity: 1;
        }
        .solver-dot.active-teal {
          background: var(--accent) !important;
          box-shadow: 0 0 6px rgba(16,224,161,0.7);
          opacity: 1;
        }

        /* ─── Assignments panel ───────────────────────────────── */
        .solver-assignments {
          flex-shrink: 0; height: 80px;
          border-top: 1px solid var(--border);
          background: var(--surface); padding: 8px 12px; overflow: auto;
        }
        .assignments-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--text3);
          font-family: "JetBrains Mono", monospace; margin-bottom: 5px;
        }
        .assignments-empty {
          font-size: 11px; color: var(--muted);
          font-family: "JetBrains Mono", monospace;
        }
        .assignment-row {
          display: flex; align-items: center; gap: 8px;
          padding: 3px 8px; border-radius: 6px; cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s, border-color 0.15s;
          font-size: 11px; font-family: "JetBrains Mono", monospace;
        }
        .assignment-row:hover    { background: var(--surface2); }
        .assignment-row.active-warm {
          background: rgba(249,115,22,0.08);
          border-color: rgba(249,115,22,0.25);
        }
        .assignment-row.active-cool {
          background: rgba(20,184,166,0.08);
          border-color: rgba(20,184,166,0.25);
        }
        .assign-dot   { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .assign-id    { color: var(--text3); min-width: 24px; }
        .assign-stops { color: var(--text2); flex: 1; }
        .assign-count { color: var(--text3); margin-left: auto; white-space: nowrap; }
        /* Load badge — new token, reuses existing accent colour logic */
        .assign-load  {
          font-size: 10px; font-weight: 700;
          margin-left: 6px; white-space: nowrap;
          font-family: "JetBrains Mono", monospace;
        }

        /* ─── Baseline toggle ─────────────────────────────────── */
        .baseline-toggle {
          display: flex; align-items: center;
          border-radius: 6px; overflow: hidden;
          border: 1px solid var(--border2);
        }
        .toggle-btn {
          padding: 0 10px; height: 26px;
          font-size: 10px; font-weight: 600; cursor: pointer;
          border: none; background: var(--surface2); color: var(--text3);
          transition: all 0.15s; font-family: inherit;
        }
        .toggle-btn:hover          { color: var(--text2); }
        .toggle-btn.active-accent  { background: var(--accent); color: #020D24; }

        /* ─── EulerQ badge ────────────────────────────────────── */
        .eulerq-badge {
          display: inline-flex; align-items: center;
          padding: 0 10px; height: 26px; border-radius: 6px;
          background: rgba(16,224,161,0.08);
          border: 1px solid rgba(16,224,161,0.2);
          color: var(--accent); font-size: 10px; font-weight: 700;
          letter-spacing: 0.04em; font-family: "JetBrains Mono", monospace;
        }

        /* ─── Animations ──────────────────────────────────────── */
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }

        /* ─── Scrollbar ───────────────────────────────────────── */
        ::-webkit-scrollbar       { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        /* ─── Responsive 1280px ───────────────────────────────── */
        @media (max-width: 1280px) {
          .summary-banner { margin: 8px 20px 0; }
          .solver-section { padding: 8px 20px 14px; }
          .summary-card   { min-width: 100px; padding: 0 10px; }
          .summary-val    { font-size: 16px; }
          .summary-label  { font-size: 8px; }
          .solver-grid    { gap: 10px; max-height: 420px; }
        }

        /* ─── Responsive 1024px ───────────────────────────────── */
        @media (max-width: 1024px) {
          .summary-banner { margin: 8px 14px 0; padding: 8px 12px; flex-wrap: nowrap; overflow-x: auto; }
          .summary-banner::-webkit-scrollbar { display: none; }
          .summary-card   { min-width: 90px; padding: 0 8px; flex-shrink: 0; }
          .summary-val    { font-size: 14px; }
          .solver-section { padding: 8px 14px 10px; }
          .solver-grid    { grid-template-columns: 1fr; max-height: none; }
          .demo-shell     { height: auto; overflow-y: auto; }
          .btn-demo       { padding: 6px 10px; font-size: 11px; }
          .field-input    { height: 30px; font-size: 11px; }
        }

        /* ─── Responsive 768px ────────────────────────────────── */
        @media (max-width: 768px) {
          .summary-banner     { margin: 8px 10px 0; padding: 10px 12px; }
          .summary-card       { min-width: 90px; padding: 0 8px; }
          .summary-val        { font-size: 13px; }
          .summary-label      { font-size: 7px; }
          .solver-section     { padding: 6px 10px 8px; }
          .btn-demo           { padding: 5px 8px; font-size: 10px; }
          .field-input        { height: 28px; font-size: 11px; }
          .solver-card-header { height: 36px; padding: 0 10px; }
          .solver-name        { font-size: 11px; }
          .solver-assignments { height: 70px; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          SHELL
      ══════════════════════════════════════════════════════════ */}
      <div className="demo-shell">

        {/* ── Topbar ───────────────────────────────────────────── */}
        <Topbar onAbout={() => setShowAbout(true)} onReset={resetAll} />

        {/* ── Mode / Input panel ───────────────────────────────── */}
        <Mode
          inputMode={inputMode}
          setInputMode={setInputMode}
          numVehicles={numVehicles}
          numPickups={numPickups}
          rawCapacity={rawCapacity}
          rawPickupLoad={rawPickupLoad}
          fieldErrors={fieldErrors}
          onNumVehiclesChange={(v) => { setNumVehicles(v); setFieldErrors({}); }}
          onNumPickupsChange={(v) => { setNumPickups(v); setFieldErrors({}); }}
          onCapacityChange={(v) => { setRawCapacity(v); setFieldErrors({}); }}
          onPickupLoadChange={(v) => { setRawPickupLoad(v); setFieldErrors({}); }}
          onGenerate={handleGenerate}
          onRunComparison={handleRunComparison}
          onUpload={handleUpload}
        />

        {/* ── Summary / Metrics banner (visible after solve) ───── */}
        {hasResults && metrics && (
          <div className="summary-banner">
            {[
              {
                label: "Baseline · Objective",
                val: metrics.baselineObjective?.toFixed(1) ?? "—",
                color: "var(--text)",
              },
              {
                label: "Baseline · Time",
                val: metrics.baselineTime != null
                  ? `${(metrics.baselineTime / 1000).toFixed(2)}s`
                  : "—",
                color: "var(--text)",
              },
              {
                label: "EulerQ · Objective",
                val: metrics.eulerQObjective?.toFixed(1) ?? "—",
                color: "var(--accent)",
              },
              {
                label: "EulerQ · Time",
                val: metrics.eulerQTime != null
                  ? `${(metrics.eulerQTime / 1000).toFixed(2)}s`
                  : "—",
                color: "var(--accent)",
              },
              {
                label: "Improvement",
                val: metrics.improvementPercent != null
                  ? `${Math.abs(metrics.improvementPercent).toFixed(1)}%`
                  : "—",
                color: (metrics.improvementPercent ?? 0) > 0 ? "var(--accent)" : "#EF4444",
              },
            ].map((s, i) => (
              <div key={i} className="summary-card">
                <div className="summary-label">{s.label}</div>
                <div className="summary-val" style={{ color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            SOLVER GRID
        ══════════════════════════════════════════════════════════ */}
        <div className="solver-section">
          <div className="solver-grid">

            {/* ════════════════════════════════════════════════════
                LEFT — BASELINE
            ════════════════════════════════════════════════════ */}
            <div className="solver-card">

              {/* Header */}
              <div className="solver-card-header">
                <div className="solver-card-title">
                  {/*
                    Dot is inactive (dim) before results arrive.
                    After results: glows orange (warm palette = baseline).
                    Transition is handled by CSS .solver-dot classes.
                  */}
                  <div
                    className={`solver-dot ${hasResults ? "active-orange" : "inactive"
                      }`}
                  />
                  <span className="solver-name">Classic Solver</span>
                </div>

                {/* Naive / Greedy toggle */}
                <div className="baseline-toggle">
                  <button
                    className={`toggle-btn ${baselineSolver === "naive" ? "active-accent" : ""}`}
                    onClick={() => setBaselineSolver("naive")}
                  >
                    Naive
                  </button>
                  <button
                    className={`toggle-btn ${baselineSolver === "greedy" ? "active-accent" : ""}`}
                    onClick={() => setBaselineSolver("greedy")}
                  >
                    Greedy
                  </button>
                </div>
              </div>

              {/* Map */}
              <div className="solver-map">
                <SolverMap
                  nodes={nodes ?? []}
                  routes={baselineRoutes ?? []}
                  palette="warm"
                  activeVehicleIdx={activeBaselineVehicle}
                />
              </div>

              {/* Assignments */}
              <div className="solver-assignments">
                <div className="assignments-label">Vehicle Assignments</div>
                <AssignmentsList
                  routes={baselineRoutes ?? []}
                  nodes={nodes ?? []}
                  palette="warm"
                  activeVehicleIdx={activeBaselineVehicle}
                  onVehicleClick={setActiveBaselineVehicle}
                />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════
                RIGHT — EULERQ
            ════════════════════════════════════════════════════ */}
            <div className="solver-card">

              {/* Header */}
              <div className="solver-card-header">
                <div className="solver-card-title">
                  {/*
                    Dot is inactive before results.
                    After results: glows teal (cool palette = EulerQ).
                  */}
                  <div
                    className={`solver-dot ${hasResults ? "active-teal" : "inactive"
                      }`}
                  />
                  <span className="solver-name">EulerQ Solver</span>
                </div>
                <div className="eulerq-badge">Quantum Inspired</div>
              </div>

              {/* Map */}
              <div className="solver-map">
                <SolverMap
                  nodes={nodes ?? []}
                  routes={eulerqRoutes ?? []}
                  palette="cool"
                  activeVehicleIdx={activeEulerqVehicle}
                />
              </div>

              {/* Assignments */}
              <div className="solver-assignments">
                <div className="assignments-label">Vehicle Assignments</div>
                <AssignmentsList
                  routes={eulerqRoutes ?? []}
                  nodes={nodes ?? []}
                  palette="cool"
                  activeVehicleIdx={activeEulerqVehicle}
                  onVehicleClick={setActiveEulerqVehicle}
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}