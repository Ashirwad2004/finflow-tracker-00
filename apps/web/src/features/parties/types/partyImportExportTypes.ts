import { PartyMetrics } from "@/utils/exportParties";
import { Party } from "../types";

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

export interface PartyImportExportDialogProps {
    open: boolean;
    onClose: () => void;
    userId: string;
    existingParties: Party[];
    partyLedgerMap?: Map<string, PartyMetrics>;
    profile?: any;
}
