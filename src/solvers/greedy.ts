// src/solvers/greedy.ts
//
// Greedy CVRP Solver — Savings / Greedy Edge-Insertion Heuristic
//
// Strategy (Clarke-Wright inspired, simplified):
//   1. Start with every pickup node in its own route: depot → i → depot
//   2. Compute a "savings" score for every pair (i, j):
//        savings(i,j) = dist(depot,i) + dist(j,depot) - dist(i,j)
//      A high savings means merging route ending at i with route
//      starting at j saves a lot of distance.
//   3. Sort all (i,j) pairs by savings descending.
//   4. Greedily merge pairs if:
//        a) i is the LAST pickup in its route (before depot return)
//        b) j is the FIRST pickup in its route (after depot start)
//        c) i and j are in DIFFERENT routes
//        d) The merged route's total load ≤ the vehicle's capacity
//   5. Assign merged routes to vehicles in order.
//      If more routes than vehicles remain, merge smallest routes
//      into the last vehicle as a best-effort fallback.
//
// Output: VehicleRoute[] — same contract as naive.ts and resultParser.ts
//
// Spec ref: §1 (distance-only CVRP, single depot, all vehicles start+end at depot)

import type { CVRPInstance, VehicleRoute } from "../types/cvrp";

// ─────────────────────────────────────────────────────────────
// Helper — total distance for an ordered route
// ─────────────────────────────────────────────────────────────
function routeDistance(route: number[], dist: number[][]): number {
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
        total += dist[route[i]][route[i + 1]];
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
// Internal route builder used during savings merge phase
// ─────────────────────────────────────────────────────────────
interface MutableRoute {
    nodes: number[];      // pickup nodes only, WITHOUT depot endpoints
    totalLoad: number;
}

// ─────────────────────────────────────────────────────────────
// Main export — runGreedySolver
// ─────────────────────────────────────────────────────────────
export interface GreedySolverResult {
    routes: VehicleRoute[];
    objectiveValue: number;
    solveTimeMs: number;
}

export function runGreedySolver(instance: CVRPInstance): GreedySolverResult {
    const start = performance.now();

    const {
        num_vehicles,
        vehicle_capacity,
        distances,
        pickup_load,
    } = instance;

    const numNodes = distances.length; // 1 depot + num_pickups
    const DEPOT = 0;

    // ── Step 1: Initialise one route per pickup node ────────────
    // routes[i] represents the current route containing pickup node (i+1)
    const routes: MutableRoute[] = [];
    for (let i = 1; i < numNodes; i++) {
        routes.push({
            nodes: [i],
            totalLoad: pickup_load[i] ?? 0,
        });
    }

    // routeOf[nodeId] → index into routes[] for quick lookup
    const routeOf = new Map<number, number>();
    for (let r = 0; r < routes.length; r++) {
        routeOf.set(routes[r].nodes[0], r);
    }

    // ── Step 2: Compute savings for all (i, j) pairs ───────────
    interface Saving {
        i: number;
        j: number;
        value: number;
    }

    const savings: Saving[] = [];
    for (let i = 1; i < numNodes; i++) {
        for (let j = 1; j < numNodes; j++) {
            if (i === j) continue;
            const value =
                distances[DEPOT][i] +
                distances[j][DEPOT] -
                distances[i][j];
            savings.push({ i, j, value });
        }
    }

    // Sort descending by savings value
    savings.sort((a, b) => b.value - a.value);

    // ── Step 3 & 4: Greedy merge ────────────────────────────────
    // Use uniform capacity for merging phase (use vehicle 0's cap as reference
    // since we don't assign vehicles until step 5)
    const uniformCap = Array.isArray(vehicle_capacity)
        ? Math.min(...vehicle_capacity)  // conservative: use smallest cap
        : vehicle_capacity;

    for (const { i, j } of savings) {
        const ri = routeOf.get(i);
        const rj = routeOf.get(j);

        // Both nodes must still exist in the map and be in different routes
        if (ri === undefined || rj === undefined) continue;
        if (ri === rj) continue;

        const routeI = routes[ri];
        const routeJ = routes[rj];

        // i must be the LAST node in its route (tail → depot)
        if (routeI.nodes[routeI.nodes.length - 1] !== i) continue;

        // j must be the FIRST node in its route (depot → head)
        if (routeJ.nodes[0] !== j) continue;

        // Capacity check
        const mergedLoad = routeI.totalLoad + routeJ.totalLoad;
        if (mergedLoad > uniformCap) continue;

        // ── Merge routeJ into routeI ──────────────────────────
        const merged: MutableRoute = {
            nodes: [...routeI.nodes, ...routeJ.nodes],
            totalLoad: mergedLoad,
        };

        // Update routeOf for all nodes that were in routeJ
        for (const node of routeJ.nodes) {
            routeOf.set(node, ri);
        }

        routes[ri] = merged;

        // Mark routeJ as consumed (empty sentinel)
        routes[rj] = { nodes: [], totalLoad: 0 };
        for (const node of routeJ.nodes) {
            // already updated above — no-op needed
            void node;
        }
    }

    // ── Step 5: Collect non-empty routes ───────────────────────
    const finalRoutes = routes.filter((r) => r.nodes.length > 0);

    // ── Step 6: Assign to vehicles ──────────────────────────────
    // If more merged routes than vehicles, pack extras into last vehicle.
    // If fewer, remaining vehicles get empty depot→depot routes.
    const vehicleRoutes: VehicleRoute[] = [];

    for (let v = 0; v < num_vehicles; v++) {
        const cap = capacityFor(vehicle_capacity, v);

        if (finalRoutes.length === 0) {
            // No more routes left — empty vehicle
            vehicleRoutes.push({
                vehicleId: v,
                route: [DEPOT, DEPOT],
                totalDistance: 0,
                totalLoad: 0,
                legDistances: [0],
            });
            continue;
        }

        // Assign next available route to this vehicle.
        // If it exceeds this vehicle's capacity, try to find one that fits.
        let assignedIdx = 0;
        for (let fi = 0; fi < finalRoutes.length; fi++) {
            if (finalRoutes[fi].totalLoad <= cap) {
                assignedIdx = fi;
                break;
            }
        }

        const assigned = finalRoutes.splice(assignedIdx, 1)[0];
        const fullRoute = [DEPOT, ...assigned.nodes, DEPOT];

        const legDistances: number[] = [];
        for (let k = 0; k < fullRoute.length - 1; k++) {
            legDistances.push(distances[fullRoute[k]][fullRoute[k + 1]]);
        }

        vehicleRoutes.push({
            vehicleId: v,
            route: fullRoute,
            totalDistance: routeDistance(fullRoute, distances),
            totalLoad: assigned.totalLoad,
            legDistances,
        });
    }

    // ── Step 7: Overflow — leftover routes beyond num_vehicles ──
    // Append remaining stops to last vehicle as best-effort fallback
    if (finalRoutes.length > 0 && vehicleRoutes.length > 0) {
        const last = vehicleRoutes[vehicleRoutes.length - 1];
        const overflowNodes = finalRoutes.flatMap((r) => r.nodes);
        const overflowLoad = finalRoutes.reduce((s, r) => s + r.totalLoad, 0);

        const newRoute = [
            DEPOT,
            ...last.route.slice(1, -1), // existing stops (excluding depots)
            ...overflowNodes,
            DEPOT,
        ];

        const legDistances: number[] = [];
        for (let k = 0; k < newRoute.length - 1; k++) {
            legDistances.push(distances[newRoute[k]][newRoute[k + 1]]);
        }

        vehicleRoutes[vehicleRoutes.length - 1] = {
            ...last,
            route: newRoute,
            totalDistance: routeDistance(newRoute, distances),
            totalLoad: last.totalLoad + overflowLoad,
            legDistances,
        };
    }

    const objectiveValue = vehicleRoutes.reduce(
        (sum, vr) => sum + vr.totalDistance,
        0
    );

    const solveTimeMs = Math.round(performance.now() - start);

    return { routes: vehicleRoutes, objectiveValue, solveTimeMs };
}