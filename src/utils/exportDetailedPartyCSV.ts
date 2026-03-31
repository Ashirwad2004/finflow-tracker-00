import { format } from "date-fns";
import { LedgerTransaction } from "@/features/business/components/DetailedPartyReport";

export const exportDetailedPartyCSV = (
    data: LedgerTransaction[],
    partyName: string
) => {
    if (!data || data.length === 0) {
        alert("No ledger data to export.");
        return;
    }

    // Define Headers
    const headers = [
        "Date",
        "Type",
        "Reference",
        "Credit (Sales)",
        "Debit (Purchases)",
        "Running Balance"
    ];

    // Process Data
    const csvContent = [
        headers.join(","), // Header Row
        ...data.map(tx => {
            const row = [
                format(new Date(tx.date), "yyyy-MM-dd"), // Date
                tx.type, // Type (sale/purchase)
                `"${(tx.ref || "").replace(/"/g, '""')}"`, // Ref
                tx.type === 'sale' ? tx.amount : 0, // Credit
                tx.type === 'purchase' ? tx.amount : 0, // Debit
                tx.runningBalance || 0 // Balance
            ];
            return row.join(",");
        })
    ].join("\n");

    // Create Blob and Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const sanitizedFileNameName = (partyName || "unknown").replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute("download", `ledger_${sanitizedFileNameName}_${format(new Date(), "yyyyMMdd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
