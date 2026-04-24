// src/types/cvrp.ts

// ================================
// BASIC TYPES
// ================================

export type SolverType = "naive" | "greedy" | "eulerq";

export type InputMode = "generate" | "upload";

// ================================
// LOCATION / NODE TYPES
// ================================

export interface Coordinate {
    lat: number;
    lng: number;
}

export interface CVRPNode extends Coordinate {
    id: number;
    label: string;
    demand: number;
    isDepot: boolean;
}

// ================================
// VEHICLE TYPES
// ================================

export interface Vehicle {
    id: number;
    capacity: number;
}

// ================================
// ROUTE TYPES
// ================================

export interface VehicleRoute {
    vehicleId: number;

    // Example:
    // [0, 3, 5, 2, 0]
    // starts and ends at depot
    route: number[];

    totalDistance: number;

    totalLoad: number;
}

export interface AssignmentItem {
    vehicleId: number;
    stops: number[];
    stopCount: number;
}

// ================================
// SOLVER RESPONSE TYPES
// ================================

export interface SolverMetrics {
    objectiveValue: number;
    solveTimeMs: number;
}

export interface SolverResult {
    solver: SolverType;

    metrics: SolverMetrics;

    routes: VehicleRoute[];

    rawResult?: unknown;
}

// ================================
// API CONTRACT TYPES
// ================================

export interface CVRPInstancePayload {
    num_vehicles: number;

    num_pickups: number;

    vehicle_capacity: number | number[];

    distances: number[][];

    pickup_load: number[];

    backend: "cim";

    force_backend_use: boolean;
}

export interface EulerQApiResponse {
    solveTimeMs: number;

    objectiveValue: number;

    result: Array<[number, [number, number]]>;
}

// ================================
// GENERATE MODE TYPES
// ================================

export interface GenerateFormData {
    numVehicles: number;

    numPickups: number;

    vehicleCapacity: string;

    pickupLoad: string;
}

// ================================
// UPLOAD MODE TYPES
// ================================

export interface UploadConfigData {
    numVehicles: number;

    numPickups: number;

    vehicleCapacity: number | number[];

    pickupLoad: number[];
}

export interface ParsedUploadData {
    config: UploadConfigData;

    distanceMatrix?: number[][];

    coordinates?: CVRPNode[];
}

// ================================
// VALIDATION TYPES
// ================================

export interface ValidationError {
    field: string;

    message: string;
}

// ================================
// METRICS BAR TYPES
// ================================

export interface ComparisonMetrics {
    baselineObjective: number;

    baselineTime: number;

    eulerQObjective: number;

    eulerQTime: number;

    improvementPercent: number;
}

// ================================
// MAP TYPES
// ================================

export interface MapViewport {
    center: [number, number];

    zoom: number;
}

// ================================
// STORE TYPES
// ================================

export interface ComparisonState {
    inputMode: InputMode;

    baselineSolver: "naive" | "greedy";

    nodes: CVRPNode[];

    distanceMatrix: number[][];

    generateForm: GenerateFormData;

    validationErrors: ValidationError[];

    isLoading: boolean;

    hasResults: boolean;

    naiveResult: SolverResult | null;

    greedyResult: SolverResult | null;

    eulerQResult: SolverResult | null;

    metrics: ComparisonMetrics | null;
}