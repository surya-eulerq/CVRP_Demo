// src/pages/CompareDashboard.tsx
import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import Topbar from "../components/Topbar";
import AboutModal from "../components/AboutModal";
import SolverMap from "../components/SolverMap";
import SolverCard from "../components/SolverCard";
import Mode from "../components/Mode";
import AssignmentsList from "../components/AssignmentsList";
import { useComparisonStore } from "../state/useComparisonStore";
import { generateInstance } from "../utils/generator";
import { runNaiveSolver } from "../solvers/naive";
import { runGreedySolver } from "../solvers/greedy";
import { runEulerQ } from "../solvers/eulerq";
import type { VehicleRoute } from "../types/cvrp";
import "./CompareDashboard.css";

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
// Main Component
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
  const [hasGenerated, setHasGenerated] = useState(false);
  // Controls the solving overlay (shown during solve + 3 s minimum)
  const [showSolvingOverlay, setShowSolvingOverlay] = useState(false);

  // Controls whether assignments are revealed (only after overlay clears)
  const [assignmentsVisible, setAssignmentsVisible] = useState(false);

  const [naiveRoutes, setNaiveRoutes] = useState<VehicleRoute[]>([]);
  const [greedyRoutes, setGreedyRoutes] = useState<VehicleRoute[]>([]);
  const [activeBaselineVehicle, setActiveBaselineVehicle] = useState<number | null>(null);
  const [activeEulerqVehicle, setActiveEulerqVehicle] = useState<number | null>(null);

  // Generate mode fields
  const [numVehicles, setNumVehicles] = useState(3);
  const [numPickups, setNumPickups] = useState(8);
  const [rawCapacity, setRawCapacity] = useState("10");
  const [rawPickupLoad, setRawPickupLoad] = useState("1,1,1,1,1,1,1,1");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Small-screen check ──
  useEffect(() => {
    const check = () => setShowSmallScreen(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Reset assignments visibility when store is reset ──
  useEffect(() => {
    if (!hasResults) setAssignmentsVisible(false);
  }, [hasResults]);

  // ── Baseline toggle: swap cached routes without re-running ──
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
    setAssignmentsVisible(false);
    setHasGenerated(true);

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

    setAssignmentsVisible(false);
    setIsRunning(true);
    setShowSolvingOverlay(true);
    setActiveBaselineVehicle(null);
    setActiveEulerqVehicle(null);

    // Minimum 3-second overlay guarantee
    const minDelay = new Promise<void>((res) => setTimeout(res, 3000));

    try {
      const [naiveResult, greedyResult, eulerResult] = await Promise.all([
        Promise.resolve(runNaiveSolver(instance)),
        Promise.resolve(runGreedySolver(instance)),
        runEulerQ(instance),
        minDelay,
      ]) as [
          ReturnType<typeof runNaiveSolver>,
          ReturnType<typeof runGreedySolver>,
          Awaited<ReturnType<typeof runEulerQ>>,
          void
        ];

      setNaiveRoutes(naiveResult.routes);
      setGreedyRoutes(greedyResult.routes);

      const activeBaselineRoutes = baselineSolver === "naive" ? naiveResult.routes : greedyResult.routes;
      const activeBaselineObjective = baselineSolver === "naive" ? naiveResult.objectiveValue : greedyResult.objectiveValue;
      const activeBaselineTime = baselineSolver === "naive" ? naiveResult.solveTimeMs : greedyResult.solveTimeMs;

      const improvementPercent =
        activeBaselineObjective > 0
          ? ((activeBaselineObjective - eulerResult.objectiveValue) / activeBaselineObjective) * 100
          : 0;

      const baselineDistance =
        activeBaselineRoutes.reduce(
          (s, vr) => s + (vr.totalDistance ?? 0),
          0
        );

      const eulerqDistance =
        eulerResult.routes.reduce(
          (s, vr) => s + (vr.totalDistance ?? 0),
          0
        );

      setResults({
        baselineRoutes: activeBaselineRoutes,
        eulerqRoutes: eulerResult.routes,

        metrics: {
          baselineObjective: baselineDistance,

          baselineTime: activeBaselineTime,

          eulerQObjective: eulerqDistance,

          eulerQTime: eulerResult.solveTimeMs,

          improvementPercent:
            baselineDistance > 0
              ? (
                (
                  baselineDistance - eulerqDistance
                ) / baselineDistance
              ) * 100
              : 0,
        },
      });

      toast.success("Comparison complete!", { style: T.success });
    } catch (err) {
      console.error("Solver error:", err);
      toast.error("Solver failed — check console for details.", { style: T.error });
    } finally {
      setIsRunning(false);
      setShowSolvingOverlay(false);
      setAssignmentsVisible(true);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────
  const showResults = hasResults && assignmentsVisible && !showSolvingOverlay;
  const baselineFleetDist = (baselineRoutes ?? []).reduce((s, vr) => s + (vr.totalDistance ?? 0), 0);
  const eulerqFleetDist = (eulerqRoutes ?? []).reduce((s, vr) => s + (vr.totalDistance ?? 0), 0);

  // Normalise VehicleRoute[] → number[][] for SolverMap
  const toRouteArrays = (routes: VehicleRoute[]) =>
    routes.map((vr) =>
      typeof vr === "object" && "route" in vr
        ? (vr as VehicleRoute).route
        : vr as unknown as number[]
    );

  // Baseline toggle rendered as the rightAction for the SCIP card
  const baselineToggle = (
    <div className="sc-baseline-toggle">
      <button
        className={`sc-toggle-btn ${baselineSolver === "naive" ? "sc-toggle-active" : ""}`}
        onClick={() => setBaselineSolver("naive")}
      >
        Naive
      </button>
      <button
        className={`sc-toggle-btn ${baselineSolver === "greedy" ? "sc-toggle-active" : ""}`}
        onClick={() => setBaselineSolver("greedy")}
      >
        Greedy
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: T.base }} />

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* ── Small-screen warning ── */}
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

      <div className="demo-shell">

        <Topbar onAbout={() => setShowAbout(true)} onReset={resetAll} />

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
          hasGenerated={hasGenerated}
        />

        {/* ── Summary banner (only after results) ── */}
        {showResults && metrics && (
          <div className="summary-banner">
            {[
              { label: "Baseline Distance", val: metrics.baselineObjective?.toFixed(1) ?? "—", color: "var(--text)" },
              { label: "Baseline Time", val: metrics.baselineTime != null ? `${(metrics.baselineTime / 1000).toFixed(2)}s` : "—", color: "var(--accent)" },
              { label: "EulerQ Distance", val: metrics.eulerQObjective?.toFixed(1) ?? "—", color: "var(--text)" },
              { label: "EulerQ Time", val: metrics.eulerQTime != null ? `${(metrics.eulerQTime / 1000).toFixed(2)}s` : "—", color: "var(--accent)" },
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

        {/* ── Solver grid ── */}
        <div className="solver-section">
          <div className="solver-grid">

            {/* LEFT — Classic SCIP */}
            <SolverCard
              title="Classic Solver"
              accent="orange"
              rightAction={baselineToggle}
              isSolving={showSolvingOverlay}
              showResults={showResults}
              objective={metrics?.baselineObjective}
              solveTimeMs={metrics?.baselineTime ?? undefined}
              map={
                <SolverMap
                  nodes={nodes ?? []}
                  routes={toRouteArrays(baselineRoutes ?? [])}
                  palette="warm"
                  activeVehicleIdx={activeBaselineVehicle}
                />
              }
              routes={baselineRoutes ?? []}
              nodes={nodes ?? []}
              activeVehicleIdx={activeBaselineVehicle}
              onVehicleClick={setActiveBaselineVehicle}
              fleetDistance={baselineFleetDist}
            />

            {/* RIGHT — EulerQ Solver */}
            <SolverCard
              title="EulerQ Solver"
              accent="teal"
              isSolving={showSolvingOverlay}
              showResults={showResults}
              objective={metrics?.eulerQObjective}
              solveTimeMs={metrics?.eulerQTime ?? undefined}
              map={
                <SolverMap
                  nodes={nodes ?? []}
                  routes={toRouteArrays(eulerqRoutes ?? [])}
                  palette="cool"
                  activeVehicleIdx={activeEulerqVehicle}
                />
              }
              routes={eulerqRoutes ?? []}
              nodes={nodes ?? []}
              activeVehicleIdx={activeEulerqVehicle}
              onVehicleClick={setActiveEulerqVehicle}
              fleetDistance={eulerqFleetDist}
            />

          </div>
        </div>
      </div>
    </>
  );
}