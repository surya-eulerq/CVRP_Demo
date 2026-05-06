import type { CVRPInstance, VehicleRoute, Pickup } from "../types/cvrp";
import { haversineMetres } from "../utils/generator";

function dist(a: Pickup, b: Pickup): number {
  return haversineMetres(a.lat, a.lon, b.lat, b.lon) / 1000;
}

function computeRouteCost(route: Pickup[]): {
  totalDistance: number;
  legDistances: number[];
} {
  const legDistances: number[] = [];
  let totalDistance = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const leg = dist(route[i], route[i + 1]);
    legDistances.push(leg);
    totalDistance += leg;
  }

  return { totalDistance, legDistances };
}

export function solveGreedy(instance: CVRPInstance): VehicleRoute[] {
  const { riders, pickups } = instance;
  const numRiders = riders.length;

  const depot = pickups.find((p) => p.is_depot)!;
  const pickupStops = pickups.filter((p) => !p.is_depot);
  const numPickups = pickupStops.length;

  const base = Math.floor(numPickups / numRiders);
  const remainder = numPickups % numRiders;

  const quotas: number[] = riders.map((_, r) =>
    r < remainder ? base + 1 : base,
  );

  const stops: Pickup[][] = riders.map(() => []); // assigned stops so far
  const current: Pickup[] = riders.map(() => depot); // current position of each rider

  const unvisited = new Set<Pickup>(pickupStops);

  while (unvisited.size > 0) {
    let anyPicked = false;

    for (let r = 0; r < numRiders; r++) {
      if (stops[r].length >= quotas[r]) continue;
      if (unvisited.size === 0) break;

      let nearest: Pickup | null = null;
      let nearestDist = Infinity;

      for (const candidate of unvisited) {
        const d = dist(current[r], candidate);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = candidate;
        }
      }

      if (!nearest) continue;

      stops[r].push(nearest);
      unvisited.delete(nearest);
      current[r] = nearest;
      anyPicked = true;
    }

    if (!anyPicked) break;
  }

  return riders.map((rider, r) => {
    const routePickups: Pickup[] = [depot, ...stops[r], depot];
    const routeIds: string[] = routePickups.map((p) => p.id);

    const { totalDistance, legDistances } = computeRouteCost(routePickups);
    const totalLoad = stops[r].reduce((sum, p) => sum + p.load, 0);

    return {
      vehicleId: rider.id,
      route: routeIds,
      totalDistance,
      totalLoad,
      legDistances,
      numStops: stops[r].length,
    };
  });
}
