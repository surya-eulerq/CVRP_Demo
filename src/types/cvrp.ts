export interface Node {
  id: number;
  type: "depot" | "pickup";
  lat: number;
  lng: number;
  demand: number;
}
export type CVRPNode = Node;

export interface Rider {
  id: string;
  capacity: number;
}

export interface Pickup {
  id: string;
  lat: number;
  lon: number;
  load: number;
  is_depot: boolean;
}

export interface CVRPInstance {
  riders: Rider[];
  pickups: Pickup[];
}

export interface CVRPPayloadV1 {
  riders: Rider[];
  pickups: Pickup[];
}

export type JobStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface JobPollResponse {
  jobId: string;
  status: JobStatus;
  solveTimeMs?: number;
  result?: RouteResult[];
  message?: string;
}

export interface RouteResult {
  rider_id: string;
  route: string[];
  distance: number;
}

export interface VehicleRoute {
  vehicleId: string;
  route: string[];
  totalDistance: number;
  totalLoad: number;
  legDistances: number[];
  numStops: number;
}

export interface RouteAssignment {
  vehicleId: string;
  route: string[];
  totalDistance: number;
  totalLoad: number;
  numStops: number;
  capacity: number;
  isOverCapacity: boolean;
}

export interface ExcelParseResult {
  nodes: Node[];
  instance: CVRPInstance;
  errors: ValidationError[];
}

export type SolverName = "naive" | "greedy" | "eulerq";
export type InputMode = "generate" | "upload";
export type BaselineName = "naive" | "greedy";

export interface SolveMetrics {
  baselineSolverName: BaselineName;
  baselineObjective: number;
  baselineTime: number;
  naiveTime: number;
  greedyTime: number;
  eulerQObjective: number;
  eulerQTime: number;
  improvementPercent: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface GenerateParams {
  numVehicles: number;
  numPickups: number;
  vehicleCapacity: number | number[];
  pickupLoad: number[];
}

export interface EulerQApiResponse {
  solveTimeMs: number;
  objectiveValue: number;
  routeResults: RouteResult[];
}
