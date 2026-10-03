import { v4 as uuidv4 } from "uuid";
import { QueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { Party } from "../../types";
import { ParsedPartyRow } from "../../types/partyImportExportTypes";

export interface ImportExecutorParams {
  userId: string;
  existingParties: Party[];
  parsedRows: ParsedPartyRow[];
  queryClient: QueryClient;
  onProgress: (current: number) => void;
}

export interface ImportResults {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export async function executePartyImport({
  userId,
  existingParties,
  parsedRows,
  queryClient,
  onProgress,
}: ImportExecutorParams): Promise<ImportResults> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const importableRows = parsedRows.filter((r) => r.healthStatus !== "error");
  const now = new Date().toISOString();

  for (let i = 0; i < importableRows.length; i++) {
    const row = importableRows[i];
    onProgress(i + 1);

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
              row.opening_balance !== undefined ? row.opening_balance : existing.opening_balance || 0,
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

  return { created, updated, skipped, failed };
}
