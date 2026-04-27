// src/types/cvrp.ts
// Single source of truth for all CVRP types
// Spec ref: §2 (Solver Input Contract), §3 (Solver Output Contract)

// ─────────────────────────────────────────────────────────────
// Node
// ─────────────────────────────────────────────────────────────
export interface Node {
    id: number;   // 0 = depot, 1…N = pickup nodes
    lat: number;
    lng: number;
    load: number; // 0 for depot, ≥0 for pickups
}

/** Alias kept for haversine.ts compatibility */
export type CVRPNode = Node;

// ─────────────────────────────────────────────────────────────
// Solver Input  (spec §2)
// ─────────────────────────────────────────────────────────────
export interface CVRPInstance {
    num_vehicles: number;
    num_pickups: number;
    vehicle_capacity: number | number[];   // int OR int[] of length num_vehicles
    distances: number[][];                 // shape (N, N), N = 1 + num_pickups
    pickup_load: number[];                 // shape (N,), index 0 = depot = 0
    backend: "cim";
    force_backend_use: true;
}

/** Shape sent to the EulerQ API */
export type CVRPInstancePayload = CVRPInstance;

// ─────────────────────────────────────────────────────────────
// Solver Output — raw API response  (spec §3)
// ─────────────────────────────────────────────────────────────
export interface EulerQApiResponse {
    solveTimeMs: number;
    objectiveValue: number;
    result: [number, [number, number]][]; // [vehicle_id, [from_node, to_node]]
}

/** Alias kept for backward compat */
export type SolverResult = EulerQApiResponse;

// ─────────────────────────────────────────────────────────────
// Derived — per-vehicle route summary
// Shared output contract for ALL three solvers (naive, greedy, eulerq)
// ─────────────────────────────────────────────────────────────
export interface VehicleRoute {
    vehicleId: number;
    route: number[];          // ordered node IDs including depot at start AND end
    totalDistance: number;    // sum of all leg distances
    totalLoad: number;        // sum of pickup_load for all stops (excl. depot)
    legDistances: number[];   // distance for each leg: legDistances[k] = dist(route[k], route[k+1])
}

/** Alias kept for RouteAssignment references in older code */
export interface RouteAssignment {
    vehicleId: number;
    route: number[];
    totalDistance: number;
    numStops: number;
}

// ─────────────────────────────────────────────────────────────
// UI state
// ─────────────────────────────────────────────────────────────
export type SolverName = "naive" | "greedy" | "eulerq";
export type InputMode = "generate" | "upload";
export type BaselineName = "naive" | "greedy";

// ─────────────────────────────────────────────────────────────
// Metrics bar  (computed after solve)
// ─────────────────────────────────────────────────────────────
export interface SolveMetrics {
    baselineObjective: number;
    baselineTime: number;     // ms
    eulerQObjective: number;
    eulerQTime: number;       // ms
    improvementPercent: number;
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────
export interface ValidationError {
    field: string;
    message: string;
}

// ─────────────────────────────────────────────────────────────
// generateInstance() params  (used by generator.ts)
// ─────────────────────────────────────────────────────────────
export interface GenerateParams {
    numVehicles: number;
    numPickups: number;
    rawCapacity: string;    // raw text field value e.g. "10" or "10,12,8"
    rawPickupLoad: string;  // raw text field value e.g. "2,3,1,4,2,1,3,2"
}