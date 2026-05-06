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

interface ComparisonStore {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;

  baselineSolver: BaselineName;
  setBaselineSolver: (solver: BaselineName) => void;

  nodes: Node[];
  setNodes: (nodes: Node[]) => void;

  instance: CVRPInstance | null;
  setInstance: (instance: CVRPInstance | null) => void;

  hasResults: boolean;

  naiveRoutes: VehicleRoute[] | null;
  setNaiveRoutes: (routes: VehicleRoute[] | null) => void;

  naiveAssignments: RouteAssignment[] | null;
  setNaiveAssignments: (assignments: RouteAssignment[] | null) => void;

  greedyRoutes: VehicleRoute[] | null;
  setGreedyRoutes: (routes: VehicleRoute[] | null) => void;

  greedyAssignments: RouteAssignment[] | null;
  setGreedyAssignments: (assignments: RouteAssignment[] | null) => void;

  eulerqRoutes: VehicleRoute[] | null;
  setEulerqRoutes: (routes: VehicleRoute[] | null) => void;

  eulerqAssignments: RouteAssignment[] | null;
  setEulerqAssignments: (assignments: RouteAssignment[] | null) => void;

  metrics: SolveMetrics | null;
  setMetrics: (metrics: SolveMetrics | null) => void;

  setResults: (payload: {
    naiveRoutes: VehicleRoute[];
    naiveAssignments: RouteAssignment[];
    greedyRoutes: VehicleRoute[];
    greedyAssignments: RouteAssignment[];
    eulerqRoutes: VehicleRoute[];
    eulerqAssignments: RouteAssignment[];
    metrics: SolveMetrics;
  }) => void;

  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  solveError: string | null;
  setSolveError: (error: string | null) => void;

  resetAll: () => void;
}

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

export const useComparisonStore = create<ComparisonStore>((set) => ({
  ...INITIAL_STATE,

  setInputMode: (mode) => set({ inputMode: mode }),

  setBaselineSolver: (solver) => set({ baselineSolver: solver }),

  setNodes: (nodes) => set({ nodes }),

  setInstance: (instance) => set({ instance }),

  setNaiveRoutes: (routes) => set({ naiveRoutes: routes }),
  setNaiveAssignments: (assignments) => set({ naiveAssignments: assignments }),

  setGreedyRoutes: (routes) => set({ greedyRoutes: routes }),
  setGreedyAssignments: (assignments) =>
    set({ greedyAssignments: assignments }),

  setEulerqRoutes: (routes) => set({ eulerqRoutes: routes }),
  setEulerqAssignments: (assignments) =>
    set({ eulerqAssignments: assignments }),

  setMetrics: (metrics) => set({ metrics }),

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
      hasResults:
        naiveRoutes.length > 0 &&
        greedyRoutes.length > 0 &&
        eulerqRoutes.length > 0,
      solveError: null,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setSolveError: (error) => set({ solveError: error }),

  resetAll: () => set({ ...INITIAL_STATE }),
}));

export const selectActiveBaselineRoutes = (
  s: ComparisonStore,
): VehicleRoute[] | null =>
  s.baselineSolver === "naive" ? s.naiveRoutes : s.greedyRoutes;

export const selectActiveBaselineAssignments = (
  s: ComparisonStore,
): RouteAssignment[] | null =>
  s.baselineSolver === "naive" ? s.naiveAssignments : s.greedyAssignments;
