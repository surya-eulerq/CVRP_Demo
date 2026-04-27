// src/state/useComparisonStore.ts

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
    baselineSolver: BaselineName;
    setBaselineSolver: (solver: BaselineName) => void;

    // ── Generated / uploaded data ─────────────────────────────
    nodes: Node[];
    setNodes: (nodes: Node[]) => void;

    instance: CVRPInstance | null;
    setInstance: (instance: CVRPInstance | null) => void;

    // ── Solve results ─────────────────────────────────────────
    /**
     * True once BOTH baseline and EulerQ routes have been set.
     * Controls solver dot active state, metrics banner visibility,
     * and assignments panel content.
     */
    hasResults: boolean;

    /** Ordered node-ID arrays per vehicle, e.g. [[0,2,4,0],[0,1,3,0]] */
    baselineRoutes: VehicleRoute[] | null;
    setBaselineRoutes: (routes: VehicleRoute[] | null) => void;

    eulerqRoutes: VehicleRoute[] | null;
    setEulerqRoutes: (routes: VehicleRoute[] | null) => void;

    /** Derived per-vehicle details — populated alongside *Routes setters */
    baselineAssignments: RouteAssignment[] | null;
    setBaselineAssignments: (assignments: RouteAssignment[] | null) => void;

    eulerqAssignments: RouteAssignment[] | null;
    setEulerqAssignments: (assignments: RouteAssignment[] | null) => void;

    metrics: SolveMetrics | null;
    setMetrics: (metrics: SolveMetrics | null) => void;

    /**
     * Convenience action used by CompareDashboard to commit all three
     * outputs in a single atomic update — avoids three separate setState
     * calls and the intermediate renders they would cause.
     */
    setResults: (payload: {
        baselineRoutes: VehicleRoute[];
        eulerqRoutes: VehicleRoute[];
        metrics: SolveMetrics;
    }) => void;

    // ── Loading ───────────────────────────────────────────────
    isLoading: boolean;
    setLoading: (loading: boolean) => void;

    // ── Full reset ────────────────────────────────────────────
    resetAll: () => void;
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────
export const useComparisonStore = create<ComparisonStore>((set) => ({
    // ── Initial state ─────────────────────────────────────────
    inputMode: "generate",
    baselineSolver: "naive",

    nodes: [],
    instance: null,

    hasResults: false,
    baselineRoutes: null,
    eulerqRoutes: null,
    baselineAssignments: null,
    eulerqAssignments: null,
    metrics: null,

    isLoading: false,

    // ── Actions ───────────────────────────────────────────────
    setInputMode: (mode) => set({ inputMode: mode }),

    setBaselineSolver: (solver) => set({ baselineSolver: solver }),

    setNodes: (nodes) => set({ nodes }),

    setInstance: (instance) => set({ instance }),

    /**
     * Setting baseline routes also re-evaluates hasResults:
     * results are considered available when BOTH baseline AND
     * eulerq routes are non-empty.
     */
    setBaselineRoutes: (routes) =>
        set((state) => ({
            baselineRoutes: routes,
            hasResults:
                !!(routes && routes.length > 0) &&
                !!(state.eulerqRoutes && state.eulerqRoutes.length > 0),
        })),

    /**
     * Setting eulerq routes also re-evaluates hasResults.
     */
    setEulerqRoutes: (routes) =>
        set((state) => ({
            eulerqRoutes: routes,
            hasResults:
                !!(routes && routes.length > 0) &&
                !!(state.baselineRoutes && state.baselineRoutes.length > 0),
        })),

    setBaselineAssignments: (assignments) =>
        set({ baselineAssignments: assignments }),

    setEulerqAssignments: (assignments) =>
        set({ eulerqAssignments: assignments }),

    setMetrics: (metrics) => set({ metrics }),

    /**
     * Atomic update — sets baselineRoutes, eulerqRoutes, and metrics
     * in a single state transition so the UI re-renders exactly once.
     * This is what CompareDashboard calls after all three solvers finish.
     */
    setResults: ({ baselineRoutes, eulerqRoutes, metrics }) =>
        set({
            baselineRoutes,
            eulerqRoutes,
            metrics,
            hasResults:
                baselineRoutes.length > 0 && eulerqRoutes.length > 0,
        }),

    setLoading: (loading) => set({ isLoading: loading }),

    resetAll: () =>
        set({
            inputMode: "generate",
            baselineSolver: "naive",
            nodes: [],
            instance: null,
            hasResults: false,
            baselineRoutes: null,
            eulerqRoutes: null,
            baselineAssignments: null,
            eulerqAssignments: null,
            metrics: null,
            isLoading: false,
        }),
}));