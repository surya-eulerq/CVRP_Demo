import type {
    Node,
    Rider,
    Pickup,
    CVRPInstance,
    GenerateParams,
    ValidationError,
} from "../types/cvrp";


const BBOX = {
    latMin: 12.834,
    latMax: 13.139,
    lngMin: 77.460,
    lngMax: 77.780,
} as const;


const DEPOT_LAT = 12.9716;
const DEPOT_LNG = 77.5946;
const DEPOT_ID = "DEPOT";

export function haversineMetres(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6_371_000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}



export function buildDistanceMatrix(nodes: Node[]): number[][] {
    const N = nodes.length;
    return Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => {
            if (i === j) return 0;
            return haversineMetres(
                nodes[i].lat, nodes[i].lng,
                nodes[j].lat, nodes[j].lng
            );
        })
    );
}

function randBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
}


function riderId(index: number): string {
    return `R${String(index + 1).padStart(3, "0")}`;
}

function pickupId(index: number): string {
    if (index === 0) return DEPOT_ID;
    return `P${String(index).padStart(3, "0")}`;
}

export function parseCapacity(
    raw: string,
    numVehicles: number
): { value: number | number[]; error: string | null } {
    const trimmed = raw.trim();
    if (!trimmed) {
        return { value: 1, error: "Vehicle capacity is required." };
    }

    const parts = trimmed.split(",").map((s) => s.trim());

    if (parts.length === 1) {
        const v = parseInt(parts[0], 10);
        if (isNaN(v) || v <= 0) {
            return { value: 1, error: "Vehicle capacity must be a positive integer." };
        }
        return { value: v, error: null };
    }

    if (parts.length !== numVehicles) {
        return {
            value: [],
            error: "vehicle_capacity list length must equal num_vehicles.",
        };
    }

    const parsed = parts.map((p) => parseInt(p, 10));
    if (parsed.some((v) => isNaN(v) || v <= 0)) {
        return { value: [], error: "All capacity values must be positive integers." };
    }

    return { value: parsed, error: null };
}


export function parsePickupLoad(
    raw: string,
    numPickups: number
): { value: number[]; error: string | null } {
    const trimmed = raw.trim();
    if (!trimmed) {
        return { value: [], error: "Pickup load is required." };
    }

    const parts = trimmed.split(",").map((s) => s.trim());

    if (parts.length !== numPickups) {
        return {
            value: [],
            error: "pickup_load must have exactly num_pickups values (depot 0 is added automatically).",
        };
    }

    const parsed = parts.map((p) => parseInt(p, 10));
    if (parsed.some((v) => isNaN(v) || v < 0)) {
        return { value: [], error: "All pickup load values must be non-negative integers." };
    }

    return { value: parsed, error: null };
}


export function validateInstance(
    riders: import("../types/cvrp").Rider[],
    pickups: import("../types/cvrp").Pickup[]
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (riders.length === 0) {
        errors.push({ field: "riders", message: "At least one rider is required." });
    }

    if (pickups.length === 0) {
        errors.push({ field: "pickups", message: "Pickups cannot be empty." });
    }
    const depots = pickups.filter((p) => p.is_depot);
    if (depots.length === 0) {
        errors.push({ field: "pickups", message: "Exactly one pickup must be marked as depot." });
    } else if (depots.length > 1) {
        errors.push({ field: "pickups", message: "Exactly one pickup must be marked as depot." });
    }

    const depot = depots[0];
    if (depot && depot.load !== 0) {
        errors.push({ field: "depot", message: "Depot load must be 0." });
    }

    const totalLoad = pickups
        .filter((p) => !p.is_depot)
        .reduce((sum, p) => sum + p.load, 0);
    const totalCap = riders.reduce((sum, r) => sum + r.capacity, 0);

    if (riders.length > 0 && totalLoad > totalCap) {
        errors.push({
            field: "capacity",
            message:
                "Warning: total load exceeds total fleet capacity — problem is infeasible.",
        });
    }

    return errors;
}


export interface GenerateResult {
    nodes: Node[];
    instance: CVRPInstance;
    errors: ValidationError[];
}

export function generateInstance(params: GenerateParams): GenerateResult {
    const { numVehicles, numPickups, vehicleCapacity, pickupLoad } = params;
    const riders: Rider[] = Array.from({ length: numVehicles }, (_, i) => ({
        id: riderId(i),
        capacity: Array.isArray(vehicleCapacity)
            ? vehicleCapacity[i] ?? 1
            : vehicleCapacity,
    }));

    const depotPickup: Pickup = {
        id: DEPOT_ID,
        lat: DEPOT_LAT,
        lon: DEPOT_LNG,
        load: 0,
        is_depot: true,
    };

    const pickupEntries: Pickup[] = Array.from({ length: numPickups }, (_, i) => ({
        id: pickupId(i + 1),
        lat: randBetween(BBOX.latMin, BBOX.latMax),
        lon: randBetween(BBOX.lngMin, BBOX.lngMax),
        load: pickupLoad[i] ?? 0,
        is_depot: false,
    }));

    const pickups: Pickup[] = [depotPickup, ...pickupEntries];
    const nodes: Node[] = pickups.map((p, i) => ({
        id: i,
        type: p.is_depot ? ("depot" as const) : ("pickup" as const),
        lat: p.lat,
        lng: p.lon,
        demand: p.load,
    }));


    const errors = validateInstance(riders, pickups);
    const instance: CVRPInstance = {
        riders,
        pickups,
    };

    return { nodes, instance, errors };
}


export interface CoordinateConversionResult {
    nodes: Node[];
    pickups: Pickup[];
}

export function nodesFromCoordinates(
    rows: { node_id: string; lat: number; lng: number }[],
    pickupLoads: number[]
): CoordinateConversionResult {
    const nodes: Node[] = rows.map((row, i) => ({
        id: i,
        type: i === 0 ? ("depot" as const) : ("pickup" as const),
        lat: row.lat,
        lng: row.lng,
        demand: i === 0 ? 0 : (pickupLoads[i - 1] ?? 0),
    }));

    const pickups: Pickup[] = rows.map((row, i) => ({
        id: i === 0 ? DEPOT_ID : pickupId(i),
        lat: row.lat,
        lon: row.lng,        // V1.1 API uses "lon"
        load: i === 0 ? 0 : (pickupLoads[i - 1] ?? 0),
        is_depot: i === 0,
    }));

    return { nodes, pickups };
}