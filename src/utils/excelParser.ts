// src/utils/excelParser.ts

import * as XLSX from "xlsx";

export async function parseExcelFile(file: File) {
    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
        type: "array",
    });

    return workbook;
}