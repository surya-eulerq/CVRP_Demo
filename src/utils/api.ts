import type {
  CVRPInstance,
  EulerQApiResponse,
  RouteResult,
} from "../types/cvrp";

const BASE_URL = "https://server-staging-adc1.up.railway.app";
const SOLVE_PATH = "/demo/cvrp/solve";

const IS_STAGING = import.meta.env.VITE_ENV === "staging";
const STAGING_TOKEN = "stage_101_eulerq";

const POLL_INTERVAL_MS = 1_500;
const MAX_POLL_ATTEMPTS = 40;

// ─────────────────────────────────────────────────────────────
// Typed error class
// ─────────────────────────────────────────────────────────────

export class EulerQApiError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "SUBMIT_FAILED"
      | "POLL_FAILED"
      | "JOB_FAILED"
      | "TIMEOUT"
      | "PARSE_ERROR",
  ) {
    super(message);
    this.name = "EulerQApiError";
  }
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (IS_STAGING) {
    headers["x-staging-token"] = STAGING_TOKEN;
  }
  return headers;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const json = await response.json();
    if (json?.message && typeof json.message === "string") {
      return json.message;
    }
    if (json?.error && typeof json.error === "string") {
      return json.error;
    }
    return response.statusText || fallback;
  } catch {
    try {
      const text = await response.text();
      return text.trim() || fallback;
    } catch {
      return fallback;
    }
  }
}

async function submitJob(payload: CVRPInstance): Promise<string> {
  const body = {
    riders: payload.riders,
    pickups: payload.pickups,
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${SOLVE_PATH}`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new EulerQApiError(
      "Network error — could not reach the server.",
      "SUBMIT_FAILED",
    );
  }

  if (!response.ok) {
    const message = await extractErrorMessage(
      response,
      "Failed to submit job.",
    );
    throw new EulerQApiError(message, "SUBMIT_FAILED");
  }

  let data: { jobId?: string };
  try {
    data = await response.json();
  } catch {
    throw new EulerQApiError("Unexpected response from server.", "PARSE_ERROR");
  }

  if (!data.jobId) {
    throw new EulerQApiError("Server did not return a job ID.", "PARSE_ERROR");
  }

  return data.jobId;
}

interface RawPollResponse {
  jobId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  solveTimeMs?: number;
  result?: RouteResult[];
  message?: string;
}

async function pollJob(jobId: string): Promise<RawPollResponse> {
  const url = `${BASE_URL}${SOLVE_PATH}/${jobId}`;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: buildHeaders(),
      });
    } catch {
      throw new EulerQApiError(
        "Network error — lost connection while polling.",
        "POLL_FAILED",
      );
    }

    if (!response.ok) {
      const message = await extractErrorMessage(response, "Polling failed.");
      throw new EulerQApiError(message, "POLL_FAILED");
    }

    let data: RawPollResponse;
    try {
      data = await response.json();
    } catch {
      throw new EulerQApiError(
        "Unexpected response while polling.",
        "PARSE_ERROR",
      );
    }

    if (data.status === "COMPLETED") {
      return data;
    }

    if (data.status === "FAILED") {
      const reason = data.message?.trim()
        ? data.message
        : "Solver failed on the server. Please try again.";
      throw new EulerQApiError(reason, "JOB_FAILED");
    }
  }

  throw new EulerQApiError(
    `Solver timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s. Please try again.`,
    "TIMEOUT",
  );
}

function parseCompletedResponse(raw: RawPollResponse): EulerQApiResponse {
  if (!raw.result || !Array.isArray(raw.result) || raw.result.length === 0) {
    throw new EulerQApiError(
      "Completed job is missing result data.",
      "PARSE_ERROR",
    );
  }

  const routeResults: RouteResult[] = raw.result;

  const objectiveValue = routeResults.reduce((sum, r) => sum + r.distance, 0);

  return {
    solveTimeMs: raw.solveTimeMs ?? 0,
    objectiveValue,
    routeResults,
  };
}
export async function runEulerQSolver(
  payload: CVRPInstance,
): Promise<EulerQApiResponse> {
  const jobId = await submitJob(payload);
  console.log(`[EulerQ] Job submitted → jobId: ${jobId}`);

  const raw = await pollJob(jobId);
  console.log(`[EulerQ] Job completed in ${raw.solveTimeMs?.toFixed(1)} ms`);

  return parseCompletedResponse(raw);
}
