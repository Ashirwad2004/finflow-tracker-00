import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface BusinessDetailsInfo {
    name?: string;
    address?: string;
    phone?: string;
    gst?: string;
    logo_url?: string;
}

export interface PartyExportItem {
    id: string;
    name: string;
    type: "customer" | "vendor" | "both";
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    gst_number?: string | null;
    opening_balance?: number;
    opening_balance_type?: "to_receive" | "to_pay";
    created_at?: string;
}

export interface PartyMetrics {
    partySales: any[];
    partyPurchases: any[];
    totalSalesAmount: number;
    totalSalesPaid: number;
    salesBalanceDue: number;
    totalPurchasesAmount: number;
    totalPurchasesPaid: number;
    purchasesBalanceDue: number;
    receivable: number;
    payable: number;
    totalRecords: number;
}

export const parseSafeDate = (d: any): Date => {
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

const sanitizeText = (text: string | null | undefined): string => {
    if (!text) return "";
    return text.replace(/[^\x00-\x7F]/g, "").trim();
};

const formatCurrencyNumber = (num: number): string => {
    return (num || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// ─── 1. EXPORT ALL / FILTERED PARTIES TO EXCEL (.xlsx) ─────────────────────────

export const exportPartiesToExcel = (
    parties: PartyExportItem[],
    partyLedgerMap: Map<string, PartyMetrics>,
    businessDetails?: BusinessDetailsInfo,
    filterName?: string
) => {
    if (!parties || parties.length === 0) {
        throw new Error("No parties available to export.");
    }

    const titleRow = [
        businessDetails?.name
            ? `${businessDetails.name.toUpperCase()} - PARTIES & ACCOUNTS DIRECTORY`
            : "PARTIES & ACCOUNTS DIRECTORY",
    ];
    const subTitleRow = [
        `Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")} ${
            filterName ? `| Filter: ${filterName}` : ""
        }`,
    ];
    const emptyRow: any[] = [];

    const headers = [
        "Party Name",
        "Type",
        "Phone",
        "Email",
        "GSTIN",
        "Opening Balance (₹)",
        "Total Sales (₹)",
        "Sales Collected (₹)",
        "Receivable / Due (₹)",
        "Total Purchases (₹)",
        "Purchases Paid (₹)",
        "Payable / Due (₹)",
        "Net Balance (₹)",
        "Status",
    ];

    let grandSales = 0;
    let grandSalesPaid = 0;
    let grandReceivable = 0;
    let grandPurchases = 0;
    let grandPurchasesPaid = 0;
    let grandPayable = 0;

    const dataRows = parties.map((party) => {
        const m = partyLedgerMap.get(party.id) || {
            partySales: [],
            partyPurchases: [],
            totalSalesAmount: 0,
            totalSalesPaid: 0,
            salesBalanceDue: 0,
            totalPurchasesAmount: 0,
            totalPurchasesPaid: 0,
            purchasesBalanceDue: 0,
            receivable: 0,
            payable: 0,
            totalRecords: 0,
        };

        grandSales += m.totalSalesAmount;
        grandSalesPaid += m.totalSalesPaid;
        grandReceivable += m.receivable;
        grandPurchases += m.totalPurchasesAmount;
        grandPurchasesPaid += m.totalPurchasesPaid;
        grandPayable += m.payable;

        const isOpeningReceivable = party.opening_balance_type
            ? party.opening_balance_type === 'to_receive'
            : party.type !== 'vendor';
        const netBalance = m.receivable - m.payable;
        let statusLabel = "Settled";
        if (netBalance > 0) statusLabel = "To Collect (Receivable)";
        else if (netBalance < 0) statusLabel = "To Pay (Payable)";

        const openBalNumber = Number(party.opening_balance || 0);
        const openBalDisplay = openBalNumber > 0
            ? `${openBalNumber} (${isOpeningReceivable ? 'Dr' : 'Cr'})`
            : 0;

        return [
            party.name || "",
            party.type ? party.type.toUpperCase() : "CUSTOMER",
            party.phone || "",
            party.email || "",
            party.gst_number || "",
            openBalDisplay,
            m.totalSalesAmount,
            m.totalSalesPaid,
            m.receivable,
            m.totalPurchasesAmount,
            m.totalPurchasesPaid,
            m.payable,
            netBalance,
            statusLabel,
        ];
    });

    const netTotal = grandReceivable - grandPayable;
    const totalsRow = [
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        grandSales,
        grandSalesPaid,
        grandReceivable,
        grandPurchases,
        grandPurchasesPaid,
        grandPayable,
        netTotal,
        netTotal > 0
            ? "Net To Collect"
            : netTotal < 0
            ? "Net To Pay"
            : "Fully Settled",
    ];

    const wsData = [
        titleRow,
        subTitleRow,
        emptyRow,
        headers,
        ...dataRows,
        emptyRow,
        totalsRow,
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
        { wch: 28 }, // Party Name
        { wch: 12 }, // Type
        { wch: 15 }, // Phone
        { wch: 24 }, // Email
        { wch: 18 }, // GSTIN
        { wch: 18 }, // Opening Balance
        { wch: 16 }, // Total Sales
        { wch: 16 }, // Sales Collected
        { wch: 20 }, // Receivable
        { wch: 18 }, // Total Purchases
        { wch: 16 }, // Purchases Paid
        { wch: 18 }, // Payable
        { wch: 16 }, // Net Balance
        { wch: 24 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Parties Directory");
    const fileName = `Parties_Directory_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

// ─── 2. EXPORT ALL / FILTERED PARTIES TO PDF (.pdf) ───────────────────────────

export const exportPartiesToPDF = (
    parties: PartyExportItem[],
    partyLedgerMap: Map<string, PartyMetrics>,
    businessDetails?: BusinessDetailsInfo,
    filterName?: string
) => {
    if (!parties || parties.length === 0) {
        throw new Error("No parties available to export.");
    }

    // Use landscape A4 for comfortable tabular presentation
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm

    // --- Header Section ---
    const startX = 14;
    let currentY = 16;

    // Business Name (Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // Slate-800
    const bizName = businessDetails?.name || "Business Accounts Directory";
    doc.text(sanitizeText(bizName), startX, currentY);

    // Document Title (Right)
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235); // Primary Blue
    doc.text("PARTIES & ACCOUNTS DIRECTORY", pageWidth - startX, currentY, { align: "right" });

    currentY += 6;

    // Business Sub-details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500

    const metaParts = [
        businessDetails?.phone ? `Phone: ${businessDetails.phone}` : null,
        businessDetails?.gst ? `GSTIN: ${businessDetails.gst}` : null,
        businessDetails?.address ? businessDetails.address : null,
    ].filter(Boolean);

    if (metaParts.length > 0) {
        doc.text(sanitizeText(metaParts.join(" | ")), startX, currentY);
    }

    doc.text(
        `Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}${
            filterName ? ` | Filter: ${filterName}` : ""
        }`,
        pageWidth - startX,
        currentY,
        { align: "right" }
    );

    currentY += 8;

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(startX, currentY, pageWidth - startX, currentY);

    currentY += 6;

    // --- KPI Metric Summary Cards ---
    let totalReceivables = 0;
    let totalPayables = 0;
    let totalSales = 0;
    let totalPurchases = 0;

    parties.forEach((p) => {
        const m = partyLedgerMap.get(p.id);
        if (m) {
            totalReceivables += m.receivable;
            totalPayables += m.payable;
            totalSales += m.totalSalesAmount;
            totalPurchases += m.totalPurchasesAmount;
        }
    });

    const netPosition = totalReceivables - totalPayables;

    // 4 KPI Summary Pill Boxes
    const cardWidth = (pageWidth - startX * 2 - 15) / 4;
    const cardHeight = 16;

    const cards = [
        { label: "TOTAL PARTIES", value: `${parties.length} Accounts`, color: [71, 85, 105] },
        {
            label: "TOTAL RECEIVABLE (DR)",
            value: `Rs. ${formatCurrencyNumber(totalReceivables)}`,
            color: [5, 150, 105], // Emerald
        },
        {
            label: "TOTAL PAYABLE (CR)",
            value: `Rs. ${formatCurrencyNumber(totalPayables)}`,
            color: [225, 29, 72], // Rose
        },
        {
            label: "NET POSITION",
            value: `Rs. ${formatCurrencyNumber(Math.abs(netPosition))} ${
                netPosition >= 0 ? "(Dr)" : "(Cr)"
            }`,
            color: netPosition >= 0 ? [37, 99, 235] : [217, 119, 6], // Blue or Amber
        },
    ];

    cards.forEach((c, idx) => {
        const xPos = startX + idx * (cardWidth + 5);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(xPos, currentY, cardWidth, cardHeight, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(c.label, xPos + 4, currentY + 5);

        doc.setFontSize(10);
        doc.setTextColor(c.color[0], c.color[1], c.color[2]);
        doc.text(c.value, xPos + 4, currentY + 12);
    });

    currentY += cardHeight + 6;

    // --- Parties Table ---
    const tableBody = parties.map((p) => {
        const m = partyLedgerMap.get(p.id) || {
            partySales: [],
            partyPurchases: [],
            totalSalesAmount: 0,
            totalSalesPaid: 0,
            salesBalanceDue: 0,
            totalPurchasesAmount: 0,
            totalPurchasesPaid: 0,
            purchasesBalanceDue: 0,
            receivable: 0,
            payable: 0,
            totalRecords: 0,
        };

        const net = m.receivable - m.payable;
        let netStr = "-";
        if (net > 0) netStr = `Rs. ${formatCurrencyNumber(net)} (Dr)`;
        else if (net < 0) netStr = `Rs. ${formatCurrencyNumber(Math.abs(net))} (Cr)`;
        else netStr = "Settled";

        return [
            sanitizeText(p.name),
            (p.type || "customer").toUpperCase(),
            sanitizeText(p.phone || p.gst_number || "—"),
            `Rs. ${formatCurrencyNumber(m.totalSalesAmount)}`,
            `Rs. ${formatCurrencyNumber(m.totalPurchasesAmount)}`,
            m.receivable > 0 ? `Rs. ${formatCurrencyNumber(m.receivable)}` : "—",
            m.payable > 0 ? `Rs. ${formatCurrencyNumber(m.payable)}` : "—",
            netStr,
        ];
    });

    // Totals Row
    const totalsRow = [
        `TOTAL (${parties.length})`,
        "",
        "",
        `Rs. ${formatCurrencyNumber(totalSales)}`,
        `Rs. ${formatCurrencyNumber(totalPurchases)}`,
        `Rs. ${formatCurrencyNumber(totalReceivables)}`,
        `Rs. ${formatCurrencyNumber(totalPayables)}`,
        netPosition >= 0
            ? `Rs. ${formatCurrencyNumber(netPosition)} (Dr)`
            : `Rs. ${formatCurrencyNumber(Math.abs(netPosition))} (Cr)`,
    ];

    autoTable(doc, {
        startY: currentY,
        head: [
            [
                "Party Name",
                "Type",
                "Contact / GSTIN",
                "Total Sales",
                "Total Purchases",
                "Receivable (Dr)",
                "Payable (Cr)",
                "Net Position",
            ],
        ],
        body: [...tableBody, totalsRow],
        theme: "striped",
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: 255,
            fontSize: 8.5,
            fontStyle: "bold",
            halign: "left",
        },
        columnStyles: {
            0: { cellWidth: 50 }, // Party Name
            1: { cellWidth: 24, halign: "center" }, // Type
            2: { cellWidth: 38 }, // Phone/GST
            3: { cellWidth: 35, halign: "right" }, // Sales
            4: { cellWidth: 35, halign: "right" }, // Purchases
            5: { cellWidth: 32, halign: "right", fontStyle: "bold", textColor: [5, 150, 105] }, // Receivable
            6: { cellWidth: 30, halign: "right", fontStyle: "bold", textColor: [225, 29, 72] }, // Payable
            7: { cellWidth: 25, halign: "right", fontStyle: "bold" }, // Net
        },
        styles: {
            font: "helvetica",
            fontSize: 8,
            cellPadding: 2.5,
            overflow: "linebreak",
        },
        margin: { left: startX, right: startX },
        didParseCell: (data) => {
            // Highlight the grand totals row at the bottom
            if (data.row.index === tableBody.length) {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [241, 245, 249];
                data.cell.styles.textColor = [15, 23, 42];
            }
        },
    });

    // --- Footer Page Numbers ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Page ${i} of ${pageCount} • Generated by RupeeBill Business Intelligence Suite`,
            pageWidth / 2,
            pageHeight - 8,
            { align: "center" }
        );
    }

    const fileName = `Parties_Directory_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
};

// ─── 3. EXPORT SINGLE PARTY STATEMENT TO EXCEL (.xlsx) ─────────────────────────

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
        ? party.opening_balance_type === 'to_receive'
        : party.type !== 'vendor';
    const openingBalLabel = `Opening Balance (${isOpeningReceivable ? 'Receivable / Dr' : 'Payable / Cr'})`;
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

// ─── 4. EXPORT SINGLE PARTY STATEMENT TO PDF (.pdf) ───────────────────────────

export const exportSinglePartyStatementToPDF = (
    party: PartyExportItem,
    metrics: PartyMetrics,
    businessDetails?: BusinessDetailsInfo
) => {
    const doc = new jsPDF({ orientation: "portrait", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
    const startX = 14;
    let currentY = 18;

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    const bizName = businessDetails?.name || "Business Accounts";
    doc.text(sanitizeText(bizName), startX, currentY);

    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text("STATEMENT OF ACCOUNT", pageWidth - startX, currentY, { align: "right" });

    currentY += 6;

    // Business sub-details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);

    const metaParts = [
        businessDetails?.phone ? `Ph: ${businessDetails.phone}` : null,
        businessDetails?.gst ? `GSTIN: ${businessDetails.gst}` : null,
        businessDetails?.address ? businessDetails.address : null,
    ].filter(Boolean);

    if (metaParts.length > 0) {
        doc.text(sanitizeText(metaParts.join(" | ")), startX, currentY);
    }

    doc.text(
        `Date: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`,
        pageWidth - startX,
        currentY,
        { align: "right" }
    );

    currentY += 7;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(startX, currentY, pageWidth - startX, currentY);

    currentY += 6;

    // --- Party Information Box ---
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(startX, currentY, pageWidth - startX * 2, 22, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(sanitizeText(party.name), startX + 4, currentY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const isOpeningReceivable = party.opening_balance_type
        ? party.opening_balance_type === 'to_receive'
        : party.type !== 'vendor';

    const partyInfo = [
        `Account Type: ${(party.type || "customer").toUpperCase()}`,
        party.phone ? `Phone: ${party.phone}` : null,
        party.email ? `Email: ${party.email}` : null,
        party.gst_number ? `GSTIN: ${party.gst_number}` : null,
        Number(party.opening_balance) > 0
            ? `Opening Bal: Rs. ${formatCurrencyNumber(Number(party.opening_balance))} (${isOpeningReceivable ? 'Receivable/Dr' : 'Payable/Cr'})`
            : null,
    ].filter(Boolean);
    doc.text(sanitizeText(partyInfo.join("  •  ")), startX + 4, currentY + 12);

    if (party.address) {
        doc.text(`Address: ${sanitizeText(party.address)}`, startX + 4, currentY + 17);
    }

    currentY += 28;

    // --- Statement Summary Cards ---
    const cardWidth = (pageWidth - startX * 2 - 10) / 3;
    const cardHeight = 16;

    const isPayableDominant = (party.type === "vendor" && metrics.payable >= metrics.receivable) || (metrics.payable > 0 && metrics.receivable === 0);
    const balanceAmount = isPayableDominant ? metrics.payable : metrics.receivable;
    const balanceLabel = isPayableDominant ? "BALANCE PAYABLE (CR)" : "BALANCE RECEIVABLE (DR)";

    const summaryCards = [
        {
            label: "TOTAL BILLED",
            value: `Rs. ${formatCurrencyNumber(metrics.totalSalesAmount + metrics.totalPurchasesAmount)}`,
            color: [71, 85, 105],
        },
        {
            label: "TOTAL COLLECTED / PAID",
            value: `Rs. ${formatCurrencyNumber(metrics.totalSalesPaid + metrics.totalPurchasesPaid)}`,
            color: [5, 150, 105],
        },
        {
            label: balanceLabel,
            value: `Rs. ${formatCurrencyNumber(balanceAmount)}`,
            color: balanceAmount > 0
                ? [225, 29, 72]
                : [5, 150, 105],
        },
    ];

    summaryCards.forEach((c, idx) => {
        const xPos = startX + idx * (cardWidth + 5);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(xPos, currentY, cardWidth, cardHeight, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(c.label, xPos + 4, currentY + 5);

        doc.setFontSize(10.5);
        doc.setTextColor(c.color[0], c.color[1], c.color[2]);
        doc.text(c.value, xPos + 4, currentY + 12);
    });

    currentY += cardHeight + 6;

    // --- Table of Transactions ---
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

    const tableRows = allRecords.map((r) => [
        format(r.dateObj, "dd/MM/yyyy"),
        r.voucherType,
        r.voucherRef,
        (r.status || "").toUpperCase(),
        `Rs. ${formatCurrencyNumber(r.total)}`,
        `Rs. ${formatCurrencyNumber(r.paid)}`,
        `Rs. ${formatCurrencyNumber(r.due)}`,
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [
            [
                "Date",
                "Voucher",
                "Invoice / Bill #",
                "Status",
                "Amount",
                "Paid",
                "Balance Due",
            ],
        ],
        body:
            tableRows.length > 0
                ? tableRows
                : [["-", "No transactions recorded for this party", "-", "-", "-", "-", "-"]],
        theme: "striped",
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: 255,
            fontSize: 8,
            fontStyle: "bold",
        },
        columnStyles: {
            0: { cellWidth: 24 }, // Date
            1: { cellWidth: 32 }, // Type
            2: { cellWidth: 36 }, // Ref
            3: { cellWidth: 22, halign: "center" }, // Status
            4: { cellWidth: 24, halign: "right" }, // Amount
            5: { cellWidth: 22, halign: "right", textColor: [5, 150, 105] }, // Paid
            6: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [225, 29, 72] }, // Due
        },
        styles: {
            font: "helvetica",
            fontSize: 7.5,
            cellPadding: 2.5,
        },
        margin: { left: startX, right: startX },
    });

    // --- Bottom Declaration / Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Page ${i} of ${pageCount} • This is a computer-generated statement of accounts.`,
            pageWidth / 2,
            pageHeight - 8,
            { align: "center" }
        );
    }

    const cleanName = (party.name || "Party").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Statement_${cleanName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

export const exportPartyStatementToExcel = exportSinglePartyStatementToExcel;
export const exportPartyStatementToPDF = exportSinglePartyStatementToPDF;

