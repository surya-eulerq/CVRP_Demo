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
import { runNaiveSolver } from "../solvers/naive";
import { runGreedySolver } from "../solvers/greedy";
import { runEulerQ } from "../solvers/eulerq";
import type { VehicleRoute } from "../types/cvrp";

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
// Spinner SVG (inline, no extra dep)
// ─────────────────────────────────────────────────────────────
function Spinner({ size = 40, color = "#10E0A1" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ animation: "spin 0.9s linear infinite" }}>
      <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="3"
        strokeDasharray="60 40" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Map overlay shown while a solver is running
// ─────────────────────────────────────────────────────────────
function SolverRunningOverlay() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      background: "rgba(2,13,36,0.60)",
      backdropFilter: "blur(3px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 14,
    }}>
      <Spinner size={48} />
      <span style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11, fontWeight: 700,
        letterSpacing: "0.22em", color: "#F0A030",
        textTransform: "uppercase",
      }}>
        Solver Running
      </span>
    </div>
  );
}

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
    setResults,
    resetAll,
  } = useComparisonStore();

  const [showAbout, setShowAbout] = useState(false);
  const [showSmallScreen, setShowSmallScreen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [naiveRoutes, setNaiveRoutes] = useState<VehicleRoute[]>([]);
  const [greedyRoutes, setGreedyRoutes] = useState<VehicleRoute[]>([]);
  const [activeBaselineVehicle, setActiveBaselineVehicle] = useState<number | null>(null);
  const [activeEulerqVehicle, setActiveEulerqVehicle] = useState<number | null>(null);

  // ── Generate mode fields ─────────────────────────────────────
  const [numVehicles, setNumVehicles] = useState(3);
  const [numPickups, setNumPickups] = useState(8);
  const [rawCapacity, setRawCapacity] = useState("10");
  const [rawPickupLoad, setRawPickupLoad] = useState("1,1,1,1,1,1,1,1");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Small-screen check ───────────────────────────────────────
  useEffect(() => {
    const check = () => setShowSmallScreen(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Baseline toggle: swap cached routes without re-running ───
  useEffect(() => {
    if (!hasResults) return;
    const routes = baselineSolver === "naive" ? naiveRoutes : greedyRoutes;
    const baselineObjective = routes.reduce((s, vr) => s + vr.totalDistance, 0);
    const currentMetrics = useComparisonStore.getState().metrics;
    if (!currentMetrics) return;
    useComparisonStore.getState().setBaselineRoutes(routes);
    useComparisonStore.getState().setMetrics({ ...currentMetrics, baselineObjective });
  }, [baselineSolver, hasResults, naiveRoutes, greedyRoutes]);

  // ─────────────────────────────────────────────────────────────
  // Generate
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
    setNaiveRoutes([]);
    setGreedyRoutes([]);
    setActiveBaselineVehicle(null);
    setActiveEulerqVehicle(null);
    toast.success(`Generated ${numPickups} pickup nodes across Bengaluru.`, { style: T.success });
  }

  // ─────────────────────────────────────────────────────────────
  // Upload
  // ─────────────────────────────────────────────────────────────
  function handleUpload(files: File[]) {
    toast(`${files.length} file(s) received — backend integration coming soon.`, { style: T.base });
  }

  // ─────────────────────────────────────────────────────────────
  // Run Comparison
  // ─────────────────────────────────────────────────────────────
  async function handleRunComparison() {
    const instance = useComparisonStore.getState().instance;
    if (!nodes || nodes.length === 0 || !instance) {
      toast.error("Generate or upload data first.", { style: T.error });
      return;
    }

    setIsRunning(true);
    setActiveBaselineVehicle(null);
    setActiveEulerqVehicle(null);

    try {
      const naiveResult = runNaiveSolver(instance);
      const greedyResult = runGreedySolver(instance);
      const eulerResult = await runEulerQ(instance);

      setNaiveRoutes(naiveResult.routes);
      setGreedyRoutes(greedyResult.routes);

      const activeBaselineRoutes = baselineSolver === "naive" ? naiveResult.routes : greedyResult.routes;
      const activeBaselineObjective = baselineSolver === "naive" ? naiveResult.objectiveValue : greedyResult.objectiveValue;
      const activeBaselineTime = baselineSolver === "naive" ? naiveResult.solveTimeMs : greedyResult.solveTimeMs;

      const improvementPercent =
        activeBaselineObjective > 0
          ? ((activeBaselineObjective - eulerResult.objectiveValue) / activeBaselineObjective) * 100
          : 0;

      setResults({
        baselineRoutes: activeBaselineRoutes,
        eulerqRoutes: eulerResult.routes,
        metrics: {
          baselineObjective: activeBaselineObjective,
          baselineTime: activeBaselineTime,
          eulerQObjective: eulerResult.objectiveValue,
          eulerQTime: eulerResult.solveTimeMs,
          improvementPercent,
        },
      });

      toast.success("Comparison complete!", { style: T.success });
    } catch (err) {
      console.error("Solver error:", err);
      toast.error("Solver failed — check console for details.", { style: T.error });
    } finally {
      setIsRunning(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Fleet distance helpers
  // ─────────────────────────────────────────────────────────────
  const baselineFleetDist = (baselineRoutes ?? []).reduce((s, vr) => s + (vr.totalDistance ?? 0), 0);
  const eulerqFleetDist = (eulerqRoutes ?? []).reduce((s, vr) => s + (vr.totalDistance ?? 0), 0);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: T.base }} />

      {/* About modal */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* Small-screen overlay */}
      {showSmallScreen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(2,13,36,0.92)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
          animation: "fadeIn 0.3s ease both",
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border2)",
            borderRadius: "16px", padding: "32px 28px",
            maxWidth: "380px", width: "100%", textAlign: "center",
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
                background: "var(--accent)", color: "#020D24", border: "none",
                borderRadius: "8px", padding: "10px 24px", fontWeight: 700,
                fontSize: 13, cursor: "pointer", width: "100%",
              }}
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* ── Global CSS ────────────────────────────────────────── */}
      <style>{`
        /* Design tokens */
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

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalPop { from { opacity: 0; transform: scale(0.92) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes expandIn { from { opacity: 0; transform: translateY(-8px) scaleY(0.92); transform-origin: top; } to { opacity: 1; transform: translateY(0) scaleY(1); } }
        @keyframes valPop   { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes solvePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,224,161,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(16,224,161,0); }
        }

        /* Shell */
        .demo-shell {
          min-height: 100vh; overflow-y: auto; overflow-x: hidden;
          background: var(--bg);
          background-image:
            radial-gradient(ellipse 60% 40% at 50% -10%, rgba(16,224,161,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 80% 50%,  rgba(26,110,255,0.04) 0%, transparent 60%);
          display: flex; flex-direction: column; height: 100vh;
        }

        /* Field labels & inputs */
        .field-group  { display: flex; flex-direction: column; gap: 4px; }
        .field-label  {
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--text3);
          font-family: "JetBrains Mono", monospace; white-space: nowrap;
        }
        .field-input  {
          height: 34px; border-radius: 7px; border: 1px solid var(--border2);
          background: var(--surface2); color: var(--text); padding: 0 10px;
          font-size: 12px; font-family: "JetBrains Mono", monospace;
          outline: none; transition: border-color 0.15s;
        }
        .field-input:focus        { border-color: rgba(16,224,161,0.4); }
        .field-input::placeholder { color: var(--text3); }
        .field-input.has-error    { border-color: rgba(239,68,68,0.6); }
        .field-error {
          font-size: 10px; color: #EF4444;
          font-family: "JetBrains Mono", monospace; margin-top: 2px;
        }

        /* Separator */
        .ctrl-sep { width: 1px; height: 26px; background: var(--border); flex-shrink: 0; }

        /* Buttons */
        .btn-demo {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px; border: none;
          font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap; font-family: inherit;
        }
        .btn-generate { background: var(--surface2); color: var(--text2); border: 1px solid var(--border2); }
        .btn-generate:hover:not(:disabled) { color: var(--text); border-color: var(--muted); }
        .btn-upload   { background: var(--surface2); color: var(--text2); border: 1px solid var(--border2); }
        .btn-upload:hover:not(:disabled)   { color: var(--blue); border-color: rgba(26,110,255,0.4); }
        .btn-template { background: var(--surface2); color: var(--text3); border: 1px solid var(--border2); }
        .btn-template:hover                { color: var(--text2); border-color: var(--muted); }
        .btn-solve    { background: var(--accent); color: #020D24; }
        .btn-solve:hover:not(:disabled)    { filter: brightness(1.1); }
        .btn-demo:disabled                 { opacity: 0.4; cursor: not-allowed; }
        .btn-solve.running {
          opacity: 0.75;
          animation: solvePulse 1.2s ease-in-out infinite;
        }

        /* Summary banner */
        .summary-banner {
          display: flex; align-items: stretch; gap: 0;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 12px 18px;
          margin: 10px 208px 0; overflow: hidden;
          animation: expandIn 0.45s cubic-bezier(0.4, 0, 0.2, 1) both;
          width: 77.5%;
        }
        .summary-card { flex: 1; min-width: 120px; padding: 0 16px; border-right: 1px solid var(--border); }
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

        /* Solver section */
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

        /* Solver card — flex column, fixed total height */
        .solver-card {
          display: flex; flex-direction: column;
          border-radius: 12px; border: 1px solid var(--border);
          background: var(--surface2); overflow: hidden; min-height: 0;
        }

        /* Header */
        .solver-card-header {
          flex-shrink: 0; height: 44px;
          border-bottom: 1px solid var(--border);
          padding: 0 12px; display: flex;
          align-items: center; justify-content: space-between;
        }
        .solver-card-title { display: flex; align-items: center; gap: 7px; }
        .solver-name { font-size: 12px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; }

        /* Solver status chip (shown while running) */
        .solver-status-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          color: var(--text2);
        }
        .solver-status-chip .chip-spinner { animation: spin 0.9s linear infinite; }

        /* Map — fills remaining space, relative for overlay */
        .solver-map {
          flex: 1; min-height: 0; overflow: hidden;
          max-height: 280px;
          position: relative;
        }

        /* Dot states */
        .solver-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          transition: background 0.4s ease, box-shadow 0.4s ease, opacity 0.4s ease;
        }
        .solver-dot.inactive     { background: var(--muted) !important; box-shadow: none; opacity: 0.45; }
        .solver-dot.active-orange{ background: #f97316 !important; box-shadow: 0 0 6px rgba(249,115,22,0.7); opacity: 1; }
        .solver-dot.active-teal  { background: var(--accent) !important; box-shadow: 0 0 6px rgba(16,224,161,0.7); opacity: 1; }

        /* ─── Assignments panel ───────────────────────────────── */
        /* Outer wrapper: flex column, shrinks but not grows */
        .solver-assignments-wrap {
          flex-shrink: 0;
          display: flex; flex-direction: column;
          border-top: 1px solid var(--border);
          background: var(--surface);
          /* fixed height so map gets the rest */
          height: 160px;
        }

        /* Section label row */
        .assignments-header {
          flex-shrink: 0;
          padding: 6px 12px 4px;
        }
        .assignments-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--text3);
          font-family: "JetBrains Mono", monospace;
        }

        /* Scrollable rows — grows to fill space above footer */
        .assignments-scroll {
          flex: 1; overflow-y: auto; padding: 0 8px;
        }
        .assignments-scroll::-webkit-scrollbar       { width: 3px; }
        .assignments-scroll::-webkit-scrollbar-track { background: transparent; }
        .assignments-scroll::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        /* Empty state */
        .assignments-empty {
          font-size: 11px; color: var(--muted);
          font-family: "JetBrains Mono", monospace;
          padding: 6px 4px;
        }

        /* Each assignment row — matches screenshot: ID | stops ... | count badge */
        .assignment-row {
          display: flex; align-items: center; gap: 0;
          padding: 4px 8px; border-radius: 6px; cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s, border-color 0.15s;
          font-size: 11px; font-family: "JetBrains Mono", monospace;
          margin-bottom: 2px;
        }
        .assignment-row:hover        { background: var(--surface2); }
        .assignment-row.active-warm  { background: rgba(249,115,22,0.08); border-color: rgba(249,115,22,0.25); }
        .assignment-row.active-cool  { background: rgba(20,184,166,0.08); border-color: rgba(20,184,166,0.25); }

        .assign-dot   { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-right: 8px; }

        /* Rider ID — colored per solver palette */
        .assign-rider-id {
          font-size: 11px; font-weight: 700;
          font-family: "JetBrains Mono", monospace;
          min-width: 36px;
          margin-right: 10px;
        }
        .assign-rider-id.warm { color: #f97316; }
        .assign-rider-id.cool { color: var(--accent); }

        /* Order IDs — flexible middle */
        .assign-orders {
          flex: 1;
          font-size: 11px; color: var(--text2);
          font-family: "JetBrains Mono", monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* Count badge — right edge */
        .assign-count-badge {
          flex-shrink: 0;
          font-size: 11px; color: var(--text3);
          font-family: "JetBrains Mono", monospace;
          margin-left: 8px;
        }

        /* ─── Total Fleet Distance — pinned footer ────────────── */
        .fleet-dist-footer {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 5px 12px 6px;
          border-top: 1px solid var(--border);
          background: var(--surface2);
        }
        .fleet-dist-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--text3);
          font-family: "JetBrains Mono", monospace;
        }
        .fleet-dist-val {
          font-size: 12px; font-weight: 800;
          font-family: "JetBrains Mono", monospace;
          color: var(--accent);
        }

        /* Baseline toggle */
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
        .toggle-btn:hover         { color: var(--text2); }
        .toggle-btn.active-accent { background: var(--accent); color: #020D24; }

        /* EulerQ badge */
        .eulerq-badge {
          display: inline-flex; align-items: center;
          padding: 0 10px; height: 26px; border-radius: 6px;
          background: rgba(16,224,161,0.08);
          border: 1px solid rgba(16,224,161,0.2);
          color: var(--accent); font-size: 10px; font-weight: 700;
          letter-spacing: 0.04em; font-family: "JetBrains Mono", monospace;
        }

        /* Scrollbar global */
        ::-webkit-scrollbar       { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        /* Responsive 1280 */
        @media (max-width: 1280px) {
          .summary-banner  { margin: 8px 20px 0; }
          .solver-section  { padding: 8px 20px 14px; }
          .summary-card    { min-width: 100px; padding: 0 10px; }
          .summary-val     { font-size: 16px; }
          .summary-label   { font-size: 8px; }
          .solver-grid     { gap: 10px; max-height: 440px; }
        }

        /* Responsive 1024 */
        @media (max-width: 1024px) {
          .summary-banner  { margin: 8px 14px 0; padding: 8px 12px; flex-wrap: nowrap; overflow-x: auto; }
          .summary-banner::-webkit-scrollbar { display: none; }
          .summary-card    { min-width: 90px; padding: 0 8px; flex-shrink: 0; }
          .summary-val     { font-size: 14px; }
          .solver-section  { padding: 8px 14px 10px; width: 100%; }
          .solver-grid     { grid-template-columns: 1fr; max-height: none; }
          .demo-shell      { height: auto; overflow-y: auto; }
          .btn-demo        { padding: 6px 10px; font-size: 11px; }
          .field-input     { height: 30px; font-size: 11px; }
        }

        /* Responsive 768 */
        @media (max-width: 768px) {
          .summary-banner       { margin: 8px 10px 0; padding: 10px 12px; }
          .summary-card         { min-width: 90px; padding: 0 8px; }
          .summary-val          { font-size: 13px; }
          .summary-label        { font-size: 7px; }
          .solver-section       { padding: 6px 10px 8px; }
          .btn-demo             { padding: 5px 8px; font-size: 10px; }
          .field-input          { height: 28px; font-size: 11px; }
          .solver-card-header   { height: 36px; padding: 0 10px; }
          .solver-name          { font-size: 11px; }
          .solver-assignments-wrap { height: 140px; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          SHELL
      ══════════════════════════════════════════════════════════ */}
      <div className="demo-shell">

        {/* Topbar */}
        <Topbar onAbout={() => setShowAbout(true)} onReset={resetAll} />

        {/* Mode / Input panel */}
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
          isRunning={isRunning}
        />

        {/* Summary / Metrics banner */}
        {hasResults && metrics && (
          <div className="summary-banner">
            {[
              { label: "Baseline · Objective", val: metrics.baselineObjective?.toFixed(1) ?? "—", color: "var(--text)" },
              { label: "Baseline · Time", val: metrics.baselineTime != null ? `${metrics.baselineTime} ms` : "—", color: "var(--text)" },
              { label: "EulerQ · Objective", val: metrics.eulerQObjective?.toFixed(1) ?? "—", color: "var(--accent)" },
              { label: "EulerQ · Time", val: metrics.eulerQTime != null ? `${metrics.eulerQTime} ms` : "—", color: "var(--accent)" },
              {
                label: "Improvement",
                val: metrics.improvementPercent != null ? `${Math.abs(metrics.improvementPercent).toFixed(1)}%` : "—",
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

        {/* ══════════════════════════════════════════════════════
            SOLVER GRID
        ══════════════════════════════════════════════════════ */}
        <div className="solver-section">
          <div className="solver-grid">

            {/* ════════════════════════════════════════════════
                LEFT — BASELINE (Naive / Greedy toggle)
            ════════════════════════════════════════════════ */}
            <div className="solver-card">

              {/* Header */}
              <div className="solver-card-header">
                <div className="solver-card-title">
                  <div className={`solver-dot ${hasResults ? "active-orange" : "inactive"}`} />
                  <span className="solver-name">Classic SCIP</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Running chip */}
                  {isRunning && (
                    <div className="solver-status-chip">
                      <svg className="chip-spinner" width="14" height="14" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="var(--text2)" strokeWidth="4"
                          strokeDasharray="60 40" strokeLinecap="round" />
                      </svg>
                      SOLVING
                    </div>
                  )}

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
              </div>

              {/* Map + running overlay */}
              <div className="solver-map">
                <SolverMap
                  nodes={nodes ?? []}
                  routes={(baselineRoutes ?? []).map((vr) =>
                    typeof vr === "object" && "route" in vr
                      ? (vr as VehicleRoute).route
                      : vr as unknown as number[]
                  )}
                  palette="warm"
                  activeVehicleIdx={activeBaselineVehicle}
                />
                {isRunning && <SolverRunningOverlay />}
              </div>

              {/* Assignments + pinned fleet total */}
              <div className="solver-assignments-wrap">
                <div className="assignments-header">
                  <div className="assignments-label">Assignments</div>
                </div>

                <div className="assignments-scroll">
                  <AssignmentsRows
                    routes={baselineRoutes ?? []}
                    nodes={nodes ?? []}
                    palette="warm"
                    activeVehicleIdx={activeBaselineVehicle}
                    onVehicleClick={setActiveBaselineVehicle}
                  />
                </div>

                {/* Pinned footer — Total Fleet Distance */}
                <div className="fleet-dist-footer">
                  <span className="fleet-dist-label">Total Fleet Distance</span>
                  <span className="fleet-dist-val">
                    {hasResults
                      ? `${baselineFleetDist.toFixed(1)} m`
                      : "—"}
                  </span>
                </div>
              </div>

            </div>

            {/* ════════════════════════════════════════════════
                RIGHT — EULERQ
            ════════════════════════════════════════════════ */}
            <div className="solver-card">

              {/* Header */}
              <div className="solver-card-header">
                <div className="solver-card-title">
                  <div className={`solver-dot ${hasResults ? "active-teal" : "inactive"}`} />
                  <span className="solver-name">EulerQ Solver</span>
                </div>

                {isRunning && (
                  <div className="solver-status-chip">
                    <svg className="chip-spinner" width="14" height="14" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--accent)" strokeWidth="4"
                        strokeDasharray="60 40" strokeLinecap="round" />
                    </svg>
                    SOLVING
                  </div>
                )}
              </div>

              {/* Map + running overlay */}
              <div className="solver-map">
                <SolverMap
                  nodes={nodes ?? []}
                  routes={(eulerqRoutes ?? []).map((vr) =>
                    typeof vr === "object" && "route" in vr
                      ? (vr as VehicleRoute).route
                      : vr as unknown as number[]
                  )}
                  palette="cool"
                  activeVehicleIdx={activeEulerqVehicle}
                />
                {isRunning && <SolverRunningOverlay />}
              </div>

              {/* Assignments + pinned fleet total */}
              <div className="solver-assignments-wrap">
                <div className="assignments-header">
                  <div className="assignments-label">Assignments</div>
                </div>

                <div className="assignments-scroll">
                  <AssignmentsRows
                    routes={eulerqRoutes ?? []}
                    nodes={nodes ?? []}
                    palette="cool"
                    activeVehicleIdx={activeEulerqVehicle}
                    onVehicleClick={setActiveEulerqVehicle}
                  />
                </div>

                {/* Pinned footer — Total Fleet Distance */}
                <div className="fleet-dist-footer">
                  <span className="fleet-dist-label">Total Fleet Distance</span>
                  <span className="fleet-dist-val">
                    {hasResults
                      ? `${eulerqFleetDist.toFixed(1)} m`
                      : "—"}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// AssignmentsRows — local inline renderer
// Displays rows matching the screenshot:
//   [dot] [RiderID]   [O001  O002  O003 ...]        [count]
// ─────────────────────────────────────────────────────────────
const WARM_PALETTE = [
  "#f97316", "#ef4444", "#eab308", "#f59e0b",
  "#fb923c", "#dc2626", "#ca8a04", "#d97706",
];
const COOL_PALETTE = [
  "#10E0A1", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#22d3ee", "#38bdf8", "#6ee7b7", "#5eead4",
];

interface AssignmentsRowsProps {
  routes: VehicleRoute[];
  nodes: Array<{ id: string | number;[k: string]: unknown }>;
  palette: "warm" | "cool";
  activeVehicleIdx: number | null;
  onVehicleClick: (idx: number | null) => void;
}

function AssignmentsRows({
  routes,
  nodes,
  palette,
  activeVehicleIdx,
  onVehicleClick,
}: AssignmentsRowsProps) {
  const colors = palette === "warm" ? WARM_PALETTE : COOL_PALETTE;

  if (!routes || routes.length === 0) {
    return (
      <div className="assignments-empty">
        No assignments yet.
      </div>
    );
  }

  return (
    <>
      {routes.map((vr, idx) => {
        const color = colors[idx % colors.length];
        const isActive = activeVehicleIdx === idx;
        const activeClass = isActive ? (palette === "warm" ? "active-warm" : "active-cool") : "";

        // Build stop label list from route indices
        const stopLabels = (vr.route ?? [])
          .filter((nodeIdx: number) => nodes[nodeIdx] && nodeIdx !== 0)
          .map((nodeIdx: number) => {
            const node = nodes[nodeIdx];
            const rawId = node?.id ?? nodeIdx;
            // Format as "O001", "O002" etc if id is numeric, else use as-is
            return typeof rawId === "number"
              ? `O${String(rawId).padStart(3, "0")}`
              : String(rawId);
          });

        const riderId = `R${String(idx + 1).padStart(3, "0")}`;
        const count = stopLabels.length;

        return (
          <div
            key={idx}
            className={`assignment-row ${activeClass}`}
            onClick={() => onVehicleClick(isActive ? null : idx)}
          >
            <div className="assign-dot" style={{ background: color }} />
            <span className={`assign-rider-id ${palette}`}>{riderId}</span>
            <span className="assign-orders">
              {stopLabels.length > 0 ? stopLabels.join("  ") : "—"}
            </span>
            <span className="assign-count-badge">{count}</span>
          </div>
        );
      })}
    </>
  );
}