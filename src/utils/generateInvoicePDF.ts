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
    tax_rate?: number;
    tax_amount?: number;
    total_amount: number;
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
    options?: { action?: 'download' | 'preview', theme?: 'corporate' | 'minimalist' | 'retail' | 'tally' }
) => {
    try {
        const doc = new jsPDF();
        const action = options?.action || 'download';
        const theme = options?.theme || localStorage.getItem("finflow_invoice_theme") || 'corporate';

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
            if (data.tax_rate && data.tax_rate > 0) {
                currentTotalY += 7;
                doc.setTextColor(...textLight);
                doc.text(`Tax (${data.tax_rate}%):`, totalBlockX, currentTotalY);
                doc.setTextColor(...textDark);
                doc.text(formatCurrencySafe(data.tax_amount || 0), vAlignX, currentTotalY, { align: "right" });
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

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("INVOICE", 196, 20, { align: "right" });
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
            if (data.customer_email) { doc.text(`E: ${safeText(data.customer_email)}`, 120, clientY); }

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
            if (data.tax_rate && data.tax_rate > 0) {
                currentTotalY += 6;
                doc.setTextColor(...textMid);
                doc.text(`Tax (${data.tax_rate}%)`, totalBlockX, currentTotalY);
                doc.setTextColor(...textDark);
                doc.text(formatCurrencySafe(data.tax_amount || 0), vAlignX, currentTotalY, { align: "right" });
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
            doc.text("INVOICE", 140, 25);

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
            if (data.customer_email) { doc.text(safeText(data.customer_email), 140, cliY); }

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

            if (data.tax_rate && data.tax_rate > 0) {
                trayY += 7;
                doc.text(`Tax (${data.tax_rate}%)`, 140, trayY);
                doc.text(formatCurrencySafe(data.tax_amount || 0), 196, trayY, { align: "right" });
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
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("TAX INVOICE", 105, 16, { align: "center" });

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

            doc.setFont("helvetica", "bold");
            doc.text("Total", 125, finalY + 6);
            doc.text(formatCurrencySafe(data.total_amount), 198, finalY + 6, { align: "right" });

            doc.line(10, finalY + 9, 200, finalY + 9);

            // Amount in words (mocked standard footer text)
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text("Declaration", 12, finalY + 15);
            doc.setFont("helvetica", "normal");
            doc.text("We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.", 12, finalY + 20, { maxWidth: 100 });

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
