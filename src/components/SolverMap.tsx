// src/components/SolverMap.tsx

import "leaflet/dist/leaflet.css";

import {
    MapContainer,
    Marker,
    Polyline,
    Popup,
    TileLayer,
    useMap,
} from "react-leaflet";

import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { useEffect } from "react";

import type {
    CVRPNode,
    VehicleRoute,
} from "../types/cvrp";
/* =========================================
   FIX DEFAULT LEAFLET ICONS
========================================= */

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,

    iconUrl: markerIcon,

    shadowUrl: markerShadow,
});
/* =========================================
   DEFAULT CENTER
========================================= */

const DEFAULT_CENTER: [number, number] = [
    12.9716,
    77.5946,
];

/* =========================================
   MARKER ICONS
========================================= */

const depotIcon = new L.Icon({
    iconUrl:
        "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png",

    iconSize: [28, 28],
});

const pickupIcon = new L.Icon({
    iconUrl:
        "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png",

    iconSize: [24, 24],
});

/* =========================================
   ROUTE COLORS
========================================= */

const ROUTE_COLORS = [
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#8b5cf6",
    "#f97316",
    "#22c55e",
    "#f43f5e",
];

/* =========================================
   AUTO FIT BOUNDS
========================================= */

function FitBounds({
    nodes,
}: {
    nodes: CVRPNode[];
}) {
    const map = useMap();

    useEffect(() => {
        if (!nodes.length) {
            map.setView(DEFAULT_CENTER, 11);

            return;
        }

        const points = nodes.map((node) => [
            node.lat,
            node.lng,
        ]) as [number, number][];

        map.fitBounds(points, {
            padding: [40, 40],
        });
    }, [nodes, map]);

    return null;
}

/* =========================================
   MAIN MAP
========================================= */

interface SolverMapProps {
    nodes: CVRPNode[];

    routes: VehicleRoute[];

    accent?: "orange" | "teal";
}

export default function SolverMap({
    nodes,
    routes,
    accent = "teal",
}: SolverMapProps) {
    function getNodeById(id: number) {
        return nodes.find((node) => node.id === id);
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
            {/* ===================================== */}
            {/* MAP TILES */}
            {/* ===================================== */}

            <TileLayer
                attribution="© OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* ===================================== */}
            {/* AUTO FIT */}
            {/* ===================================== */}

            <FitBounds nodes={nodes} />

            {/* ===================================== */}
            {/* MARKERS */}
            {/* ===================================== */}

            {nodes.map((node) => (
                <Marker
                    key={node.id}
                    position={[node.lat, node.lng]}
                    icon={
                        node.isDepot
                            ? depotIcon
                            : pickupIcon
                    }
                >
                    <Popup>
                        <div className="text-sm">
                            <strong>
                                {node.label}
                            </strong>

                            <br />

                            Demand: {node.demand}

                            <br />

                            {node.isDepot
                                ? "Depot"
                                : "Pickup Node"}
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* ===================================== */}
            {/* ROUTES */}
            {/* ===================================== */}

            {routes.map((route, index) => {
                const color =
                    ROUTE_COLORS[
                    index % ROUTE_COLORS.length
                    ];

                const coordinates = route.route
                    .map((nodeId) => {
                        const node =
                            getNodeById(nodeId);

                        if (!node) return null;

                        return [
                            node.lat,
                            node.lng,
                        ] as [number, number];
                    })
                    .filter(Boolean) as [
                        number,
                        number
                    ][];

                return (
                    <Polyline
                        key={route.vehicleId}
                        positions={coordinates}
                        pathOptions={{
                            color,

                            weight: 4,

                            opacity: 0.85,
                        }}
                    />
                );
            })}
        </MapContainer>
    );
}