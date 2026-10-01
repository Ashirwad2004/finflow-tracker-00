import * as XLSX from "xlsx";
import { format } from "date-fns";
import { LedgerTransaction } from "@/features/parties/components/DetailedPartyReport";

export interface BusinessDetailsCSV {
    name?: string;
    address?: string;
    phone?: string;
    gst?: string;
    email?: string;
}

export interface PartyDetailsCSV {
    name?: string;
    phone?: string;
    gst?: string;
    address?: string;
    type?: string;
}

const safeStr = (text: any): string => {
    if (text == null) return "";
    return String(text).trim();
};

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
        case 'payment_received': return 'Payment In (Receipt)';
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
    businessDetails?: BusinessDetailsCSV,
    partyDetails?: PartyDetailsCSV
) => {
    try {
        const sheetData: any[][] = [];

        // 1. Business Header
        const bizName = safeStr(businessDetails?.name) || "RupeeBill Business";
        sheetData.push([bizName.toUpperCase()]);
        
        const bizDetailsLine = [
            businessDetails?.address ? `Address: ${businessDetails.address}` : "",
            businessDetails?.phone ? `Ph: ${businessDetails.phone}` : "",
            businessDetails?.gst ? `GSTIN: ${businessDetails.gst}` : "",
            businessDetails?.email ? `Email: ${businessDetails.email}` : ""
        ].filter(Boolean).join(" | ");
        
        if (bizDetailsLine) {
            sheetData.push([bizDetailsLine]);
        }
        sheetData.push([]); // Blank row

        // 2. Statement Title & Party Info
        sheetData.push([`PARTY STATEMENT / LEDGER - ${safeStr(partyName).toUpperCase()}`]);

        const partyMetaLine = [
            `Party: ${safeStr(partyName)}`,
            partyDetails?.phone ? `Mobile: ${partyDetails.phone}` : "",
            partyDetails?.gst ? `GSTIN: ${partyDetails.gst}` : "",
            partyDetails?.type ? `Category: ${partyDetails.type.toUpperCase()}` : "",
            partyDetails?.address ? `Address: ${partyDetails.address}` : ""
        ].filter(Boolean).join(" | ");
        sheetData.push([partyMetaLine]);

        let rangeStr = "All Time (Complete History)";
        if (dateRange?.from && dateRange?.to) {
            rangeStr = `${format(dateRange.from, "dd MMM yyyy")} to ${format(dateRange.to, "dd MMM yyyy")}`;
        } else if (dateRange?.from) {
            rangeStr = `Since ${format(dateRange.from, "dd MMM yyyy")}`;
        } else if (dateRange?.to) {
            rangeStr = `Up to ${format(dateRange.to, "dd MMM yyyy")}`;
        }
        sheetData.push([`Period: ${rangeStr} | Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`]);
        sheetData.push([]); // Blank row

        // 3. Table Column Headers
        sheetData.push([
            "Date",
            "Particulars / Voucher Reference",
            "Voucher Type",
            "Debit (Dr) (₹)",
            "Credit (Cr) (₹)",
            "Running Balance (₹)",
            "Dr / Cr",
            "Status"
        ]);

        let periodDebit = 0;
        let periodCredit = 0;

        if (!data || data.length === 0) {
            sheetData.push(["-", "No transaction records found for this period", "-", 0, 0, 0, "Nil", "Settled"]);
        } else {
            data.forEach((tx) => {
                const debit = Number(tx.debit || 0);
                const credit = Number(tx.credit || 0);
                
                // Exclude b/f row from period turnover
                if (tx.id !== 'opening-balance-bfwd') {
                    periodDebit += debit;
                    periodCredit += credit;
                }

                const bal = tx.runningBalance;
                const balType = bal > 0 ? "Dr" : bal < 0 ? "Cr" : "Nil";

                let dateFormatted = "-";
                try {
                    dateFormatted = format(parseSafeDate(tx.date), "dd/MM/yyyy");
                } catch {
                    dateFormatted = safeStr(tx.date);
                }

                sheetData.push([
                    dateFormatted,
                    safeStr(tx.ref),
                    getVoucherTypeLabel(tx.type),
                    debit > 0 ? debit : 0,
                    credit > 0 ? credit : 0,
                    Math.abs(bal),
                    balType,
                    (tx.status || "settled").toUpperCase()
                ]);
            });
        }

        // 4. Summary Rows
        const lastTx = data && data.length > 0 ? data[data.length - 1] : null;
        const closingBal = lastTx ? lastTx.runningBalance : 0;
        const closingBalType = closingBal > 0 ? "Dr (Receivable)" : closingBal < 0 ? "Cr (Payable)" : "Nil (Settled)";

        sheetData.push([]); // Blank row
        sheetData.push([
            "TOTAL",
            "Total Period Turnover",
            "",
            periodDebit,
            periodCredit,
            "",
            "",
            ""
        ]);

        sheetData.push([
            "NET CLOSING POSITION",
            closingBalType,
            "",
            "",
            "",
            Math.abs(closingBal),
            closingBal > 0 ? "Dr" : closingBal < 0 ? "Cr" : "Nil",
            closingBal === 0 ? "SETTLED" : "PENDING"
        ]);

        // Create Workbook
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        // Auto-fit column widths
        worksheet["!cols"] = [
            { wch: 14 }, // Date
            { wch: 42 }, // Particulars
            { wch: 22 }, // Voucher Type
            { wch: 18 }, // Debit
            { wch: 18 }, // Credit
            { wch: 20 }, // Running Balance
            { wch: 16 }, // Dr/Cr
            { wch: 14 }  // Status
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Party Ledger");

        const sanitizedFileName = safeStr(partyName).replace(/[^a-zA-Z0-9]/g, "_") || "Party";
        const dateStamp = format(new Date(), "yyyyMMdd");
        XLSX.writeFile(workbook, `Ledger_${sanitizedFileName}_${dateStamp}.xlsx`);

    } catch (e) {
        console.error("[exportDetailedPartyCSV] Error generating Excel file:", e);
        alert("Failed to export Excel file. Please try again.");
    }
};
