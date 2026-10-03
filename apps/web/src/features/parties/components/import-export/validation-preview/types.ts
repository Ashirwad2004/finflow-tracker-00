import {
    ParsedPartyRow,
    RowResolutionAction,
} from "../../types/partyImportExportTypes";

export interface ImportStats {
    total: number;
    ready: number;
    duplicates: number;
    conflicts: number;
    errors: number;
    warnings: number;
    needsAttention: number;
    customers: number;
    vendors: number;
    both: number;
}

export interface PlannedActions {
    toCreate: number;
    toMerge: number;
    toSkip: number;
    excludedErrors: number;
}

export interface ImportValidationPreviewSectionProps {
    stats: ImportStats;
    parsedRows: ParsedPartyRow[];
    visibleRows: ParsedPartyRow[];
    previewFilter: "all" | "ready" | "duplicates" | "conflicts" | "errors";
    setPreviewFilter: (filter: "all" | "ready" | "duplicates" | "conflicts" | "errors") => void;
    globalDuplicateAction: RowResolutionAction;
    handleApplyGlobalDuplicateAction: (action: "merge" | "skip" | "create_new") => void;
    handleToggleRowAction: (rowNumber: number, action: RowResolutionAction) => void;
    handleDownloadErrorReport: () => void;
    onBackToMap: () => void;
    onProceedToConfirm: () => void;
    plannedActions: PlannedActions;
}
