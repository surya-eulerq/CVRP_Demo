// src/utils/routeHelpers.ts
//
// Shared helpers for converting raw VehicleRoute[] data into the
// RouteAssignment[] shape consumed by assignment card components.
//
// Kept separate from generator.ts so it can be imported by
// CompareDashboard, SolverCard, and excelExport without creating
// circular dependencies.

import type {
  VehicleRoute,
  RouteAssignment,
  CVRPInstance,
} from "../types/cvrp";

// ─────────────────────────────────────────────────────────────────────────────
// resolveCapacity
//
// Returns the capacity for a specific vehicle, handling both the
// uniform (single int) and per-vehicle (int[]) cases.
// ─────────────────────────────────────────────────────────────────────────────

export function resolveCapacity(
  vehicleCapacity: number | number[],
  vehicleId: number,
): number {
  if (Array.isArray(vehicleCapacity)) {
    return vehicleCapacity[vehicleId] ?? vehicleCapacity[0] ?? 0;
  }
  return vehicleCapacity;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildRouteAssignments
//
// Converts a VehicleRoute[] (output of any solver) into RouteAssignment[]
// for display in the assignment cards below each map pane.
//
// Adds:
//   • capacity       — resolved per-vehicle capacity from the instance
//   • isOverCapacity — true if totalLoad > capacity (UI shows a warning badge)
// ─────────────────────────────────────────────────────────────────────────────

export function buildRouteAssignments(
  routes: VehicleRoute[],
  instance: CVRPInstance,
): RouteAssignment[] {
  return routes.map((vr): RouteAssignment => {
    const capacity = resolveCapacity(instance.vehicle_capacity, vr.vehicleId);
    return {
      vehicleId: vr.vehicleId,
      route: vr.route,
      totalDistance: vr.totalDistance,
      totalLoad: vr.totalLoad,
      numStops: vr.numStops,
      capacity,
      isOverCapacity: vr.totalLoad > capacity,
    };
  });
}

export function computeFleetTotal(routes: VehicleRoute[]): number {
  return routes.reduce((sum, vr) => sum + vr.totalDistance, 0);
}
