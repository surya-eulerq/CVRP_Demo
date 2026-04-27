// src/solvers/eulerq.ts
//
// EulerQ Solver — wraps api.ts + resultParser.ts into the same
// VehicleRoute[] contract that naive.ts and greedy.ts produce.
//
// This is intentionally a thin adapter so CompareDashboard can
// call all three solvers with identical call signatures.
//
// Spec ref: §3 (Solver Output Contract), §2.1 (backend: "cim")

import type { CVRPInstance, VehicleRoute } from "../types/cvrp";
import { runEulerQSolver } from "../utils/api";
import { parseEulerQRoutes } from "../utils/resultParser";

// ─────────────────────────────────────────────────────────────
// Output — same shape as NaiveSolverResult / GreedySolverResult
// ─────────────────────────────────────────────────────────────
export interface EulerQSolverResult {
    routes: VehicleRoute[];
    objectiveValue: number;
    solveTimeMs: number;
}

// ─────────────────────────────────────────────────────────────
// Main export — runEulerQ
//
// Calls the API, parses the edge-list response into ordered
// routes, computes per-leg distances, and returns the unified
// VehicleRoute[] shape.
// ─────────────────────────────────────────────────────────────
export async function runEulerQ(
    instance: CVRPInstance
): Promise<EulerQSolverResult> {

    // ── 1. Call EulerQ API (mock or real) ──────────────────────
    const response = await runEulerQSolver(instance);

    // ── 2. Parse edge-list → ordered routes with distances ─────
    //    resultParser already computes totalDistance per vehicle.
    //    We extend each route with legDistances[] so AssignmentsList
    //    can display per-hop breakdown — matching naive/greedy output.
    const parsedRoutes = parseEulerQRoutes(response, instance.distances);

    const routes: VehicleRoute[] = parsedRoutes.map((pr) => {
        // Compute per-leg distances from the ordered route
        const legDistances: number[] = [];
        for (let i = 0; i < pr.route.length - 1; i++) {
            const from = pr.route[i];
            const to = pr.route[i + 1];
            legDistances.push(instance.distances[from][to]);
        }

        // Compute totalLoad from pickup_load array
        const totalLoad = pr.route
            .filter((id) => id !== 0)
            .reduce((sum, id) => sum + (instance.pickup_load[id] ?? 0), 0);

        return {
            vehicleId: pr.vehicleId,
            route: pr.route,
            totalDistance: pr.totalDistance,
            totalLoad,
            legDistances,
        };
    });

    return {
        routes,
        objectiveValue: response.objectiveValue,
        solveTimeMs: response.solveTimeMs,
    };
}