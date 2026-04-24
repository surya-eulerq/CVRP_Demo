// src/state/useComparisonStore.ts

import { create } from "zustand";

import type {
    ComparisonMetrics,
    ComparisonState,
    CVRPNode,
    GenerateFormData,
    InputMode,
    MapViewport,
    SolverResult,
    ValidationError,
} from "../types/cvrp";

interface ComparisonStore extends ComparisonState {
    // ======================================
    // MODE
    // ======================================

    setInputMode: (mode: InputMode) => void;

    setBaselineSolver: (solver: "naive" | "greedy") => void;

    // ======================================
    // FORM
    // ======================================

    updateGenerateForm: (
        field: keyof GenerateFormData,
        value: string | number
    ) => void;

    resetGenerateForm: () => void;

    // ======================================
    // DATA
    // ======================================

    setNodes: (nodes: CVRPNode[]) => void;

    setDistanceMatrix: (matrix: number[][]) => void;

    // ======================================
    // VALIDATION
    // ======================================

    setValidationErrors: (errors: ValidationError[]) => void;

    addValidationError: (error: ValidationError) => void;

    clearValidationErrors: () => void;

    // ======================================
    // RESULTS
    // ======================================

    setNaiveResult: (result: SolverResult | null) => void;

    setGreedyResult: (result: SolverResult | null) => void;

    setEulerQResult: (result: SolverResult | null) => void;

    setMetrics: (metrics: ComparisonMetrics | null) => void;

    clearResults: () => void;

    // ======================================
    // LOADING
    // ======================================

    setLoading: (loading: boolean) => void;

    // ======================================
    // MAP
    // ======================================

    mapViewport: MapViewport;

    setMapViewport: (viewport: MapViewport) => void;

    // ======================================
    // FULL RESET
    // ======================================

    resetAll: () => void;
}

// ======================================
// DEFAULTS
// ======================================

const defaultGenerateForm: GenerateFormData = {
    numVehicles: 3,

    numPickups: 8,

    vehicleCapacity: "10",

    pickupLoad: "2,3,1,4,2,1,3,2",
};

const defaultMapViewport: MapViewport = {
    center: [12.9716, 77.5946], // Bengaluru

    zoom: 11,
};

// ======================================
// STORE
// ======================================

export const useComparisonStore = create<ComparisonStore>((set) => ({
    // ======================================
    // INITIAL STATE
    // ======================================

    inputMode: "generate",

    baselineSolver: "naive",

    nodes: [],

    distanceMatrix: [],

    generateForm: defaultGenerateForm,

    validationErrors: [],

    isLoading: false,

    hasResults: false,

    naiveResult: null,

    greedyResult: null,

    eulerQResult: null,

    metrics: null,

    mapViewport: defaultMapViewport,

    // ======================================
    // MODE ACTIONS
    // ======================================

    setInputMode: (mode) => {
        set({
            inputMode: mode,
        });
    },

    setBaselineSolver: (solver) => {
        set({
            baselineSolver: solver,
        });
    },

    // ======================================
    // FORM ACTIONS
    // ======================================

    updateGenerateForm: (field, value) => {
        set((state) => ({
            generateForm: {
                ...state.generateForm,
                [field]: value,
            },
        }));
    },

    resetGenerateForm: () => {
        set({
            generateForm: defaultGenerateForm,
        });
    },

    // ======================================
    // DATA ACTIONS
    // ======================================

    setNodes: (nodes) => {
        set({
            nodes,
        });
    },

    setDistanceMatrix: (matrix) => {
        set({
            distanceMatrix: matrix,
        });
    },

    // ======================================
    // VALIDATION ACTIONS
    // ======================================

    setValidationErrors: (errors) => {
        set({
            validationErrors: errors,
        });
    },

    addValidationError: (error) => {
        set((state) => ({
            validationErrors: [...state.validationErrors, error],
        }));
    },

    clearValidationErrors: () => {
        set({
            validationErrors: [],
        });
    },

    // ======================================
    // RESULT ACTIONS
    // ======================================

    setNaiveResult: (result) => {
        set({
            naiveResult: result,

            hasResults: !!result,
        });
    },

    setGreedyResult: (result) => {
        set({
            greedyResult: result,
        });
    },

    setEulerQResult: (result) => {
        set({
            eulerQResult: result,
        });
    },

    setMetrics: (metrics) => {
        set({
            metrics,
        });
    },

    clearResults: () => {
        set({
            naiveResult: null,

            greedyResult: null,

            eulerQResult: null,

            metrics: null,

            hasResults: false,
        });
    },

    // ======================================
    // LOADING ACTIONS
    // ======================================

    setLoading: (loading) => {
        set({
            isLoading: loading,
        });
    },

    // ======================================
    // MAP ACTIONS
    // ======================================

    setMapViewport: (viewport) => {
        set({
            mapViewport: viewport,
        });
    },

    // ======================================
    // RESET EVERYTHING
    // ======================================

    resetAll: () => {
        set({
            inputMode: "generate",

            baselineSolver: "naive",

            nodes: [],

            distanceMatrix: [],

            generateForm: defaultGenerateForm,

            validationErrors: [],

            isLoading: false,

            hasResults: false,

            naiveResult: null,

            greedyResult: null,

            eulerQResult: null,

            metrics: null,

            mapViewport: defaultMapViewport,
        });
    },
}));