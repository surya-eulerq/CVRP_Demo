
import type { CVRPNode } from "../types/cvrp";

function toRadians(value: number) {
    return (value * Math.PI) / 180;
}

export function haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
) {
    const EARTH_RADIUS_KM = 6371;

    const dLat = toRadians(lat2 - lat1);

    const dLng = toRadians(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}

export function generateDistanceMatrix(
    nodes: CVRPNode[]
): number[][] {
    const matrix: number[][] = [];

    for (let i = 0; i < nodes.length; i++) {
        const row: number[] = [];

        for (let j = 0; j < nodes.length; j++) {
            if (i === j) {
                row.push(0);
            } else {
                const distance = haversineDistance(
                    nodes[i].lat,
                    nodes[i].lng,
                    nodes[j].lat,
                    nodes[j].lng
                );

                row.push(Number(distance.toFixed(2)));
            }
        }

        matrix.push(row);
    }

    return matrix;
}