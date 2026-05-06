// src/state/useComparisonStore.ts
// ─────────────────────────────────────────────────────────────
// Zustand store — single source of truth for the CVRP demo.
// ─────────────────────────────────────────────────────────────

import { create } from "zustand";

import type {
    Node,
    CVRPInstance,
    InputMode,
    BaselineName,
    SolveMetrics,
    RouteAssignment,
    VehicleRoute,
} from "../types/cvrp";

// ─────────────────────────────────────────────────────────────
// Store shape
// ─────────────────────────────────────────────────────────────

interface ComparisonStore {
    // ── Input mode ────────────────────────────────────────────
    inputMode: InputMode;
    setInputMode: (mode: InputMode) => void;

    // ── Baseline solver toggle ────────────────────────────────
    /**
     * Controls which baseline is shown on the LEFT map pane.
     * Switching this never triggers a re-solve — both baselines are
     * pre-computed and stored separately (see naiveRoutes / greedyRoutes).
     */
    baselineSolver: BaselineName;
    setBaselineSolver: (solver: BaselineName) => void;

    // ── Generated / uploaded data ─────────────────────────────
    nodes: Node[];
    setNodes: (nodes: Node[]) => void;

    instance: CVRPInstance | null;
    setInstance: (instance: CVRPInstance | null) => void;

    // ── Solve results ─────────────────────────────────────────

    /**
     * True once ALL three solvers have completed successfully.
     * Gates: metrics bar visibility, assignment panels, download button.
     */
    hasResults: boolean;

    /**
     * Naive solver routes — stored independently so toggling the
     * baseline toggle never triggers a re-solve.
     */
    naiveRoutes: VehicleRoute[] | null;
    setNaiveRoutes: (routes: VehicleRoute[] | null) => void;

    naiveAssignments: RouteAssignment[] | null;
    setNaiveAssignments: (assignments: RouteAssignment[] | null) => void;

    /**
     * Greedy solver routes — stored independently for the same reason.
     */
    greedyRoutes: VehicleRoute[] | null;
    setGreedyRoutes: (routes: VehicleRoute[] | null) => void;

    greedyAssignments: RouteAssignment[] | null;
    setGreedyAssignments: (assignments: RouteAssignment[] | null) => void;

    /**
     * EulerQ solver routes — populated after API polling completes.
     */
    eulerqRoutes: VehicleRoute[] | null;
    setEulerqRoutes: (routes: VehicleRoute[] | null) => void;

    eulerqAssignments: RouteAssignment[] | null;
    setEulerqAssignments: (assignments: RouteAssignment[] | null) => void;

    /**
     * Derived metrics for the five stat chips in the Metrics Bar.
     * Recomputed whenever baselineSolver is toggled.
     */
    metrics: SolveMetrics | null;
    setMetrics: (metrics: SolveMetrics | null) => void;

    /**
     * Atomic commit — sets all three solvers' routes + assignments + metrics
     * in ONE state transition to avoid cascading re-renders.
     * CompareDashboard calls this after naive, greedy, and eulerq all finish.
     */
    setResults: (payload: {
        naiveRoutes: VehicleRoute[];
        naiveAssignments: RouteAssignment[];
        greedyRoutes: VehicleRoute[];
        greedyAssignments: RouteAssignment[];
        eulerqRoutes: VehicleRoute[];
        eulerqAssignments: RouteAssignment[];
        metrics: SolveMetrics;
    }) => void;

    // ── Loading ───────────────────────────────────────────────
    isLoading: boolean;
    setLoading: (loading: boolean) => void;

    // ── Error handling ────────────────────────────────────────
    /**
     * Populated when the EulerQ API call fails (network error, FAILED status,
     * polling timeout, etc.). Cleared on every new solve attempt and on resetAll.
     * Surface this as an inline error banner — same as ROA demo.
     */
    solveError: string | null;
    setSolveError: (error: string | null) => void;

    // ── Full reset ────────────────────────────────────────────
    resetAll: () => void;
}

// ─────────────────────────────────────────────────────────────
// Initial state snapshot — extracted so resetAll can reuse it
// ─────────────────────────────────────────────────────────────

const INITIAL_STATE = {
    inputMode: "generate" as InputMode,
    baselineSolver: "naive" as BaselineName,
    nodes: [] as Node[],
    instance: null,
    hasResults: false,
    naiveRoutes: null,
    naiveAssignments: null,
    greedyRoutes: null,
    greedyAssignments: null,
    eulerqRoutes: null,
    eulerqAssignments: null,
    metrics: null,
    isLoading: false,
    solveError: null,
};

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useComparisonStore = create<ComparisonStore>((set) => ({
    // ── Initial state ─────────────────────────────────────────
    ...INITIAL_STATE,

    // ── Actions ───────────────────────────────────────────────

    setInputMode: (mode) => set({ inputMode: mode }),

    setBaselineSolver: (solver) => set({ baselineSolver: solver }),

    setNodes: (nodes) => set({ nodes }),

    setInstance: (instance) => set({ instance }),

    // Individual route setters — used when updating solvers independently
    // (e.g. EulerQ result arrives while baseline is already displayed).
    // hasResults is only flipped to true via setResults (atomic commit).

    setNaiveRoutes: (routes) => set({ naiveRoutes: routes }),
    setNaiveAssignments: (assignments) => set({ naiveAssignments: assignments }),

    setGreedyRoutes: (routes) => set({ greedyRoutes: routes }),
    setGreedyAssignments: (assignments) => set({ greedyAssignments: assignments }),

    setEulerqRoutes: (routes) => set({ eulerqRoutes: routes }),
    setEulerqAssignments: (assignments) => set({ eulerqAssignments: assignments }),

    setMetrics: (metrics) => set({ metrics }),

    /**
     * Atomic commit — called by CompareDashboard once ALL three solvers finish.
     * Sets every result field in a single state transition so the UI
     * re-renders exactly once. Also clears any prior solve error.
     */
    setResults: ({
        naiveRoutes,
        naiveAssignments,
        greedyRoutes,
        greedyAssignments,
        eulerqRoutes,
        eulerqAssignments,
        metrics,
    }) =>
        set({
            naiveRoutes,
            naiveAssignments,
            greedyRoutes,
            greedyAssignments,
            eulerqRoutes,
            eulerqAssignments,
            metrics,
            hasResults: naiveRoutes.length > 0 && greedyRoutes.length > 0 && eulerqRoutes.length > 0,
            solveError: null,
        }),

    setLoading: (loading) => set({ isLoading: loading }),

    setSolveError: (error) => set({ solveError: error }),

    /** Resets every field back to its initial value. */
    resetAll: () => set({ ...INITIAL_STATE }),
}));

// ─────────────────────────────────────────────────────────────
// Derived selectors  (use these in components to avoid inline logic)
// ─────────────────────────────────────────────────────────────

export const selectActiveBaselineRoutes = (s: ComparisonStore): VehicleRoute[] | null =>
    s.baselineSolver === "naive" ? s.naiveRoutes : s.greedyRoutes;

export const selectActiveBaselineAssignments = (s: ComparisonStore): RouteAssignment[] | null =>
    s.baselineSolver === "naive" ? s.naiveAssignments : s.greedyAssignments;