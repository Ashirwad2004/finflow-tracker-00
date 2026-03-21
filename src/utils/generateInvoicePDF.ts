import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface InvoiceDetails {
    invoice_number: string;
    date: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    items: {
        description: string;
        quantity: number | string;
        price: number | string;
        total: number | string;
    }[];
    subtotal: number;
    discount_amount?: number;
    tax_rate?: number;
    tax_amount?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total_amount: number;
    customer_gstin?: string;
    business_details?: {
        name: string;
        address?: string;
        phone?: string;
        gst?: string;
        logo_url?: string;
        signature_url?: string;
    };
}

const sanitizeText = (text: string) => {
    return text.replace(/[^\x00-\x7F]/g, "");
};

const formatCurrencySafe = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return "0.00";
    return `Rs. ${num.toFixed(2)}`;
};

const fetchImageAsBase64 = async (url: string): Promise<{ dataUrl: string, width: number, height: number } | null> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        dataUrl: reader.result as string,
                        width: img.width,
                        height: img.height
                    });
                };
                img.onerror = reject;
                img.src = reader.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to load image as base64", url, e);
        return null;
    }
};

export const generateInvoicePDF = async (
    data: InvoiceDetails,
    options?: { action?: 'download' | 'preview', theme?: 'corporate' | 'minimalist' | 'retail' | 'tally' | 'gst1', documentTitle?: string }
) => {
    try {
        const doc = new jsPDF();
        const action = options?.action || 'download';
        const theme = options?.theme || localStorage.getItem("finflow_invoice_theme") || 'corporate';
        const documentTitle = options?.documentTitle;

        const safeText = (txt: string | undefined | null) => sanitizeText(txt || "");
        const dateFormatted = data.date ? format(new Date(data.date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy");
        const bizName = safeText(data.business_details?.name || "FinFlow Business");
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        const tableRows = data.items.map(item => [
            safeText(item.description),
            item.quantity.toString(),
            formatCurrencySafe(item.price),
            formatCurrencySafe(Number(item.quantity) * Number(item.price))
        ]);

        // Fetch images
        let logoBase64: { dataUrl: string, width: number, height: number } | null = null;
        let signatureBase64: { dataUrl: string, width: number, height: number } | null = null;

        if (data.business_details?.logo_url) {
            logoBase64 = await fetchImageAsBase64(data.business_details.logo_url);
        }
        if (data.business_details?.signature_url) {
            signatureBase64 = await fetchImageAsBase64(data.business_details.signature_url);
        }

        // Tax logic
        let cgstVal = data.cgst || 0;
        let sgstVal = data.sgst || 0;
        let igstVal = data.igst || 0;
        let isInterState = false;

        const bizGSTIN = data.business_details?.gst?.trim().toUpperCase();
        const custGSTIN = data.customer_gstin?.trim().toUpperCase();
        
        if (data.tax_amount && data.tax_amount > 0 && !cgstVal && !igstVal) {
            // Calculate dynamic split based on GSTINs
            if (bizGSTIN && bizGSTIN.length >= 2 && custGSTIN && custGSTIN.length >= 2) {
                if (bizGSTIN.substring(0, 2) !== custGSTIN.substring(0, 2)) {
                    isInterState = true;
                }
            }
            if (isInterState) {
                igstVal = data.tax_amount;
            } else {
                cgstVal = Number((data.tax_amount / 2).toFixed(2));
                sgstVal = Number((data.tax_amount - cgstVal).toFixed(2));
            }
        }

        if (theme === 'corporate') {
            // --- CORPORATE THEME (Blue Header) ---
            const brandColor: [number, number, number] = [37, 99, 235];
            const textDark: [number, number, number] = [30, 41, 59];
            const textLight: [number, number, number] = [100, 116, 139];
            const lineLight: [number, number, number] = [226, 232, 240];

            doc.setFillColor(...brandColor);
            doc.rect(0, 0, 210, 40, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");

            let currentHeaderY = 26;

            if (logoBase64) {
                // Calculate dimensions to fit inside 30x30 bounding box
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
            doc.text("INVOICE", 196, 20, { align: "right" });
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`No. ${safeText(data.invoice_number)}`, 196, 27, { align: "right" });
            doc.text(`Date: ${dateFormatted}`, 196, 32, { align: "right" });

            doc.setTextColor(...textDark);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("BILL TO", 14, 55);

            doc.setDrawColor(...lineLight);
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

            autoTable(doc, {
                startY: Math.max(85, billY + 10),
                head: [["Item Description", "Qty", "Price", "Amount"]],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: brandColor, textColor: 255, fontStyle: 'bold', fontSize: 10, cellPadding: 4 },
                bodyStyles: { textColor: textDark, fontSize: 9, cellPadding: 4, lineColor: [241, 245, 249] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
                margin: { left: 14, right: 14 },
                didParseCell: (hookData) => {
                    if (hookData.section === 'head') {
                        if (hookData.column.index === 1) hookData.cell.styles.halign = 'center';
                        if (hookData.column.index === 2 || hookData.column.index === 3) hookData.cell.styles.halign = 'right';
                    }
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            const totalBlockX = 120;
            const vAlignX = 196;

            doc.setFontSize(10);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "normal");
            doc.text("Subtotal:", totalBlockX, finalY);
            doc.setTextColor(...textDark);
            doc.text(formatCurrencySafe(data.subtotal), vAlignX, finalY, { align: "right" });

            let currentTotalY = finalY;
            if (data.discount_amount && data.discount_amount > 0) {
                currentTotalY += 7;
                doc.setTextColor(...textLight);
                doc.text("Discount:", totalBlockX, currentTotalY);
                doc.setTextColor(...textDark);
                doc.text(`-${formatCurrencySafe(data.discount_amount)}`, vAlignX, currentTotalY, { align: "right" });
            }

            const splitRate = data.tax_rate ? data.tax_rate / 2 : 0;
            const cgstLabel = splitRate ? `CGST (${splitRate}%):` : "CGST:";
            const sgstLabel = splitRate ? `SGST (${splitRate}%):` : "SGST:";
            const igstLabel = data.tax_rate ? `IGST (${data.tax_rate}%):` : "IGST:";

            if (isInterState && igstVal > 0) {
                currentTotalY += 7;
                doc.setTextColor(...textLight);
                doc.text(igstLabel, totalBlockX, currentTotalY);
                doc.setTextColor(...textDark);
                doc.text(formatCurrencySafe(igstVal), vAlignX, currentTotalY, { align: "right" });
            } else if (!isInterState && (cgstVal > 0 || sgstVal > 0)) {
                if (cgstVal > 0) {
                    currentTotalY += 7;
                    doc.setTextColor(...textLight);
                    doc.text(cgstLabel, totalBlockX, currentTotalY);
                    doc.setTextColor(...textDark);
                    doc.text(formatCurrencySafe(cgstVal), vAlignX, currentTotalY, { align: "right" });
                }
                if (sgstVal > 0) {
                    currentTotalY += 7;
                    doc.setTextColor(...textLight);
                    doc.text(sgstLabel, totalBlockX, currentTotalY);
                    doc.setTextColor(...textDark);
                    doc.text(formatCurrencySafe(sgstVal), vAlignX, currentTotalY, { align: "right" });
                }
            } else if (data.tax_amount && data.tax_amount > 0) {
                currentTotalY += 7;
                doc.setTextColor(...textLight);
                doc.text(`Tax (${data.tax_rate || ''}%):`, totalBlockX, currentTotalY);
                doc.setTextColor(...textDark);
                doc.text(formatCurrencySafe(data.tax_amount), vAlignX, currentTotalY, { align: "right" });
            }

            const totalBoxY = currentTotalY + 5;
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(...lineLight);
            doc.roundedRect(totalBlockX - 5, totalBoxY, 87, 14, 2, 2, "FD");

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...brandColor);
            doc.text("Total Due:", totalBlockX, totalBoxY + 9);
            doc.text(formatCurrencySafe(data.total_amount), vAlignX, totalBoxY + 9, { align: "right" });

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
                const sigX = 196 - renderW; // Align right based on page width (210) margin (14)
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                // Text is also right-aligned relative to the end margin
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(...lineLight);
            doc.line(14, pageHeight - 20, 196, pageHeight - 20);
            doc.setFontSize(9);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "italic");
            doc.text("Thank you for your business. For any inquiries, please contact us.", 105, pageHeight - 12, { align: "center" });

        } else if (theme === 'minimalist') {
            // --- MINIMALIST THEME (Black & White structural) ---
            const textDark: [number, number, number] = [15, 23, 42];
            const textMid: [number, number, number] = [71, 85, 105];

            let myY = 52;
            let headerBaseY = 24;

            if (logoBase64) {
                const maxDim = 28;
                let renderW = logoBase64.width;
                let renderH = logoBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                const startY = 14;
                doc.addImage(logoBase64.dataUrl, "PNG", 14, startY, renderW, renderH);

                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);
                doc.text(bizName, 18 + renderW, 23);
                headerBaseY = Math.max(28, startY + renderH + 5);
            } else {
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(26);
                doc.text(bizName, 14, 24);
                headerBaseY = 32;
            }

            doc.setFontSize(28);
            doc.setFont("helvetica", "bold");
            doc.text((documentTitle || "INVOICE").toUpperCase(), 196, 20, { align: "right" });
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...textMid);
            doc.text(`No. ${safeText(data.invoice_number)}`, 196, 26, { align: "right" });
            doc.text(`Date: ${dateFormatted}`, 196, 31, { align: "right" });

            doc.setDrawColor(15, 23, 42); // Black solid divide
            doc.setLineWidth(0.8);
            doc.line(14, headerBaseY + 8, 196, headerBaseY + 8);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(...textDark);
            doc.setFontSize(10);
            doc.text("YOUR DETAILS", 14, headerBaseY + 16);
            doc.text("CLIENT DETAILS", 120, headerBaseY + 16);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(...textMid);

            myY = headerBaseY + 22;
            if (data.business_details?.address) { doc.text(safeText(data.business_details.address), 14, myY); myY += 5; }
            if (data.business_details?.phone) { doc.text(`P: ${safeText(data.business_details.phone)}`, 14, myY); myY += 5; }
            if (data.business_details?.gst) { doc.text(`GST: ${safeText(data.business_details.gst)}`, 14, myY); }

            let clientY = headerBaseY + 22;
            doc.setTextColor(...textDark);
            doc.text(safeText(data.customer_name), 120, clientY); clientY += 5;
            doc.setTextColor(...textMid);
            if (data.customer_phone) { doc.text(`P: ${safeText(data.customer_phone)}`, 120, clientY); clientY += 5; }
            if (data.customer_email) { doc.text(`E: ${safeText(data.customer_email)}`, 120, clientY); clientY += 5; }
            if (custGSTIN) { doc.text(`GST: ${custGSTIN}`, 120, clientY); }

            autoTable(doc, {
                startY: Math.max(75, Math.max(myY, clientY) + 10),
                head: [["DESCRIPTION", "QTY", "PRICE", "TOTAL"]],
                body: tableRows,
                theme: 'plain',
                headStyles: { textColor: textDark, fontStyle: 'bold', fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 0, right: 0 }, lineWidth: { bottom: 1, top: 0, left: 0, right: 0 }, lineColor: textDark },
                bodyStyles: { textColor: textMid, fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 0, right: 0 }, lineWidth: { bottom: 0.1, top: 0, left: 0, right: 0 }, lineColor: [203, 213, 225] },
                columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 31, halign: 'right' }, 3: { cellWidth: 31, halign: 'right' } },
                margin: { left: 14, right: 14 },
                didParseCell: (hookData) => {
                    if (hookData.section === 'head') {
                        if (hookData.column.index === 1) hookData.cell.styles.halign = 'center';
                        if (hookData.column.index === 2 || hookData.column.index === 3) hookData.cell.styles.halign = 'right';
                    }
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            const totalBlockX = 140;
            const vAlignX = 196;

            doc.setFontSize(9);
            doc.setTextColor(...textMid);
            doc.text("Subtotal", totalBlockX, finalY);
            doc.setTextColor(...textDark);
            doc.text(formatCurrencySafe(data.subtotal), vAlignX, finalY, { align: "right" });

            let currentTotalY = finalY;
            if (data.discount_amount && data.discount_amount > 0) {
                currentTotalY += 6;
                doc.setTextColor(...textMid);
                doc.text("Discount", totalBlockX, currentTotalY);
                doc.setTextColor(...textDark);
                doc.text(`-${formatCurrencySafe(data.discount_amount)}`, vAlignX, currentTotalY, { align: "right" });
            }

            const splitRate = data.tax_rate ? data.tax_rate / 2 : 0;
            const cgstLabel = splitRate ? `CGST (${splitRate}%)` : "CGST";
            const sgstLabel = splitRate ? `SGST (${splitRate}%)` : "SGST";
            const igstLabel = data.tax_rate ? `IGST (${data.tax_rate}%)` : "IGST";

            if (isInterState && igstVal > 0) {
                currentTotalY += 6;
                doc.setTextColor(...textMid);
                doc.text(igstLabel, totalBlockX, currentTotalY);
                doc.setTextColor(...textDark);
                doc.text(formatCurrencySafe(igstVal), vAlignX, currentTotalY, { align: "right" });
            } else if (!isInterState && (cgstVal > 0 || sgstVal > 0)) {
                if (cgstVal > 0) {
                    currentTotalY += 6;
                    doc.setTextColor(...textMid);
                    doc.text(cgstLabel, totalBlockX, currentTotalY);
                    doc.setTextColor(...textDark);
                    doc.text(formatCurrencySafe(cgstVal), vAlignX, currentTotalY, { align: "right" });
                }
                if (sgstVal > 0) {
                    currentTotalY += 6;
                    doc.setTextColor(...textMid);
                    doc.text(sgstLabel, totalBlockX, currentTotalY);
                    doc.setTextColor(...textDark);
                    doc.text(formatCurrencySafe(sgstVal), vAlignX, currentTotalY, { align: "right" });
                }
            } else if (data.tax_amount && data.tax_amount > 0) {
                currentTotalY += 6;
                doc.setTextColor(...textMid);
                doc.text(`Tax (${data.tax_rate || ''}%)`, totalBlockX, currentTotalY);
                doc.setTextColor(...textDark);
                doc.text(formatCurrencySafe(data.tax_amount), vAlignX, currentTotalY, { align: "right" });
            }

            currentTotalY += 6;
            doc.setDrawColor(...textDark);
            doc.setLineWidth(0.5);
            doc.line(totalBlockX, currentTotalY, vAlignX, currentTotalY);

            currentTotalY += 8;
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...textDark);
            doc.text("TOTAL DUE", totalBlockX, currentTotalY);
            doc.text(formatCurrencySafe(data.total_amount), vAlignX, currentTotalY, { align: "right" });

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
                const sigX = 196 - renderW; // Align right
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...textMid);
            doc.text(safeText(data.business_details?.name || "Thank you for your business."), 14, pageHeight - 12);

        } else if (theme === 'retail') {
            // --- RETAIL THEME (Modern Edge Banner) ---
            const accentColor: [number, number, number] = [14, 165, 233]; // sky-500
            const textDark: [number, number, number] = [15, 23, 42];
            const lineLight: [number, number, number] = [226, 232, 240];

            doc.setFillColor(240, 249, 255); // sky-50 right side tray
            doc.rect(130, 0, 80, pageHeight, "F");
            doc.setDrawColor(186, 230, 253); // sky-200 border
            doc.setLineWidth(0.5);
            doc.line(130, 0, 130, pageHeight);

            let myY = 35;
            if (logoBase64) {
                const maxDim = 26;
                let renderW = logoBase64.width;
                let renderH = logoBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                const startY = 16;
                doc.addImage(logoBase64.dataUrl, "PNG", 14, startY, renderW, renderH);

                doc.setTextColor(...accentColor);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(18);
                doc.text(doc.splitTextToSize(bizName, 80), 18 + renderW, 25);
                myY = Math.max(35, startY + renderH + 5);
            } else {
                doc.setTextColor(...accentColor);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(24);
                doc.text(doc.splitTextToSize(bizName, 110), 14, 25);
            }

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...textDark);
            if (data.business_details?.address) { doc.text(doc.splitTextToSize(safeText(data.business_details.address), 110), 14, myY); myY += 5; }
            if (data.business_details?.phone) { doc.text(`Phone: ${safeText(data.business_details.phone)}`, 14, myY); myY += 5; }
            if (data.business_details?.gst) { doc.text(`GSTIN: ${safeText(data.business_details.gst)}`, 14, myY); }

            doc.setTextColor(...accentColor);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(documentTitle || "INVOICE", 140, 25);

            doc.setFontSize(10);
            doc.setTextColor(...textDark);
            doc.text(safeText(data.invoice_number), 140, 32);
            doc.setFont("helvetica", "normal");
            doc.text(dateFormatted, 140, 37);

            doc.setFont("helvetica", "bold");
            doc.text("BILLED TO", 140, 50);
            doc.setFont("helvetica", "normal");
            doc.text(doc.splitTextToSize(safeText(data.customer_name), 65), 140, 56);
            let cliY = 62;
            if (data.customer_phone) { doc.text(safeText(data.customer_phone), 140, cliY); cliY += 5; }
            if (data.customer_email) { doc.text(safeText(data.customer_email), 140, cliY); cliY += 5; }
            if (custGSTIN) { doc.text(`GSTIN: ${custGSTIN}`, 140, cliY); }

            autoTable(doc, {
                startY: Math.max(70, myY + 15),
                head: [["Item Description", "Qty", "Price", "Amount"]],
                body: tableRows,
                theme: 'striped',
                headStyles: { fillColor: [248, 250, 252], textColor: textDark, fontStyle: 'bold', fontSize: 9, cellPadding: 4, lineColor: lineLight, lineWidth: { bottom: 1, top: 1, left: 0, right: 0 } },
                bodyStyles: { textColor: textDark, fontSize: 8, cellPadding: 3 },
                alternateRowStyles: { fillColor: [255, 255, 255] },
                columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 15, halign: 'center' }, 2: { cellWidth: 20, halign: 'right' }, 3: { cellWidth: 25, halign: 'right' } },
                margin: { left: 14, right: 86 }, // Constrain totally entirely to the left white block (210 - 80 tray = 130 max right)
                didParseCell: (hookData) => {
                    if (hookData.section === 'head') {
                        if (hookData.column.index === 1) hookData.cell.styles.halign = 'center';
                        if (hookData.column.index === 2 || hookData.column.index === 3) hookData.cell.styles.halign = 'right';
                    }
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;

            // Render totals in the right sky blue tray panel
            let trayY = Math.max(85, cliY + 15);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...textDark);
            doc.text("Subtotal", 140, trayY);
            doc.text(formatCurrencySafe(data.subtotal), 196, trayY, { align: "right" });

            if (data.discount_amount && data.discount_amount > 0) {
                trayY += 7;
                doc.text("Discount", 140, trayY);
                doc.text(`-${formatCurrencySafe(data.discount_amount)}`, 196, trayY, { align: "right" });
            }

            const splitRate = data.tax_rate ? data.tax_rate / 2 : 0;
            const cgstLabel = splitRate ? `CGST (${splitRate}%)` : "CGST";
            const sgstLabel = splitRate ? `SGST (${splitRate}%)` : "SGST";
            const igstLabel = data.tax_rate ? `IGST (${data.tax_rate}%)` : "IGST";

            if (isInterState && igstVal > 0) {
                trayY += 7;
                doc.text(igstLabel, 140, trayY);
                doc.text(formatCurrencySafe(igstVal), 196, trayY, { align: "right" });
            } else if (!isInterState && (cgstVal > 0 || sgstVal > 0)) {
                if (cgstVal > 0) {
                    trayY += 7;
                    doc.text(cgstLabel, 140, trayY);
                    doc.text(formatCurrencySafe(cgstVal), 196, trayY, { align: "right" });
                }
                if (sgstVal > 0) {
                    trayY += 7;
                    doc.text(sgstLabel, 140, trayY);
                    doc.text(formatCurrencySafe(sgstVal), 196, trayY, { align: "right" });
                }
            } else if (data.tax_amount && data.tax_amount > 0) {
                trayY += 7;
                doc.text(`Tax (${data.tax_rate || ''}%)`, 140, trayY);
                doc.text(formatCurrencySafe(data.tax_amount), 196, trayY, { align: "right" });
            }

            trayY += 8;
            doc.setDrawColor(...accentColor);
            doc.setLineWidth(1);
            doc.line(140, trayY, 196, trayY);

            trayY += 8;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...accentColor);
            doc.text("TOTAL", 140, trayY);
            doc.text(formatCurrencySafe(data.total_amount), 196, trayY, { align: "right" });

            if (signatureBase64) {
                const maxDim = 30;
                let renderW = signatureBase64.width;
                let renderH = signatureBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                const sigY = pageHeight - 40;
                // Retail theme has the right side tray, so position it aligned to the right edge of the tray
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(...lineLight);
            doc.setLineWidth(0.5);
            doc.line(14, pageHeight - 20, 110, pageHeight - 20);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.setFont("helvetica", "italic");
            doc.text("Thank you.", 14, pageHeight - 12);
        } else if (theme === 'tally') {
            // --- TALLY CLASSIC THEME (Boxy, borders, formal) ---
            const textDark: [number, number, number] = [0, 0, 0];
            doc.setTextColor(...textDark);
            doc.setDrawColor(0, 0, 0); // Pure black lines
            doc.setLineWidth(0.3);

            // Outer Border
            doc.rect(10, 10, 190, pageHeight - 20);

            // Title
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text((documentTitle || "TAX INVOICE").toUpperCase(), 105, 16, { align: "center" });

            // Title bottom line
            doc.line(10, 20, 200, 20);

            let myY = 25;
            let myMaxY = 40;

            // Company Name & Address (Left block)
            if (logoBase64) {
                const maxDim = 20;
                let renderW = logoBase64.width;
                let renderH = logoBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                doc.addImage(logoBase64.dataUrl, "PNG", 12, myY, renderW, renderH);
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text(bizName, 14 + renderW, myY + 6);
                myY = Math.max(myY + 12, myY + renderH + 5);
            } else {
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text(bizName, 12, myY + 4);
                myY += 10;
            }

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            if (data.business_details?.address) {
                const addrLines = doc.splitTextToSize(safeText(data.business_details.address), 90);
                doc.text(addrLines, 12, myY);
                myY += addrLines.length * 4;
            }
            if (data.business_details?.phone) { doc.text(`Phone: ${safeText(data.business_details.phone)}`, 12, myY + 2); myY += 6; }
            if (data.business_details?.gst) { doc.text(`GSTIN/UIN: ${safeText(data.business_details.gst)}`, 12, myY + 2); myY += 6; }
            myMaxY = Math.max(myMaxY, myY + 2);

            // Middle horizontal line separating company details and Buyer
            doc.line(10, myMaxY, 200, myMaxY);

            // Vertical line dividing Company Details / Invoice Details
            doc.line(105, 20, 105, myMaxY);

            // Invoice details (Right block top)
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Invoice No.", 107, 25);
            doc.setFont("helvetica", "normal");
            doc.text(safeText(data.invoice_number), 107, 29);

            doc.line(105, 31, 200, 31);

            doc.setFont("helvetica", "bold");
            doc.text("Dated", 107, 35);
            doc.setFont("helvetica", "normal");
            doc.text(dateFormatted, 107, 39);

            // Buyer / Client details
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.text("Buyer (Bill to)", 12, myMaxY + 5);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(safeText(data.customer_name), 12, myMaxY + 11);

            let cliY = myMaxY + 16;
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            if (data.customer_phone) { doc.text(`Phone: ${safeText(data.customer_phone)}`, 12, cliY); cliY += 4; }
            if (data.customer_email) { doc.text(`Email: ${safeText(data.customer_email)}`, 12, cliY); cliY += 4; }

            const afterBuyerY = Math.max(myMaxY + 25, cliY + 2);

            // Table setup
            autoTable(doc, {
                startY: afterBuyerY,
                head: [["Sl No.", "Description of Goods", "Quantity", "Rate", "Amount"]],
                body: data.items.map((item, index) => [
                    (index + 1).toString(),
                    safeText(item.description),
                    item.quantity.toString(),
                    formatCurrencySafe(item.price),
                    formatCurrencySafe(Number(item.quantity) * Number(item.price))
                ]),
                theme: 'grid',
                headStyles: { fillColor: [255, 255, 255], textColor: textDark, fontStyle: 'bold', fontSize: 9, cellPadding: 2, lineColor: 0, lineWidth: 0.3, halign: 'center' },
                bodyStyles: { textColor: textDark, fontSize: 9, cellPadding: 2, lineColor: 0, lineWidth: { left: 0.3, right: 0.3 } },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 90 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 30, halign: 'right' },
                    4: { cellWidth: 35, halign: 'right' }
                },
                margin: { left: 10, right: 10 },
                tableLineColor: 0,
                tableLineWidth: 0.3,
                didDrawPage: (hookData) => {
                    // Draw outer border if table goes to new page
                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(0.3);
                    doc.rect(10, 10, 190, pageHeight - 20);
                }
            });

            let finalY = (doc as any).lastAutoTable.finalY;

            // Totals block
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            doc.line(10, finalY, 200, finalY);

            let tallyTotalY = finalY;

            if (data.discount_amount && data.discount_amount > 0) {
                tallyTotalY += 6;
                doc.setFont("helvetica", "italic");
                doc.text("Discount", 125, tallyTotalY);
                doc.text(`-${formatCurrencySafe(data.discount_amount)}`, 198, tallyTotalY, { align: "right" });
            }

            const splitRate = data.tax_rate ? data.tax_rate / 2 : 0;
            const cgstLabel = splitRate ? `CGST (${splitRate}%)` : "CGST";
            const sgstLabel = splitRate ? `SGST (${splitRate}%)` : "SGST";
            const igstLabel = data.tax_rate ? `IGST (${data.tax_rate}%)` : "IGST";

            doc.setFont("helvetica", "normal");
            if (isInterState && igstVal > 0) {
                tallyTotalY += 6;
                doc.text(igstLabel, 125, tallyTotalY);
                doc.text(formatCurrencySafe(igstVal), 198, tallyTotalY, { align: "right" });
            } else if (!isInterState && (cgstVal > 0 || sgstVal > 0)) {
                if (cgstVal > 0) {
                    tallyTotalY += 6;
                    doc.text(cgstLabel, 125, tallyTotalY);
                    doc.text(formatCurrencySafe(cgstVal), 198, tallyTotalY, { align: "right" });
                }
                if (sgstVal > 0) {
                    tallyTotalY += 6;
                    doc.text(sgstLabel, 125, tallyTotalY);
                    doc.text(formatCurrencySafe(sgstVal), 198, tallyTotalY, { align: "right" });
                }
            } else if (data.tax_amount && data.tax_amount > 0) {
                tallyTotalY += 6;
                doc.text(`Tax (${data.tax_rate || ''}%)`, 125, tallyTotalY);
                doc.text(formatCurrencySafe(data.tax_amount), 198, tallyTotalY, { align: "right" });
            }

            tallyTotalY += 6;
            doc.line(10, tallyTotalY, 200, tallyTotalY);

            doc.setFont("helvetica", "bold");
            tallyTotalY += 6;
            doc.text("Total", 125, tallyTotalY);
            doc.text(formatCurrencySafe(data.total_amount), 198, tallyTotalY, { align: "right" });

            tallyTotalY += 3;
            doc.line(10, tallyTotalY, 200, tallyTotalY);

            // Amount in words (mocked standard footer text)
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text("Declaration", 12, tallyTotalY + 6);
            doc.setFont("helvetica", "normal");
            doc.text("We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.", 12, tallyTotalY + 11, { maxWidth: 100 });

            // Signature block vertical line right
            doc.line(125, finalY, 125, pageHeight - 10);

            // Signature block bottom right
            doc.line(125, finalY + 9, 125, pageHeight - 10);

            doc.setFont("helvetica", "bold");
            doc.text(`for ${bizName}`, 198, finalY + 14, { align: "right" });

            if (signatureBase64) {
                const maxDim = 25;
                let renderW = signatureBase64.width;
                let renderH = signatureBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                const sigY = pageHeight - 35;
                const sigX = 198 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
            }

            doc.setFont("helvetica", "normal");
            doc.text("Authorised Signatory", 198, pageHeight - 15, { align: "right" });

        } else if (theme === 'gst1') {
            // --- STANDARD GST THEME 1 ---
            const textDark: [number, number, number] = [0, 0, 0];
            doc.setTextColor(...textDark);
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);

            // Outer Border
            doc.rect(10, 10, 190, pageHeight - 20);

            // Header Top Bar
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text((documentTitle || "TAX INVOICE").toUpperCase(), 105, 18, { align: "center" });

            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text("Original for Recipient", 195, 14, { align: "right" });

            doc.line(10, 22, 200, 22);

            let myY = 28;
            let myMaxY = 45;

            // Left Block (Business Details)
            if (logoBase64) {
                const maxDim = 20;
                let renderW = logoBase64.width;
                let renderH = logoBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                doc.addImage(logoBase64.dataUrl, "PNG", 12, myY, renderW, renderH);
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(bizName, 14 + renderW, myY + 6);
                myY = Math.max(myY + 12, myY + renderH + 5);
            } else {
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(bizName, 12, myY + 4);
                myY += 10;
            }

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            if (data.business_details?.address) {
                const addrLines = doc.splitTextToSize(safeText(data.business_details.address), 90);
                doc.text(addrLines, 12, myY);
                myY += addrLines.length * 4;
            }
            if (data.business_details?.phone) { doc.text(`Phone: ${safeText(data.business_details.phone)}`, 12, myY + 2); myY += 6; }
            if (data.business_details?.gst) {
                doc.setFont("helvetica", "bold");
                doc.text(`GSTIN/UIN: ${safeText(data.business_details.gst)}`, 12, myY + 2);
                doc.setFont("helvetica", "normal");
                myY += 6;
            }

            myMaxY = Math.max(myMaxY, myY + 2);

            // Vertical line divider
            doc.line(105, 22, 105, myMaxY);

            // Right Block (Invoice Details)
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Invoice No.", 107, 28);
            doc.setFont("helvetica", "normal");
            doc.text(safeText(data.invoice_number), 107, 32);

            doc.line(105, 34, 200, 34);

            doc.setFont("helvetica", "bold");
            doc.text("Dated", 107, 38);
            doc.setFont("helvetica", "normal");
            doc.text(dateFormatted, 107, 42);

            // Middle horizontal line 
            doc.line(10, myMaxY, 200, myMaxY);

            // Billed to
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Billed to:", 12, myMaxY + 5);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(safeText(data.customer_name), 12, myMaxY + 11);

            let cliY = myMaxY + 16;
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            if (data.customer_phone) { doc.text(`Phone: ${safeText(data.customer_phone)}`, 12, cliY); cliY += 4; }
            if (data.customer_email) { doc.text(`Email: ${safeText(data.customer_email)}`, 12, cliY); cliY += 4; }
            if (custGSTIN) { doc.text(`GSTIN/UIN: ${custGSTIN}`, 12, cliY); cliY += 4; }

            const afterBuyerY = Math.max(myMaxY + 25, cliY + 2);

            // GST specific columns
            autoTable(doc, {
                startY: afterBuyerY,
                head: [["S No.", "Description of Goods", "HSN/SAC", "Qty", "Rate", "Amount"]],
                body: data.items.map((item, index) => [
                    (index + 1).toString(),
                    safeText(item.description),
                    "-", // HSN placeholder
                    item.quantity.toString(),
                    formatCurrencySafe(item.price),
                    formatCurrencySafe(Number(item.quantity) * Number(item.price))
                ]),
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: textDark, fontStyle: 'bold', fontSize: 9, cellPadding: 2, lineColor: 0, lineWidth: 0.3, halign: 'center' },
                bodyStyles: { textColor: textDark, fontSize: 9, cellPadding: 2, lineColor: 0, lineWidth: { left: 0.3, right: 0.3 } },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 70 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 25, halign: 'right' },
                    5: { cellWidth: 40, halign: 'right' }
                },
                margin: { left: 10, right: 10 },
                tableLineColor: 0,
                tableLineWidth: 0.3,
            });

            let finalY = (doc as any).lastAutoTable.finalY + 2;

            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            doc.line(10, (doc as any).lastAutoTable.finalY, 200, (doc as any).lastAutoTable.finalY);

            // Subtotal
            doc.setFont("helvetica", "normal");
            doc.text("Taxable Value", 140, finalY + 6);
            doc.text(formatCurrencySafe(data.subtotal), 198, finalY + 6, { align: "right" });

            let currentTotalY = finalY + 12;

            if (data.discount_amount && data.discount_amount > 0) {
                doc.text("Discount", 140, currentTotalY);
                doc.text(`-${formatCurrencySafe(data.discount_amount)}`, 198, currentTotalY, { align: "right" });
                currentTotalY += 6;
            }

            const splitRate = data.tax_rate ? data.tax_rate / 2 : 0;
            const cgstLabel = splitRate ? `CGST @ ${splitRate}%` : "CGST";
            const sgstLabel = splitRate ? `SGST @ ${splitRate}%` : "SGST";
            const igstLabel = data.tax_rate ? `IGST @ ${data.tax_rate}%` : "IGST";

            if (isInterState && igstVal > 0) {
                doc.text(igstLabel, 140, currentTotalY);
                doc.text(formatCurrencySafe(igstVal), 198, currentTotalY, { align: "right" });
                currentTotalY += 6;
            } else if (!isInterState && (cgstVal > 0 || sgstVal > 0)) {
                if (cgstVal > 0) {
                    doc.text(cgstLabel, 140, currentTotalY);
                    doc.text(formatCurrencySafe(cgstVal), 198, currentTotalY, { align: "right" });
                    currentTotalY += 6;
                }
                if (sgstVal > 0) {
                    doc.text(sgstLabel, 140, currentTotalY);
                    doc.text(formatCurrencySafe(sgstVal), 198, currentTotalY, { align: "right" });
                    currentTotalY += 6;
                }
            } else if (data.tax_amount && data.tax_amount > 0) {
                // Split tax for local GST appearance (CGST/SGST 50% each if total tax rate)
                
                const splitAmount = (data.tax_amount || 0) / 2;

                doc.text(cgstLabel, 140, currentTotalY);
                doc.text(formatCurrencySafe(splitAmount), 198, currentTotalY, { align: "right" });
                currentTotalY += 6;

                doc.text(sgstLabel, 140, currentTotalY);
                doc.text(formatCurrencySafe(splitAmount), 198, currentTotalY, { align: "right" });
                currentTotalY += 6;
            }

            doc.line(10, currentTotalY, 200, currentTotalY);

            doc.setFont("helvetica", "bold");
            doc.text("Total", 140, currentTotalY + 6);
            doc.text(formatCurrencySafe(data.total_amount), 198, currentTotalY + 6, { align: "right" });

            doc.line(10, currentTotalY + 9, 200, currentTotalY + 9);

            // Footer / Sign
            doc.line(125, currentTotalY + 9, 125, pageHeight - 10);

            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text("Declaration", 12, currentTotalY + 15);
            doc.setFont("helvetica", "normal");
            doc.text("We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.", 12, currentTotalY + 20, { maxWidth: 100 });

            doc.setFont("helvetica", "bold");
            doc.text(`for ${bizName}`, 198, currentTotalY + 14, { align: "right" });

            if (signatureBase64) {
                const maxDim = 25;
                let renderW = signatureBase64.width;
                let renderH = signatureBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                const sigY = pageHeight - 35;
                const sigX = 198 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
            }

            doc.setFont("helvetica", "normal");
            doc.text("Authorised Signatory", 198, pageHeight - 15, { align: "right" });

        }

        if (action === 'download') {
            doc.save(`${data.invoice_number}.pdf`);
        } else {
            return doc.output('bloburl');
        }

    } catch (e) {
        console.error("PDF generation failed", e);
        alert("Failed to generate PDF. Please try again.");
        return null;
    }
};
