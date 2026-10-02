import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/core/hooks/use-toast";
import { offlineMutate } from "@/core/offline/apiService";
import {
    exportPartiesToExcel,
    exportPartiesToPDF,
    BusinessDetailsInfo,
} from "@/utils/exportParties";
import { Party } from "../types";
import {
    ImportStep,
    ColumnMapping,
    RowResolutionAction,
    ParsedPartyRow,
    PartyImportExportDialogProps,
} from "../types/partyImportExportTypes";
import {
    downloadSampleExcelTemplate,
    guessColumnMapping,
    validateAndParseRows,
    downloadErrorReport,
} from "../lib/partyImportExportUtils";

export interface UsePartyImportExportOptions extends Pick<
    PartyImportExportDialogProps,
    "userId" | "existingParties" | "partyLedgerMap" | "profile" | "onClose"
> {}

export function usePartyImportExport({
    userId,
    existingParties,
    partyLedgerMap,
    profile,
    onClose,
}: UsePartyImportExportOptions) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
    const [mode, setMode] = useState<"select" | "import" | "export">("select");
    const [step, setStep] = useState<ImportStep>("upload");

    // Stage 1: File & Parsing
    const [file, setFile] = useState<File | null>(null);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[][]>([]);
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Stage 2: Column Mapping
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

    // Stage 3 & 4: Validation, Duplicates & Staging
    const [parsedRows, setParsedRows] = useState<ParsedPartyRow[]>([]);
    const [previewFilter, setPreviewFilter] = useState<"all" | "ready" | "duplicates" | "conflicts" | "errors">("all");
    const [globalDuplicateAction, setGlobalDuplicateAction] = useState<RowResolutionAction>("merge");

    // Stage 5 & 6: Execution Progress & Summary
    const [isImporting, setIsImporting] = useState(false);
    const [currentImportIndex, setCurrentImportIndex] = useState(0);
    const [importResults, setImportResults] = useState<{
        created: number;
        updated: number;
        skipped: number;
        failed: number;
    }>({ created: 0, updated: 0, skipped: 0, failed: 0 });

    // Mode 3: Export Options
    const [exportFilter, setExportFilter] = useState<"all" | "customer" | "vendor" | "both">("all");

    // ─── RESET ALL STATES ────────────────────────────────────────────────────────
    const resetState = () => {
        setMode("select");
        setStep("upload");
        setFile(null);
        setRawHeaders([]);
        setRawRows([]);
        setIsDragActive(false);
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
        setExportFilter("all");
    };

    const handleClose = () => {
        if (isImporting) return;
        resetState();
        onClose();
    };

    // ─── 1. DOWNLOAD SAMPLE EXCEL TEMPLATE ───────────────────────────────────────
    const handleDownloadTemplate = () => {
        downloadSampleExcelTemplate(toast);
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
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (uploadedFile: File) => {
        const ext = uploadedFile.name.split(".").pop()?.toLowerCase();
        if (!["xlsx", "xls", "csv"].includes(ext || "")) {
            toast({
                title: "Unsupported File Format",
                description: "Please upload an Excel spreadsheet (.xlsx, .xls) or a CSV file (.csv).",
                variant: "destructive",
            });
            return;
        }

        try {
            const data = await uploadedFile.arrayBuffer();
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
                toast({
                    title: "Empty Spreadsheet",
                    description: "Your file must contain a header row and at least one party record.",
                    variant: "destructive",
                });
                return;
            }

            const headers = jsonData[0].map((h: any) => String(h || "").trim());
            const rows = jsonData.slice(1).filter((r: any[]) => r.some((c) => c !== null && c !== undefined && c !== ""));

            setFile(uploadedFile);
            setRawHeaders(headers);
            setRawRows(rows);

            // Auto-detect & match columns intelligently
            const guessed = guessColumnMapping(headers);
            setMapping(guessed);

            setStep("map");
            toast({
                title: "Spreadsheet Uploaded",
                description: `Found ${rows.length} records. Please verify the detected column mappings.`,
            });
        } catch (error: any) {
            console.error("Failed to parse party spreadsheet:", error);
            toast({
                title: "File Reading Error",
                description: error.message || "Failed to read data from the uploaded file.",
                variant: "destructive",
            });
        }
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

        const parsed = validateAndParseRows(
            rawRows,
            rawHeaders,
            mapping,
            existingParties,
            globalDuplicateAction
        );

        setParsedRows(parsed);
        setStep("validate_preview");
    };

    // ─── STAGE 4: DOWNLOAD ERROR & CONFLICT REPORT ─────────────────────────────
    const handleDownloadErrorReport = () => {
        downloadErrorReport(parsedRows, toast);
    };

    // ─── STAGE 5: BATCH RESOLUTION STRATEGY APPLICATION ─────────────────────────
    const handleApplyGlobalDuplicateAction = (action: RowResolutionAction) => {
        setGlobalDuplicateAction(action);
        setParsedRows((prev) =>
            prev.map((r) => {
                if (r.duplicateStatus === "duplicate") {
                    return { ...r, resolutionAction: action };
                }
                return r;
            })
        );
        toast({
            title: "Strategy Applied",
            description: `Applied '${action.replace("_", " ")}' action to all duplicate party matches.`,
        });
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
        const ready = parsedRows.filter((r) => r.healthStatus === "ready" && r.duplicateStatus === "new").length;
        const duplicates = parsedRows.filter((r) => r.duplicateStatus === "duplicate").length;
        const conflicts = parsedRows.filter((r) => r.duplicateStatus === "conflict").length;
        const errors = parsedRows.filter((r) => r.healthStatus === "error").length;
        const warnings = parsedRows.filter((r) => r.healthStatus === "warning").length;
        const needsAttention = duplicates + conflicts + errors + warnings;

        const customers = parsedRows.filter((r) => r.type === "customer").length;
        const vendors = parsedRows.filter((r) => r.type === "vendor").length;
        const both = parsedRows.filter((r) => r.type === "both").length;

        return {
            total,
            ready,
            duplicates,
            conflicts,
            errors,
            warnings,
            needsAttention,
            customers,
            vendors,
            both,
        };
    }, [parsedRows]);

    const visibleRows = useMemo(() => {
        if (previewFilter === "ready") return parsedRows.filter((r) => r.healthStatus === "ready");
        if (previewFilter === "duplicates") return parsedRows.filter((r) => r.duplicateStatus === "duplicate");
        if (previewFilter === "conflicts") return parsedRows.filter((r) => r.duplicateStatus === "conflict");
        if (previewFilter === "errors") return parsedRows.filter((r) => r.healthStatus === "error");
        return parsedRows;
    }, [parsedRows, previewFilter]);

    const plannedActions = useMemo(() => {
        let toCreate = 0;
        let toMerge = 0;
        let toSkip = 0;
        let excludedErrors = 0;

        parsedRows.forEach((r) => {
            if (r.healthStatus === "error") {
                excludedErrors++;
            } else if (r.resolutionAction === "skip") {
                toSkip++;
            } else if (r.resolutionAction === "merge") {
                toMerge++;
            } else {
                toCreate++;
            }
        });

        return { toCreate, toMerge, toSkip, excludedErrors };
    }, [parsedRows]);

    const handleBack = () => {
        if (step === "map") {
            setStep("upload");
            setFile(null);
        } else if (step === "validate_preview") {
            setStep("map");
        } else if (step === "confirm") {
            setStep("validate_preview");
        } else {
            setMode("select");
        }
    };

    return {
        // State
        mode,
        step,
        file,
        rawHeaders,
        rawRows,
        isDragActive,
        fileInputRef,
        mapping,
        parsedRows,
        previewFilter,
        globalDuplicateAction,
        isImporting,
        currentImportIndex,
        importResults,
        exportFilter,
        // Setters
        setMode,
        setStep,
        setFile,
        setMapping,
        setPreviewFilter,
        setExportFilter,
        resetState,
        handleClose,
        handleBack,
        // Handlers
        handleDownloadTemplate,
        handleDrag,
        handleDrop,
        handleFileChange,
        handleFileUpload,
        executeValidationAndDuplicateDetection,
        handleDownloadErrorReport,
        handleApplyGlobalDuplicateAction,
        handleToggleRowAction,
        handleStartImport,
        handleExecuteExportExcel,
        handleExecuteExportPDF,
        // Computed
        stats,
        visibleRows,
        plannedActions,
        filteredExportParties,
        businessDetails,
    };
}
