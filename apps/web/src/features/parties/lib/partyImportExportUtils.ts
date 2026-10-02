import * as XLSX from "xlsx";
import { Party } from "../types";
import {
    ColumnMapping,
    DuplicateStatus,
    RowHealthStatus,
    RowResolutionAction,
    ParsedPartyRow,
} from "../types/partyImportExportTypes";

// ─── INDIAN GSTIN REGEX CHECK ──────────────────────────────────────────────────
// 2 digits state code + 5 chars PAN + 4 digits PAN + 1 char PAN + 1 entity code + 'Z' + 1 checksum
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ─── 1. DOWNLOAD SAMPLE EXCEL TEMPLATE ───────────────────────────────────────
export function downloadSampleExcelTemplate(toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void) {
    try {
        const headers = [
            [
                "Party Name *",
                "Type (customer/vendor/both) *",
                "Phone Number",
                "Email Address",
                "GSTIN",
                "Billing Address",
                "Opening Balance",
                "Balance Type (to_receive/to_pay)",
            ],
        ];

        const samples = [
            [
                "Sharma Enterprises & Traders",
                "customer",
                "9876543210",
                "sharma.traders@example.com",
                "07AAAAA0000A1Z5",
                "Shop 12, Main Market, Connaught Place, New Delhi",
                5000,
                "to_receive",
            ],
            [
                "Apex Logistics & Supplies",
                "vendor",
                "9123456780",
                "billing@apexlogistics.in",
                "27BBBBB1111B2Z8",
                "Plot 44, Industrial Area Phase 2, Mumbai, MH",
                12500,
                "to_pay",
            ],
            [
                "Kisan Agro Seeds & Fertilizers",
                "both",
                "9988776655",
                "info@kisanagro.com",
                "24CCCCC2222C3Z1",
                "Station Road, Mandi Samiti, Jaipur, RJ",
                0,
                "to_receive",
            ],
        ];

        const wsData = [...headers, ...samples];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        ws["!cols"] = [
            { wch: 32 },
            { wch: 28 },
            { wch: 16 },
            { wch: 28 },
            { wch: 20 },
            { wch: 45 },
            { wch: 18 },
            { wch: 32 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Parties Template");

        const instructions = [
            ["FinFlow — Party Directory Bulk Import Guide"],
            [""],
            ["Field Name", "Required?", "Accepted Values / Format", "Example / Notes"],
            ["Party Name", "YES", "Business or individual name", "Sharma Enterprises"],
            ["Type", "YES", "customer, vendor, or both", "customer"],
            ["Phone Number", "Optional", "10-digit mobile number", "9876543210"],
            ["Email Address", "Optional", "Valid email address", "contact@company.com"],
            ["GSTIN", "Optional", "15-character Indian GSTIN", "07AAAAA0000A1Z5"],
            ["Billing Address", "Optional", "Street, City, State, PIN", "123 Market Rd, Delhi"],
            ["Opening Balance", "Optional", "Numeric amount (default: 0)", "5000"],
            ["Balance Type", "Optional", "to_receive (Dr / Receivable) or to_pay (Cr / Payable)", "to_receive"],
        ];
        const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
        wsInstr["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 45 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

        XLSX.writeFile(wb, "parties_import_template.xlsx");
        toast({
            title: "Template Downloaded",
            description: "Open the template in Excel, enter your records, and upload it back here.",
        });
    } catch (error) {
        console.error("Failed to generate party template:", error);
        toast({
            title: "Template Generation Failed",
            description: "An error occurred while creating the Excel template.",
            variant: "destructive",
        });
    }
}

// ─── STAGE 2: COLUMN ALIAS GUESSING ─────────────────────────────────────────
export function guessColumnMapping(headers: string[]): ColumnMapping {
    const lowerH = headers.map((h) => h.toLowerCase());

    const findColIdx = (aliases: string[]) => {
        return lowerH.findIndex((h) =>
            aliases.includes(h) || aliases.some((alias) => h.includes(alias))
        );
    };

    return {
        name: findColIdx([
            "party name",
            "customer name",
            "vendor name",
            "party",
            "ledger name",
            "account name",
            "firm name",
            "client name",
            "name",
            "company",
        ]),
        type: findColIdx(["party type", "type", "category", "role", "group", "customer/vendor"]),
        phone: findColIdx(["phone", "mobile", "contact", "phone number", "mobile number", "cell", "whatsapp"]),
        email: findColIdx(["email", "email address", "e-mail", "mail id", "mail"]),
        gstin: findColIdx(["gstin", "gst number", "gst no", "gst", "tax id", "tin"]),
        address: findColIdx(["address", "billing address", "location", "city", "place", "state"]),
        opening_balance: findColIdx(["opening balance", "balance", "op bal", "amount", "opening amt"]),
        opening_balance_type: findColIdx([
            "balance type",
            "opening_balance_type",
            "dr/cr",
            "dr / cr",
            "type (dr/cr)",
            "to_receive/to_pay",
        ]),
    };
}

// ─── STAGE 3: VALIDATION & MULTI-FACTOR DUPLICATE DETECTION ENGINE ─────────
export function validateAndParseRows(
    rawRows: any[][],
    rawHeaders: string[],
    mapping: ColumnMapping,
    existingParties: Party[],
    globalDuplicateAction: RowResolutionAction
): ParsedPartyRow[] {
    const parsed: ParsedPartyRow[] = [];
    const sheetSeenGstins = new Map<string, number>(); // gstin -> firstRow
    const sheetSeenPhones = new Map<string, number>(); // phone -> firstRow
    const sheetSeenNames = new Map<string, number>();  // nameLower -> firstRow

    // Pre-index existing database parties for ultra-fast lookup
    const existingByName = new Map<string, Party>();
    const existingByPhone = new Map<string, Party>();
    const existingByGstin = new Map<string, Party>();

    existingParties.forEach((p) => {
        if (p.name) existingByName.set(p.name.trim().toLowerCase(), p);
        if (p.phone) {
            const pClean = p.phone.replace(/[^0-9]/g, "");
            if (pClean.length >= 10) existingByPhone.set(pClean.slice(-10), p);
        }
        if (p.gst_number) {
            const gClean = p.gst_number.toUpperCase().trim();
            if (gClean.length === 15) existingByGstin.set(gClean, p);
        }
    });

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const rowNumber = i + 2; // +2 for 1-based index and header row
        const rawValues: Record<string, any> = {};

        rawHeaders.forEach((h, idx) => {
            rawValues[h] = row[idx];
        });

        // Extract values according to mapped indexes
        const rawName = mapping.name !== -1 ? String(row[mapping.name] || "").trim() : "";
        const rawType = mapping.type !== -1 ? String(row[mapping.type] || "").trim().toLowerCase() : "";
        const rawPhone = mapping.phone !== -1 ? String(row[mapping.phone] || "").trim() : "";
        const rawEmail = mapping.email !== -1 ? String(row[mapping.email] || "").trim() : "";
        const rawGstin = mapping.gstin !== -1 ? String(row[mapping.gstin] || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim() : "";
        const rawAddress = mapping.address !== -1 ? String(row[mapping.address] || "").trim() : "";
        const rawBalance = mapping.opening_balance !== -1 ? row[mapping.opening_balance] : 0;
        const rawBalType = mapping.opening_balance_type !== -1 ? String(row[mapping.opening_balance_type] || "").trim().toLowerCase() : "";

        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. Mandatory Party Name Validation
        if (!rawName) {
            errors.push("Party Name is missing / empty.");
        }

        // 2. Party Type Resolution
        let type: "customer" | "vendor" | "both" = "customer";
        if (rawType.includes("vend") || rawType.includes("suppl")) {
            type = "vendor";
        } else if (rawType.includes("both")) {
            type = "both";
        } else {
            type = "customer";
        }

        // 3. Phone Sanitization & Validation
        let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
        if (cleanPhone.length > 10 && cleanPhone.startsWith("91")) {
            cleanPhone = cleanPhone.slice(2);
        }
        if (rawPhone && cleanPhone.length !== 10) {
            warnings.push(`Phone '${rawPhone}' should ideally be 10 digits.`);
        }

        // 4. GSTIN Validation (Indian 15-char tax format)
        if (rawGstin) {
            if (rawGstin.length !== 15) {
                errors.push(`GSTIN '${rawGstin}' is invalid (length ${rawGstin.length}, must be 15 chars).`);
            } else if (!GSTIN_REGEX.test(rawGstin)) {
                warnings.push(`GSTIN '${rawGstin}' does not match standard Indian GSTIN syntax.`);
            }
        }

        // 5. Opening Balance Parsing
        let opening_balance = 0;
        if (rawBalance !== undefined && rawBalance !== null && rawBalance !== "") {
            const parsedNum = parseFloat(String(rawBalance).replace(/,/g, ""));
            if (isNaN(parsedNum)) {
                errors.push(`Opening balance '${rawBalance}' is not a valid number.`);
            } else {
                opening_balance = Math.abs(parsedNum);
            }
        }

        // 6. Balance Type Resolution (to_receive = Dr / to_pay = Cr)
        let opening_balance_type: "to_receive" | "to_pay" = type === "vendor" ? "to_pay" : "to_receive";
        if (rawBalType.includes("cr") || rawBalType.includes("pay") || rawBalType.includes("to_pay")) {
            opening_balance_type = "to_pay";
        } else if (rawBalType.includes("dr") || rawBalType.includes("rec") || rawBalType.includes("to_rec")) {
            opening_balance_type = "to_receive";
        }

        // 7. Multi-Factor Duplicate & Conflict Detection
        let duplicateStatus: DuplicateStatus = "new";
        let duplicateReason: string | undefined;
        let matchedPartyId: string | undefined;
        let matchedPartyName: string | undefined;

        const nameNorm = rawName.toLowerCase();
        const phone10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : "";

        // A) Conflict checks against existing database:
        if (rawGstin && existingByGstin.has(rawGstin)) {
            const existing = existingByGstin.get(rawGstin)!;
            if (existing.name.trim().toLowerCase() !== nameNorm) {
                duplicateStatus = "conflict";
                duplicateReason = `GSTIN ${rawGstin} is registered to existing party "${existing.name}".`;
                matchedPartyId = existing.id;
                matchedPartyName = existing.name;
            } else {
                duplicateStatus = "duplicate";
                duplicateReason = `Exact match on GSTIN & Name with existing party "${existing.name}".`;
                matchedPartyId = existing.id;
                matchedPartyName = existing.name;
            }
        } else if (phone10 && existingByPhone.has(phone10)) {
            const existing = existingByPhone.get(phone10)!;
            if (existing.name.trim().toLowerCase() !== nameNorm) {
                duplicateStatus = "conflict";
                duplicateReason = `Phone ${phone10} belongs to existing party "${existing.name}".`;
                matchedPartyId = existing.id;
                matchedPartyName = existing.name;
            } else {
                duplicateStatus = "duplicate";
                duplicateReason = `Phone & Name match existing party "${existing.name}".`;
                matchedPartyId = existing.id;
                matchedPartyName = existing.name;
            }
        } else if (nameNorm && existingByName.has(nameNorm)) {
            const existing = existingByName.get(nameNorm)!;
            duplicateStatus = "duplicate";
            duplicateReason = `Party name matches existing party "${existing.name}".`;
            matchedPartyId = existing.id;
            matchedPartyName = existing.name;
        }

        // B) In-File Duplicate Checks:
        if (duplicateStatus === "new") {
            if (rawGstin && sheetSeenGstins.has(rawGstin)) {
                duplicateStatus = "duplicate";
                duplicateReason = `Duplicate GSTIN with Row ${sheetSeenGstins.get(rawGstin)} in this sheet.`;
            } else if (phone10 && sheetSeenPhones.has(phone10)) {
                duplicateStatus = "duplicate";
                duplicateReason = `Duplicate Phone with Row ${sheetSeenPhones.get(phone10)} in this sheet.`;
            } else if (nameNorm && sheetSeenNames.has(nameNorm)) {
                duplicateStatus = "duplicate";
                duplicateReason = `Duplicate Party Name with Row ${sheetSeenNames.get(nameNorm)} in this sheet.`;
            }
        }

        if (rawGstin) sheetSeenGstins.set(rawGstin, rowNumber);
        if (phone10) sheetSeenPhones.set(phone10, rowNumber);
        if (nameNorm) sheetSeenNames.set(nameNorm, rowNumber);

        // Determine Overall Row Health Status
        let healthStatus: RowHealthStatus = "ready";
        if (errors.length > 0) {
            healthStatus = "error";
        } else if (warnings.length > 0 || duplicateStatus === "conflict") {
            healthStatus = "warning";
        }

        // Default Resolution Action:
        let resolutionAction: RowResolutionAction = "merge";
        if (duplicateStatus === "new") {
            resolutionAction = "create_new";
        } else if (duplicateStatus === "conflict") {
            resolutionAction = "skip"; // Defaults conflicts to skip for safety
        } else {
            resolutionAction = globalDuplicateAction;
        }

        parsed.push({
            rowNumber,
            rawValues,
            name: rawName,
            type,
            phone: cleanPhone || rawPhone,
            email: rawEmail,
            address: rawAddress,
            gst_number: rawGstin,
            opening_balance,
            opening_balance_type,
            duplicateStatus,
            duplicateReason,
            matchedPartyId,
            matchedPartyName,
            healthStatus,
            errors,
            warnings,
            resolutionAction,
        });
    }

    return parsed;
}

// ─── STAGE 4: DOWNLOAD ERROR & CONFLICT REPORT ─────────────────────────────
export function downloadErrorReport(
    parsedRows: ParsedPartyRow[],
    toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void
) {
    try {
        const problematicRows = parsedRows.filter(
            (r) => r.healthStatus === "error" || r.healthStatus === "warning" || r.duplicateStatus === "conflict"
        );

        if (problematicRows.length === 0) {
            toast({
                title: "No Errors Found",
                description: "All records are clean and ready for import!",
            });
            return;
        }

        const exportHeaders = [
            "Excel Row #",
            "Party Name",
            "Party Type",
            "Phone",
            "Email",
            "GSTIN",
            "Address",
            "Opening Balance",
            "Balance Type",
            "Health Status",
            "Failure Reasons & Warnings",
            "Matched Existing Party",
        ];

        const exportData = problematicRows.map((r) => [
            r.rowNumber,
            r.name,
            r.type,
            r.phone,
            r.email,
            r.gst_number,
            r.address,
            r.opening_balance,
            r.opening_balance_type,
            r.healthStatus.toUpperCase(),
            [...r.errors, ...r.warnings, r.duplicateReason || ""].filter(Boolean).join(" | "),
            r.matchedPartyName || "None",
        ]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...exportData]);

        ws["!cols"] = [
            { wch: 12 },
            { wch: 28 },
            { wch: 12 },
            { wch: 16 },
            { wch: 24 },
            { wch: 18 },
            { wch: 30 },
            { wch: 16 },
            { wch: 14 },
            { wch: 14 },
            { wch: 50 },
            { wch: 24 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Errors and Conflicts");
        XLSX.writeFile(wb, `party_import_error_report_${new Date().toISOString().slice(0, 10)}.xlsx`);

        toast({
            title: "Error Report Downloaded",
            description: `Exported ${problematicRows.length} error/warning rows to Excel.`,
        });
    } catch (err) {
        console.error("Failed to export error report:", err);
        toast({
            title: "Download Failed",
            description: "Could not generate the error report Excel sheet.",
            variant: "destructive",
        });
    }
}
