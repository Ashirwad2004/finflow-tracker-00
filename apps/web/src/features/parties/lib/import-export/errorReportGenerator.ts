import * as XLSX from "xlsx";
import { ParsedPartyRow } from "../../types/partyImportExportTypes";

export function downloadErrorReport(
    parsedRows: ParsedPartyRow[],
    toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void
) {
    try {
        const problematicRows = parsedRows.filter(
            (r) => r.healthStatus === "error" || r.healthStatus === "warning" || r.duplicateStatus === "conflict"
        );

        if (problematicRows.length === 0) {
            toast({
                title: "No Errors Found",
                description: "All records are clean and ready for import!",
            });
            return;
        }

        const exportHeaders = [
            "Excel Row #",
            "Party Name",
            "Party Type",
            "Phone",
            "Email",
            "GSTIN",
            "Address",
            "Opening Balance",
            "Balance Type",
            "Health Status",
            "Failure Reasons & Warnings",
            "Matched Existing Party",
        ];

        const exportData = problematicRows.map((r) => [
            r.rowNumber,
            r.name,
            r.type,
            r.phone,
            r.email,
            r.gst_number,
            r.address,
            r.opening_balance,
            r.opening_balance_type,
            r.healthStatus.toUpperCase(),
            [...r.errors, ...r.warnings, r.duplicateReason || ""].filter(Boolean).join(" | "),
            r.matchedPartyName || "None",
        ]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...exportData]);

        ws["!cols"] = [
            { wch: 12 },
            { wch: 28 },
            { wch: 12 },
            { wch: 16 },
            { wch: 24 },
            { wch: 18 },
            { wch: 30 },
            { wch: 16 },
            { wch: 14 },
            { wch: 14 },
            { wch: 50 },
            { wch: 24 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Errors and Conflicts");
        XLSX.writeFile(wb, `party_import_error_report_${new Date().toISOString().slice(0, 10)}.xlsx`);

        toast({
            title: "Error Report Downloaded",
            description: `Exported ${problematicRows.length} error/warning rows to Excel.`,
        });
    } catch (err) {
        console.error("Failed to export error report:", err);
        toast({
            title: "Download Failed",
            description: "Could not generate the error report Excel sheet.",
            variant: "destructive",
        });
    }
}
