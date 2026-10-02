import * as XLSX from "xlsx";
import { format } from "date-fns";
import { BusinessDetailsInfo, PartyExportItem, PartyMetrics } from "./types";
import { parseSafeDate, sanitizeText } from "./helpers";

export const exportSinglePartyStatementToExcel = (
    party: PartyExportItem,
    metrics: PartyMetrics,
    businessDetails?: BusinessDetailsInfo
) => {
    const bizName = businessDetails?.name || "Business Accounts";
    const titleRow = [`STATEMENT OF ACCOUNT - ${sanitizeText(party.name).toUpperCase()}`];
    const bizInfoRow = [
        `${bizName} ${businessDetails?.phone ? `| Ph: ${businessDetails.phone}` : ""} ${
            businessDetails?.gst ? `| GSTIN: ${businessDetails.gst}` : ""
        }`,
    ];
    const partyInfoRow = [
        `Party: ${party.name} (${(party.type || "customer").toUpperCase()}) ${
            party.phone ? `| Phone: ${party.phone}` : ""
        } ${party.gst_number ? `| GSTIN: ${party.gst_number}` : ""}`,
    ];
    const dateRow = [`Statement Generated On: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`];
    const emptyRow: any[] = [];

    const headers = [
        "Date",
        "Voucher Type",
        "Invoice / Ref #",
        "Status",
        "Total Invoiced (₹)",
        "Paid / Settled (₹)",
        "Balance Due (₹)",
    ];

    // Combine sales and purchases chronologically
    const allRecords: any[] = [
        ...(metrics.partySales || []).map((s: any) => ({
            ...s,
            voucherType: "Sales Invoice",
            voucherRef: s.invoice_number || `INV-${s.id?.slice(0, 6)}`,
            dateObj: parseSafeDate(s.date || s.created_at),
            total: Number(s.total_amount || 0),
            paid: Number(
                s.amount_paid != null
                    ? s.amount_paid
                    : s.status === "paid"
                    ? s.total_amount
                    : 0
            ),
            due: Number(
                s.balance_due != null
                    ? s.balance_due
                    : s.status === "paid"
                    ? 0
                    : Math.max(0, s.total_amount - (Number(s.amount_paid) || 0))
            ),
            status: s.status || "settled",
        })),
        ...(metrics.partyPurchases || []).map((p: any) => ({
            ...p,
            voucherType: "Purchase Bill",
            voucherRef: p.bill_number || `BILL-${p.id?.slice(0, 6)}`,
            dateObj: parseSafeDate(p.date || p.created_at),
            total: Number(p.total_amount || 0),
            paid: Number(
                p.amount_paid != null
                    ? p.amount_paid
                    : p.status === "paid"
                    ? p.total_amount
                    : 0
            ),
            due: Number(
                p.balance_due != null
                    ? p.balance_due
                    : p.status === "paid"
                    ? 0
                    : Math.max(0, p.total_amount - (Number(p.amount_paid) || 0))
            ),
            status: p.status || "settled",
        })),
    ].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    const dataRows = allRecords.map((r) => [
        format(r.dateObj, "dd/MM/yyyy"),
        r.voucherType,
        r.voucherRef,
        (r.status || "").toUpperCase(),
        r.total,
        r.paid,
        r.due,
    ]);

    const openingBal = Number(party.opening_balance) || 0;
    const isOpeningReceivable = party.opening_balance_type
        ? party.opening_balance_type === "to_receive"
        : party.type !== "vendor";
    const openingBalLabel = `Opening Balance (${isOpeningReceivable ? "Receivable / Dr" : "Payable / Cr"})`;
    const summaryRows = [
        emptyRow,
        [openingBalLabel, "", "", "", openingBal, "", ""],
        ["Total Billed", "", "", "", metrics.totalSalesAmount + metrics.totalPurchasesAmount, "", ""],
        ["Total Collected / Paid", "", "", "", metrics.totalSalesPaid + metrics.totalPurchasesPaid, "", ""],
        ["Total Outstanding Receivable (Dr)", "", "", "", metrics.receivable, "", ""],
        ["Total Outstanding Payable (Cr)", "", "", "", metrics.payable, "", ""],
    ];

    const wsData = [
        titleRow,
        bizInfoRow,
        partyInfoRow,
        dateRow,
        emptyRow,
        headers,
        ...dataRows,
        ...summaryRows,
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
        { wch: 14 }, // Date
        { wch: 18 }, // Voucher Type
        { wch: 22 }, // Ref #
        { wch: 14 }, // Status
        { wch: 18 }, // Total Invoiced
        { wch: 18 }, // Paid
        { wch: 18 }, // Due
    ];

    const cleanName = (party.name || "Party").replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `Statement_${cleanName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
};
