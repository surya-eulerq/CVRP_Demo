// src/utils/excelExport.ts

import * as XLSX from "xlsx";

interface RouteExportRow {
    vehicle_id: number;

    route: string;

    total_distance: number;

    num_stops: number;
}

interface SummaryRow {
    solver: string;

    objective_value: number;

    solve_time_ms: number;

    improvement_percent?: number;

    backend?: string;
}

interface ExportResultsParams {
    summary: SummaryRow[];

    eulerqRoutes: RouteExportRow[];

    naiveRoutes: RouteExportRow[];

    greedyRoutes: RouteExportRow[];

    inputEcho?: Record<string, unknown>[];
}

function createSheet(data: unknown[]) {
    return XLSX.utils.json_to_sheet(data);
}

export function exportResultsToExcel({
    summary,
    eulerqRoutes,
    naiveRoutes,
    greedyRoutes,
    inputEcho = [],
}: ExportResultsParams) {
    // =========================================
    // CREATE WORKBOOK
    // =========================================

    const workbook = XLSX.utils.book_new();

    // =========================================
    // SUMMARY SHEET
    // =========================================

    const summarySheet = createSheet(summary);

    XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Summary"
    );

    // =========================================
    // EULERQ ROUTES
    // =========================================

    const eulerQSheet = createSheet(eulerqRoutes);

    XLSX.utils.book_append_sheet(
        workbook,
        eulerQSheet,
        "EulerQ_Routes"
    );

    // =========================================
    // NAIVE ROUTES
    // =========================================

    const naiveSheet = createSheet(naiveRoutes);

    XLSX.utils.book_append_sheet(
        workbook,
        naiveSheet,
        "Naive_Routes"
    );

    // =========================================
    // GREEDY ROUTES
    // =========================================

    const greedySheet = createSheet(greedyRoutes);

    XLSX.utils.book_append_sheet(
        workbook,
        greedySheet,
        "Greedy_Routes"
    );

    // =========================================
    // INPUT ECHO
    // =========================================

    if (inputEcho.length > 0) {
        const inputEchoSheet = createSheet(inputEcho);

        XLSX.utils.book_append_sheet(
            workbook,
            inputEchoSheet,
            "Input_Echo"
        );
    }

    // =========================================
    // EXPORT FILE
    // =========================================

    XLSX.writeFile(workbook, "cvrp_results.xlsx");
}