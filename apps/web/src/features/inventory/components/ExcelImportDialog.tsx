import React from "react";
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
import {
    UploadCloud,
    Download,
    FileSpreadsheet,
    Loader2,
    Check,
    X,
    ArrowLeft,
} from "lucide-react";
import {
    ExcelImportDialogProps,
    useExcelImport,
    SelectModeView,
    UploadDropzoneView,
    PreviewTableView,
    ExportModeView,
} from "./excelImport";

export * from "./excelImport/types";

export function ExcelImportDialog({
    open,
    onClose,
    userId,
    existingProducts,
}: ExcelImportDialogProps) {
    const {
        mode,
        setMode,
        isDragActive,
        parsedProducts,
        duplicateAction,
        setDuplicateAction,
        isImporting,
        currentImportIndex,
        fileInputRef,
        totalCount,
        errorCount,
        duplicateCount,
        readyCount,
        resetState,
        handleClose,
        handleDownloadTemplate,
        handleExportProducts,
        handleDrag,
        handleDrop,
        handleFileChange,
        handleImport,
    } = useExcelImport({ userId, existingProducts, onClose });

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b border-slate-100 flex-shrink-0 relative">
                    {mode !== "select" && !isImporting && (
                        <button
                            onClick={() => {
                                if (mode === "import") {
                                    resetState();
                                } else {
                                    setMode("select");
                                }
                            }}
                            className="absolute left-6 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"
                            title="Go back"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <DialogTitle className={`flex items-center gap-2 text-xl font-bold ${mode !== "select" ? "pl-8" : ""}`}>
                        {mode === "select" && (
                            <>
                                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                Import / Export Inventory
                            </>
                        )}
                        {mode === "import" && (
                            <>
                                <UploadCloud className="w-5 h-5 text-emerald-600" />
                                Import Products from Excel
                            </>
                        )}
                        {mode === "export" && (
                            <>
                                <Download className="w-5 h-5 text-blue-600" />
                                Export Products to Excel
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription className={mode !== "select" ? "pl-8" : ""}>
                        {mode === "select" && "Choose an action below to upload bulk product data or download your current inventory."}
                        {mode === "import" && "Upload Excel or CSV spreadsheet to add multiple products to your inventory at once."}
                        {mode === "export" && "Download all products from your current inventory into an Excel spreadsheet."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {mode === "select" && (
                        <SelectModeView onSelectMode={(selectedMode) => setMode(selectedMode)} />
                    )}

                    {mode === "import" && (
                        <>
                            {parsedProducts.length === 0 ? (
                                <UploadDropzoneView
                                    fileInputRef={fileInputRef}
                                    isDragActive={isDragActive}
                                    onDrag={handleDrag}
                                    onDrop={handleDrop}
                                    onFileChange={handleFileChange}
                                    onDownloadTemplate={handleDownloadTemplate}
                                />
                            ) : (
                                <PreviewTableView
                                    parsedProducts={parsedProducts}
                                    duplicateAction={duplicateAction}
                                    onDuplicateActionChange={setDuplicateAction}
                                />
                            )}
                        </>
                    )}

                    {mode === "export" && (
                        <ExportModeView
                            totalProductsCount={existingProducts.length}
                            onExportProducts={handleExportProducts}
                        />
                    )}
                </div>

                {/* Footer Controls */}
                <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 flex items-center justify-between gap-4 w-full">
                    {mode === "select" ? (
                        <div className="flex justify-end w-full">
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Close
                            </Button>
                        </div>
                    ) : (
                        <>
                            {mode === "import" && parsedProducts.length > 0 && !isImporting ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={resetState}
                                    className="text-slate-500 hover:text-slate-700 mr-auto gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Clear File
                                </Button>
                            ) : (
                                !isImporting && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            if (mode === "import") {
                                                resetState();
                                            } else {
                                                setMode("select");
                                            }
                                        }}
                                        className="text-slate-500 hover:text-slate-700 mr-auto gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </Button>
                                )
                            )}

                            {/* Progress Bar (during import execution) */}
                            {mode === "import" && isImporting && (
                                <div className="flex-1 flex flex-col gap-1.5 mr-4">
                                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                                        <span>Importing products...</span>
                                        <span>{currentImportIndex} of {totalCount}</span>
                                    </div>
                                    <Progress value={(currentImportIndex / totalCount) * 100} className="h-2" />
                                </div>
                            )}

                            <div className="flex gap-2 ml-auto">
                                <Button type="button" variant="outline" onClick={handleClose} disabled={isImporting}>
                                    Cancel
                                </Button>
                                {mode === "import" && parsedProducts.length > 0 && (
                                    <Button
                                        type="button"
                                        onClick={handleImport}
                                        disabled={isImporting || errorCount > 0}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md shadow-emerald-600/10"
                                    >
                                        {isImporting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Start Import ({readyCount + (duplicateAction === "update" ? duplicateCount : 0)} items)
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ExcelImportDialog;
