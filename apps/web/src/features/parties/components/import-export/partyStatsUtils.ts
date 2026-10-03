import { ParsedPartyRow } from "../../types/partyImportExportTypes";

export interface PartyImportStats {
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

export interface PartyPlannedActions {
  toCreate: number;
  toMerge: number;
  toSkip: number;
  excludedErrors: number;
}

export function calculateImportStats(parsedRows: ParsedPartyRow[]): PartyImportStats {
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
}

export function calculatePlannedActions(parsedRows: ParsedPartyRow[]): PartyPlannedActions {
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
}
