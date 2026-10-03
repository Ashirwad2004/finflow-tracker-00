import * as XLSX from "xlsx";
import { ColumnMapping } from "../../types/partyImportExportTypes";
import { guessColumnMapping } from "../../lib/partyImportExportUtils";

export interface ParsedSpreadsheetData {
  headers: string[];
  rows: any[][];
  mapping: ColumnMapping;
}

export async function parsePartySpreadsheet(file: File): Promise<ParsedSpreadsheetData> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Spreadsheet contains no sheets.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (jsonData.length < 2) {
    throw new Error("Your file must contain a header row and at least one party record.");
  }

  const headers = jsonData[0].map((h: any) => String(h || "").trim());
  const rows = jsonData.slice(1).filter((r: any[]) => r.some((c) => c !== null && c !== undefined && c !== ""));

  const mapping = guessColumnMapping(headers);

  return { headers, rows, mapping };
}
