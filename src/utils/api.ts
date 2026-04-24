// src/utils/api.ts

import type {
    CVRPInstancePayload,
    EulerQApiResponse,
} from "../types/cvrp";

// =========================================
// MOCK EULERQ SOLVER
// Temporary until backend integration
// =========================================

export async function runEulerQSolver(
    payload: CVRPInstancePayload
): Promise<EulerQApiResponse> {
    console.log("EulerQ Payload:", payload);

    // simulate backend delay
    await new Promise((resolve) =>
        setTimeout(resolve, 1200)
    );

    // mock response based on num_pickups
    const mockResult: EulerQApiResponse = {
        solveTimeMs: 742,

        objectiveValue: 2033,

        result: [
            [0, [0, 1]],
            [0, [1, 3]],
            [0, [3, 0]],

            [1, [0, 2]],
            [1, [2, 4]],
            [1, [4, 0]],
        ],
    };

    return mockResult;
}