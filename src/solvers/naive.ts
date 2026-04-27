// src/solvers/naive.ts
//
// Naive CVRP Solver — Nearest Neighbour Heuristic
//
// Strategy:
//   For each vehicle in turn, repeatedly pick the closest unvisited
//   pickup node that still fits within remaining capacity.
//   When no more nodes fit (or all are visited), return the vehicle
//   to the depot.  Repeat until all pickups are assigned.
//
// Output: VehicleRoute[] — same shape as resultParser / EulerQ output
//   so CompareDashboard can treat all three solvers identically.
//
// Spec ref: §1 (distance-only CVRP, single depot, all vehicles start+end at depot)

import type { CVRPInstance, VehicleRoute } from "../types/cvrp";

// ─────────────────────────────────────────────────────────────
// Helper — compute total distance for an ordered route
// ─────────────────────────────────────────────────────────────
function routeDistance(route: number[], distanceMatrix: number[][]): number {
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
        total += distanceMatrix[route[i]][route[i + 1]];
    }
    return total;
}

// ─────────────────────────────────────────────────────────────
// Helper — resolve vehicle capacity for a given vehicle index
// ─────────────────────────────────────────────────────────────
function capacityFor(
    vehicleCapacity: number | number[],
    vehicleIdx: number
): number {
    if (Array.isArray(vehicleCapacity)) {
        return vehicleCapacity[vehicleIdx] ?? 0;
    }
    return vehicleCapacity;
}

// ─────────────────────────────────────────────────────────────
// Main export — runNaiveSolver
// ─────────────────────────────────────────────────────────────
export interface NaiveSolverResult {
    routes: VehicleRoute[];
    objectiveValue: number;   // sum of all vehicle total distances
    solveTimeMs: number;
}

export function runNaiveSolver(instance: CVRPInstance): NaiveSolverResult {
    const start = performance.now();

    const {
        num_vehicles,
        vehicle_capacity,
        distances,
        pickup_load,
    } = instance;

    const numNodes = distances.length; // N = 1 depot + num_pickups
    const DEPOT = 0;

    // Track which pickup nodes are still unvisited
    // Index 0 is depot — skip it
    const unvisited = new Set<number>();
    for (let i = 1; i < numNodes; i++) {
        unvisited.add(i);
    }

    const vehicleRoutes: VehicleRoute[] = [];

    for (let v = 0; v < num_vehicles; v++) {
        // If all pickups already assigned, give this vehicle an empty depot→depot route
        if (unvisited.size === 0) {
            vehicleRoutes.push({
                vehicleId: v,
                route: [DEPOT, DEPOT],
                totalDistance: 0,
                totalLoad: 0,
                legDistances: [0],
            });
            continue;
        }

        const cap = capacityFor(vehicle_capacity, v);
        let remainingCap = cap;
        let currentNode = DEPOT;
        const route: number[] = [DEPOT];
        let totalLoad = 0;

        // Nearest neighbour loop
        while (unvisited.size > 0) {
            let nearestNode = -1;
            let nearestDist = Infinity;

            // Find closest unvisited node that fits in remaining capacity
            for (const candidate of unvisited) {
                const load = pickup_load[candidate] ?? 0;
                if (load > remainingCap) continue; // capacity check

                const dist = distances[currentNode][candidate];
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestNode = candidate;
                }
            }

            // No feasible node found for this vehicle — send it back to depot
            if (nearestNode === -1) break;

            // Visit the nearest node
            unvisited.delete(nearestNode);
            route.push(nearestNode);
            totalLoad += pickup_load[nearestNode] ?? 0;
            remainingCap -= pickup_load[nearestNode] ?? 0;
            currentNode = nearestNode;
        }

        // Return to depot
        route.push(DEPOT);

        // Compute per-leg distances
        const legDistances: number[] = [];
        for (let i = 0; i < route.length - 1; i++) {
            legDistances.push(distances[route[i]][route[i + 1]]);
        }

        vehicleRoutes.push({
            vehicleId: v,
            route,
            totalDistance: routeDistance(route, distances),
            totalLoad,
            legDistances,
        });
    }

    // If any pickups remain unvisited after all vehicles exhausted,
    // append them to the last vehicle's route as a best-effort fallback.
    // This signals an infeasible instance (total load > total capacity).
    if (unvisited.size > 0) {
        const last = vehicleRoutes[vehicleRoutes.length - 1];
        const extraRoute = [
            DEPOT,
            ...Array.from(unvisited),
            DEPOT,
        ];
        const extraLegs: number[] = [];
        for (let i = 0; i < extraRoute.length - 1; i++) {
            extraLegs.push(distances[extraRoute[i]][extraRoute[i + 1]]);
        }
        vehicleRoutes[vehicleRoutes.length - 1] = {
            ...last,
            route: extraRoute,
            totalDistance: routeDistance(extraRoute, distances),
            totalLoad: Array.from(unvisited).reduce(
                (s, id) => s + (pickup_load[id] ?? 0),
                0
            ),
            legDistances: extraLegs,
        };
    }

    const objectiveValue = vehicleRoutes.reduce(
        (sum, vr) => sum + vr.totalDistance,
        0
    );

    const solveTimeMs = Math.round(performance.now() - start);

    return { routes: vehicleRoutes, objectiveValue, solveTimeMs };
}