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
            : "FinFlow Business Tracker",
    ];

    let rangeStr = "All Time";
    if (dateRange?.from && dateRange?.to) {
        rangeStr = `${format(dateRange.from, "dd MMM yyyy")} to ${format(dateRange.to, "dd MMM yyyy")}`;
    } else if (dateRange?.from) {
        rangeStr = `Since ${format(dateRange.from, "dd MMM yyyy")}`;
    }
    const dateRow = [`Period: ${rangeStr} | Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`];
    const emptyRow: any[] = [];

    // Define Headers
    const headers = [
        "Date",
        "Transaction Type",
        "Invoice / Voucher Ref",
        "Debit / Receivable (₹)",
        "Credit / Payable (₹)",
        "Running Balance (₹)",
        "Status",
    ];

    let totalDebit = 0;
    let totalCredit = 0;

    // Process Data
    const dataRows = data.map((tx) => {
        const debit = tx.debit != null ? tx.debit : tx.type === "sale" ? tx.amount : 0;
        const credit = tx.credit != null ? tx.credit : tx.type === "purchase" ? tx.amount : 0;
        totalDebit += debit;
        totalCredit += credit;

        let typeLabel = "Sale Invoice";
        if (tx.type === "purchase") typeLabel = "Purchase Bill";
        else if (tx.type === "payment_received") typeLabel = "Payment Received";
        else if (tx.type === "payment_made") typeLabel = "Payment Made";

        return [
            format(parseSafeDate(tx.date), "dd/MM/yyyy"),
            typeLabel,
            tx.ref || "-",
            debit,
            credit,
            tx.runningBalance || 0,
            (tx.status || "settled").toUpperCase(),
        ];
    });

    const netClosing = totalDebit - totalCredit;
    const totalsRow = [
        "TOTAL",
        "",
        "",
        totalDebit,
        totalCredit,
        netClosing,
        netClosing > 0 ? "Net Dr (Receivable)" : netClosing < 0 ? "Net Cr (Payable)" : "Settled",
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
        { wch: 20 }, // Transaction Type
        { wch: 22 }, // Invoice Ref
        { wch: 22 }, // Debit
        { wch: 22 }, // Credit
        { wch: 22 }, // Running Balance
        { wch: 22 }, // Status
    ];

    const sanitizedFileName = (partyName || "Party").replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `ledger_${sanitizedFileName}_${format(new Date(), "yyyyMMdd")}.xlsx`);
};
