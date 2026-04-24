import type { CVRPNode } from "../types/cvrp";

import { BENGALURU_BOUNDS } from "../config";

function randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export function generateRandomNodes(
    numPickups: number,
    pickupLoads: number[]
): CVRPNode[] {
    const depot: CVRPNode = {
        id: 0,

        label: "Depot",

        lat: 12.9716,

        lng: 77.5946,

        demand: 0,

        isDepot: true,
    };

    const pickups: CVRPNode[] = Array.from(
        { length: numPickups },
        (_, index) => ({
            id: index + 1,

            label: `Node_${index + 1}`,

            lat: randomBetween(
                BENGALURU_BOUNDS.minLat,
                BENGALURU_BOUNDS.maxLat
            ),

            lng: randomBetween(
                BENGALURU_BOUNDS.minLng,
                BENGALURU_BOUNDS.maxLng
            ),

            demand: pickupLoads[index] || 1,

            isDepot: false,
        })
    );

    return [depot, ...pickups];
}