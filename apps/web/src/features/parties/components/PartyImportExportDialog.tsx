import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers } from "lucide-react";
import { PartyImportExportDialogProps } from "../types/partyImportExportTypes";
import {
    usePartyImportExport,
    PartySelectModeSection,
    ImportUploadSection,
    ImportMapColumnsSection,
    ImportValidationPreviewSection,
    ImportConfirmSection,
    ImportProgressSection,
    ImportCompleteSection,
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
    const {
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
        handleClose,
        handleBack,
        handleDownloadTemplate,
        handleDrag,
        handleDrop,
        handleFileChange,
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
    } = usePartyImportExport({
        userId,
        existingParties,
        partyLedgerMap,
        profile,
        onClose,
    });

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
                        <PartySelectModeSection
                            onSelectImport={() => {
                                setMode("import");
                                setStep("upload");
                            }}
                            onSelectExport={() => setMode("export")}
                            onDownloadTemplate={handleDownloadTemplate}
                            existingPartiesCount={existingParties.length}
                        />
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
                        <ImportProgressSection
                            currentImportIndex={currentImportIndex}
                            totalCount={parsedRows.filter((r) => r.healthStatus !== "error").length}
                        />
                    )}

                    {/* ─── STAGE 6: COMPLETE SCREEN ─────────────────────────────────────── */}
                    {mode === "import" && step === "complete" && (
                        <ImportCompleteSection
                            importResults={importResults}
                            onDone={handleClose}
                        />
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
                        {mode !== "select" && step !== "complete" && step !== "importing" && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBack}
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
