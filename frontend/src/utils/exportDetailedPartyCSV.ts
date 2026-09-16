import { format } from "date-fns";
import { LedgerTransaction } from "@/features/business/components/DetailedPartyReport";

const parseSafeDate = (d: any): Date => {
    if (!d) return new Date();
    if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
    if (typeof d === 'string') {
        const s = d.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, day] = s.split('-').map(Number);
            return new Date(y, m - 1, day, 12, 0, 0);
        }
        if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
            const [day, m, y] = s.split(/[-/]/).map(Number);
            return new Date(y, m - 1, day, 12, 0, 0);
        }
    }
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date() : dt;
};

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
                format(parseSafeDate(tx.date), "yyyy-MM-dd"), // Date
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
