import * as XLSX from "xlsx";
import { format } from "date-fns";
import { LedgerTransaction } from "@/features/business/components/DetailedPartyReport";

const parseSafeDate = (d: any): Date => {
    if (!d) return new Date();
    if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
    if (typeof d === "string") {
        const s = d.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, day] = s.split("-").map(Number);
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

const getVoucherTypeLabel = (type: string): string => {
    switch (type) {
        case 'sale': return 'Sales Invoice';
        case 'purchase': return 'Purchase Bill';
        case 'payment_received': return 'Payment In';
        case 'payment_made': return 'Payment Out';
        case 'credit_note': return 'Credit Note';
        case 'debit_note': return 'Debit Note';
        case 'opening_balance': return 'Opening Balance';
        default: return type.replace(/_/g, ' ');
    }
};

export const exportDetailedPartyCSV = (
    data: LedgerTransaction[],
    partyName: string,
    dateRange?: { from?: Date; to?: Date },
    businessDetails?: { name?: string; address?: string; phone?: string; gst?: string }
) => {
    if (!data || data.length === 0) {
        alert("No ledger data to export.");
        return;
    }

    const titleRow = [`PARTY LEDGER STATEMENT - ${(partyName || "Party").toUpperCase()}`];
    const bizRow = [
        businessDetails?.name
            ? `${businessDetails.name} ${businessDetails.phone ? `| Ph: ${businessDetails.phone}` : ""} ${
                  businessDetails.gst ? `| GSTIN: ${businessDetails.gst}` : ""
              }`
            : "FinFlow Business Ledger",
    ];

    let rangeStr = "All Time (Complete History)";
    if (dateRange?.from && dateRange?.to) {
        rangeStr = `${format(dateRange.from, "dd MMM yyyy")} to ${format(dateRange.to, "dd MMM yyyy")}`;
    } else if (dateRange?.from) {
        rangeStr = `Since ${format(dateRange.from, "dd MMM yyyy")}`;
    } else if (dateRange?.to) {
        rangeStr = `Up to ${format(dateRange.to, "dd MMM yyyy")}`;
    }
    const dateRow = [`Period: ${rangeStr} | Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`];
    const emptyRow: any[] = [];

    // Define Headers
    const headers = [
        "Date",
        "Particulars / Voucher Reference",
        "Voucher Type",
        "Debit (Dr) (₹)",
        "Credit (Cr) (₹)",
        "Running Balance (₹)",
        "Dr / Cr",
        "Status",
    ];

    let totalDebit = 0;
    let totalCredit = 0;

    // Process Data
    const dataRows = data.map((tx) => {
        const debit = Number(tx.debit || 0);
        const credit = Number(tx.credit || 0);
        totalDebit += debit;
        totalCredit += credit;

        const bal = tx.runningBalance;
        const balSuffix = bal > 0 ? "Dr" : bal < 0 ? "Cr" : "Nil";

        return [
            format(parseSafeDate(tx.date), "dd/MM/yyyy"),
            tx.ref || "-",
            getVoucherTypeLabel(tx.type),
            debit > 0 ? debit : 0,
            credit > 0 ? credit : 0,
            Math.abs(bal),
            balSuffix,
            (tx.status || "settled").toUpperCase(),
        ];
    });

    const finalBalance = data[data.length - 1]?.runningBalance ?? (totalDebit - totalCredit);
    const totalsRow = [
        "TOTAL",
        "Closing Position",
        "",
        totalDebit,
        totalCredit,
        Math.abs(finalBalance),
        finalBalance > 0 ? "Dr (Receivable)" : finalBalance < 0 ? "Cr (Payable)" : "Nil (Settled)",
        "",
    ];

    const wsData = [
        titleRow,
        bizRow,
        dateRow,
        emptyRow,
        headers,
        ...dataRows,
        emptyRow,
        totalsRow,
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
        { wch: 14 }, // Date
        { wch: 38 }, // Particulars
        { wch: 18 }, // Type
        { wch: 18 }, // Debit
        { wch: 18 }, // Credit
        { wch: 20 }, // Running Balance
        { wch: 16 }, // Dr / Cr
        { wch: 14 }, // Status
    ];

    const sanitizedFileName = (partyName || "Party").replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `ledger_${sanitizedFileName}_${format(new Date(), "yyyyMMdd")}.xlsx`);
};
