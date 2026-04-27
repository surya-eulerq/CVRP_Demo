// src/components/AssignmentsList.tsx
//
// Renders the per-vehicle assignment rows inside a solver card's
// assignments panel.  Clicking a row highlights that vehicle on
// the map (via onVehicleClick).
//
// Extended from original:
//   - Now accepts VehicleRoute[] (with legDistances) instead of
//     raw number[][] so per-leg distances and total distance can
//     be displayed without re-computing them here.
//   - Falls back gracefully to number[][] for backward compat.
//
// Spec ref: §7.4 (Map Panes — assignments list below each map)

import type { Node, VehicleRoute } from "../types/cvrp";

// ─────────────────────────────────────────────────────────────
// Colour palettes — must mirror SolverMap / CompareDashboard
// ─────────────────────────────────────────────────────────────
const WARM = ["#f97316", "#f59e0b", "#ef4444", "#fb923c", "#fbbf24"];
const COOL = ["#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6"];

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface AssignmentsListProps {
    /**
     * Full VehicleRoute[] from the solver — includes route,
     * totalDistance, totalLoad, and legDistances per vehicle.
     * Pass number[][] for backward compat (distances will be hidden).
     */
    routes: VehicleRoute[] | number[][];

    /**
     * Full node list from the store — used to look up load values.
     */
    nodes: Node[];

    /**
     * "warm" → orange/amber palette (baseline pane)
     * "cool" → teal/blue palette (EulerQ pane)
     */
    palette: "warm" | "cool";

    /**
     * Currently highlighted vehicle index, or null for none.
     */
    activeVehicleIdx: number | null;

    /**
     * Called when a row is clicked.
     * Passes the vehicle index, or null if the same row is clicked
     * again (toggle off).
     */
    onVehicleClick: (idx: number | null) => void;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Detect if routes are VehicleRoute[] or number[][] */
function isVehicleRoutes(
    routes: VehicleRoute[] | number[][]
): routes is VehicleRoute[] {
    if (!routes || routes.length === 0) return false;
    return typeof (routes[0] as VehicleRoute).vehicleId !== "undefined";
}

/** Look up a node by id; returns undefined if not found */
function getNode(nodes: Node[], id: number): Node | undefined {
    return nodes.find((n) => n.id === id);
}

/** Sum the load of all pickup stops (exclude depot id=0) in a raw route */
function routeTotalLoad(route: number[], nodes: Node[]): number {
    return route
        .filter((id) => id !== 0)
        .reduce((sum, id) => sum + (getNode(nodes, id)?.load ?? 0), 0);
}

/** Format distance value — shows metres if < 1000, else km */
function formatDist(metres: number): string {
    if (metres === 0) return "0 m";
    if (metres < 1000) return `${Math.round(metres)} m`;
    return `${(metres / 1000).toFixed(1)} km`;
}

// ─────────────────────────────────────────────────────────────
// Sub-component — expanded leg breakdown shown on active row
// ─────────────────────────────────────────────────────────────
interface LegBreakdownProps {
    route: number[];
    legDistances: number[];
    color: string;
}

function LegBreakdown({ route, legDistances, color }: LegBreakdownProps) {
    if (!legDistances || legDistances.length === 0) return null;

    return (
        <div className="assign-legs">
            {legDistances.map((dist, i) => {
                const from = route[i];
                const to = route[i + 1];
                const fromLabel = from === 0 ? "Depot" : `N${from}`;
                const toLabel = to === 0 ? "Depot" : `N${to}`;
                return (
                    <div key={i} className="assign-leg-row">
                        <span className="assign-leg-nodes" style={{ color }}>
                            {fromLabel} → {toLabel}
                        </span>
                        <span className="assign-leg-dist">
                            {formatDist(dist)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function AssignmentsList({
    routes,
    nodes,
    palette,
    activeVehicleIdx,
    onVehicleClick,
}: AssignmentsListProps) {
    const colors = palette === "warm" ? WARM : COOL;
    const activeClass = palette === "warm" ? "active-warm" : "active-cool";

    // ── Empty state ─────────────────────────────────────────────
    if (!routes || routes.length === 0) {
        return (
            <div className="assignments-empty">No assignments available</div>
        );
    }

    // ── Normalise to a common shape ──────────────────────────────
    const isRich = isVehicleRoutes(routes);

    interface NormalisedRow {
        vehicleId: number;
        route: number[];
        stops: number[];
        totalLoad: number;
        totalDistance: number;
        legDistances: number[];
    }

    const rows: NormalisedRow[] = isRich
        ? (routes as VehicleRoute[]).map((vr, i) => ({
            vehicleId: vr.vehicleId ?? i,
            route: vr.route,
            stops: vr.route.filter((id) => id !== 0),
            totalLoad: vr.totalLoad,
            totalDistance: vr.totalDistance,
            legDistances: vr.legDistances ?? [],
        }))
        : (routes as number[][]).map((rawRoute, i) => ({
            vehicleId: i,
            route: rawRoute,
            stops: rawRoute.filter((id) => id !== 0),
            totalLoad: routeTotalLoad(rawRoute, nodes),
            totalDistance: 0,
            legDistances: [],
        }));

    return (
        <>
            {/* ── Per-vehicle rows ────────────────────────────────── */}
            {rows.map((row, vIdx) => {
                const color = colors[vIdx % colors.length];
                const isActive = activeVehicleIdx === vIdx;

                return (
                    <div key={vIdx}>
                        {/* ── Main row ──────────────────────────── */}
                        <div
                            className={`assignment-row ${isActive ? activeClass : ""}`}
                            onClick={() =>
                                onVehicleClick(isActive ? null : vIdx)
                            }
                        >
                            {/* Colour dot */}
                            <span
                                className="assign-dot"
                                style={{ background: color }}
                            />

                            {/* Vehicle label */}
                            <span className="assign-id">
                                V{row.vehicleId}
                            </span>

                            {/* Stop sequence */}
                            <span className="assign-stops">
                                {row.stops.length > 0
                                    ? row.stops
                                        .map((id) => `N${id}`)
                                        .join(" → ")
                                    : "no stops"}
                            </span>

                            {/* Stop count */}
                            <span className="assign-count">
                                {row.stops.length}{" "}
                                {row.stops.length === 1 ? "stop" : "stops"}
                            </span>

                            {/* Total distance for this vehicle */}
                            {row.totalDistance > 0 && (
                                <span
                                    className="assign-dist"
                                    style={{ color, opacity: 0.9 }}
                                >
                                    {formatDist(row.totalDistance)}
                                </span>
                            )}

                            {/* Total load for this vehicle */}
                            <span
                                className="assign-load"
                                style={{ color, opacity: 0.85 }}
                            >
                                load&nbsp;{row.totalLoad}
                            </span>
                        </div>

                        {/* ── Leg breakdown (only when row is active) ── */}
                        {isActive && row.legDistances.length > 0 && (
                            <LegBreakdown
                                route={row.route}
                                legDistances={row.legDistances}
                                color={color}
                            />
                        )}
                    </div>
                );
            })}

            {/* ── Grand total distance across all vehicles ──────────── */}
            {isRich && (
                <div className="assign-grand-total">
                    <span className="assign-grand-label">Total Fleet Distance</span>
                    <span
                        className="assign-grand-val"
                        style={{ color: colors[0] }}
                    >
                        {formatDist(
                            rows.reduce((s, r) => s + r.totalDistance, 0)
                        )}
                    </span>
                </div>
            )}
        </>
    );
}