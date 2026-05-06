import { useState, useEffect, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import Topbar from "../components/Topbar";
import AboutModal from "../components/AboutModal";
import SolverMap from "../components/SolverMap";
import SolverCard from "../components/SolverCard";
import Mode from "../components/Mode";
import {
  useComparisonStore,
  selectActiveBaselineRoutes,
  selectActiveBaselineAssignments,
} from "../state/useComparisonStore";
import { generateInstance } from "../utils/generator";
import { runEulerQSolver, EulerQApiError } from "../utils/api";
import { solveNaive } from "../solvers/naive";
import { solveGreedy } from "../solvers/greedy";
import { buildRouteAssignments } from "../utils/routeHelpers";
import type {
  VehicleRoute,
  RouteAssignment,
  RouteResult,
  ExcelParseResult,
  SolveMetrics,
  GenerateParams,
  Pickup,
} from "../types/cvrp";
import "./CompareDashboard.css";

const T = {
  base: {
    background: "#020D24",
    color: "#F8FAFC",
    border: "1px solid #1E293B",
  },
  success: {
    background: "#020D24",
    color: "#F8FAFC",
    border: "1px solid #10E0A1",
    boxShadow: "0 0 20px rgba(16,224,161,0.2)",
  },
  error: {
    background: "#020D24",
    color: "#F8FAFC",
    border: "1px solid #EF4444",
  },
  warn: {
    background: "#020D24",
    color: "#F8FAFC",
    border: "1px solid #F59E0B",
  },
};

function buildEulerQRoutes(
  routeResults: RouteResult[],
  pickups: Pickup[],
): VehicleRoute[] {
  const loadByPickupId = new Map<string, number>(
    pickups.map((p) => [p.id, p.load]),
  );

  return routeResults.map((result) => {
    const stopIds = result.route.slice(1, -1);
    const totalLoad = stopIds.reduce(
      (sum, id) => sum + (loadByPickupId.get(id) ?? 0),
      0,
    );

    return {
      vehicleId: result.rider_id,
      route: result.route,
      totalDistance: result.distance,
      totalLoad,
      legDistances: [],
      numStops: stopIds.length,
    };
  });
}

function nodeIndexToStringId(idx: number): string {
  return idx === 0 ? "DEPOT" : `P${String(idx).padStart(3, "0")}`;
}

function toRouteArrays(routes: VehicleRoute[] | null): string[][] {
  if (!routes) return [];
  return routes.map((vr) => {
    return (vr.route as Array<string | number>).map((stop) =>
      typeof stop === "number" ? nodeIndexToStringId(stop) : stop,
    );
  });
}

export default function CompareDashboard() {
  const {
    baselineSolver,
    hasResults,
    metrics,
    nodes,
    naiveRoutes,
    greedyRoutes,
    eulerqRoutes,
    eulerqAssignments,
    setBaselineSolver,
    setNodes,
    setInstance,
    setResults,
    setSolveError,
    resetAll,
  } = useComparisonStore();
  const activeBaselineRoutes = useComparisonStore(selectActiveBaselineRoutes);
  const activeBaselineAssignments = useComparisonStore(
    selectActiveBaselineAssignments,
  );
  const [showAbout, setShowAbout] = useState(false);
  const [showSmallScreen, setShowSmallScreen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showSolvingOverlay, setShowSolvingOverlay] = useState(false);
  const [assignmentsVisible, setAssignmentsVisible] = useState(false);
  const [activeBaselineVehicle, setActiveBaselineVehicle] = useState<
    number | null
  >(null);
  const [activeEulerqVehicle, setActiveEulerqVehicle] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const check = () => setShowSmallScreen(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!hasResults) {
      setAssignmentsVisible(false);
      setActiveBaselineVehicle(null);
      setActiveEulerqVehicle(null);
    }
  }, [hasResults]);

  // ─────────────────────────────────────────────────────────────
  // Generate handler
  // ─────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(
    (params: GenerateParams) => {
      setAssignmentsVisible(false);
      setActiveBaselineVehicle(null);
      setActiveEulerqVehicle(null);

      const result = generateInstance(params);
      const blockingErrors = result.errors.filter(
        (e) => !e.message.startsWith("Warning"),
      );

      if (blockingErrors.length > 0) {
        blockingErrors.forEach((e) =>
          toast.error(e.message, { style: T.error }),
        );
        return;
      }

      result.errors
        .filter((e) => e.message.startsWith("Warning"))
        .forEach((e) => toast(e.message, { style: T.warn, icon: "⚠️" }));

      setNodes(result.nodes);
      setInstance(result.instance);
      setHasGenerated(true);

      const numPickups = result.instance.pickups.filter(
        (p) => !p.is_depot,
      ).length;
      toast.success(
        `Generated ${numPickups} pickup node(s) across Bengaluru.`,
        { style: T.success },
      );
    },
    [setNodes, setInstance],
  );

  // ─────────────────────────────────────────────────────────────
  // Upload handler
  // ─────────────────────────────────────────────────────────────

  const handleUploadParsed = useCallback(
    (result: ExcelParseResult) => {
      setAssignmentsVisible(false);
      setActiveBaselineVehicle(null);
      setActiveEulerqVehicle(null);

      setNodes(result.nodes);
      setInstance(result.instance);
      setHasGenerated(true);

      const numPickups = result.instance.pickups.filter(
        (p) => !p.is_depot,
      ).length;
      toast.success(`Loaded ${numPickups} pickup location(s) from file.`, {
        style: T.success,
      });
    },
    [setNodes, setInstance],
  );

  // ─────────────────────────────────────────────────────────────
  // Run Comparison handler
  // ─────────────────────────────────────────────────────────────

  const handleRunComparison = useCallback(async () => {
    const instance = useComparisonStore.getState().instance;

    if (!instance) {
      toast.error("Generate or upload data first.", { style: T.error });
      return;
    }

    setAssignmentsVisible(false);
    setActiveBaselineVehicle(null);
    setActiveEulerqVehicle(null);
    setIsRunning(true);
    setShowSolvingOverlay(true);
    setSolveError(null);

    const minDelay = new Promise<void>((res) => setTimeout(res, 3000));

    try {
      const [naiveResult, greedyResult, eulerRaw] = await Promise.all([
        Promise.resolve(
          (() => {
            const t0 = performance.now();
            const routes: VehicleRoute[] = solveNaive(instance);
            return { routes, solveTimeMs: performance.now() - t0 };
          })(),
        ),
        Promise.resolve(
          (() => {
            const t0 = performance.now();
            const routes: VehicleRoute[] = solveGreedy(instance);
            return { routes, solveTimeMs: performance.now() - t0 };
          })(),
        ),
        runEulerQSolver(instance),
      ]);

      const eulerqVehicleRoutes: VehicleRoute[] = buildEulerQRoutes(
        eulerRaw.routeResults,
        instance.pickups,
      );

      const naiveAssignments: RouteAssignment[] = buildRouteAssignments(
        naiveResult.routes,
        instance,
      );
      const greedyAssignments: RouteAssignment[] = buildRouteAssignments(
        greedyResult.routes,
        instance,
      );
      const eulerqAssignmentsBuilt: RouteAssignment[] = buildRouteAssignments(
        eulerqVehicleRoutes,
        instance,
      );

      const naiveTotal = naiveResult.routes.reduce(
        (s, vr) => s + vr.totalDistance,
        0,
      );
      const greedyTotal = greedyResult.routes.reduce(
        (s, vr) => s + vr.totalDistance,
        0,
      );

      const eulerqTotal = eulerRaw.objectiveValue;
      const eulerqTimeMs = eulerRaw.solveTimeMs ?? 0;

      const activeBaselineTotal =
        baselineSolver === "naive" ? naiveTotal : greedyTotal;
      const activeBaselineTime =
        baselineSolver === "naive"
          ? naiveResult.solveTimeMs
          : greedyResult.solveTimeMs;

      const improvementPercent =
        activeBaselineTotal > 0
          ? ((activeBaselineTotal - eulerqTotal) / activeBaselineTotal) * 100
          : 0;

      const solvedMetrics: SolveMetrics = {
        baselineSolverName: baselineSolver,
        baselineObjective: activeBaselineTotal,
        baselineTime: activeBaselineTime,
        naiveTime: naiveResult.solveTimeMs,
        greedyTime: greedyResult.solveTimeMs,
        eulerQObjective: eulerqTotal,
        eulerQTime: eulerqTimeMs,
        improvementPercent,
      };

      setResults({
        naiveRoutes: naiveResult.routes,
        naiveAssignments,
        greedyRoutes: greedyResult.routes,
        greedyAssignments,
        eulerqRoutes: eulerqVehicleRoutes,
        eulerqAssignments: eulerqAssignmentsBuilt,
        metrics: solvedMetrics,
      });

      toast.success("Comparison complete!", { style: T.success });
    } catch (err) {
      console.error("[RunComparison]", err);

      if (err instanceof EulerQApiError) {
        // Extract clean message
        let cleanMessage = err.message;

        if (cleanMessage.includes("No solution available")) {
          cleanMessage = "No solution available";
        }

        setSolveError(cleanMessage);

        toast.error(cleanMessage, {
          style: T.error,
          duration: 7000,
        });
      } else {
        const msg =
          err instanceof Error ? err.message : "Unknown solver error.";

        setSolveError(msg);

        toast.error(msg, {
          style: T.error,
          duration: 5000,
        });
      }
    } finally {
      await minDelay;
      setIsRunning(false);
      setShowSolvingOverlay(false);
      setAssignmentsVisible(true);
    }
  }, [baselineSolver, setSolveError, setResults]);

  const handleBaselineToggle = useCallback(
    (solver: "naive" | "greedy") => {
      setBaselineSolver(solver);
      setActiveBaselineVehicle(null);

      const state = useComparisonStore.getState();
      if (!state.metrics || !state.naiveRoutes || !state.greedyRoutes) return;

      const routes =
        solver === "naive" ? state.naiveRoutes : state.greedyRoutes;
      const baselineObjective = routes.reduce(
        (s, vr) => s + vr.totalDistance,
        0,
      );
      const baselineTime =
        solver === "naive" ? state.metrics.naiveTime : state.metrics.greedyTime;

      const improvementPercent =
        baselineObjective > 0
          ? ((baselineObjective - state.metrics.eulerQObjective) /
              baselineObjective) *
            100
          : 0;

      state.setMetrics({
        ...state.metrics,
        baselineSolverName: solver,
        baselineObjective,
        baselineTime,
        improvementPercent,
      });
    },
    [setBaselineSolver],
  );

  // ─────────────────────────────────────────────────────────────
  // Reset handler
  // ─────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    resetAll();
    setHasGenerated(false);
    setIsRunning(false);
    setShowSolvingOverlay(false);
    setAssignmentsVisible(false);
    setActiveBaselineVehicle(null);
    setActiveEulerqVehicle(null);
  }, [resetAll]);

  const showResults = hasResults && assignmentsVisible && !showSolvingOverlay;

  const baselineFleetDist = (activeBaselineRoutes ?? []).reduce(
    (s, vr) => s + vr.totalDistance,
    0,
  );
  const eulerqFleetDist = (eulerqRoutes ?? []).reduce(
    (s, vr) => s + vr.totalDistance,
    0,
  );

  const baselineToggle = (
    <div className="sc-baseline-toggle">
      <button
        className={`sc-toggle-btn ${baselineSolver === "naive" ? "sc-toggle-active" : ""}`}
        onClick={() => handleBaselineToggle("naive")}
      >
        Naive
      </button>
      <button
        className={`sc-toggle-btn ${baselineSolver === "greedy" ? "sc-toggle-active" : ""}`}
        onClick={() => handleBaselineToggle("greedy")}
      >
        Greedy
      </button>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: T.base }} />

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* ── Small-screen warning overlay ──────────────────────────── */}
      {showSmallScreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(2,13,36,0.92)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            animation: "fadeIn 0.3s ease both",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border2)",
              borderRadius: "16px",
              padding: "32px 28px",
              maxWidth: "380px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 0 60px rgba(16,224,161,0.08)",
              animation: "modalPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              Best viewed on a larger screen
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text2)",
                lineHeight: 1.6,
                marginBottom: 24,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              This demo compares two solvers side-by-side with live maps. A
              screen width of at least 1024 px is recommended.
            </div>
            <button
              onClick={() => setShowSmallScreen(false)}
              style={{
                background: "var(--accent)",
                color: "#020D24",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout shell ──────────────────────────────────────── */}
      <div className="demo-shell">
        {/* Topbar */}
        <Topbar
          onAbout={() => setShowAbout(true)}
          onReset={handleReset}
          hasResults={hasResults}
        />
        {/* Input Panel */}
        <Mode
          onGenerate={handleGenerate}
          onRunComparison={handleRunComparison}
          onUploadParsed={handleUploadParsed}
          hasGenerated={hasGenerated}
          isRunning={isRunning}
        />

        <div className="solver-section">
          <div className="solver-grid">
            <SolverCard
              title="Classic Solver"
              accent="orange"
              rightAction={baselineToggle}
              isSolving={showSolvingOverlay}
              showResults={showResults}
              objective={metrics?.baselineObjective}
              solveTimeMs={metrics?.baselineTime}
              map={
                <SolverMap
                  nodes={nodes}
                  routes={toRouteArrays(activeBaselineRoutes)}
                  palette="warm"
                  activeVehicleIdx={activeBaselineVehicle}
                />
              }
              routes={activeBaselineRoutes ?? []}
              nodes={nodes}
              activeVehicleIdx={activeBaselineVehicle}
              onVehicleClick={setActiveBaselineVehicle}
              fleetDistance={baselineFleetDist}
            />

            <SolverCard
              title="EulerQ Solver"
              accent="teal"
              isSolving={showSolvingOverlay}
              showResults={showResults}
              objective={metrics?.eulerQObjective}
              solveTimeMs={metrics?.eulerQTime}
              map={
                <SolverMap
                  nodes={nodes}
                  routes={toRouteArrays(eulerqRoutes)}
                  palette="cool"
                  activeVehicleIdx={activeEulerqVehicle}
                />
              }
              routes={eulerqRoutes ?? []}
              nodes={nodes}
              activeVehicleIdx={activeEulerqVehicle}
              onVehicleClick={setActiveEulerqVehicle}
              fleetDistance={eulerqFleetDist}
            />
          </div>

          {showResults &&
            metrics &&
            (() => {
              const baselineWins =
                metrics.baselineObjective <= metrics.eulerQObjective;
              const eulerqWins =
                metrics.eulerQObjective < metrics.baselineObjective;
              return (
                <div className="result-row">
                  {/* ── Classic Solver result card ── */}
                  <div
                    className={`result-card ${baselineWins ? "result-card--best" : ""}`}
                  >
                    <div className="result-card-header">
                      <span className="result-dot result-dot--orange" />
                      <span className="result-card-title">
                        Classic Solver
                        <span
                          style={{
                            opacity: 0.55,
                            fontWeight: 500,
                            marginLeft: 6,
                          }}
                        >
                          ({metrics.baselineSolverName})
                        </span>
                      </span>
                      {baselineWins && (
                        <span className="result-best-badge">BEST</span>
                      )}
                    </div>
                    <div className="result-card-stats">
                      <div className="result-stat-cell">
                        <span className="result-stat-label">
                          Total Distance
                        </span>
                        <span
                          className={`result-stat-value ${baselineWins ? "result-stat-value--best" : ""}`}
                        >
                          {metrics.baselineObjective.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                          <span className="result-stat-unit"> KM</span>
                        </span>
                      </div>
                      <div className="result-stat-cell">
                        <span className="result-stat-label">Solve Time</span>
                        <span
                          className={`result-stat-value ${baselineWins ? "result-stat-value--best" : ""}`}
                        >
                          {metrics.baselineTime.toFixed(3)}
                          <span className="result-stat-unit"> ms</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── EulerQ Solver result card ── */}
                  <div
                    className={`result-card ${eulerqWins ? "result-card--best" : ""}`}
                  >
                    <div className="result-card-header">
                      <span className="result-dot result-dot--teal" />
                      <span className="result-card-title">EulerQ Solver</span>
                      {eulerqWins && (
                        <span className="result-best-badge">BEST</span>
                      )}
                    </div>
                    <div className="result-card-stats">
                      <div className="result-stat-cell">
                        <span className="result-stat-label">
                          Total Distance
                        </span>
                        <span
                          className={`result-stat-value ${eulerqWins ? "result-stat-value--best" : ""}`}
                        >
                          {metrics.eulerQObjective.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                          <span className="result-stat-unit">KM</span>
                        </span>
                      </div>
                      <div className="result-stat-cell">
                        <span className="result-stat-label">Solve Time</span>
                        <span
                          className={`result-stat-value ${eulerqWins ? "result-stat-value--best" : ""}`}
                        >
                          {metrics.eulerQTime.toFixed(3)}
                          <span className="result-stat-unit"> ms</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      </div>
    </>
  );
}
