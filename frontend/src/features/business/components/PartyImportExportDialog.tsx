import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/core/hooks/use-toast";
import { offlineMutate } from "@/core/offline/apiService";
import {
    UploadCloud,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Info,
    Loader2,
    Check,
    X,
    ArrowLeft,
    ArrowRight,
    Users,
    FileText,
    ShieldCheck,
    RefreshCw,
    Layers,
    SlidersHorizontal,
    HelpCircle,
    CheckCircle,
} from "lucide-react";
import {
    exportPartiesToExcel,
    exportPartiesToPDF,
    PartyMetrics,
    BusinessDetailsInfo,
} from "@/utils/exportParties";
import { Party } from "../pages/Parties";

// ─── TYPES & INTERFACES ────────────────────────────────────────────────────────

export type ImportStep = "upload" | "map" | "validate_preview" | "confirm" | "importing" | "complete";

export interface ColumnMapping {
    name: number; // Column index in sheet (-1 = unmapped)
    type: number;
    phone: number;
    email: number;
    gstin: number;
    address: number;
    opening_balance: number;
    opening_balance_type: number;
}

export type DuplicateStatus = "new" | "duplicate" | "conflict";
export type RowHealthStatus = "ready" | "warning" | "error";
export type RowResolutionAction = "merge" | "skip" | "create_new";

export interface ParsedPartyRow {
    rowNumber: number; // 1-indexed Excel row number
    rawValues: Record<string, any>;
    name: string;
    type: "customer" | "vendor" | "both";
    phone: string;
    email: string;
    address: string;
    gst_number: string;
    opening_balance: number;
    opening_balance_type: "to_receive" | "to_pay";
    duplicateStatus: DuplicateStatus;
    duplicateReason?: string;
    matchedPartyId?: string;
    matchedPartyName?: string;
    healthStatus: RowHealthStatus;
    errors: string[];
    warnings: string[];
    resolutionAction: RowResolutionAction;
}

interface PartyImportExportDialogProps {
    open: boolean;
    onClose: () => void;
    userId: string;
    existingParties: Party[];
    partyLedgerMap?: Map<string, PartyMetrics>;
    profile?: any;
}

// ─── INDIAN GSTIN REGEX CHECK ──────────────────────────────────────────────────
// 2 digits state code + 5 chars PAN + 4 digits PAN + 1 char PAN + 1 entity code + 'Z' + 1 checksum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function PartyImportExportDialog({
    open,
    onClose,
    userId,
    existingParties,
    partyLedgerMap = new Map(),
    profile,
}: PartyImportExportDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modes & Steps
    const [mode, setMode] = useState<"select" | "import" | "export">("select");
    const [step, setStep] = useState<ImportStep>("upload");

    // File & Raw Data State
    const [file, setFile] = useState<File | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[][]>([]);

    // Column Mapping State
    const [mapping, setMapping] = useState<ColumnMapping>({
        name: -1,
        type: -1,
        phone: -1,
        email: -1,
        gstin: -1,
        address: -1,
        opening_balance: -1,
        opening_balance_type: -1,
    });

    // Validated & Parsed Rows State
    const [parsedRows, setParsedRows] = useState<ParsedPartyRow[]>([]);
    const [previewFilter, setPreviewFilter] = useState<"all" | "ready" | "duplicates" | "conflicts" | "errors">("all");
    const [globalDuplicateAction, setGlobalDuplicateAction] = useState<"merge" | "skip" | "create_new">("merge");

    // Execution & Progress State
    const [isImporting, setIsImporting] = useState(false);
    const [currentImportIndex, setCurrentImportIndex] = useState(0);
    const [importResults, setImportResults] = useState<{
        created: number;
        updated: number;
        skipped: number;
        failed: number;
    }>({ created: 0, updated: 0, skipped: 0, failed: 0 });

    // Export State
    const [exportFilter, setExportFilter] = useState<"all" | "customer" | "vendor" | "both">("all");

    // ─── RESET ALL STATES ────────────────────────────────────────────────────────
    const resetState = () => {
        setMode("select");
        setStep("upload");
        setFile(null);
        setRawHeaders([]);
        setRawRows([]);
        setMapping({
            name: -1,
            type: -1,
            phone: -1,
            email: -1,
            gstin: -1,
            address: -1,
            opening_balance: -1,
            opening_balance_type: -1,
        });
        setParsedRows([]);
        setPreviewFilter("all");
        setGlobalDuplicateAction("merge");
        setIsImporting(false);
        setCurrentImportIndex(0);
        setImportResults({ created: 0, updated: 0, skipped: 0, failed: 0 });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleClose = () => {
        if (isImporting) return;
        resetState();
        onClose();
    };

    // ─── 1. DOWNLOAD SAMPLE EXCEL TEMPLATE ───────────────────────────────────────
    const handleDownloadTemplate = () => {
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
    };

    // ─── 2. STAGE 1: UPLOAD & READ FILE ─────────────────────────────────────────
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            processUploadedFile(droppedFile);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0]);
        }
    };

    const processUploadedFile = (fileObj: File) => {
        const ext = fileObj.name.split(".").pop()?.toLowerCase();
        if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
            toast({
                title: "Invalid File Format",
                description: "Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file (.csv).",
                variant: "destructive",
            });
            return;
        }

        setFile(fileObj);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
                if (!rows || rows.length <= 1) {
                    toast({
                        title: "Empty Spreadsheet",
                        description: "The uploaded file does not contain any header or data rows.",
                        variant: "destructive",
                    });
                    setFile(null);
                    return;
                }

                // Headers from first row
                const rawH = (rows[0] || []).map((h) => String(h || "").trim());
                const dataRows = rows.slice(1).filter((r) => r && r.length > 0 && r.some((cell) => cell !== null && cell !== undefined && cell !== ""));

                if (dataRows.length === 0) {
                    toast({
                        title: "No Data Rows",
                        description: "Found headers, but no records to import.",
                        variant: "destructive",
                    });
                    setFile(null);
                    return;
                }

                setRawHeaders(rawH);
                setRawRows(dataRows);

                // Guess Initial Mapping
                const autoMap = guessColumnMapping(rawH);
                setMapping(autoMap);

                // Move to Stage 2: MAP
                setStep("map");
            } catch (err) {
                console.error("Failed to parse file:", err);
                toast({
                    title: "File Reading Error",
                    description: "Failed to read the file structure. Please ensure the file is not corrupted.",
                    variant: "destructive",
                });
                setFile(null);
            }
        };
        reader.readAsArrayBuffer(fileObj);
    };

    // ─── STAGE 2: COLUMN ALIAS GUESSING ─────────────────────────────────────────
    const guessColumnMapping = (headers: string[]): ColumnMapping => {
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
    };

    // ─── STAGE 3: VALIDATION & MULTI-FACTOR DUPLICATE DETECTION ENGINE ─────────
    const executeValidationAndDuplicateDetection = () => {
        if (mapping.name === -1) {
            toast({
                title: "Party Name Mapping Required",
                description: "Please map the 'Party Name' field to proceed with validation.",
                variant: "destructive",
            });
            return;
        }

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
            // If GSTIN matches an existing party, but the name is completely different -> CONFLICT!
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
            }
            // If Phone matches an existing party, but name is different -> Warning / Potential Conflict
            else if (phone10 && existingByPhone.has(phone10)) {
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
            }
            // If Name matches an existing party
            else if (nameNorm && existingByName.has(nameNorm)) {
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

        setParsedRows(parsed);
        setStep("validate_preview");
    };

    // ─── STAGE 4: DOWNLOAD ERROR & CONFLICT REPORT ─────────────────────────────
    const handleDownloadErrorReport = () => {
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
    };

    // ─── STAGE 5: BATCH RESOLUTION STRATEGY APPLICATION ─────────────────────────
    const handleApplyGlobalDuplicateAction = (action: "merge" | "skip" | "create_new") => {
        setGlobalDuplicateAction(action);
        setParsedRows((prev) =>
            prev.map((r) => {
                if (r.duplicateStatus === "duplicate") {
                    return { ...r, resolutionAction: action };
                }
                return r;
            })
        );
    };

    const handleToggleRowAction = (rowNumber: number, action: RowResolutionAction) => {
        setParsedRows((prev) =>
            prev.map((r) => (r.rowNumber === rowNumber ? { ...r, resolutionAction: action } : r))
        );
    };

    // ─── STAGE 6: IMPORT EXECUTION (CHUNKED & OFFLINE-FIRST) ───────────────────
    const handleStartImport = async () => {
        setStep("importing");
        setIsImporting(true);
        setCurrentImportIndex(0);

        let created = 0;
        let updated = 0;
        let skipped = 0;
        let failed = 0;

        const importableRows = parsedRows.filter((r) => r.healthStatus !== "error");
        const now = new Date().toISOString();

        for (let i = 0; i < importableRows.length; i++) {
            const row = importableRows[i];
            setCurrentImportIndex(i + 1);

            // Yield thread every 25 rows to allow UI repaints
            if (i % 25 === 0) {
                await new Promise((resolve) => setTimeout(resolve, 0));
            }

            try {
                if (row.resolutionAction === "skip") {
                    skipped++;
                    continue;
                }

                if (row.resolutionAction === "merge" && row.matchedPartyId) {
                    const existing = existingParties.find((p) => p.id === row.matchedPartyId);
                    if (existing) {
                        const updatePayload = {
                            name: row.name || existing.name,
                            type: row.type || existing.type,
                            phone: row.phone || existing.phone || null,
                            email: row.email || existing.email || null,
                            address: row.address || existing.address || null,
                            gst_number: row.gst_number || existing.gst_number || null,
                            opening_balance:
                                row.opening_balance !== undefined
                                    ? row.opening_balance
                                    : existing.opening_balance || 0,
                            opening_balance_type:
                                row.opening_balance_type ||
                                existing.opening_balance_type ||
                                (row.type === "vendor" ? "to_pay" : "to_receive"),
                            updated_at: now,
                        };

                        await offlineMutate({
                            table: "parties",
                            action: "update",
                            recordId: existing.id,
                            payload: updatePayload,
                            userId,
                        });
                        updated++;
                        continue;
                    }
                }

                // Create as new entity
                const recordId = uuidv4();
                const partyName =
                    row.resolutionAction === "create_new" && row.duplicateStatus !== "new"
                        ? `${row.name} (New)`
                        : row.name;

                const recordPayload: Party = {
                    id: recordId,
                    user_id: userId,
                    name: partyName,
                    type: row.type,
                    phone: row.phone || null,
                    email: row.email || null,
                    address: row.address || null,
                    gst_number: row.gst_number || null,
                    opening_balance: row.opening_balance || 0,
                    opening_balance_type:
                        row.opening_balance_type || (row.type === "vendor" ? "to_pay" : "to_receive"),
                    created_at: now,
                    updated_at: now,
                };

                await offlineMutate({
                    table: "parties",
                    action: "insert",
                    recordId,
                    payload: recordPayload,
                    userId,
                });
                created++;
            } catch (err) {
                console.error(`Failed to import row #${row.rowNumber}:`, err);
                failed++;
            }
        }

        // Invalidate React Query caches
        await queryClient.invalidateQueries({ queryKey: ["parties"] });
        await queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
        await queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });

        setImportResults({ created, updated, skipped, failed });
        setIsImporting(false);
        setStep("complete");

        toast({
            title: "Party Import Completed!",
            description: `Successfully processed ${importableRows.length} rows (${created} created, ${updated} merged, ${skipped} skipped).`,
        });
    };

    // ─── STAGE 7: DIRECTORY EXPORTS ─────────────────────────────────────────────
    const filteredExportParties = useMemo(() => {
        if (exportFilter === "customer") return existingParties.filter((p) => p.type === "customer");
        if (exportFilter === "vendor") return existingParties.filter((p) => p.type === "vendor");
        if (exportFilter === "both") return existingParties.filter((p) => p.type === "both");
        return existingParties;
    }, [existingParties, exportFilter]);

    const businessDetails: BusinessDetailsInfo = useMemo(() => {
        return {
            name: profile?.business_name || profile?.display_name || "BUSINESS DIRECTORY",
            address: profile?.business_address,
            phone: profile?.business_phone || profile?.phone,
            gst: profile?.gst_number,
            logo_url: profile?.business_logo,
        };
    }, [profile]);

    const handleExecuteExportExcel = () => {
        try {
            if (filteredExportParties.length === 0) {
                toast({
                    title: "No Parties to Export",
                    description: "There are no parties matching your selected filter.",
                    variant: "destructive",
                });
                return;
            }
            exportPartiesToExcel(
                filteredExportParties,
                partyLedgerMap,
                businessDetails,
                exportFilter !== "all" ? exportFilter.toUpperCase() : undefined
            );
            toast({
                title: "Excel Export Complete",
                description: `Exported ${filteredExportParties.length} party records to Excel.`,
            });
            handleClose();
        } catch (err: any) {
            console.error("Export error:", err);
            toast({
                title: "Export Failed",
                description: err.message || "Failed to generate Excel file.",
                variant: "destructive",
            });
        }
    };

    const handleExecuteExportPDF = () => {
        try {
            if (filteredExportParties.length === 0) {
                toast({
                    title: "No Parties to Export",
                    description: "There are no parties matching your selected filter.",
                    variant: "destructive",
                });
                return;
            }
            exportPartiesToPDF(
                filteredExportParties,
                partyLedgerMap,
                businessDetails,
                exportFilter !== "all" ? exportFilter.toUpperCase() : undefined
            );
            toast({
                title: "PDF Export Complete",
                description: `Generated PDF directory with ${filteredExportParties.length} parties.`,
            });
            handleClose();
        } catch (err: any) {
            console.error("PDF export error:", err);
            toast({
                title: "Export Failed",
                description: err.message || "Failed to generate PDF directory.",
                variant: "destructive",
            });
        }
    };

    // ─── COMPUTED METRICS & FILTERS ─────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = parsedRows.length;
        const customers = parsedRows.filter((r) => r.type === "customer").length;
        const vendors = parsedRows.filter((r) => r.type === "vendor").length;
        const both = parsedRows.filter((r) => r.type === "both").length;

        const ready = parsedRows.filter((r) => r.healthStatus === "ready" && r.duplicateStatus === "new").length;
        const duplicates = parsedRows.filter((r) => r.duplicateStatus === "duplicate").length;
        const conflicts = parsedRows.filter((r) => r.duplicateStatus === "conflict").length;
        const errors = parsedRows.filter((r) => r.healthStatus === "error").length;
        const warnings = parsedRows.filter((r) => r.healthStatus === "warning").length;

        const newRecords = parsedRows.filter((r) => r.duplicateStatus === "new" && r.healthStatus !== "error").length;

        return {
            total,
            customers,
            vendors,
            both,
            ready,
            duplicates,
            conflicts,
            errors,
            warnings,
            newRecords,
            needsAttention: duplicates + conflicts + warnings,
        };
    }, [parsedRows]);

    const visibleRows = useMemo(() => {
        if (previewFilter === "ready") return parsedRows.filter((r) => r.healthStatus === "ready" && r.duplicateStatus === "new");
        if (previewFilter === "duplicates") return parsedRows.filter((r) => r.duplicateStatus === "duplicate");
        if (previewFilter === "conflicts") return parsedRows.filter((r) => r.duplicateStatus === "conflict");
        if (previewFilter === "errors") return parsedRows.filter((r) => r.healthStatus === "error");
        return parsedRows;
    }, [parsedRows, previewFilter]);

    // Planned actions count for confirmation
    const plannedActions = useMemo(() => {
        const importable = parsedRows.filter((r) => r.healthStatus !== "error");
        const toCreate = importable.filter((r) => r.resolutionAction === "create_new").length;
        const toMerge = importable.filter((r) => r.resolutionAction === "merge").length;
        const toSkip = importable.filter((r) => r.resolutionAction === "skip").length;
        const excludedErrors = parsedRows.filter((r) => r.healthStatus === "error").length;
        return { toCreate, toMerge, toSkip, excludedErrors };
    }, [parsedRows]);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl">
                
                {/* Header with Pipeline Stepper */}
                <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {mode !== "select" && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        if (isImporting) return;
                                        if (step === "map") {
                                            setStep("upload");
                                            setFile(null);
                                        } else if (step === "validate_preview") {
                                            setStep("map");
                                        } else if (step === "confirm") {
                                            setStep("validate_preview");
                                        } else {
                                            resetState();
                                        }
                                    }}
                                    className="h-8 w-8 rounded-lg"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            )}
                            <div>
                                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                    <Users className="w-5 h-5 text-primary" />
                                    {mode === "select" && "Customer & Supplier Data Hub"}
                                    {mode === "export" && "Export Party Directory"}
                                    {mode === "import" && (
                                        <>
                                            {step === "upload" && "Step 1: Upload Spreadsheet"}
                                            {step === "map" && "Step 2: Match Your Columns"}
                                            {step === "validate_preview" && "Step 3: Preview & Check Duplicates"}
                                            {step === "confirm" && "Step 4: Review & Confirm"}
                                            {step === "importing" && "Step 5: Adding Parties to Directory..."}
                                            {step === "complete" && "Import Completed Successfully"}
                                        </>
                                    )}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    {mode === "select" && "Quickly import customer and supplier lists from Excel, or download your complete accounting directory."}
                                    {mode === "export" && "Download your customer and vendor directory in Excel (.xlsx) or formatted PDF reports."}
                                    {mode === "import" && (
                                        <>
                                            {step === "upload" && "Select an Excel (.xlsx, .xls) or CSV file. You can review all records before anything is saved."}
                                            {step === "map" && "Match your spreadsheet columns with party details like Name, Phone, and GSTIN."}
                                            {step === "validate_preview" && "Preview your records, review duplicate matches, and resolve any conflicts."}
                                            {step === "confirm" && "Check the summary below before adding these parties to your directory."}
                                            {step === "importing" && "Saving your verified party records..."}
                                            {step === "complete" && "Your customer and vendor directory has been updated."}
                                        </>
                                    )}
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Pipeline Stepper Pills */}
                        {mode === "import" && step !== "complete" && (
                            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <span className={`px-2 py-0.5 rounded-lg ${step === "upload" ? "bg-primary text-white shadow-xs" : "text-muted-foreground"}`}>
                                    1. Upload File
                                </span>
                                <span>&rarr;</span>
                                <span className={`px-2 py-0.5 rounded-lg ${step === "map" ? "bg-primary text-white shadow-xs" : "text-muted-foreground"}`}>
                                    2. Match Columns
                                </span>
                                <span>&rarr;</span>
                                <span className={`px-2 py-0.5 rounded-lg ${step === "validate_preview" ? "bg-primary text-white shadow-xs" : "text-muted-foreground"}`}>
                                    3. Preview & Review
                                </span>
                                <span>&rarr;</span>
                                <span className={`px-2 py-0.5 rounded-lg ${step === "confirm" ? "bg-primary text-white shadow-xs" : "text-muted-foreground"}`}>
                                    4. Save
                                </span>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0 space-y-4">

                    {/* ─── MODE 1: SELECT HUB ────────────────────────────────────────────── */}
                    {mode === "select" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                            
                            {/* Import Option Card */}
                            <div 
                                onClick={() => {
                                    setMode("import");
                                    setStep("upload");
                                }}
                                className="group relative bg-card border-2 border-slate-200 dark:border-slate-800 hover:border-primary/60 dark:hover:border-primary/60 rounded-2xl p-6 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <UploadCloud className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                                Bulk Import Parties
                                            </h3>
                                            <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                                                Duplicate Protected
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                            Import your customers and suppliers from Excel or CSV. Review columns, check for duplicate accounts, and preview everything before saving.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                                        Start Import &rarr;
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadTemplate();
                                        }}
                                        className="h-7 text-[11px] font-semibold gap-1 rounded-lg"
                                    >
                                        <Download className="w-3 h-3" />
                                        Sample Template
                                    </Button>
                                </div>
                            </div>

                            {/* Export Option Card */}
                            <div 
                                onClick={() => setMode("export")}
                                className="group relative bg-card border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 rounded-2xl p-6 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-foreground group-hover:text-emerald-600 transition-colors">
                                            Export Party Directory
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                            Download your entire party register with balances, contact details, GST numbers, and ledger stats in Excel (.xlsx) or formatted PDF.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                        Configure & Export &rarr;
                                    </span>
                                    <Badge variant="outline" className="text-[10px] font-bold">
                                        {existingParties.length} Parties Active
                                    </Badge>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* ─── STAGE 1: UPLOAD SCREEN ───────────────────────────────────────── */}
                    {mode === "import" && step === "upload" && (
                        <div className="space-y-4 py-2">
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                                    isDragActive
                                        ? "border-primary bg-primary/5"
                                        : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-primary/50"
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                                    <UploadCloud className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="font-bold text-base text-foreground">
                                        Click to upload or drag & drop customer / vendor spreadsheet
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) up to 50,000 records
                                    </p>
                                </div>
                                <Button size="sm" variant="outline" className="text-xs h-8 font-semibold gap-1.5 rounded-xl">
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    Browse Computer
                                </Button>
                            </div>

                            {/* Template Download Prompt */}
                            <div className="bg-slate-100/80 dark:bg-slate-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <Info className="w-4 h-4 text-primary shrink-0" />
                                    <span className="text-slate-700 dark:text-slate-300">
                                        Need the standard format? Download our pre-styled template with sample Indian business parties.
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleDownloadTemplate}
                                    className="h-7 text-xs font-bold shrink-0 gap-1 rounded-lg"
                                >
                                    <Download className="w-3 h-3" />
                                    Download Template
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ─── STAGE 2: MAP COLUMNS SCREEN ─────────────────────────────────── */}
                    {mode === "import" && step === "map" && (
                        <div className="space-y-4">
                            
                            {/* File Info Header */}
                            <div className="bg-slate-100/80 dark:bg-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <FileSpreadsheet className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground">
                                            {file?.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {rawRows.length} data rows detected &bull; {rawHeaders.length} columns found
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                        Verify column mappings before validation
                                    </span>
                                </div>
                            </div>

                            {/* Mapping Grid Table */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-card">
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                                        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                                        Match Spreadsheet Columns to Party Details
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        * Required Field
                                    </span>
                                </div>

                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {[
                                        {
                                            key: "name" as const,
                                            label: "Party / Customer / Vendor Name",
                                            required: true,
                                            desc: "Full business or person name. Cannot be blank.",
                                        },
                                        {
                                            key: "type" as const,
                                            label: "Party Type",
                                            required: false,
                                            desc: "customer, vendor, or both (defaults to customer if blank)",
                                        },
                                        {
                                            key: "phone" as const,
                                            label: "Phone / Mobile Number",
                                            required: false,
                                            desc: "10-digit mobile number for WhatsApp and calling",
                                        },
                                        {
                                            key: "email" as const,
                                            label: "Email Address",
                                            required: false,
                                            desc: "Email address for digital invoices and communications",
                                        },
                                        {
                                            key: "gstin" as const,
                                            label: "GSTIN (Tax Identification)",
                                            required: false,
                                            desc: "15-character Indian GSTIN (e.g. 07AAAAA0000A1Z5)",
                                        },
                                        {
                                            key: "address" as const,
                                            label: "Billing Address",
                                            required: false,
                                            desc: "Physical shop, registered office, or billing address",
                                        },
                                        {
                                            key: "opening_balance" as const,
                                            label: "Opening Balance Amount",
                                            required: false,
                                            desc: "Initial outstanding balance (numeric, defaults to 0)",
                                        },
                                        {
                                            key: "opening_balance_type" as const,
                                            label: "Balance Nature / Type",
                                            required: false,
                                            desc: "to_receive (Dr / Receivable) or to_pay (Cr / Payable)",
                                        },
                                    ].map((field) => {
                                        const selectedColIdx = mapping[field.key];
                                        const sampleValues =
                                            selectedColIdx !== -1
                                                ? rawRows
                                                      .slice(0, 3)
                                                      .map((r) => r[selectedColIdx])
                                                      .filter((v) => v !== null && v !== undefined && v !== "")
                                                : [];

                                        return (
                                            <div
                                                key={field.key}
                                                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                                            >
                                                <div className="sm:w-1/2">
                                                    <p className="font-bold text-xs text-foreground flex items-center gap-1">
                                                        {field.label}
                                                        {field.required && (
                                                            <span className="text-rose-500 font-black">*</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        {field.desc}
                                                    </p>
                                                    {sampleValues.length > 0 && (
                                                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                                            <span className="text-[10px] text-slate-400 font-semibold">
                                                                Sample data:
                                                            </span>
                                                            {sampleValues.map((val, sIdx) => (
                                                                <span
                                                                    key={sIdx}
                                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono truncate max-w-[140px]"
                                                                >
                                                                    {String(val)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="sm:w-1/2 max-w-xs">
                                                    <select
                                                        value={selectedColIdx}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            setMapping((prev) => ({ ...prev, [field.key]: val }));
                                                        }}
                                                        className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary ${
                                                            field.required && selectedColIdx === -1
                                                                ? "border-rose-300 bg-rose-50/30 text-rose-700"
                                                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-foreground"
                                                        }`}
                                                    >
                                                        <option value="-1">— Do Not Map (Ignore) —</option>
                                                        {rawHeaders.map((headerName, idx) => (
                                                            <option key={idx} value={idx}>
                                                                Column {idx + 1}: {headerName || `(Unnamed Column ${idx + 1})`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center justify-between pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setStep("upload");
                                        setFile(null);
                                    }}
                                    className="text-xs rounded-xl"
                                >
                                    &larr; Choose Different File
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={executeValidationAndDuplicateDetection}
                                    disabled={mapping.name === -1}
                                    className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl gap-1.5"
                                >
                                    Confirm Mapping & Validate &rarr;
                                </Button>
                            </div>

                        </div>
                    )}

                    {/* ─── STAGE 3: VALIDATION & DUPLICATE PREVIEW SCREEN ───────────────── */}
                    {mode === "import" && step === "validate_preview" && (
                        <div className="space-y-4">
                            
                            {/* Summary Dashboard as specified in enterprise spec */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Total Records
                                    </p>
                                    <p className="text-xl font-black text-foreground mt-0.5">
                                        {stats.total.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {stats.customers} Cust &bull; {stats.vendors} Vend &bull; {stats.both} Both
                                    </p>
                                </div>

                                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-3.5 rounded-xl">
                                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                        Ready to Add
                                    </p>
                                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                                        {stats.ready.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                                        New Verified Parties
                                    </p>
                                </div>

                                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 p-3.5 rounded-xl">
                                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        Needs Review
                                    </p>
                                    <p className="text-xl font-black text-amber-800 dark:text-amber-300 mt-0.5">
                                        {stats.needsAttention.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                                        {stats.duplicates} Duplicates &bull; {stats.conflicts} Conflicts
                                    </p>
                                </div>

                                <div className={`p-3.5 rounded-xl border ${
                                    stats.errors > 0
                                        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60"
                                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                }`}>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                        stats.errors > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"
                                    }`}>
                                        <AlertCircle className="w-3 h-3" />
                                        Errors to Fix
                                    </p>
                                    <p className={`text-xl font-black mt-0.5 ${
                                        stats.errors > 0 ? "text-rose-700 dark:text-rose-400" : "text-slate-400"
                                    }`}>
                                        {stats.errors.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {stats.errors > 0 ? "Excluded from import" : "0 Errors Found"}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed Error & Attention Ledger Box */}
                            {(stats.errors > 0 || stats.conflicts > 0 || stats.warnings > 0) && (
                                <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/50 rounded-xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                            Records Needing Attention ({stats.errors + stats.conflicts + stats.warnings} entries)
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleDownloadErrorReport}
                                            className="h-7 text-xs font-bold gap-1 rounded-lg border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50"
                                        >
                                            <Download className="w-3 h-3" />
                                            Download Error Report (.xlsx)
                                        </Button>
                                    </div>
                                    <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] font-mono pr-2">
                                        {parsedRows
                                            .filter((r) => r.healthStatus === "error" || r.duplicateStatus === "conflict" || r.warnings.length > 0)
                                            .slice(0, 10)
                                            .map((r, eIdx) => (
                                                <div key={eIdx} className="flex items-start gap-2 text-rose-700 dark:text-rose-400">
                                                    <span className="font-bold shrink-0">Row {r.rowNumber}:</span>
                                                    <span>
                                                        {[...r.errors, ...r.warnings, r.duplicateReason].filter(Boolean).join(" — ")}
                                                    </span>
                                                </div>
                                            ))}
                                        {parsedRows.filter((r) => r.healthStatus === "error" || r.duplicateStatus === "conflict").length > 10 && (
                                            <p className="text-[10px] text-slate-500 font-sans italic pt-1">
                                                ...and {parsedRows.filter((r) => r.healthStatus === "error" || r.duplicateStatus === "conflict").length - 10} more. Download error report for complete details.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Duplicate Resolution Strategy Selector */}
                            {stats.duplicates > 0 && (
                                <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 p-3.5 rounded-xl space-y-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                                <ShieldCheck className="w-4 h-4 text-amber-600" />
                                                How to Handle Existing Parties ({stats.duplicates} matched)
                                            </p>
                                            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                                Choose how to handle parties that already exist in your directory. You can also change individual rows in the table below.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {(["merge", "skip", "create_new"] as const).map((strat) => (
                                                <Button
                                                    key={strat}
                                                    size="sm"
                                                    variant={globalDuplicateAction === strat ? "default" : "outline"}
                                                    onClick={() => handleApplyGlobalDuplicateAction(strat)}
                                                    className={`h-7 text-xs font-bold rounded-lg capitalize ${
                                                        globalDuplicateAction === strat
                                                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                                                            : "border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                                    }`}
                                                >
                                                    {strat === "merge" ? "Merge / Update" : strat === "skip" ? "Skip Duplicates" : "Create New"}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Filter Tabs & Preview Table */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter("all")}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                            previewFilter === "all"
                                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                        }`}
                                    >
                                        All ({stats.total})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter("ready")}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                            previewFilter === "ready"
                                                ? "bg-emerald-600 text-white"
                                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                        }`}
                                    >
                                        Ready ({stats.ready})
                                    </button>
                                    {stats.duplicates > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewFilter("duplicates")}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                previewFilter === "duplicates"
                                                    ? "bg-amber-600 text-white"
                                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                            }`}
                                        >
                                            Duplicates ({stats.duplicates})
                                        </button>
                                    )}
                                    {stats.conflicts > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewFilter("conflicts")}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                previewFilter === "conflicts"
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                                            }`}
                                        >
                                            Conflicts ({stats.conflicts})
                                        </button>
                                    )}
                                    {stats.errors > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewFilter("errors")}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                previewFilter === "errors"
                                                    ? "bg-rose-600 text-white"
                                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                            }`}
                                        >
                                            Errors ({stats.errors})
                                        </button>
                                    )}
                                </div>

                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10 text-[11px] font-bold">
                                            <TableRow>
                                                <TableHead className="w-12 text-center">Row</TableHead>
                                                <TableHead>Party Name</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Phone / GSTIN</TableHead>
                                                <TableHead className="text-right">Opening Balance</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {visibleRows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                                                        No records found under this filter.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                visibleRows.map((row) => (
                                                    <TableRow
                                                        key={row.rowNumber}
                                                        className={`text-xs ${
                                                            row.healthStatus === "error"
                                                                ? "bg-rose-50/50 dark:bg-rose-950/20"
                                                                : row.duplicateStatus === "conflict"
                                                                ? "bg-purple-50/40 dark:bg-purple-950/10"
                                                                : row.duplicateStatus === "duplicate"
                                                                ? "bg-amber-50/40 dark:bg-amber-950/10"
                                                                : ""
                                                        }`}
                                                    >
                                                        <TableCell className="text-center text-slate-400 font-mono text-[10px]">
                                                            {row.rowNumber}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-foreground">
                                                            {row.name || <span className="text-rose-500 italic">Missing Name</span>}
                                                            {row.duplicateReason && (
                                                                <span className="block text-[10px] font-normal text-amber-700 dark:text-amber-400">
                                                                    {row.duplicateReason}
                                                                </span>
                                                            )}
                                                            {row.errors.length > 0 && (
                                                                <span className="block text-[10px] font-normal text-rose-600 dark:text-rose-400">
                                                                    {row.errors.join(", ")}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={`capitalize text-[10px] font-semibold ${
                                                                    row.type === "customer"
                                                                        ? "text-blue-600 border-blue-200"
                                                                        : row.type === "vendor"
                                                                        ? "text-purple-600 border-purple-200"
                                                                        : "text-emerald-600 border-emerald-200"
                                                                }`}
                                                            >
                                                                {row.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                                                            <div>{row.phone || "-"}</div>
                                                            <div className="text-[10px] text-muted-foreground">{row.gst_number || "-"}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-bold">
                                                            {row.opening_balance > 0 ? (
                                                                <span>
                                                                    ₹{row.opening_balance.toLocaleString()}{" "}
                                                                    <span className={`text-[10px] font-normal ${
                                                                        row.opening_balance_type === "to_receive"
                                                                            ? "text-emerald-600"
                                                                            : "text-rose-600"
                                                                    }`}>
                                                                        ({row.opening_balance_type === "to_receive" ? "Dr" : "Cr"})
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 font-normal">₹0</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.healthStatus === "error" ? (
                                                                <Badge variant="destructive" className="text-[10px]">
                                                                    Syntax Error
                                                                </Badge>
                                                            ) : row.duplicateStatus === "conflict" ? (
                                                                <Badge className="bg-purple-600 text-white hover:bg-purple-600 text-[10px]">
                                                                    Conflict
                                                                </Badge>
                                                            ) : row.duplicateStatus === "duplicate" ? (
                                                                <Badge className="bg-amber-500 text-white hover:bg-amber-500 text-[10px]">
                                                                    Duplicate Match
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px]">
                                                                    Ready (New)
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {row.healthStatus === "error" ? (
                                                                <span className="text-[10px] text-rose-500 font-bold">Exclude</span>
                                                            ) : (
                                                                <select
                                                                    value={row.resolutionAction}
                                                                    onChange={(e) =>
                                                                        handleToggleRowAction(
                                                                            row.rowNumber,
                                                                            e.target.value as RowResolutionAction
                                                                        )
                                                                    }
                                                                    className="h-6 text-[10px] font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1"
                                                                >
                                                                    <option value="create_new">Create New</option>
                                                                    {row.matchedPartyId && <option value="merge">Merge</option>}
                                                                    <option value="skip">Skip</option>
                                                                </select>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Transition to Confirmation */}
                            <div className="flex items-center justify-between pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStep("map")}
                                    className="text-xs rounded-xl"
                                >
                                    &larr; Back to Column Mapping
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setStep("confirm")}
                                    disabled={plannedActions.toCreate === 0 && plannedActions.toMerge === 0}
                                    className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl gap-1.5"
                                >
                                    Review & Confirm Batch Import &rarr;
                                </Button>
                            </div>

                        </div>
                    )}

                    {/* ─── STAGE 4: CONFIRMATION BARRIER ───────────────────────────────── */}
                    {mode === "import" && step === "confirm" && (
                        <div className="space-y-4 py-2">
                            <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-foreground">
                                            Ready to Save to Directory
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Here is a summary of what will be added or updated in your directory:
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">New Parties</p>
                                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                                            +{plannedActions.toCreate}
                                        </p>
                                        <p className="text-[10px] text-emerald-600/80 mt-0.5">Will be created</p>
                                    </div>

                                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase">Existing Parties</p>
                                        <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5">
                                            ~{plannedActions.toMerge}
                                        </p>
                                        <p className="text-[10px] text-blue-600/80 mt-0.5">Will be merged</p>
                                    </div>

                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Skipped Rows</p>
                                        <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">
                                            {plannedActions.toSkip}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Ignored duplicates</p>
                                    </div>

                                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl">
                                        <p className="text-[10px] font-bold text-rose-600 uppercase">Excluded Errors</p>
                                        <p className="text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5">
                                            {plannedActions.excludedErrors}
                                        </p>
                                        <p className="text-[10px] text-rose-600/80 mt-0.5">Will not be imported</p>
                                    </div>
                                </div>

                                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Safe & Protected:</strong> Only clean, verified records will be added to your directory. Existing party data is kept safe, and invalid error rows will not be saved.
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStep("validate_preview")}
                                    className="text-xs rounded-xl"
                                >
                                    &larr; Back to Adjustments
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleStartImport}
                                    className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl gap-1.5 px-5"
                                >
                                    <Check className="w-4 h-4" />
                                    Confirm & Execute Import
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ─── STAGE 5: IMPORTING PROGRESS BAR ─────────────────────────────── */}
                    {mode === "import" && step === "importing" && (
                        <div className="space-y-4 py-8 max-w-md mx-auto text-center">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-foreground">
                                    Importing Parties to Directory...
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Writing records safely to offline storage and queuing cloud synchronization.
                                </p>
                            </div>

                            <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span>Progress</span>
                                    <span>
                                        {currentImportIndex} / {parsedRows.filter((r) => r.healthStatus !== "error").length} (
                                        {Math.round(
                                            (currentImportIndex /
                                                Math.max(1, parsedRows.filter((r) => r.healthStatus !== "error").length)) *
                                                100
                                        )}
                                        %)
                                    </span>
                                </div>
                                <Progress
                                    value={
                                        (currentImportIndex /
                                            Math.max(1, parsedRows.filter((r) => r.healthStatus !== "error").length)) *
                                        100
                                    }
                                    className="h-2.5"
                                />
                            </div>
                        </div>
                    )}

                    {/* ─── STAGE 6: COMPLETE SCREEN ─────────────────────────────────────── */}
                    {mode === "import" && step === "complete" && (
                        <div className="space-y-5 py-6 max-w-lg mx-auto text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-foreground">
                                    Import Completed Successfully!
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your party master directory and accounting ledgers have been updated.
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Created</p>
                                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                                        {importResults.created}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase">Merged</p>
                                    <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5">
                                        {importResults.updated}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Skipped</p>
                                    <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">
                                        {importResults.skipped}
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handleClose}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 rounded-xl"
                            >
                                Done &bull; View Party Directory
                            </Button>
                        </div>
                    )}

                    {/* ─── MODE 3: EXPORT FLOW ──────────────────────────────────────────── */}
                    {mode === "export" && (
                        <div className="space-y-5 py-2">
                            <div className="bg-slate-50 dark:bg-slate-900 border rounded-2xl p-5 space-y-4">
                                <h4 className="font-bold text-sm text-foreground">Select Party Directory Filter</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {(["all", "customer", "vendor", "both"] as const).map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setExportFilter(opt)}
                                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                                                exportFilter === opt
                                                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                                            }`}
                                        >
                                            <span className="capitalize text-xs font-bold">
                                                {opt === "all" ? "All Parties" : opt === "both" ? "Both (Cust & Vend)" : `${opt}s`}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {opt === "all" 
                                                    ? `${existingParties.length} records`
                                                    : `${existingParties.filter((p) => p.type === opt).length} records`}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3 bg-card flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                                            <FileSpreadsheet className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-sm">Microsoft Excel (.xlsx)</h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Spreadsheet with party names, contacts, GSTIN, opening balances, total billed, paid, and balance due.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleExecuteExportExcel}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 rounded-xl"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Excel
                                    </Button>
                                </div>

                                <div className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3 bg-card flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-sm">Formatted PDF Directory</h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Print-ready clean accounting master directory with business header, party ledgers, and summary totals.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleExecuteExportPDF}
                                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 h-9 rounded-xl"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download PDF
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClose}
                        disabled={isImporting}
                        className="text-xs rounded-xl"
                    >
                        {mode === "select" || step === "complete" ? "Close" : "Cancel"}
                    </Button>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>100% Safe & Verified Import</span>
                    </div>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}
