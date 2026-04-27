// src/components/SolverMap.tsx

import "leaflet/dist/leaflet.css";

import {
    MapContainer,
    Marker,
    Polyline,
    Popup,
    TileLayer,
    Tooltip,
    useMap,
} from "react-leaflet";

import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { useEffect } from "react";

import type { Node } from "../types/cvrp";

/* ────────────────────────────────────────────────────────────
   Fix Leaflet default icons
──────────────────────────────────────────────────────────── */
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

/* ────────────────────────────────────────────────────────────
   Icons
──────────────────────────────────────────────────────────── */

/* Depot → red marker */
const depotIcon = new L.Icon({
    iconUrl:
        "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png",

    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
});

/* Pickup → green marker (same style as old project) */
const pickupIcon = new L.Icon({
    iconUrl:
        "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png",

    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -22],
});

/* ────────────────────────────────────────────────────────────
   Route palettes
──────────────────────────────────────────────────────────── */

const WARM = [
    "#f97316",
    "#f59e0b",
    "#ef4444",
    "#fb923c",
    "#fbbf24",
];

const COOL = [
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
];

/* ────────────────────────────────────────────────────────────
   Default map center
──────────────────────────────────────────────────────────── */

const DEFAULT_CENTER: [number, number] = [
    12.9716,
    77.5946,
];

/* ────────────────────────────────────────────────────────────
   Auto fit bounds
──────────────────────────────────────────────────────────── */

function FitBounds({
    nodes,
}: {
    nodes: Node[];
}) {
    const map = useMap();

    useEffect(() => {
        if (!nodes.length) {
            map.setView(DEFAULT_CENTER, 11);
            return;
        }

        const points = nodes.map((n) => [
            n.lat,
            n.lng,
        ]) as [number, number][];

        map.fitBounds(points, {
            padding: [40, 40],
        });
    }, [nodes, map]);

    return null;
}

/* ────────────────────────────────────────────────────────────
   Props
──────────────────────────────────────────────────────────── */

interface SolverMapProps {
    nodes: Node[];
    routes: number[][];
    palette?: "warm" | "cool";
    activeVehicleIdx?: number | null;
}

/* ────────────────────────────────────────────────────────────
   Component
──────────────────────────────────────────────────────────── */

export default function SolverMap({
    nodes,
    routes,
    palette = "cool",
    activeVehicleIdx = null,
}: SolverMapProps) {
    const colors =
        palette === "warm"
            ? WARM
            : COOL;

    function getNode(id: number) {
        return nodes.find(
            (n) => n.id === id
        );
    }

    return (
        <MapContainer
            center={DEFAULT_CENTER}
            zoom={11}
            style={{
                width: "100%",
                height: "100%",
            }}
        >
            <TileLayer
                attribution="© OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds nodes={nodes} />

            {/* ─────────────────────────────────────
          Markers
      ───────────────────────────────────── */}

            {nodes.map((node) => {
                const isDepot =
                    node.id === 0;

                return (
                    <Marker
                        key={node.id}
                        position={[
                            node.lat,
                            node.lng,
                        ]}
                        icon={
                            isDepot
                                ? depotIcon
                                : pickupIcon
                        }
                    >


                        <Popup>
                            {isDepot ? (
                                <div>
                                    <strong>
                                        Depot
                                    </strong>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        fontSize:
                                            13,
                                    }}
                                >
                                    <strong>
                                        Pickup{" "}
                                        {node.id}
                                    </strong>

                                    <br />

                                    load:{" "}
                                    <strong>
                                        {node.load}
                                    </strong>
                                </div>
                            )}
                        </Popup>
                    </Marker>
                );
            })}

            {/* ─────────────────────────────────────
          Routes
      ───────────────────────────────────── */}

            {routes.map(
                (
                    route,
                    vehicleIdx
                ) => {
                    const color =
                        colors[
                        vehicleIdx %
                        colors.length
                        ];

                    const isActive =
                        activeVehicleIdx ===
                        null ||
                        activeVehicleIdx ===
                        vehicleIdx;

                    const opacity =
                        isActive
                            ? 0.9
                            : 0.15;

                    const positions =
                        route
                            .map((id) => {
                                const node =
                                    getNode(id);

                                return node
                                    ? ([
                                        node.lat,
                                        node.lng,
                                    ] as [
                                            number,
                                            number
                                        ])
                                    : null;
                            })
                            .filter(
                                Boolean
                            ) as [
                                number,
                                number
                            ][];

                    return (
                        <Polyline
                            key={
                                vehicleIdx
                            }
                            positions={
                                positions
                            }
                            pathOptions={{
                                color,

                                weight: 4,

                                opacity,

                                lineCap:
                                    "round",

                                lineJoin:
                                    "round",
                            }}
                        />
                    );
                }
            )}
        </MapContainer>
    );
}