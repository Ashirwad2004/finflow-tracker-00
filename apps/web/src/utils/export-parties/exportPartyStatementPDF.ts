import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { BusinessDetailsInfo, PartyExportItem, PartyMetrics } from "./types";
import { parseSafeDate, sanitizeText, formatCurrencyNumber } from "./helpers";

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
        ? party.opening_balance_type === "to_receive"
        : party.type !== "vendor";

    const partyInfo = [
        `Account Type: ${(party.type || "customer").toUpperCase()}`,
        party.phone ? `Phone: ${party.phone}` : null,
        party.email ? `Email: ${party.email}` : null,
        party.gst_number ? `GSTIN: ${party.gst_number}` : null,
        Number(party.opening_balance) > 0
            ? `Opening Bal: Rs. ${formatCurrencyNumber(Number(party.opening_balance))} (${isOpeningReceivable ? "Receivable/Dr" : "Payable/Cr"})`
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
