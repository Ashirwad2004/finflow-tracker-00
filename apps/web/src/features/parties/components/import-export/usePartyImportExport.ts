import { useState, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/core/hooks/use-toast";
import { BusinessDetailsInfo } from "@/utils/exportParties";
import {
  ImportStep,
  ColumnMapping,
  RowResolutionAction,
  ParsedPartyRow,
  PartyImportExportDialogProps,
} from "../../types/partyImportExportTypes";
import {
  downloadSampleExcelTemplate,
  validateAndParseRows,
  downloadErrorReport,
} from "../../lib/partyImportExportUtils";
import { calculateImportStats, calculatePlannedActions } from "./partyStatsUtils";
import { parsePartySpreadsheet } from "./partyFileParser";
import { executePartyImport } from "./partyImportExecutor";
import {
  formatBusinessDetails,
  filterPartiesForExport,
  performExcelExport,
  performPdfExport,
} from "./partyExportHelpers";

export * from "./partyStatsUtils";
export * from "./partyFileParser";
export * from "./partyImportExecutor";
export * from "./partyExportHelpers";

export interface UsePartyImportExportOptions
  extends Pick<
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
      const { headers, rows, mapping: guessedMapping } = await parsePartySpreadsheet(uploadedFile);

      setFile(uploadedFile);
      setRawHeaders(headers);
      setRawRows(rows);
      setMapping(guessedMapping);
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

  // ─── STAGE 3: VALIDATION & DUPLICATE DETECTION ─────────────────────────────
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

    const results = await executePartyImport({
      userId,
      existingParties,
      parsedRows,
      queryClient,
      onProgress: setCurrentImportIndex,
    });

    const importableRowsCount = parsedRows.filter((r) => r.healthStatus !== "error").length;
    setImportResults(results);
    setIsImporting(false);
    setStep("complete");

    toast({
      title: "Party Import Completed!",
      description: `Successfully processed ${importableRowsCount} rows (${results.created} created, ${results.updated} merged, ${results.skipped} skipped).`,
    });
  };

  // ─── STAGE 7: DIRECTORY EXPORTS ─────────────────────────────────────────────
  const filteredExportParties = useMemo(
    () => filterPartiesForExport(existingParties, exportFilter),
    [existingParties, exportFilter]
  );

  const businessDetails: BusinessDetailsInfo = useMemo(
    () => formatBusinessDetails(profile),
    [profile]
  );

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
      performExcelExport(
        filteredExportParties,
        partyLedgerMap || new Map(),
        businessDetails,
        exportFilter
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
      performPdfExport(
        filteredExportParties,
        partyLedgerMap || new Map(),
        businessDetails,
        exportFilter
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
  const stats = useMemo(() => calculateImportStats(parsedRows), [parsedRows]);

  const visibleRows = useMemo(() => {
    if (previewFilter === "ready") return parsedRows.filter((r) => r.healthStatus === "ready");
    if (previewFilter === "duplicates") return parsedRows.filter((r) => r.duplicateStatus === "duplicate");
    if (previewFilter === "conflicts") return parsedRows.filter((r) => r.duplicateStatus === "conflict");
    if (previewFilter === "errors") return parsedRows.filter((r) => r.healthStatus === "error");
    return parsedRows;
  }, [parsedRows, previewFilter]);

  const plannedActions = useMemo(() => calculatePlannedActions(parsedRows), [parsedRows]);

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
    setMode,
    setStep,
    setFile,
    setMapping,
    setPreviewFilter,
    setExportFilter,
    resetState,
    handleClose,
    handleBack,
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
    stats,
    visibleRows,
    plannedActions,
    filteredExportParties,
    businessDetails,
  };
}
