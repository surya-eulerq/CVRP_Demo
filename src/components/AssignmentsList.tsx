// src/components/AssignmentsList.tsx
//
// Renders the per-vehicle assignment rows inside a solver card's
// assignments panel.  Clicking a row highlights that vehicle on
// the map (via onVehicleClick).
//
// Spec ref: §7.4 (Map Panes — assignments list below each map)

import type { Node } from "../types/cvrp";

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
     * Per-vehicle ordered node-ID arrays including depot at start/end.
     * e.g. [[0,2,4,0],[0,1,3,0]]
     */
    routes: number[][];

    /**
     * Full node list from the store — used to look up load values
     * and compute per-vehicle total load.
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

/** Look up a node by id; returns undefined if not found */
function getNode(nodes: Node[], id: number): Node | undefined {
    return nodes.find((n) => n.id === id);
}

/** Sum the load of all pickup stops (exclude depot id=0) in a route */
function routeTotalLoad(route: number[], nodes: Node[]): number {
    return route
        .filter((id) => id !== 0)
        .reduce((sum, id) => sum + (getNode(nodes, id)?.load ?? 0), 0);
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

    // ── Empty state ────────────────────────────────────────────
    if (!routes || routes.length === 0) {
        return (
            <div className="assignments-empty">No assignments available</div>
        );
    }

    return (
        <>
            {routes.map((route, vIdx) => {
                const color = colors[vIdx % colors.length];
                const isActive = activeVehicleIdx === vIdx;

                // Pickup stops only (exclude depot node 0)
                const stops = route.filter((id) => id !== 0);
                const totalLoad = routeTotalLoad(route, nodes);

                return (
                    <div
                        key={vIdx}
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
                        <span className="assign-id">V{vIdx}</span>

                        {/* Stop node IDs */}
                        <span className="assign-stops">
                            {stops.length > 0
                                ? stops.join(" → ")
                                : "no stops"}
                        </span>

                        {/* Stop count */}
                        <span className="assign-count">
                            {stops.length}{" "}
                            {stops.length === 1 ? "stop" : "stops"}
                        </span>

                        {/* Total load for this vehicle */}
                        <span
                            className="assign-load"
                            style={{ color, opacity: 0.85 }}
                        >
                            load&nbsp;{totalLoad}
                        </span>
                    </div>
                );
            })}
        </>
    );
}