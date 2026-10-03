import React from "react";
import { Button } from "@/components/ui/button";
import { ImportValidationPreviewSectionProps } from "./types";
import { ImportStatsDashboard } from "./ImportStatsDashboard";
import { ImportErrorLedger } from "./ImportErrorLedger";
import { ImportDuplicateStrategySelector } from "./ImportDuplicateStrategySelector";
import { ImportPreviewTable } from "./ImportPreviewTable";

export * from "./types";
export { ImportStatsDashboard } from "./ImportStatsDashboard";
export { ImportErrorLedger } from "./ImportErrorLedger";
export { ImportDuplicateStrategySelector } from "./ImportDuplicateStrategySelector";
export { ImportPreviewTable } from "./ImportPreviewTable";

export const ImportValidationPreviewSection: React.FC<ImportValidationPreviewSectionProps> = ({
    stats,
    parsedRows,
    visibleRows,
    previewFilter,
    setPreviewFilter,
    globalDuplicateAction,
    handleApplyGlobalDuplicateAction,
    handleToggleRowAction,
    handleDownloadErrorReport,
    onBackToMap,
    onProceedToConfirm,
    plannedActions,
}) => {
    return (
        <div className="space-y-4">
            {/* Summary Dashboard */}
            <ImportStatsDashboard stats={stats} />

            {/* Detailed Error & Attention Ledger Box */}
            <ImportErrorLedger
                stats={stats}
                parsedRows={parsedRows}
                onDownloadErrorReport={handleDownloadErrorReport}
            />

            {/* Duplicate Resolution Strategy Selector */}
            <ImportDuplicateStrategySelector
                stats={stats}
                globalDuplicateAction={globalDuplicateAction}
                onApplyGlobalDuplicateAction={handleApplyGlobalDuplicateAction}
            />

            {/* Filter Tabs & Preview Table */}
            <ImportPreviewTable
                stats={stats}
                visibleRows={visibleRows}
                previewFilter={previewFilter}
                onSetPreviewFilter={setPreviewFilter}
                onToggleRowAction={handleToggleRowAction}
            />

            {/* Transition to Confirmation */}
            <div className="flex items-center justify-between pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBackToMap}
                    className="text-xs rounded-xl"
                >
                    &larr; Back to Column Mapping
                </Button>
                <Button
                    size="sm"
                    onClick={onProceedToConfirm}
                    disabled={plannedActions.toCreate === 0 && plannedActions.toMerge === 0}
                    className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl gap-1.5"
                >
                    Review & Confirm Batch Import &rarr;
                </Button>
            </div>
        </div>
    );
};
