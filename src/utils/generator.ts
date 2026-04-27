// src/utils/generator.ts
//
// Mirrors the ROA demo's generator.ts pattern.
// Responsibilities:
//   1. Randomly place 1 depot + N pickup nodes inside Bengaluru bounding box
//   2. Build the N×N Haversine distance matrix
//   3. Parse + validate user inputs (vehicles, pickups, capacity, load)
//   4. Return a fully-formed CVRPInstance ready to hand to the solver API
//
// Spec ref: Section 4-A (Generate Mode) and Section 2 (Solver Input Contract)

import type { Node, CVRPInstance, GenerateParams, ValidationError } from "../types/cvrp";

// ─────────────────────────────────────────────────────────────
// Bengaluru bounding box  (spec: §4-A)
// ─────────────────────────────────────────────────────────────
const BBOX = {
    latMin: 12.834,
    latMax: 13.139,
    lngMin: 77.460,
    lngMax: 77.780,
} as const;

// Fixed depot coordinates — centre of Bengaluru
const DEPOT_LAT = 12.9716;
const DEPOT_LNG = 77.5946;

// ─────────────────────────────────────────────────────────────
// Haversine distance  (returns metres, rounded to integer)
// ─────────────────────────────────────────────────────────────
function haversineMetres(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6_371_000; // Earth radius in metres
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─────────────────────────────────────────────────────────────
// Build N×N distance matrix from an ordered array of nodes
// Row/col 0 = depot, rows/cols 1…N = pickup nodes  (spec: §2)
// ─────────────────────────────────────────────────────────────
export function buildDistanceMatrix(nodes: Node[]): number[][] {
    const N = nodes.length;
    return Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
            if (i === j) return 0; // diagonal must be 0  (spec: §6)
            return haversineMetres(nodes[i].lat, nodes[i].lng, nodes[j].lat, nodes[j].lng);
        })
    );
}

// ─────────────────────────────────────────────────────────────
// Random float in [min, max)
// ─────────────────────────────────────────────────────────────
function randBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

// ─────────────────────────────────────────────────────────────
// Parse vehicle_capacity field
// Accepts:  "10"          → uniform int
//           "10,12,8"     → per-vehicle int[]
// Returns null on parse failure.
// ─────────────────────────────────────────────────────────────
export function parseCapacity(
    raw: string,
    numVehicles: number
): { value: number | number[]; error: string | null } {
    const trimmed = raw.trim();
    if (!trimmed) return { value: 0, error: "Vehicle capacity is required." };

    const parts = trimmed.split(",").map((s) => s.trim());

    if (parts.length === 1) {
        const v = parseInt(parts[0], 10);
        if (isNaN(v) || v <= 0)
            return { value: 0, error: "Vehicle capacity must be a positive integer." };
        return { value: v, error: null };
    }

    // Per-vehicle array
    if (parts.length !== numVehicles) {
        return {
            value: [],
            // Spec §6: exact error message required
            error: "vehicle_capacity list length must equal num_vehicles.",
        };
    }

    const parsed = parts.map((p) => parseInt(p, 10));
    if (parsed.some((v) => isNaN(v) || v <= 0))
        return { value: [], error: "All capacity values must be positive integers." };

    return { value: parsed, error: null };
}

// ─────────────────────────────────────────────────────────────
// Parse pickup_load field
// Accepts:  "2,3,1,4"  (comma-separated, length = num_pickups)
// The depot load (index 0 = 0) is prepended automatically.  (spec §5.1)
// ─────────────────────────────────────────────────────────────
export function parsePickupLoad(
    raw: string,
    numPickups: number
): { value: number[]; error: string | null } {
    const trimmed = raw.trim();
    if (!trimmed) return { value: [], error: "Pickup load is required." };

    const parts = trimmed.split(",").map((s) => s.trim());

    if (parts.length !== numPickups) {
        return {
            value: [],
            // Spec §6: exact error message required
            error: "pickup_load must have exactly num_pickups values (depot 0 is added automatically).",
        };
    }

    const parsed = parts.map((p) => parseInt(p, 10));
    if (parsed.some((v) => isNaN(v) || v < 0))
        return { value: [], error: "All pickup load values must be non-negative integers." };

    return { value: parsed, error: null };
}

// ─────────────────────────────────────────────────────────────
// Validate the fully-assembled instance  (spec §6)
// ─────────────────────────────────────────────────────────────
export function validateInstance(
    numVehicles: number,
    vehicleCapacity: number | number[],
    pickupLoad: number[] // already includes depot 0 at index 0
): ValidationError[] {
    const errors: ValidationError[] = [];

    // Capacity array length check
    if (Array.isArray(vehicleCapacity) && vehicleCapacity.length !== numVehicles) {
        errors.push({
            field: "vehicle_capacity",
            message: "vehicle_capacity list length must equal num_vehicles.",
        });
    }

    // Total load vs total fleet capacity  (spec §6 — warning level)
    const totalLoad = pickupLoad.slice(1).reduce((s, v) => s + v, 0); // exclude depot
    const totalCap = Array.isArray(vehicleCapacity)
        ? vehicleCapacity.reduce((s, v) => s + v, 0)
        : vehicleCapacity * numVehicles;

    if (totalLoad > totalCap) {
        errors.push({
            field: "capacity",
            message:
                "Warning: total load exceeds total fleet capacity — problem is infeasible.",
        });
    }

    return errors;
}

// ─────────────────────────────────────────────────────────────
// Main export — generateInstance
//
// Called when user clicks ⚡ Generate.
// Returns:
//   nodes          — depot + pickup Node[] for the map
//   instance       — CVRPInstance ready for the solver API
//   distanceMatrix — the raw N×N matrix (for display / echo)
//   errors         — validation errors (empty = all good)
// ─────────────────────────────────────────────────────────────
export interface GenerateResult {
    nodes: Node[];
    instance: CVRPInstance;
    distanceMatrix: number[][];
    errors: ValidationError[];
}

export function generateInstance(params: GenerateParams): GenerateResult {
    const { numVehicles, numPickups, rawCapacity, rawPickupLoad } = params;

    const errors: ValidationError[] = [];

    // ── 1. Parse capacity ──────────────────────────────────────
    const capResult = parseCapacity(rawCapacity, numVehicles);
    if (capResult.error) errors.push({ field: "vehicle_capacity", message: capResult.error });

    // ── 2. Parse pickup load ───────────────────────────────────
    const loadResult = parsePickupLoad(rawPickupLoad, numPickups);
    if (loadResult.error) errors.push({ field: "pickup_load", message: loadResult.error });

    // ── 3. Build nodes ─────────────────────────────────────────
    //    Node 0 = fixed depot
    //    Nodes 1…numPickups = random positions in Bengaluru bbox
    const depot: Node = {
        id: 0,
        lat: DEPOT_LAT,
        lng: DEPOT_LNG,
        load: 0,
    };

    const pickupNodes: Node[] = Array.from({ length: numPickups }, (_, i) => ({
        id: i + 1,
        lat: randBetween(BBOX.latMin, BBOX.latMax),
        lng: randBetween(BBOX.lngMin, BBOX.lngMax),
        load: loadResult.value[i] ?? 1, // fallback to 1 if parse failed
    }));

    const nodes: Node[] = [depot, ...pickupNodes];

    // ── 4. Build distance matrix  (Haversine, shape N×N) ──────
    const distanceMatrix = buildDistanceMatrix(nodes);

    // ── 5. Assemble pickup_load array including depot 0 ────────
    //    Spec §2: index 0 = depot, always 0
    const pickupLoadFull: number[] = [0, ...loadResult.value];

    // ── 6. Cross-validate ──────────────────────────────────────
    const capacityValue = capResult.value ?? 1;
    const crossErrors = validateInstance(numVehicles, capacityValue, pickupLoadFull);
    errors.push(...crossErrors);

    // ── 7. Assemble CVRPInstance  (spec §2) ────────────────────
    const instance: CVRPInstance = {
        num_vehicles: numVehicles,
        num_pickups: numPickups,
        vehicle_capacity: capacityValue,
        distances: distanceMatrix,
        pickup_load: pickupLoadFull,
        backend: "cim",           // fixed for demo  (spec §2.1)
        force_backend_use: true,  // fixed for demo  (spec §2.1)
    };

    return { nodes, instance, distanceMatrix, errors };
}

// ─────────────────────────────────────────────────────────────
// Coordinate helpers  (reusable in excelParser / upload mode)
// ─────────────────────────────────────────────────────────────

/** Build Node[] from raw lat/lng rows (e.g. parsed from Coordinates sheet) */
export function nodesFromCoordinates(
    rows: { node_id: string; lat: number; lng: number }[],
    pickupLoads: number[]
): Node[] {
    return rows.map((row, i) => ({
        id: i,
        lat: row.lat,
        lng: row.lng,
        load: i === 0 ? 0 : (pickupLoads[i - 1] ?? 0),
    }));
}

/** Re-export haversine for use in excelParser */
export { haversineMetres };