import type { CVRPInstance, VehicleRoute, Pickup } from "../types/cvrp";
import { haversineMetres } from "../utils/generator";


function computeRouteCost(
    route: Pickup[]
): { totalDistance: number; legDistances: number[] } {
    const legDistances: number[] = [];
    let totalDistance = 0;

    for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];
        const leg = haversineMetres(from.lat, from.lon, to.lat, to.lon) / 1000;
        legDistances.push(leg);
        totalDistance += leg;
    }

    return { totalDistance, legDistances };
}

export function solveNaive(instance: CVRPInstance): VehicleRoute[] {
    const { riders, pickups } = instance;

    const numRiders = riders.length;
    const depot = pickups.find((p) => p.is_depot)!;
    const pickupStops = pickups.filter((p) => !p.is_depot);
    const numPickups = pickupStops.length;


    const base = Math.floor(numPickups / numRiders);
    const remainder = numPickups % numRiders;
    const assignments: Pickup[][] = [];
    let cursor = 0;

    for (let r = 0; r < numRiders; r++) {
        const quota = r < remainder ? base + 1 : base;
        assignments.push(pickupStops.slice(cursor, cursor + quota));
        cursor += quota;
    }

    return riders.map((rider, r) => {
        const stops = assignments[r];
        const routePickups: Pickup[] = [depot, ...stops, depot];
        const routeIds: string[] = routePickups.map((p) => p.id);

        const { totalDistance, legDistances } = computeRouteCost(routePickups);
        const totalLoad = stops.reduce((sum, p) => sum + p.load, 0);

        return {
            vehicleId: rider.id,
            route: routeIds,
            totalDistance,
            totalLoad,
            legDistances,
            numStops: stops.length,
        };
    });
}