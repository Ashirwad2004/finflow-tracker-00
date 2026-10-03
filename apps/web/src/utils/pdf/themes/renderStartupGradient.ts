import autoTable from "jspdf-autotable";
import { ThemeRenderContext } from "../types";
import {
    handleContinuationPage,
    formatCurrencySafe
} from "../helpers";

export function renderStartupGradient(ctx: ThemeRenderContext): void {
    const {
        doc,
        data,
        options,
        descriptor,
        resolvedBank,
        logoBase64,
        signatureBase64,
        upiQrBase64,
        totalRows,
        taxRateVal,
        cgstVal,
        sgstVal,
        amountPaid,
        balanceDue,
        totalAmount,
        shouldShowPartyBalance,
        prevBalanceVal,
        closingNetDueVal,
        showItemTaxRate,
        pageWidth,
        pageHeight,
        scale,
        marginX,
        dateFormatted,
        dueDateFormatted,
        bizName,
        custGSTIN,
        safeText,
        isFullyPaid,
        resolvedUpiId,
        customTerms
    } = ctx;

    // --- STARTUP GRADIENT THEME (Modern Tech Default) ---
    const indigoColor: [number, number, number] = [79, 70, 229]; // Indigo
    const pinkColor: [number, number, number] = [236, 72, 153]; // Pink
    const textDark: [number, number, number] = [30, 41, 59];
    const textLight: [number, number, number] = [100, 116, 139];

    for (let i = 0; i < 40; i++) {
        const ratio = i / 40;
        const r = Math.round(indigoColor[0] + ratio * (pinkColor[0] - indigoColor[0]));
        const g = Math.round(indigoColor[1] + ratio * (pinkColor[1] - indigoColor[1]));
        const b = Math.round(indigoColor[2] + ratio * (pinkColor[2] - indigoColor[2]));
        doc.setFillColor(r, g, b);
        doc.rect(0, i, pageWidth, 1, "F");
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");

    let currentHeaderY = 26;

    if (logoBase64) {
        const maxDim = 28;
        let renderW = logoBase64.width;
        let renderH = logoBase64.height;
        if (renderW > maxDim || renderH > maxDim) {
            const ratio = Math.min(maxDim / renderW, maxDim / renderH);
            renderW *= ratio;
            renderH *= ratio;
        }
        const startY = 6 + (28 - renderH) / 2;
        doc.addImage(logoBase64.dataUrl, "PNG", 14, startY, renderW, renderH);

        doc.setFontSize(18);
        doc.text(bizName, 18 + renderW, 20);

        currentHeaderY = 26;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        if (data.business_details?.address) {
            doc.text(safeText(data.business_details.address), 18 + renderW, currentHeaderY);
            currentHeaderY += 5;
        }
        if (data.business_details?.phone || data.business_details?.gst) {
            const extraDetails = [
                data.business_details.phone ? `Phone: ${safeText(data.business_details.phone)}` : '',
                data.business_details.gst ? `GSTIN: ${safeText(data.business_details.gst)}` : ''
            ].filter(Boolean).join(" | ");
            if (extraDetails) doc.text(extraDetails, 18 + renderW, currentHeaderY);
        }
    } else {
        doc.setFontSize(22);
        doc.text(bizName, 14, 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        if (data.business_details?.address) {
            doc.text(safeText(data.business_details.address), 14, currentHeaderY);
            currentHeaderY += 5;
        }
        if (data.business_details?.phone || data.business_details?.gst) {
            const extraDetails = [
                data.business_details.phone ? `Phone: ${safeText(data.business_details.phone)}` : '',
                data.business_details.gst ? `GSTIN: ${safeText(data.business_details.gst)}` : ''
            ].filter(Boolean).join(" | ");
            if (extraDetails) doc.text(extraDetails, 14, currentHeaderY);
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(descriptor.title, 196, 20, { align: "right" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${descriptor.numberLabel.replace(':', '')} ${safeText(data.invoice_number)}`, 196, 27, { align: "right" });
    doc.text(`${descriptor.dateLabel} ${dateFormatted}`, 196, 32, { align: "right" });
    if (dueDateFormatted) {
        doc.text(`${descriptor.dueDateLabel} ${dueDateFormatted}`, 196, 37, { align: "right" });
    }
    const statusLineY = dueDateFormatted ? 42 : 37;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    if (balanceDue <= 0 && isFullyPaid) {
        doc.setTextColor(22, 101, 52);
        doc.text(`STATUS: ${descriptor.isOrder ? "CONFIRMED / SETTLED" : "FULLY PAID"}`, 196, statusLineY, { align: "right" });
    } else if (amountPaid > 0) {
        doc.setTextColor(180, 83, 9);
        doc.text(`STATUS: PARTIALLY PAID (Pending: ${formatCurrencySafe(balanceDue)})`, 196, statusLineY, { align: "right" });
    } else {
        doc.setTextColor(220, 38, 38);
        doc.text(`STATUS: ${(data.status ? safeText(data.status).toUpperCase().replace("_", " ") : "UNPAID / DUE")}`, 196, statusLineY, { align: "right" });
    }

    doc.setTextColor(...textDark);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(descriptor.partyLabel.toUpperCase().replace(":", ""), 14, 55);

    doc.setDrawColor(...indigoColor);
    doc.setLineWidth(0.5);
    doc.line(14, 57, 80, 57);

    doc.setFontSize(11);
    doc.text(safeText(data.customer_name), 14, 63);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textLight);
    doc.setFontSize(10);
    let billY = 68;
    if (data.customer_phone) { doc.text(`Phone: ${safeText(data.customer_phone)}`, 14, billY); billY += 5; }
    if (data.customer_email) { doc.text(`Email: ${safeText(data.customer_email)}`, 14, billY); billY += 5; }
    if (custGSTIN) { doc.text(`GSTIN/UIN: ${custGSTIN}`, 14, billY); billY += 5; }

    const tableHeadGradient = showItemTaxRate ? [[
        { content: "Item Description", styles: { halign: 'left' } },
        { content: "Qty", styles: { halign: 'center' } },
        { content: "Price", styles: { halign: 'right' } },
        { content: "Tax %", styles: { halign: 'center' } },
        { content: "Amount", styles: { halign: 'right' } }
    ]] : [[
        { content: "Item Description", styles: { halign: 'left' } },
        { content: "Qty", styles: { halign: 'center' } },
        { content: "Price", styles: { halign: 'right' } },
        { content: "Amount", styles: { halign: 'right' } }
    ]];

    const tableRows = data.items.map((item) => {
        const itemTax = item.tax_rate !== undefined && item.tax_rate !== null && item.tax_rate !== ''
            ? `${Number(item.tax_rate)}%`
            : (taxRateVal > 0 ? `${taxRateVal}%` : "0%");
        return showItemTaxRate ? [
            safeText(item.description) + (item.hsn_code ? `\nHSN: ${safeText(item.hsn_code)}` : ""),
            item.quantity.toString(),
            formatCurrencySafe(item.price),
            itemTax,
            formatCurrencySafe(item.total ?? (Number(item.quantity) * Number(item.price)))
        ] : [
            safeText(item.description) + (item.hsn_code ? `\nHSN: ${safeText(item.hsn_code)}` : ""),
            item.quantity.toString(),
            formatCurrencySafe(item.price),
            formatCurrencySafe(item.total ?? (Number(item.quantity) * Number(item.price)))
        ];
    });

    const columnStylesGradient = showItemTaxRate ? {
        1: { cellWidth: 18 * scale, halign: 'center' }, 
        2: { cellWidth: 28 * scale, halign: 'right' }, 
        3: { cellWidth: 20 * scale, halign: 'center' },
        4: { cellWidth: 32 * scale, halign: 'right' } 
    } : { 
        0: { cellWidth: 90 * scale }, 
        1: { cellWidth: 22 * scale, halign: 'center' }, 
        2: { cellWidth: 35 * scale, halign: 'right' }, 
        3: { cellWidth: 35 * scale, halign: 'right' } 
    };

    autoTable(doc, {
        startY: Math.max(85, billY + 10),
        head: tableHeadGradient,
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: indigoColor, textColor: 255, fontStyle: 'bold', fontSize: 10, cellPadding: 4 },
        bodyStyles: { textColor: textDark, fontSize: 9, cellPadding: 4, lineColor: [243, 244, 246] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: columnStylesGradient,
        didParseCell: (hookData: any) => {
            const colIdx = hookData.column.index;
            if (showItemTaxRate) {
                if (colIdx === 1 || colIdx === 3) {
                    hookData.cell.styles.halign = 'center';
                } else if (colIdx === 2 || colIdx === 4) {
                    hookData.cell.styles.halign = 'right';
                } else if (colIdx === 0) {
                    hookData.cell.styles.halign = 'left';
                }
            } else {
                if (colIdx === 1) {
                    hookData.cell.styles.halign = 'center';
                } else if (colIdx === 2 || colIdx === 3) {
                    hookData.cell.styles.halign = 'right';
                } else if (colIdx === 0) {
                    hookData.cell.styles.halign = 'left';
                }
            }
        },
        margin: { left: marginX, right: marginX },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    finalY = handleContinuationPage(doc, finalY, pageHeight, pageWidth, indigoColor, theme, data.invoice_number, bizName);
    
    const totalBlockX = pageWidth - 90;
    const vAlignX = pageWidth - 14;

    // --- LEFT COLUMN OF SUMMARY: Bank Details & UPI QR Code ---
    let leftPayY = finalY;
    if (resolvedBank || upiQrBase64) {
        if (upiQrBase64) {
            const qrSize = 24 * scale;
            const qrX = 14;
            const qrY = leftPayY;
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1.5, 1.5, "FD");
            doc.addImage(upiQrBase64.dataUrl, "PNG", qrX, qrY, qrSize, qrSize);

            const textStartX = qrX + qrSize + 4;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(...indigoColor);
            doc.text("Scan & Pay via UPI", textStartX, qrY + 4);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.8);
            doc.setTextColor(...textLight);
            doc.text("GPay • PhonePe • Paytm • BHIM", textStartX, qrY + 8);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(...textDark);
            doc.text(`UPI: ${resolvedUpiId}`, textStartX, qrY + 12.5);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.8);
            doc.setTextColor(...textLight);
            const payAmt = balanceDue > 0 ? balanceDue : totalAmount;
            doc.text(`Amount: ${formatCurrencySafe(payAmt)}`, textStartX, qrY + 16.5);

            leftPayY = Math.max(leftPayY + qrSize + 5, leftPayY + 20);
        }

        if (resolvedBank) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(...textDark);
            doc.text("Bank Transfer Details:", 14, leftPayY);
            leftPayY += 3.8;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...textLight);
            doc.text(`Bank: ${resolvedBank.bankName}  |  A/c: ${resolvedBank.accountNumber}`, 14, leftPayY);
            leftPayY += 3.2;
            const branchIfsc = [
                resolvedBank.ifscCode ? `IFSC: ${resolvedBank.ifscCode}` : '',
                resolvedBank.branchName ? `Branch: ${resolvedBank.branchName}` : ''
            ].filter(Boolean).join("  |  ");
            if (branchIfsc) {
                doc.text(branchIfsc, 14, leftPayY);
                leftPayY += 3.2;
            }
        }
    }

    doc.setFontSize(10);
    doc.setTextColor(...textLight);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", totalBlockX, finalY);
    doc.setTextColor(...textDark);
    doc.text(formatCurrencySafe(data.subtotal), vAlignX, finalY, { align: "right" });

    let currentTotalY = finalY;
    totalRows.slice(1).forEach(row => {
        currentTotalY += 7;
        if (row.isPrevBal) {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(70, 70, 70);
            doc.text(row.label + ":", totalBlockX, currentTotalY);
            const prevText = (row.value < 0 ? "-" : "") + formatCurrencySafe(Math.abs(row.value));
            doc.text(prevText, vAlignX, currentTotalY, { align: "right" });
        } else if (row.isNetDue) {
            currentTotalY += 2;
            const netBoxY = currentTotalY - 5;
            const isNetPositive = row.value > 0;
            const isNetNegative = row.value < 0;
            if (isNetPositive) {
                doc.setFillColor(254, 242, 242); // red-50
                doc.setDrawColor(220, 38, 38); // red-600
                doc.roundedRect(totalBlockX - 5, netBoxY, 87, 14, 2, 2, "FD");
                doc.setTextColor(185, 28, 28); // red-700
                doc.setFont("helvetica", "bold");
                doc.text("Current Pending Balance:", totalBlockX, netBoxY + 9);
                doc.text(`${formatCurrencySafe(row.value)} Dr`, vAlignX, netBoxY + 9, { align: "right" });
            } else if (isNetNegative) {
                doc.setFillColor(240, 253, 244); // green-50
                doc.setDrawColor(22, 163, 74); // green-600
                doc.roundedRect(totalBlockX - 5, netBoxY, 87, 14, 2, 2, "FD");
                doc.setTextColor(22, 101, 52); // green-700
                doc.setFont("helvetica", "bold");
                doc.text("Current Advance Balance:", totalBlockX, netBoxY + 9);
                doc.text(`${formatCurrencySafe(Math.abs(row.value))} Cr`, vAlignX, netBoxY + 9, { align: "right" });
            } else {
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(203, 213, 225);
                doc.roundedRect(totalBlockX - 5, netBoxY, 87, 14, 2, 2, "FD");
                doc.setTextColor(51, 65, 85);
                doc.setFont("helvetica", "bold");
                doc.text("Current Pending Balance:", totalBlockX, netBoxY + 9);
                doc.text("Rs. 0.00 (Settled)", vAlignX, netBoxY + 9, { align: "right" });
            }
            currentTotalY += 8;
        } else if (row.isPaid) {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(22, 101, 52); // Forest Green
            doc.text(row.label + ":", totalBlockX, currentTotalY);
            doc.text(formatCurrencySafe(row.value), vAlignX, currentTotalY, { align: "right" });
        } else if (row.isDue) {
            if (row.value > 0) {
                currentTotalY += 2;
                const dueBoxY = currentTotalY - 5;
                doc.setFillColor(254, 242, 242); // red-50
                doc.setDrawColor(239, 68, 68); // red-500
                doc.roundedRect(totalBlockX - 5, dueBoxY, 87, 13, 2, 2, "FD");
                doc.setTextColor(185, 28, 28); // red-700
                doc.setFont("helvetica", "bold");
                doc.text("Balance Due (Pending):", totalBlockX, dueBoxY + 8.5);
                doc.text(formatCurrencySafe(row.value), vAlignX, dueBoxY + 8.5, { align: "right" });
                currentTotalY += 8;
            } else {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(22, 101, 52);
                doc.text("Balance Due:", totalBlockX, currentTotalY);
                doc.text("Rs. 0.00 (PAID)", vAlignX, currentTotalY, { align: "right" });
            }
        } else if (row.bold) {
            const totalBoxY = currentTotalY - 5;
            doc.setFillColor(253, 244, 245); // pink-50
            doc.setDrawColor(...pinkColor);
            doc.roundedRect(totalBlockX - 5, totalBoxY, 87, 14, 2, 2, "FD");
            doc.setTextColor(...pinkColor);
            doc.setFont("helvetica", "bold");
            doc.text(row.label + ":", totalBlockX, totalBoxY + 9);
            doc.text(formatCurrencySafe(row.value), vAlignX, totalBoxY + 9, { align: "right" });
            currentTotalY += 7;
        } else {
            doc.text(row.label + ":", totalBlockX, currentTotalY);
            doc.setTextColor(...textDark);
            doc.text((row.value < 0 ? "-" : "") + formatCurrencySafe(Math.abs(row.value)), vAlignX, currentTotalY, { align: "right" });
        }
    });

    if (signatureBase64) {
        const maxDim = 35;
        let renderW = signatureBase64.width;
        let renderH = signatureBase64.height;
        if (renderW > maxDim || renderH > maxDim) {
            const ratio = Math.min(maxDim / renderW, maxDim / renderH);
            renderW *= ratio;
            renderH *= ratio;
        }
        const sigY = pageHeight - 45;
        const sigX = pageWidth - 14 - renderW;
        doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
        doc.setFontSize(9);
        doc.setTextColor(...textDark);
        doc.setFont("helvetica", "normal");
        doc.text(descriptor.signatoryRoleText, pageWidth - 14, sigY + renderH + 5, { align: "right" });
    }

    doc.setDrawColor(243, 244, 246);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
    doc.setFontSize(9);
    doc.setTextColor(...textLight);
    doc.setFont("helvetica", "italic");
    const termsText = customTerms || descriptor.defaultDeclaration;
    doc.text(doc.splitTextToSize(termsText, pageWidth - 28), pageWidth / 2, pageHeight - 12, { align: "center" });
}
