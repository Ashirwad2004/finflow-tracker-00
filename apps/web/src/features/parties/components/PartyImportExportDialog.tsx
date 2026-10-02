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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/core/hooks/use-toast";
import { offlineMutate } from "@/core/offline/apiService";
import {
    UploadCloud,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    ArrowRight,
    ShieldCheck,
    Layers,
} from "lucide-react";
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
import {
    ImportUploadSection,
    ImportMapColumnsSection,
    ImportValidationPreviewSection,
    ImportConfirmSection,
    ExportPartiesSection,
} from "./import-export";

export * from "../types/partyImportExportTypes";

export function PartyImportExportDialog({
    open,
    onClose,
    userId,
    existingParties,
    partyLedgerMap,
    profile,
}: PartyImportExportDialogProps) {
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

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
                {/* Header */}
                <DialogHeader className="p-6 border-b border-border bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                    {mode === "select" && "Party Data Management Hub"}
                                    {mode === "export" && "Export Party Master Directory"}
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
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground">
                                {mode === "select" && "Easily import your customer/vendor list or export clean accounting books."}
                                {mode === "export" && "Generate downloadable Excel spreadsheets or formatted PDF ledger directories."}
                                {mode === "import" && (
                                    <>
                                        {step === "upload" && "Select an Excel (.xlsx, .xls) or CSV file. You can review all records before importing."}
                                        {step === "map" && "Match your spreadsheet columns with party details like Name, Phone, and GSTIN."}
                                        {step === "validate_preview" && "Preview your records, review duplicate matches, and resolve any conflicts."}
                                        {step === "confirm" && "Check the summary below before adding these parties to your directory."}
                                        {step === "importing" && "Saving your verified party records..."}
                                        {step === "complete" && "Your customer and vendor directory has been updated."}
                                    </>
                                )}
                            </DialogDescription>
                        </div>

                        {mode === "import" && step !== "importing" && step !== "complete" && (
                            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold">
                                <span className={`px-2 py-0.5 rounded-lg ${step === "upload" ? "bg-primary text-white shadow-xs" : "text-muted-foreground"}`}>
                                    1. Upload
                                </span>
                                <span className="text-slate-300">&bull;</span>
                                <span className={`px-2 py-0.5 rounded-lg ${step === "map" ? "bg-primary text-white shadow-xs" : "text-muted-foreground"}`}>
                                    2. Map
                                </span>
                                <span className="text-slate-300">&bull;</span>
                                <span className={`px-2 py-0.5 rounded-lg ${step === "validate_preview" ? "bg-primary text-white shadow-xs" : "text-muted-foreground"}`}>
                                    3. Preview
                                </span>
                                <span className="text-slate-300">&bull;</span>
                                <span className={`px-2 py-0.5 rounded-lg ${step === "confirm" ? "bg-primary text-white shadow-xs" : "text-muted-foreground"}`}>
                                    4. Confirm
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
                        <ImportUploadSection
                            isDragActive={isDragActive}
                            fileInputRef={fileInputRef}
                            handleDrag={handleDrag}
                            handleDrop={handleDrop}
                            handleFileChange={handleFileChange}
                            handleDownloadTemplate={handleDownloadTemplate}
                        />
                    )}

                    {/* ─── STAGE 2: MAP COLUMNS SCREEN ─────────────────────────────────── */}
                    {mode === "import" && step === "map" && (
                        <ImportMapColumnsSection
                            file={file}
                            rawRows={rawRows}
                            rawHeaders={rawHeaders}
                            mapping={mapping}
                            setMapping={setMapping}
                            onBackToUpload={() => {
                                setStep("upload");
                                setFile(null);
                            }}
                            onConfirmMapping={executeValidationAndDuplicateDetection}
                        />
                    )}

                    {/* ─── STAGE 3: VALIDATION & DUPLICATE PREVIEW SCREEN ───────────────── */}
                    {mode === "import" && step === "validate_preview" && (
                        <ImportValidationPreviewSection
                            stats={stats}
                            parsedRows={parsedRows}
                            visibleRows={visibleRows}
                            previewFilter={previewFilter}
                            setPreviewFilter={setPreviewFilter}
                            globalDuplicateAction={globalDuplicateAction}
                            handleApplyGlobalDuplicateAction={handleApplyGlobalDuplicateAction}
                            handleToggleRowAction={handleToggleRowAction}
                            handleDownloadErrorReport={handleDownloadErrorReport}
                            onBackToMap={() => setStep("map")}
                            onProceedToConfirm={() => setStep("confirm")}
                            plannedActions={plannedActions}
                        />
                    )}

                    {/* ─── STAGE 4: CONFIRMATION BARRIER ───────────────────────────────── */}
                    {mode === "import" && step === "confirm" && (
                        <ImportConfirmSection
                            plannedActions={plannedActions}
                            onBackToPreview={() => setStep("validate_preview")}
                            onExecuteImport={handleStartImport}
                        />
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
                        <ExportPartiesSection
                            existingParties={existingParties}
                            exportFilter={exportFilter}
                            setExportFilter={setExportFilter}
                            handleExecuteExportExcel={handleExecuteExportExcel}
                            handleExecuteExportPDF={handleExecuteExportPDF}
                        />
                    )}
                </div>

                {/* Footer Controls */}
                <DialogFooter className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between sm:justify-between flex-shrink-0">
                    <div>
                        {(mode !== "select" && step !== "complete" && step !== "importing") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
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
                                }}
                                className="text-xs gap-1 font-semibold"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClose}
                            disabled={isImporting}
                            className="text-xs"
                        >
                            {mode === "select" || step === "complete" ? "Close" : "Cancel"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default PartyImportExportDialog;
