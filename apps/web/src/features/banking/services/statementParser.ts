/**
 * Bank Statement Parser Utility
 * Parses Excel (.xlsx, .xls) and CSV statement exports from major Indian banks:
 * SBI, HDFC, ICICI, Axis, Kotak, Bank of Baroda, PNB, etc.
 */

import * as XLSX from "xlsx";
import { format, parse, isValid } from "date-fns";

export interface ParsedStatementLine {
    date: string; // YYYY-MM-DD
    narration: string;
    referenceNo: string;
    withdrawal: number;
    deposit: number;
    balance?: number;
}

export interface ParsedStatementResult {
    filename: string;
    lines: ParsedStatementLine[];
    openingBalance?: number;
    closingBalance?: number;
    totalDeposits: number;
    totalWithdrawals: number;
    startDate?: string;
    endDate?: string;
}

/**
 * Standardize varied bank date strings to ISO YYYY-MM-DD
 */
function normalizeDate(raw: any): string {
    if (!raw) return format(new Date(), "yyyy-MM-dd");

    // If already a JS Date
    if (raw instanceof Date && isValid(raw)) {
        return format(raw, "yyyy-MM-dd");
    }

    // If Excel numeric date serial
    if (typeof raw === "number") {
        try {
            const parsed = XLSX.SSF.parse_date_code(raw);
            if (parsed) {
                const jsDate = new Date(parsed.y, parsed.m - 1, parsed.d);
                if (isValid(jsDate)) return format(jsDate, "yyyy-MM-dd");
            }
        } catch {}
    }

    const str = String(raw).trim().replace(/[/\\]/g, "-");

    const formatsToTry = [
        "yyyy-MM-dd",
        "dd-MM-yyyy",
        "dd-MM-yy",
        "MM-dd-yyyy",
        "dd MMM yyyy",
        "dd-MMM-yyyy",
        "dd-MMM-yy"
    ];

    for (const fmt of formatsToTry) {
        try {
            const parsed = parse(str, fmt, new Date());
            if (isValid(parsed) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
                return format(parsed, "yyyy-MM-dd");
            }
        } catch {}
    }

    // Last resort fallback
    const timestamp = Date.parse(str);
    if (!isNaN(timestamp)) {
        return format(new Date(timestamp), "yyyy-MM-dd");
    }

    return format(new Date(), "yyyy-MM-dd");
}

/**
 * Clean numeric amounts (handles comma formatted "1,25,000.00", currency signs, negative brackets "(500)")
 */
function parseAmount(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : Math.abs(val);

    let s = String(val).trim();
    if (!s) return 0;

    // Handle parentheses for negative numbers e.g. (1,200.00)
    const isNegative = s.startsWith("(") && s.endsWith(")");
    s = s.replace(/[₹$€£,()\s]/g, "");

    const num = parseFloat(s);
    if (isNaN(num)) return 0;
    return isNegative ? -Math.abs(num) : Math.abs(num);
}

/**
 * Extract UTR / Cheque / Ref Number from Narration if column is missing or blank
 */
function extractRefFromNarration(narration: string): string {
    if (!narration) return "";

    // Look for UTR patterns like UTR123456789 or 12 to 16 digit numbers or UPI/xxxx
    const utrMatch = narration.match(/(?:UTR|REF|CHQ|TXN|UPI)[\s/:-]*([A-Z0-9]{8,22})/i);
    if (utrMatch) return utrMatch[1].toUpperCase();

    // Look for 12 digit UPI reference
    const upiRefMatch = narration.match(/\b\d{12}\b/);
    if (upiRefMatch) return upiRefMatch[0];

    // Look for 6 digit cheque number
    const chqMatch = narration.match(/\b\d{6}\b/);
    if (chqMatch) return `CHQ-${chqMatch[0]}`;

    return "";
}

/**
 * Parse an Excel or CSV file buffer into normalized bank statement records
 */
export async function parseStatementFile(file: File): Promise<ParsedStatementResult> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array", cellDates: true });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        throw new Error("The uploaded file does not contain any sheets.");
    }

    const sheet = workbook.Sheets[firstSheetName];
    // Convert to array of rows
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (!rows || rows.length < 2) {
        throw new Error("The statement file is empty or does not contain data rows.");
    }

    // Find the header row by searching for common keywords
    let headerRowIndex = -1;
    let colIndices = {
        date: -1,
        narration: -1,
        ref: -1,
        withdrawal: -1,
        deposit: -1,
        balance: -1
    };

    for (let r = 0; r < Math.min(rows.length, 25); r++) {
        const row = rows[r].map(c => String(c).toLowerCase().trim());
        
        const dateIdx = row.findIndex(c => c.includes("date") || c.includes("txn dt") || c.includes("value dt"));
        const descIdx = row.findIndex(c => c.includes("narration") || c.includes("particular") || c.includes("description") || c.includes("details") || c.includes("remark"));
        const wdlIdx = row.findIndex(c => c.includes("withdrawal") || c.includes("debit") || c === "dr" || c.includes("dr amt"));
        const depIdx = row.findIndex(c => c.includes("deposit") || c.includes("credit") || c === "cr" || c.includes("cr amt"));

        if (dateIdx !== -1 && (descIdx !== -1 || wdlIdx !== -1 || depIdx !== -1)) {
            headerRowIndex = r;
            colIndices.date = dateIdx;
            colIndices.narration = descIdx !== -1 ? descIdx : (dateIdx === 0 ? 1 : 0);
            colIndices.withdrawal = wdlIdx;
            colIndices.deposit = depIdx;
            colIndices.ref = row.findIndex(c => c.includes("chq") || c.includes("cheque") || c.includes("ref") || c.includes("utr") || c.includes("trn"));
            colIndices.balance = row.findIndex(c => c.includes("balance") || c.includes("bal"));
            break;
        }
    }

    // Fallback if header wasn't found through keywords: assume col 0 = Date, col 1 = Narration, col 2 = Ref, col 3 = Withdrawal, col 4 = Deposit, col 5 = Balance
    if (headerRowIndex === -1) {
        headerRowIndex = 0;
        colIndices = {
            date: 0,
            narration: 1,
            ref: 2,
            withdrawal: 3,
            deposit: 4,
            balance: 5
        };
    }

    const lines: ParsedStatementLine[] = [];
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const rawDate = row[colIndices.date];
        const rawNarration = row[colIndices.narration];
        if (!rawDate && !rawNarration) continue;

        const narration = String(rawNarration || "Bank Transaction").trim();
        if (narration.toLowerCase().includes("opening balance") || narration.toLowerCase().includes("brought forward")) {
            continue;
        }

        const date = normalizeDate(rawDate);
        let rawRef = colIndices.ref !== -1 ? String(row[colIndices.ref] || "").trim() : "";
        if (!rawRef || rawRef === "-") {
            rawRef = extractRefFromNarration(narration);
        }

        let withdrawal = colIndices.withdrawal !== -1 ? parseAmount(row[colIndices.withdrawal]) : 0;
        let deposit = colIndices.deposit !== -1 ? parseAmount(row[colIndices.deposit]) : 0;
        let balance = colIndices.balance !== -1 ? parseAmount(row[colIndices.balance]) : undefined;

        // Skip rows where both withdrawal and deposit are 0 (e.g. footer rows, disclaimer notes)
        if (withdrawal === 0 && deposit === 0) {
            continue;
        }

        totalWithdrawals += withdrawal;
        totalDeposits += deposit;

        lines.push({
            date,
            narration,
            referenceNo: rawRef || `STMT-${date.replace(/-/g, "")}-${lines.length + 1}`,
            withdrawal,
            deposit,
            balance
        });
    }

    if (lines.length === 0) {
        throw new Error("Could not extract valid transaction rows. Please ensure your statement file has transaction dates and amounts.");
    }

    // Sort lines chronologically
    lines.sort((a, b) => a.date.localeCompare(b.date));

    return {
        filename: file.name,
        lines,
        totalDeposits,
        totalWithdrawals,
        startDate: lines[0]?.date,
        endDate: lines[lines.length - 1]?.date,
        openingBalance: lines[0]?.balance ? lines[0].balance + lines[0].withdrawal - lines[0].deposit : undefined,
        closingBalance: lines[lines.length - 1]?.balance
    };
}
