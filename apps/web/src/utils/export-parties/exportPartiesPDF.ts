import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { BusinessDetailsInfo, PartyExportItem, PartyMetrics } from "./types";
import { sanitizeText, formatCurrencyNumber } from "./helpers";

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
