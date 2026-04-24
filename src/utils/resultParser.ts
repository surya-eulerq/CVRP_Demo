// src/utils/resultParser.ts

import type {
    EulerQApiResponse,
    VehicleRoute,
} from "../types/cvrp";

export function parseEulerQRoutes(
    response: EulerQApiResponse,
    distanceMatrix: number[][]
): VehicleRoute[] {
    const vehicleRoutesMap = new Map<number, number[]>();

    response.result.forEach(([vehicleId, [from, to]]) => {
        if (!vehicleRoutesMap.has(vehicleId)) {
            vehicleRoutesMap.set(vehicleId, []);
        }

        const currentRoute = vehicleRoutesMap.get(vehicleId)!;

        if (currentRoute.length === 0) {
            currentRoute.push(from);
        }

        currentRoute.push(to);
    });

    return Array.from(vehicleRoutesMap.entries()).map(
        ([vehicleId, route]) => {
            let totalDistance = 0;

            for (let i = 0; i < route.length - 1; i++) {
                totalDistance +=
                    distanceMatrix[route[i]][route[i + 1]];
            }

            return {
                vehicleId,

                route,

                totalDistance,

                totalLoad: 0,
            };
        }
    );
}