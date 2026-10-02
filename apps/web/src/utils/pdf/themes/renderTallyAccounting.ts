import autoTable from "jspdf-autotable";
import { ThemeRenderContext } from "../types";
import {
    handleContinuationPage,
    convertAmountToIndianWords,
    formatAmountClean,
    formatCurrencySafe
} from "../helpers";

export function renderTallyAccounting(ctx: ThemeRenderContext): void {
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

    // --- TALLY ERP GST TAX INVOICE FORMAT ---
    const lineDark: [number, number, number] = [0, 0, 0];
    const textDark: [number, number, number] = [0, 0, 0];
    const fontStyle = "helvetica";
    const tallyMarginX = 10 * scale;
    const tallyMarginY = 10 * scale;

    // Outer border around the page
    doc.setDrawColor(...lineDark);
    doc.setLineWidth(0.5);
    doc.rect(tallyMarginX, tallyMarginY, pageWidth - 2 * tallyMarginX, pageHeight - 2 * tallyMarginY);

    // Centered Header Label: e.g. "TAX INVOICE", "PURCHASE BILL", "SALE ORDER", "PURCHASE ORDER"
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(11);
    doc.text(descriptor.title, pageWidth / 2, 16 * scale, { align: "center" });
    doc.line(tallyMarginX, 19 * scale, pageWidth - tallyMarginX, 19 * scale);

    const midX = pageWidth / 2;

    // Quadrant 1: Seller / Company Details (Top Left)
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(descriptor.senderLabel, tallyMarginX + 2, 23 * scale);
    doc.setTextColor(...textDark);
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(11);
    doc.text(bizName, tallyMarginX + 2, 27.5 * scale);
    doc.setFont(fontStyle, "normal");
    doc.setFontSize(7.5);
    let sellerY = 31.5 * scale;
    if (data.business_details?.address) {
        const addrLines = doc.splitTextToSize(safeText(data.business_details.address), midX - tallyMarginX - 4);
        doc.text(addrLines, tallyMarginX + 2, sellerY);
        sellerY += addrLines.length * 3.4 * scale;
    }
    if (data.business_details?.phone) {
        doc.text(`Phone: ${safeText(data.business_details.phone)}`, tallyMarginX + 2, sellerY);
        sellerY += 3.6 * scale;
    }
    if (data.business_details?.gst) {
        doc.setFont(fontStyle, "bold");
        doc.text(`GSTIN/UIN: ${safeText(data.business_details.gst)}`, tallyMarginX + 2, sellerY);
        doc.setFont(fontStyle, "normal");
        sellerY += 3.6 * scale;
    }

    // Quadrant 2: Invoice / Bill Metadata (Top Right)
    let metaY = 23 * scale;
    const metaLabelX = midX + 2;
    const metaValX = pageWidth - tallyMarginX - 2;

    doc.setFont(fontStyle, "normal");
    doc.setFontSize(7.5);
    doc.text(descriptor.numberLabel, metaLabelX, metaY);
    doc.setFont(fontStyle, "bold");
    doc.text(safeText(data.invoice_number), metaValX, metaY, { align: "right" });
    metaY += 4.8 * scale;

    doc.setFont(fontStyle, "normal");
    doc.text(descriptor.dateLabel, metaLabelX, metaY);
    doc.setFont(fontStyle, "bold");
    doc.text(dateFormatted, metaValX, metaY, { align: "right" });
    metaY += 4.8 * scale;

    doc.setFont(fontStyle, "normal");
    doc.text(descriptor.dueDateLabel, metaLabelX, metaY);
    doc.text(dueDateFormatted ? dueDateFormatted : descriptor.defaultDueDateText, metaValX, metaY, { align: "right" });
    metaY += 4.8 * scale;

    doc.text(descriptor.statusHeaderLabel, metaLabelX, metaY);
    const statusLabel = balanceDue <= 0 && isFullyPaid 
        ? (descriptor.isOrder ? "Confirmed / Settled" : "Immediate / Paid") 
        : (amountPaid > 0 ? `Partial (Due: Rs. ${balanceDue.toFixed(2)})` : (data.status ? safeText(data.status).toUpperCase().replace("_", " ") : "Pending / Due"));
    doc.setFont(fontStyle, "bold");
    if (balanceDue <= 0 && isFullyPaid) doc.setTextColor(22, 101, 52);
    else if (amountPaid > 0) doc.setTextColor(180, 83, 9);
    else doc.setTextColor(220, 38, 38);
    doc.text(statusLabel, metaValX, metaY, { align: "right" });
    doc.setTextColor(...textDark);
    metaY += 4.8 * scale;

    // Horizontal dividing line between Quadrants 1/2 and 3/4
    const middleY = Math.max(sellerY + 2, metaY + 2, 45 * scale);
    doc.line(tallyMarginX, middleY, pageWidth - tallyMarginX, middleY);

    // Quadrant 3: Buyer Details or Supplier Details (Bottom Left)
    let buyerY = middleY + 4 * scale;
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(descriptor.partyLabel, tallyMarginX + 2, buyerY);
    doc.setTextColor(...textDark);
    buyerY += 4.2 * scale;
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(10);
    doc.text(safeText(data.customer_name || (descriptor.isPurchaseFlow ? "Vendor / Supplier" : "Walk-in Guest")), tallyMarginX + 2, buyerY);
    doc.setFont(fontStyle, "normal");
    doc.setFontSize(7.5);
    buyerY += 4 * scale;
    if (data.customer_phone) {
        doc.text(`Phone: ${safeText(data.customer_phone)}`, tallyMarginX + 2, buyerY);
        buyerY += 3.6 * scale;
    }
    if (data.customer_email) {
        doc.text(`Email: ${safeText(data.customer_email)}`, tallyMarginX + 2, buyerY);
        buyerY += 3.6 * scale;
    }
    if (custGSTIN) {
        doc.setFont(fontStyle, "bold");
        doc.text(`GSTIN/UIN: ${custGSTIN}`, tallyMarginX + 2, buyerY);
        doc.setFont(fontStyle, "normal");
        buyerY += 3.6 * scale;
    }

    // Quadrant 4: Consignee Details (Bottom Right)
    let shipY = middleY + 4 * scale;
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(descriptor.consigneeLabel, midX + 2, shipY);
    doc.setTextColor(...textDark);
    shipY += 4.2 * scale;
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(9.5);
    doc.text(descriptor.isPurchaseFlow ? bizName : safeText(data.customer_name || "Walk-in Guest"), midX + 2, shipY);
    doc.setFont(fontStyle, "normal");
    doc.setFontSize(7.5);
    shipY += 4 * scale;
    const consigneeAddress = descriptor.isPurchaseFlow 
        ? (data.business_details?.address ? safeText(data.business_details.address).slice(0, 45) : "Business Premises / Receiving Bay")
        : "Same as billing address";
    doc.text(consigneeAddress, midX + 2, shipY);
    shipY += 4 * scale;

    // Compute table start Y
    const tableStartY = Math.max(buyerY + 3, shipY + 3, middleY + 24 * scale);

    // Vertical divider between quadrants
    doc.line(midX, 19 * scale, midX, tableStartY);

    // Border above table
    doc.line(tallyMarginX, tableStartY, pageWidth - tallyMarginX, tableStartY);

    // Standard Tally Table: support showing or hiding individual product Tax % column
    const tableHeadTally = showItemTaxRate ? [[
        { content: "S.No", styles: { halign: 'center' } },
        { content: "Description of Goods", styles: { halign: 'left' } },
        { content: "Qty", styles: { halign: 'center' } },
        { content: "Rate", styles: { halign: 'right' } },
        { content: "per", styles: { halign: 'center' } },
        { content: "Tax %", styles: { halign: 'center' } },
        { content: "Amount", styles: { halign: 'right' } }
    ]] : [[
        { content: "S.No", styles: { halign: 'center' } },
        { content: "Description of Goods", styles: { halign: 'left' } },
        { content: "Qty", styles: { halign: 'center' } },
        { content: "Rate", styles: { halign: 'right' } },
        { content: "per", styles: { halign: 'center' } },
        { content: "Amount", styles: { halign: 'right' } }
    ]];

    const tableRowsTally = data.items.map((item, index) => {
        const itemTax = item.tax_rate !== undefined && item.tax_rate !== null && item.tax_rate !== ''
            ? `${Number(item.tax_rate)}%`
            : (taxRateVal > 0 ? `${taxRateVal}%` : "0%");
        return showItemTaxRate ? [
            (index + 1).toString(),
            safeText(item.description) + (item.hsn_code ? `\nHSN: ${safeText(item.hsn_code)}` : ""),
            item.quantity.toString(),
            formatAmountClean(item.price),
            safeText(item.unit || "pcs"),
            itemTax,
            formatAmountClean(item.total ?? (Number(item.quantity) * Number(item.price)))
        ] : [
            (index + 1).toString(),
            safeText(item.description) + (item.hsn_code ? `\nHSN: ${safeText(item.hsn_code)}` : ""),
            item.quantity.toString(),
            formatAmountClean(item.price),
            safeText(item.unit || "pcs"),
            formatAmountClean(item.total ?? (Number(item.quantity) * Number(item.price)))
        ];
    });

    const columnStylesTally = showItemTaxRate ? {
        0: { cellWidth: 10 * scale, halign: 'center' }, 
        2: { cellWidth: 14 * scale, halign: 'center' }, 
        3: { cellWidth: 24 * scale, halign: 'right' }, 
        4: { cellWidth: 12 * scale, halign: 'center' },
        5: { cellWidth: 16 * scale, halign: 'center' },
        6: { cellWidth: 28 * scale, halign: 'right' } 
    } : {
        0: { cellWidth: 12 * scale, halign: 'center' }, 
        2: { cellWidth: 16 * scale, halign: 'center' }, 
        3: { cellWidth: 28 * scale, halign: 'right' }, 
        4: { cellWidth: 14 * scale, halign: 'center' },
        5: { cellWidth: 32 * scale, halign: 'right' } 
    };

    autoTable(doc, {
        startY: tableStartY,
        head: tableHeadTally,
        body: tableRowsTally,
        theme: 'grid',
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            fontSize: 8, 
            cellPadding: 2.8, 
            lineWidth: 0.5, 
            lineColor: [0, 0, 0] 
        },
        bodyStyles: { 
            textColor: [0, 0, 0], 
            fontSize: 8, 
            cellPadding: 2.8, 
            lineColor: [0, 0, 0], 
            lineWidth: 0.5 
        },
        columnStyles: columnStylesTally,
        didParseCell: (hookData: any) => {
            const colIdx = hookData.column.index;
            if (showItemTaxRate) {
                if (colIdx === 0 || colIdx === 2 || colIdx === 4 || colIdx === 5) {
                    hookData.cell.styles.halign = 'center';
                } else if (colIdx === 3 || colIdx === 6) {
                    hookData.cell.styles.halign = 'right';
                } else if (colIdx === 1) {
                    hookData.cell.styles.halign = 'left';
                }
            } else {
                if (colIdx === 0 || colIdx === 2 || colIdx === 4) {
                    hookData.cell.styles.halign = 'center';
                } else if (colIdx === 3 || colIdx === 5) {
                    hookData.cell.styles.halign = 'right';
                } else if (colIdx === 1) {
                    hookData.cell.styles.halign = 'left';
                }
            }
        },
        margin: { left: tallyMarginX, right: tallyMarginX },
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // Footer height: dynamically accommodate Bank details, UPI QR, words, totals, and signature
    const hasBankOrUpi = Boolean(resolvedBank || upiQrBase64);
    const footerHeight = (hasBankOrUpi ? 72 : 54) * scale;
    finalY = handleContinuationPage(doc, finalY, pageHeight, pageWidth, lineDark, theme, data.invoice_number, bizName, footerHeight);

    const footerStartY = Math.max(finalY, pageHeight - tallyMarginY - footerHeight);

    doc.setDrawColor(...lineDark);
    doc.setLineWidth(0.5);

    // Dynamic continuation vertical lines derived from actual table columns
    const headCells = (doc as any).lastAutoTable?.head?.[0]?.cells;
    if (headCells && finalY < footerStartY) {
        const cellKeys = Object.keys(headCells);
        for (let i = 0; i < cellKeys.length - 1; i++) {
            const c = headCells[cellKeys[i]];
            if (c && typeof c.x === 'number' && typeof c.width === 'number') {
                const lineX = c.x + c.width;
                doc.line(lineX, finalY, lineX, footerStartY);
            }
        }
    }

    // Box for bank/amount details starting at footerStartY
    doc.rect(tallyMarginX, footerStartY, pageWidth - 2 * tallyMarginX, (pageHeight - tallyMarginY) - footerStartY);
    
    // Vertical split: left column for words/bank/declaration, right for financial breakdown & signature
    const splitX = pageWidth - (80 * scale);
    doc.line(splitX, footerStartY, splitX, pageHeight - tallyMarginY);
    
    // --- LEFT COLUMN: Words, Bank Details (if active), Declaration ---
    doc.setFont(fontStyle, "normal");
    doc.setFontSize(7.5);
    doc.text("Amount Chargeable (in words):", tallyMarginX + 2, footerStartY + 4.5);
    
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(8);
    const wordsText = convertAmountToIndianWords(data.total_amount);
    const splitWords = doc.splitTextToSize(wordsText, splitX - tallyMarginX - 4);
    doc.text(splitWords, tallyMarginX + 2, footerStartY + 8.5);

    if (hasBankOrUpi) {
        // Divider 1: between words and Bank/UPI
        const line1Y = footerStartY + 14 * scale;
        doc.line(tallyMarginX, line1Y, splitX, line1Y);

        const qrSize = upiQrBase64 ? 20 * scale : 0;
        const qrX = splitX - qrSize - 3 * scale;
        const qrY = line1Y + 2.5 * scale;

        if (upiQrBase64) {
            doc.addImage(upiQrBase64.dataUrl, "PNG", qrX, qrY, qrSize, qrSize);
            doc.setFontSize(5.5);
            doc.setFont(fontStyle, "bold");
            doc.text("SCAN TO PAY (UPI)", qrX + qrSize / 2, qrY + qrSize + 2.5 * scale, { align: "center" });
        }

        let textY = line1Y + 4 * scale;

        if (resolvedBank) {
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(7.5);
            doc.text("Company's Bank Details:", tallyMarginX + 2, textY);
            textY += 3.5 * scale;
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(7);
            doc.text(`Bank Name : ${resolvedBank.bankName}`, tallyMarginX + 2, textY);
            textY += 3.1 * scale;
            doc.text(`A/c No.   : ${resolvedBank.accountNumber}`, tallyMarginX + 2, textY);
            textY += 3.1 * scale;
            const branchIfsc = [
                resolvedBank.branchName ? `Branch: ${resolvedBank.branchName}` : '',
                resolvedBank.ifscCode ? `IFSC: ${resolvedBank.ifscCode}` : ''
            ].filter(Boolean).join("  |  ");
            if (branchIfsc) {
                doc.text(branchIfsc, tallyMarginX + 2, textY);
                textY += 3.1 * scale;
            }
        } else if (upiQrBase64) {
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(7.5);
            doc.text("Instant Payment via UPI:", tallyMarginX + 2, textY);
            textY += 3.5 * scale;
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(7);
            doc.text(`UPI ID / VPA : ${resolvedUpiId}`, tallyMarginX + 2, textY);
            textY += 3.1 * scale;
            doc.text(`Payee Name   : ${bizName.slice(0, 32)}`, tallyMarginX + 2, textY);
            textY += 3.1 * scale;
            doc.text(`Amount       : ${formatCurrencySafe(balanceDue > 0 ? balanceDue : totalAmount)}`, tallyMarginX + 2, textY);
            textY += 3.1 * scale;
        }

        // Divider 2: between Bank/UPI and Declaration
        const line2Y = line1Y + 28 * scale;
        doc.line(tallyMarginX, line2Y, splitX, line2Y);

        // Declaration
        const declY = line2Y + 3.8 * scale;
        doc.setFont(fontStyle, "bold");
        doc.setFontSize(7.5);
        doc.text(descriptor.declarationTitle, tallyMarginX + 2, declY);

        doc.setFont(fontStyle, "normal");
        doc.setFontSize(6.8);
        const termsText = customTerms || descriptor.defaultDeclaration;
        const splitTerms = doc.splitTextToSize(termsText, splitX - tallyMarginX - 4);
        doc.text(splitTerms, tallyMarginX + 2, declY + 3.5 * scale);

        // Seal note at bottom left
        doc.setFont(fontStyle, "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(110, 110, 110);
        doc.text(descriptor.isPurchaseFlow ? "Receiver's / Store's Seal & Signature" : "Customer's Seal and Signature", tallyMarginX + 2, pageHeight - tallyMarginY - 2.5 * scale);
        doc.setTextColor(...textDark);

    } else {
        // Divider 1: between words and Declaration
        const line1Y = footerStartY + 15 * scale;
        doc.line(tallyMarginX, line1Y, splitX, line1Y);

        // Declaration
        const declY = line1Y + 4 * scale;
        doc.setFont(fontStyle, "bold");
        doc.setFontSize(7.5);
        doc.text(descriptor.declarationTitle, tallyMarginX + 2, declY);

        doc.setFont(fontStyle, "normal");
        doc.setFontSize(6.8);
        const termsText = customTerms || descriptor.defaultDeclaration;
        const splitTerms = doc.splitTextToSize(termsText, splitX - tallyMarginX - 4);
        doc.text(splitTerms, tallyMarginX + 2, declY + 3.5 * scale);

        // Seal note at bottom left
        doc.setFont(fontStyle, "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(110, 110, 110);
        doc.text(descriptor.isPurchaseFlow ? "Receiver's / Store's Seal & Signature" : "Customer's Seal and Signature", tallyMarginX + 2, pageHeight - tallyMarginY - 2.5 * scale);
        doc.setTextColor(...textDark);
    }

    // --- RIGHT COLUMN: Summary & Signatory ---
    let rightY = footerStartY + 4.2 * scale;
    doc.setFont(fontStyle, "normal");
    doc.setFontSize(8);
    
    doc.text(descriptor.subtotalLabel, splitX + 2, rightY);
    doc.text(formatCurrencySafe(data.subtotal), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
    rightY += 4.2 * scale;
    
    if (data.discount_amount && data.discount_amount > 0) {
        doc.text("Discount:", splitX + 2, rightY);
        doc.text(`-${formatCurrencySafe(data.discount_amount)}`, pageWidth - tallyMarginX - 2, rightY, { align: "right" });
        rightY += 4.2 * scale;
    }
    if (data.tax_amount && data.tax_amount > 0) {
        const tr = taxRateVal;
        if (data.igst !== undefined && Number(data.igst) > 0) {
            doc.text(`IGST (${tr}%):`, splitX + 2, rightY);
            doc.text(formatCurrencySafe(Number(data.igst)), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
            rightY += 4.0 * scale;
        } else {
            doc.text(`CGST (${tr/2}%):`, splitX + 2, rightY);
            doc.text(formatCurrencySafe(cgstVal), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
            rightY += 4.0 * scale;
            doc.text(`SGST (${tr/2}%):`, splitX + 2, rightY);
            doc.text(formatCurrencySafe(sgstVal), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
            rightY += 4.0 * scale;
        }
    }
    
    doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(9);
    doc.text(descriptor.totalLabel, splitX + 2, rightY + 3.8 * scale);
    doc.text(formatCurrencySafe(data.total_amount), pageWidth - tallyMarginX - 2, rightY + 3.8 * scale, { align: "right" });
    rightY += 5.8 * scale;

    // Partial Payment Breakdown
    doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);
    doc.setFont(fontStyle, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52); // Forest green
    doc.text(descriptor.paidLabel, splitX + 2, rightY + 3.2 * scale);
    doc.text(formatCurrencySafe(amountPaid), pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
    rightY += 4.8 * scale;

    doc.setFont(fontStyle, "bold");
    if (balanceDue > 0) {
        doc.setTextColor(185, 28, 28); // Crimson red
        doc.text(descriptor.balanceLabel, splitX + 2, rightY + 3.2 * scale);
        doc.text(formatCurrencySafe(balanceDue), pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
    } else {
        doc.setTextColor(22, 101, 52); // Forest green
        doc.text(descriptor.balanceLabel, splitX + 2, rightY + 3.2 * scale);
        doc.text("0.00 (PAID / SETTLED)", pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
    }
    doc.setTextColor(...textDark);
    rightY += 5.2 * scale;

    // CA-Grade Party Previous Due & Net Balance Breakdown (FinFlow Billing Standard)
    if (shouldShowPartyBalance) {
        doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);
        doc.setFont(fontStyle, "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(70, 70, 70);
        const prevBalLabel = prevBalanceVal >= 0 ? "Previous Pending (Dr):" : "Previous Advance (Cr):";
        doc.text(prevBalLabel, splitX + 2, rightY + 3.2 * scale);
        const prevBalFormatted = (prevBalanceVal < 0 ? "-" : "") + formatCurrencySafe(Math.abs(prevBalanceVal));
        doc.text(prevBalFormatted, pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
        rightY += 4.5 * scale;

        doc.setFont(fontStyle, "bold");
        doc.setFontSize(8);
        if (closingNetDueVal > 0) {
            doc.setTextColor(185, 28, 28); // Crimson red
            doc.text("Current Pending Balance:", splitX + 2, rightY + 3.2 * scale);
            doc.text(`${formatCurrencySafe(closingNetDueVal)} Dr`, pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
        } else if (closingNetDueVal < 0) {
            doc.setTextColor(22, 101, 52); // Forest green
            doc.text("Current Advance Balance:", splitX + 2, rightY + 3.2 * scale);
            doc.text(`${formatCurrencySafe(Math.abs(closingNetDueVal))} Cr`, pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
        } else {
            doc.setTextColor(22, 101, 52);
            doc.text("Current Pending Balance:", splitX + 2, rightY + 3.2 * scale);
            doc.text("0.00 (SETTLED)", pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
        }
        doc.setTextColor(...textDark);
        rightY += 5.2 * scale;
    }

    doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);

    // Signatory Box
    const signatoryBoxTop = rightY;
    const signatoryBoxBottom = pageHeight - tallyMarginY;
    const rightColWidth = (pageWidth - tallyMarginX) - splitX;
    const signatoryCenterX = splitX + rightColWidth / 2;

    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    const forBizText = descriptor.signatoryCompanyText(bizName);
    const splitForBiz = doc.splitTextToSize(forBizText, rightColWidth - 4);
    doc.text(splitForBiz, splitX + 2, signatoryBoxTop + 3.5 * scale);
    const bizTextH = splitForBiz.length * 3.2 * scale;

    // Authorized Signatory anchor at bottom
    doc.setFont(fontStyle, "normal");
    doc.setFontSize(7.5);
    doc.text(descriptor.signatoryRoleText, signatoryCenterX, signatoryBoxBottom - 2.5 * scale, { align: "center" });

    // Signature Image strictly placed in the available slot between forBizText and Authorized Signatory
    if (signatureBase64) {
        const sigSlotTop = signatoryBoxTop + 3.5 * scale + bizTextH + 1.5 * scale;
        const sigSlotBottom = signatoryBoxBottom - 6.5 * scale;
        const maxSigH = Math.max(6, sigSlotBottom - sigSlotTop);
        const maxSigW = rightColWidth - 8 * scale;

        let renderW = signatureBase64.width;
        let renderH = signatureBase64.height;
        const ratio = Math.min(maxSigW / renderW, maxSigH / renderH);
        renderW *= ratio;
        renderH *= ratio;

        const sigY = sigSlotTop + (maxSigH - renderH) / 2;
        const sigX = signatoryCenterX - renderW / 2;
        doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
    }

}
