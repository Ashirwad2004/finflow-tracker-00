import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ThemeRenderContext } from "../types";
import {
    handleContinuationPage,
    convertAmountToIndianWords,
    formatCurrencySafe
} from "../helpers";

export function renderSaleInvoice(ctx: ThemeRenderContext): void {
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
        customTerms,
        profile
    } = ctx;

    // --- VYAPAR-STYLE "SALE INVOICE" THEME ---
    const borderDark: [number, number, number] = [0, 0, 0];
    const textDark: [number, number, number] = [0, 0, 0];
    const skyBg: [number, number, number] = [217, 240, 252]; // #D9F0FC
    const bannerSkyBg: [number, number, number] = [152, 213, 247]; // #98D5F7
    const fontStyle = "helvetica";
    const saleMarginX = 10 * scale;
    const saleMarginY = 10 * scale;
    const contentW = pageWidth - 2 * saleMarginX;

    // Outer Page Border
    doc.setDrawColor(...borderDark);
    doc.setLineWidth(0.4);
    doc.rect(saleMarginX, saleMarginY, contentW, pageHeight - 2 * saleMarginY);

    // 1. Company Header (Sky Blue Box #D9F0FC)
    const compBoxH = 26 * scale;
    doc.setFillColor(...skyBg);
    doc.rect(saleMarginX, saleMarginY, contentW, compBoxH, 'FD');

    doc.setFont(fontStyle, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...textDark);
    doc.text("Company Name: ", saleMarginX + 3, saleMarginY + 5.5 * scale);
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(9.5);
    doc.text(safeText(bizName), saleMarginX + 30 * scale, saleMarginY + 5.5 * scale);

    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    doc.text("Address: ", saleMarginX + 3, saleMarginY + 11.5 * scale);
    doc.setFont(fontStyle, "normal");
    const addrLine = safeText(data.business_details?.address || profile?.business_address || profile?.address || "-");
    const splitCompAddr = doc.splitTextToSize(addrLine, contentW - 35 * scale);
    doc.text(splitCompAddr[0] || "-", saleMarginX + 18 * scale, saleMarginY + 11.5 * scale);

    const phoneVal = safeText(data.business_details?.phone || profile?.business_phone || profile?.phone || "-");
    const emailVal = safeText(data.business_details?.email || profile?.email || "-");
    const gstinVal = safeText(data.business_details?.gst || profile?.gst_number || profile?.gstin || "-");
    const stateVal = safeText(data.business_details?.state || profile?.state || data.place_of_supply || "State");
    const midCompX = saleMarginX + contentW * 0.52;

    doc.setFont(fontStyle, "bold");
    doc.text("Phone No.: ", saleMarginX + 3, saleMarginY + 17.5 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(phoneVal, saleMarginX + 20 * scale, saleMarginY + 17.5 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("Email ID: ", midCompX, saleMarginY + 17.5 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(emailVal, midCompX + 16 * scale, saleMarginY + 17.5 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("GSTIN No.: ", saleMarginX + 3, saleMarginY + 23 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(gstinVal, saleMarginX + 20 * scale, saleMarginY + 23 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("State: ", midCompX, saleMarginY + 23 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(stateVal, midCompX + 16 * scale, saleMarginY + 23 * scale);

    // Divider under company info
    doc.line(saleMarginX, saleMarginY + compBoxH, saleMarginX + contentW, saleMarginY + compBoxH);

    // 2. Banner Bar Ribbon: "TAX INVOICE"
    const bannerY = saleMarginY + compBoxH;
    const bannerH = 7 * scale;
    doc.setFillColor(...bannerSkyBg);
    doc.rect(saleMarginX, bannerY, contentW, bannerH, 'FD');

    doc.setFont(fontStyle, "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(descriptor.title || "TAX INVOICE", saleMarginX + contentW / 2, bannerY + 5 * scale, { align: "center" });
    doc.line(saleMarginX, bannerY + bannerH, saleMarginX + contentW, bannerY + bannerH);

    // 3. Bill Details & Invoice Details Split Box
    const detailsY = bannerY + bannerH;
    const detailsH = 34 * scale;
    const detailsSplitX = saleMarginX + contentW * 0.58;

    doc.rect(saleMarginX, detailsY, contentW, detailsH);
    doc.line(detailsSplitX, detailsY, detailsSplitX, detailsY + detailsH);

    // Left: Bill Details
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(8.5);
    doc.text("Bill Details", saleMarginX + 3, detailsY + 5 * scale);

    doc.setFontSize(7.5);
    doc.text("Party Name: ", saleMarginX + 3, detailsY + 10.5 * scale);
    doc.setFont(fontStyle, "bold");
    doc.text(safeText(data.customer_name || "Cash Customer"), saleMarginX + 22 * scale, detailsY + 10.5 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("Address: ", saleMarginX + 3, detailsY + 15.5 * scale);
    doc.setFont(fontStyle, "normal");
    const partyAddr = safeText(data.billing_address || data.customer_address || "-");
    const splitPartyAddr = doc.splitTextToSize(partyAddr, detailsSplitX - saleMarginX - 22 * scale);
    doc.text(splitPartyAddr[0] || "-", saleMarginX + 18 * scale, detailsY + 15.5 * scale);

    const custPhone = safeText(data.customer_phone || "-");
    const custEmail = safeText(data.customer_email || "-");
    const custGst = safeText(data.customer_gstin || "-");
    const custState = safeText(data.customer_state || data.place_of_supply || stateVal);
    const billSubX = saleMarginX + (detailsSplitX - saleMarginX) * 0.52;

    doc.setFont(fontStyle, "bold");
    doc.text("Phone No.: ", saleMarginX + 3, detailsY + 22 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(custPhone, saleMarginX + 19 * scale, detailsY + 22 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("Email ID: ", billSubX, detailsY + 22 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(custEmail, billSubX + 15 * scale, detailsY + 22 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("GSTIN No.: ", saleMarginX + 3, detailsY + 28 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(custGst, saleMarginX + 19 * scale, detailsY + 28 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("State: ", billSubX, detailsY + 28 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(custState, billSubX + 15 * scale, detailsY + 28 * scale);

    // Right: Invoice Details
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(8.5);
    doc.text("Invoice Details", detailsSplitX + 3, detailsY + 5 * scale);

    doc.setFontSize(7.5);
    doc.text("Invoice No.: ", detailsSplitX + 3, detailsY + 10.5 * scale);
    doc.setFont(fontStyle, "bold");
    doc.text(safeText(data.invoice_number), detailsSplitX + 26 * scale, detailsY + 10.5 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("Invoice Date: ", detailsSplitX + 3, detailsY + 15.5 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(dateFormatted, detailsSplitX + 26 * scale, detailsY + 15.5 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("Time: ", detailsSplitX + 3, detailsY + 20 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(format(new Date(), "hh:mm a"), detailsSplitX + 26 * scale, detailsY + 20 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("Place of Supply: ", detailsSplitX + 3, detailsY + 24.5 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text(custState, detailsSplitX + 26 * scale, detailsY + 24.5 * scale);

    doc.setFont(fontStyle, "bold");
    doc.text("PO Date: ", detailsSplitX + 3, detailsY + 29 * scale);
    doc.setFont(fontStyle, "normal");
    doc.text("-", detailsSplitX + 26 * scale, detailsY + 29 * scale);

    // 4. Item Table (Vyapar columns)
    const tableStartY = detailsY + detailsH;

    let totalQty = 0;
    let totalGstAmt = 0;

    const tableRowsSale = data.items.map((item, idx) => {
        const q = Number(item.quantity) || 1;
        totalQty += q;
        const p = Number(item.price) || 0;
        const d = Number(item.discount || 0);
        const itemTax = item.tax_rate !== undefined ? Number(item.tax_rate) : taxRateVal;
        const lineTotal = Number(item.total ?? (q * p * (1 - d / 100)));
        const gAmt = lineTotal * (itemTax / 100);
        totalGstAmt += gAmt;

        return [
            String(idx + 1),
            safeText(item.description),
            safeText(item.hsn_code || "-"),
            "-",
            "-",
            p > 0 ? p.toFixed(2) : "-",
            String(q),
            safeText(item.unit || "PCS"),
            p.toFixed(2),
            d > 0 ? `${d}%` : "-",
            itemTax > 0 ? `${itemTax}%` : "0%",
            gAmt.toFixed(2),
            lineTotal.toFixed(2)
        ];
    });

    // Table total row
    tableRowsSale.push([
        "",
        "Total",
        "",
        "",
        "",
        "",
        String(totalQty),
        "",
        "",
        "",
        "",
        totalGstAmt.toFixed(2),
        Number(data.total_amount).toFixed(2)
    ]);

    autoTable(doc, {
        startY: tableStartY,
        head: [[ "Sl.\nNo.", "Item Name", "HSN/SAC", "Batch\nNo.", "Exp.\nDate", "MRP", "QTY", "Unit", "Price/Unit", "Disc", "GST\nRate", "GST\nAmt", "Amount" ]],
        body: tableRowsSale,
        theme: 'grid',
        headStyles: { 
            fillColor: skyBg, 
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            fontSize: 6.8, 
            cellPadding: 1.8, 
            lineColor: borderDark, 
            lineWidth: 0.3 
        },
        bodyStyles: { 
            textColor: [0, 0, 0], 
            fontSize: 6.8, 
            cellPadding: 1.8, 
            lineColor: borderDark, 
            lineWidth: 0.3 
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 9 * scale },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 14 * scale },
            3: { halign: 'center', cellWidth: 12 * scale },
            4: { halign: 'center', cellWidth: 12 * scale },
            5: { halign: 'right', cellWidth: 13 * scale },
            6: { halign: 'center', cellWidth: 10 * scale },
            7: { halign: 'center', cellWidth: 10 * scale },
            8: { halign: 'right', cellWidth: 15 * scale },
            9: { halign: 'center', cellWidth: 11 * scale },
            10: { halign: 'center', cellWidth: 12 * scale },
            11: { halign: 'right', cellWidth: 14 * scale },
            12: { halign: 'right', cellWidth: 17 * scale },
        },
        didParseCell: (hookData: any) => {
            if (hookData.row.index === tableRowsSale.length - 1) {
                hookData.cell.styles.fontStyle = 'bold';
                hookData.cell.styles.fillColor = [240, 248, 255];
            }
        },
        margin: { left: saleMarginX, right: saleMarginX },
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // 5. Footer & Totals Section
    const footerHeight = (resolvedBank || upiQrBase64 ? 75 : 58) * scale;
    finalY = handleContinuationPage(doc, finalY, pageHeight, pageWidth, borderDark, 'tally-accounting', data.invoice_number, bizName, footerHeight);

    const footerStartY = Math.max(finalY, pageHeight - saleMarginY - footerHeight);
    const footerBoxH = (pageHeight - saleMarginY) - footerStartY;

    // Footer outer box
    doc.setDrawColor(...borderDark);
    doc.rect(saleMarginX, footerStartY, contentW, footerBoxH);

    // Vertical divider separating Left (words/terms/bank) and Right (summary & signature)
    const splitX = pageWidth - saleMarginX - (68 * scale);
    doc.line(splitX, footerStartY, splitX, pageHeight - saleMarginY);

    // --- LEFT COLUMN ---
    let leftY = footerStartY + 3.5 * scale;
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    doc.text("Description:", saleMarginX + 2, leftY);
    doc.setFont(fontStyle, "normal");
    const noteText = safeText(data.notes || "Goods once sold will not be taken back.");
    const splitNote = doc.splitTextToSize(noteText, splitX - saleMarginX - 4);
    doc.text(splitNote[0] || "", saleMarginX + 20 * scale, leftY);
    leftY += 4.5 * scale;

    // Ribbon: Invoice Amount In Words
    doc.setFillColor(...skyBg);
    doc.rect(saleMarginX, leftY, splitX - saleMarginX, 5 * scale, 'FD');
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    doc.text("Invoice Amount In Words:", saleMarginX + 2, leftY + 3.6 * scale);
    leftY += 5 * scale;

    const wordsText = convertAmountToIndianWords(data.total_amount);
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    const splitWords = doc.splitTextToSize(wordsText, splitX - saleMarginX - 4);
    doc.text(splitWords, saleMarginX + 2, leftY + 3.8 * scale);
    leftY += Math.max(7 * scale, splitWords.length * 3.6 * scale + 2 * scale);

    // Ribbon: Terms and Conditions
    doc.setFillColor(...skyBg);
    doc.rect(saleMarginX, leftY, splitX - saleMarginX, 5 * scale, 'FD');
    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    doc.text("Terms and Conditions:", saleMarginX + 2, leftY + 3.6 * scale);
    leftY += 5 * scale;

    doc.setFont(fontStyle, "normal");
    doc.setFontSize(6.8);
    const termsStr = customTerms || descriptor.defaultDeclaration;
    const splitTerms = doc.splitTextToSize(termsStr, splitX - saleMarginX - 4);
    doc.text(splitTerms, saleMarginX + 2, leftY + 3.5 * scale);
    leftY += Math.max(7 * scale, splitTerms.length * 3.2 * scale + 2 * scale);

    // Optional: Bank / UPI on bottom-left
    if (resolvedBank || upiQrBase64) {
        const bankLineY = Math.max(leftY, footerStartY + footerBoxH - 18 * scale);
        doc.line(saleMarginX, bankLineY, splitX, bankLineY);
        if (resolvedBank) {
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(7);
            doc.text(`Bank: ${resolvedBank.bankName}  |  A/c: ${resolvedBank.accountNumber}  |  IFSC: ${resolvedBank.ifscCode || ''}`, saleMarginX + 2, bankLineY + 4 * scale);
        }
        if (upiQrBase64) {
            const qrSize = 14 * scale;
            doc.addImage(upiQrBase64.dataUrl, "PNG", splitX - qrSize - 3 * scale, bankLineY + 2 * scale, qrSize, qrSize);
            doc.setFontSize(6.5);
            doc.text(`UPI: ${resolvedUpiId}`, saleMarginX + 2, bankLineY + 8 * scale);
        }
    }

    // --- RIGHT COLUMN ---
    let rightY = footerStartY + 4 * scale;
    const rValX = pageWidth - saleMarginX - 2;

    doc.setFont(fontStyle, "normal");
    doc.setFontSize(7.5);
    doc.text("Sub Total", splitX + 2, rightY);
    doc.text(formatCurrencySafe(data.subtotal), rValX, rightY, { align: "right" });
    rightY += 4.2 * scale;

    if (data.discount_amount && data.discount_amount > 0) {
        doc.text("Discount", splitX + 2, rightY);
        doc.text(`-${formatCurrencySafe(data.discount_amount)}`, rValX, rightY, { align: "right" });
        rightY += 4.2 * scale;
    }

    doc.setFont(fontStyle, "bold");
    doc.setFontSize(8);
    doc.text("Total Amount", splitX + 2, rightY);
    doc.text(formatCurrencySafe(data.total_amount), rValX, rightY, { align: "right" });
    rightY += 4.5 * scale;

    doc.setFont(fontStyle, "normal");
    doc.setFontSize(7.5);
    doc.text("Received", splitX + 2, rightY);
    doc.text(formatCurrencySafe(amountPaid), rValX, rightY, { align: "right" });
    rightY += 4.2 * scale;

    doc.setFont(fontStyle, "bold");
    doc.text("Balance Amount:", splitX + 2, rightY);
    doc.text(formatCurrencySafe(balanceDue), rValX, rightY, { align: "right" });
    rightY += 4.8 * scale;

    // Party Pending Balance (when enabled)
    if (shouldShowPartyBalance) {
        doc.line(splitX, rightY, pageWidth - saleMarginX, rightY);
        rightY += 1.5 * scale;
        doc.setFont(fontStyle, "normal");
        doc.setFontSize(7);
        doc.text("Previous Pending:", splitX + 2, rightY + 2.5 * scale);
        doc.text((prevBalanceVal < 0 ? "-" : "") + formatCurrencySafe(Math.abs(prevBalanceVal)), rValX, rightY + 2.5 * scale, { align: "right" });
        rightY += 4 * scale;

        doc.setFont(fontStyle, "bold");
        doc.setFontSize(7.5);
        doc.text(closingNetDueVal < 0 ? "Advance Balance:" : "Pending Balance:", splitX + 2, rightY + 2.5 * scale);
        doc.text((closingNetDueVal < 0 ? `${formatCurrencySafe(Math.abs(closingNetDueVal))} Cr` : formatCurrencySafe(closingNetDueVal)), rValX, rightY + 2.5 * scale, { align: "right" });
        rightY += 4.5 * scale;
    }

    // Divider above Signature
    const sigBoxTop = Math.max(rightY + 2 * scale, footerStartY + footerBoxH - 24 * scale);
    doc.line(splitX, sigBoxTop, pageWidth - saleMarginX, sigBoxTop);

    const sigCenterX = splitX + (pageWidth - saleMarginX - splitX) / 2;

    if (signatureBase64) {
        const maxSigH = 14 * scale;
        const maxSigW = (pageWidth - saleMarginX - splitX) - 8 * scale;
        let sW = signatureBase64.width;
        let sH = signatureBase64.height;
        const sRatio = Math.min(maxSigW / sW, maxSigH / sH);
        sW *= sRatio;
        sH *= sRatio;
        const sY = sigBoxTop + 1.5 * scale;
        const sX = sigCenterX - sW / 2;
        doc.addImage(signatureBase64.dataUrl, "PNG", sX, sY, sW, sH);
    }

    doc.setFont(fontStyle, "bold");
    doc.setFontSize(7.5);
    doc.text("Company Seal & Signature", sigCenterX, pageHeight - saleMarginY - 2.5 * scale, { align: "center" });

}
