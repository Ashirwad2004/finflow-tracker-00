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
        hsn_code?: string;
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

export type InvoicePdfTheme = 'corporate' | 'modern-dark' | 'minimal-white' | 'professional-green' | 'premium-gold' | 'creative-purple' | 'startup-gradient' | 'elegant-mono' | 'retail' | 'construction';

export interface TotalRow {
    label: string;
    value: number;
    bold?: boolean;
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

const runAutoTable = (pdfDoc: jsPDF, opts: any) => {
    const userWillDrawCell = opts.willDrawCell;
    const userDidDrawCell = opts.didDrawCell;
    const cellDataMap = new Map<string, { name: string, hsn: string }>();

    opts.willDrawCell = (hookData: any) => {
        if (userWillDrawCell) userWillDrawCell(hookData);
        
        if (hookData.section === 'body' && hookData.column.index === 0) {
            const text = hookData.cell.raw || "";
            if (typeof text === 'string' && text.includes("\nHSN: ")) {
                const parts = text.split("\nHSN: ");
                cellDataMap.set(`${hookData.row.index}-${hookData.column.index}`, {
                    name: parts[0],
                    hsn: parts[1]
                });
                // Clear text to prevent default drawing
                hookData.cell.text = [];
            }
        }
    };

    opts.didDrawCell = (hookData: any) => {
        if (userDidDrawCell) userDidDrawCell(hookData);

        if (hookData.section === 'body' && hookData.column.index === 0) {
            const key = `${hookData.row.index}-${hookData.column.index}`;
            const info = cellDataMap.get(key);
            if (info) {
                const cell = hookData.cell;
                const paddingLeft = cell.styles.cellPadding?.left ?? 4;
                const paddingTop = cell.styles.cellPadding?.top ?? 4;
                const paddingBottom = cell.styles.cellPadding?.bottom ?? 4;
                
                pdfDoc.saveGraphicsState();
                
                // Draw Product Name (normal size, e.g. 9.5, dark color)
                pdfDoc.setFontSize(9.5);
                pdfDoc.setFont("helvetica", "normal");
                pdfDoc.setTextColor(30, 41, 59); // slate-800
                pdfDoc.text(info.name, cell.x + paddingLeft, cell.y + paddingTop + 3.5, {
                    maxWidth: cell.width - paddingLeft - (cell.styles.cellPadding?.right ?? 4)
                });

                // Draw HSN Code (smaller size, e.g. 7.5, gray color)
                pdfDoc.setFontSize(7.5);
                pdfDoc.setFont("helvetica", "normal");
                pdfDoc.setTextColor(148, 163, 184); // slate-400
                pdfDoc.text(`HSN: ${info.hsn}`, cell.x + paddingLeft, cell.y + cell.height - paddingBottom);
                
                pdfDoc.restoreGraphicsState();
            }
        }
    };

    autoTable(pdfDoc, opts);
};

export const generateInvoicePDF = async (
    data: InvoiceDetails,
    options?: { action?: 'download' | 'preview', theme?: InvoicePdfTheme, documentTitle?: string }
) => {
    try {
        const autoTable = runAutoTable;
        const doc = new jsPDF();
        const action = options?.action || 'download';
        const savedTheme = options?.theme || localStorage.getItem("finflow_invoice_theme") || 'corporate';
        const theme = savedTheme === 'thermal' ? 'corporate' : savedTheme;
        const documentTitle = options?.documentTitle;

        const safeText = (txt: string | undefined | null) => sanitizeText(txt || "");
        const dateFormatted = data.date ? format(new Date(data.date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy");
        const bizName = safeText(data.business_details?.name || "FinFlow Business");
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        const tableRows = data.items.map(item => [
            safeText(item.description) + (item.hsn_code ? `\nHSN: ${safeText(item.hsn_code)}` : ""),
            item.quantity.toString(),
            formatCurrencySafe(item.price),
            formatCurrencySafe(item.total ?? (Number(item.quantity) * Number(item.price)))
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

        const getTaxRows = (style: "paren" | "at" = "paren"): TotalRow[] => {
            const rows: TotalRow[] = [];
            const splitRate = data.tax_rate ? data.tax_rate / 2 : 0;
            const cgstLabel = splitRate ? (style === "at" ? `CGST @ ${splitRate}%` : `CGST (${splitRate}%)`) : "CGST";
            const sgstLabel = splitRate ? (style === "at" ? `SGST @ ${splitRate}%` : `SGST (${splitRate}%)`) : "SGST";
            const igstLabel = data.tax_rate ? (style === "at" ? `IGST @ ${data.tax_rate}%` : `IGST (${data.tax_rate}%)`) : "IGST";

            if (isInterState && igstVal > 0) {
                rows.push({ label: igstLabel, value: igstVal });
            } else if (!isInterState && (cgstVal > 0 || sgstVal > 0)) {
                if (cgstVal > 0) rows.push({ label: cgstLabel, value: cgstVal });
                if (sgstVal > 0) rows.push({ label: sgstLabel, value: sgstVal });
            } else if (data.tax_amount && data.tax_amount > 0) {
                rows.push({ label: data.tax_rate ? `Tax (${data.tax_rate}%)` : "Tax", value: data.tax_amount });
            }

            return rows;
        };

        const totalRows: TotalRow[] = [
            { label: "Subtotal", value: data.subtotal },
            ...(data.discount_amount && data.discount_amount > 0 ? [{ label: "Discount", value: -data.discount_amount }] : []),
            ...getTaxRows("at"),
            { label: "Grand Total", value: data.total_amount, bold: true }
        ];

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
            totalRows.slice(1).forEach(row => {
                currentTotalY += 7;
                doc.setTextColor(...(row.bold ? brandColor : textLight));
                doc.setFont("helvetica", row.bold ? "bold" : "normal");
                if (row.bold) {
                    const totalBoxY = currentTotalY - 5;
                    doc.setFillColor(241, 245, 249);
                    doc.setDrawColor(...lineLight);
                    doc.roundedRect(totalBlockX - 5, totalBoxY, 87, 14, 2, 2, "FD");
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
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(...lineLight);
            doc.line(14, pageHeight - 20, 196, pageHeight - 20);
            doc.setFontSize(9);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "italic");
            doc.text("Thank you for your business. For any inquiries, please contact us.", 105, pageHeight - 12, { align: "center" });

        } else if (theme === 'modern-dark') {
            const darkBg: [number, number, number] = [15, 23, 42]; // slate-900
            const darkPanel: [number, number, number] = [30, 41, 59]; // slate-800
            const accentCyan: [number, number, number] = [6, 182, 212]; // cyan-500
            const textGray: [number, number, number] = [148, 163, 184]; // slate-400
            const lineDark: [number, number, number] = [51, 65, 85]; // slate-700

            doc.setFillColor(...darkBg);
            doc.rect(0, 0, 210, 60, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");

            let currentHeaderY = 24;

            if (logoBase64) {
                const maxDim = 28;
                let renderW = logoBase64.width;
                let renderH = logoBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                const startY = 8 + (28 - renderH) / 2;
                doc.addImage(logoBase64.dataUrl, "PNG", 14, startY, renderW, renderH);

                doc.setFontSize(18);
                doc.text(bizName, 18 + renderW, 22);

                currentHeaderY = 28;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(...textGray);
                if (data.business_details?.address) {
                    doc.text(safeText(data.business_details.address), 18 + renderW, currentHeaderY);
                    currentHeaderY += 4.5;
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
                doc.text(bizName, 14, 22);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(...textGray);
                if (data.business_details?.address) {
                    doc.text(safeText(data.business_details.address), 14, currentHeaderY + 4);
                    currentHeaderY += 8.5;
                }
                if (data.business_details?.phone || data.business_details?.gst) {
                    const extraDetails = [
                        data.business_details.phone ? `Phone: ${safeText(data.business_details.phone)}` : '',
                        data.business_details.gst ? `GSTIN: ${safeText(data.business_details.gst)}` : ''
                    ].filter(Boolean).join(" | ");
                    if (extraDetails) doc.text(extraDetails, 14, currentHeaderY + 4);
                }
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(26);
            doc.setTextColor(...accentCyan);
            doc.text("INVOICE", 196, 22, { align: "right" });
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(255, 255, 255);
            doc.text(`No. ${safeText(data.invoice_number)}`, 196, 29, { align: "right" });
            doc.setTextColor(...textGray);
            doc.text(`Date: ${dateFormatted}`, 196, 34, { align: "right" });

            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, 70, 182, 32, 3, 3, "FD");

            doc.setTextColor(...darkBg);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("BILL TO", 20, 78);

            doc.setFontSize(11);
            doc.text(safeText(data.customer_name), 20, 84);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(...darkPanel);
            doc.setFontSize(9.5);
            const clientDetails = [
                data.customer_phone ? `Phone: ${safeText(data.customer_phone)}` : "",
                data.customer_email ? `Email: ${safeText(data.customer_email)}` : "",
                custGSTIN ? `GSTIN: ${custGSTIN}` : ""
            ].filter(Boolean).join("  |  ");
            doc.text(clientDetails || "-", 20, 92, { maxWidth: 170 });

            autoTable(doc, {
                startY: 112,
                head: [["Item Description", "Qty", "Price", "Amount"]],
                body: tableRows,
                theme: 'striped',
                headStyles: { fillColor: darkBg, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5, cellPadding: 4 },
                bodyStyles: { textColor: darkBg, fontSize: 9, cellPadding: 4, lineColor: [241, 245, 249] },
                columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
                margin: { left: 14, right: 14 },
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            const totalBlockX = 120;
            const vAlignX = 196;

            doc.setFontSize(10);
            doc.setTextColor(...textGray);
            doc.setFont("helvetica", "normal");
            doc.text("Subtotal:", totalBlockX, finalY);
            doc.setTextColor(...darkBg);
            doc.text(formatCurrencySafe(data.subtotal), vAlignX, finalY, { align: "right" });

            let currentTotalY = finalY;
            totalRows.slice(1).forEach(row => {
                currentTotalY += 7;
                doc.setTextColor(...(row.bold ? accentCyan : textGray));
                doc.setFont("helvetica", row.bold ? "bold" : "normal");
                if (row.bold) {
                    const totalBoxY = currentTotalY - 5;
                    doc.setFillColor(...darkBg);
                    doc.roundedRect(totalBlockX - 5, totalBoxY, 87, 14, 2, 2, "F");
                    doc.setTextColor(...accentCyan);
                    doc.setFontSize(11);
                    doc.text(row.label + ":", totalBlockX, totalBoxY + 9);
                    doc.text(formatCurrencySafe(row.value), vAlignX, totalBoxY + 9, { align: "right" });
                    currentTotalY += 7;
                } else {
                    doc.setTextColor(...darkBg);
                    doc.text(row.label + ":", totalBlockX, currentTotalY);
                    doc.setTextColor(...darkBg);
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
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...darkBg);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(226, 232, 240);
            doc.line(14, pageHeight - 20, 196, pageHeight - 20);
            doc.setFontSize(8.5);
            doc.setTextColor(...textGray);
            doc.setFont("helvetica", "italic");
            doc.text("Digital Invoice. Generated via FinFlow ledger.", 105, pageHeight - 12, { align: "center" });

        } else if (theme === 'minimal-white') {
            const inkDark: [number, number, number] = [15, 23, 42]; // slate-900
            const inkMuted: [number, number, number] = [100, 116, 139]; // slate-500
            const borderInk: [number, number, number] = [0, 0, 0];

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

                doc.setTextColor(...inkDark);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);
                doc.text(bizName, 18 + renderW, 23);
                headerBaseY = Math.max(28, startY + renderH + 5);
            } else {
                doc.setTextColor(...inkDark);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(26);
                doc.text(bizName, 14, 24);
                headerBaseY = 32;
            }

            doc.setFontSize(28);
            doc.setFont("helvetica", "bold");
            doc.text("INVOICE", 196, 20, { align: "right" });
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...inkMuted);
            doc.setFontSize(10);
            doc.text(`No. ${safeText(data.invoice_number)}`, 196, 26, { align: "right" });
            doc.text(`Date: ${dateFormatted}`, 196, 31, { align: "right" });

            doc.setDrawColor(...borderInk);
            doc.setLineWidth(0.8);
            doc.line(14, headerBaseY + 8, 196, headerBaseY + 8);

            let myY = headerBaseY + 18;
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...inkDark);
            doc.setFontSize(10);
            doc.text("SENDER", 14, myY);
            doc.text("BILL TO", 120, myY);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(...inkMuted);

            myY += 6;
            let senderY = myY;
            if (data.business_details?.address) { doc.text(safeText(data.business_details.address), 14, senderY); senderY += 5; }
            if (data.business_details?.phone) { doc.text(`Phone: ${safeText(data.business_details.phone)}`, 14, senderY); senderY += 5; }
            if (data.business_details?.gst) { doc.text(`GSTIN: ${safeText(data.business_details.gst)}`, 14, senderY); }

            let buyerY = myY;
            doc.setTextColor(...inkDark);
            doc.text(safeText(data.customer_name), 120, buyerY); buyerY += 5.5;
            doc.setTextColor(...inkMuted);
            if (data.customer_phone) { doc.text(`Phone: ${safeText(data.customer_phone)}`, 120, buyerY); buyerY += 5; }
            if (data.customer_email) { doc.text(`Email: ${safeText(data.customer_email)}`, 120, buyerY); buyerY += 5; }
            if (custGSTIN) { doc.text(`GSTIN: ${custGSTIN}`, 120, buyerY); }

            const startTableY = Math.max(76, Math.max(senderY, buyerY) + 8);

            autoTable(doc, {
                startY: startTableY,
                head: [["DESCRIPTION", "QTY", "PRICE", "TOTAL"]],
                body: tableRows,
                theme: 'plain',
                headStyles: { textColor: inkDark, fontStyle: 'bold', fontSize: 9.5, cellPadding: { top: 4, bottom: 4, left: 0, right: 0 }, lineWidth: { bottom: 1, top: 0, left: 0, right: 0 }, lineColor: borderInk },
                bodyStyles: { textColor: inkDark, fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 232, 240] },
                columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 31, halign: 'right' }, 3: { cellWidth: 31, halign: 'right' } },
                margin: { left: 14, right: 14 },
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            const totalBlockX = 140;
            const vAlignX = 196;

            doc.setFontSize(9.5);
            doc.setTextColor(...inkMuted);
            doc.setFont("helvetica", "normal");
            doc.text("Subtotal", totalBlockX, finalY);
            doc.setTextColor(...inkDark);
            doc.text(formatCurrencySafe(data.subtotal), vAlignX, finalY, { align: "right" });

            let currentTotalY = finalY;
            totalRows.slice(1).forEach(row => {
                currentTotalY += 6.5;
                if (row.bold) {
                    currentTotalY += 2;
                    doc.setDrawColor(...borderInk);
                    doc.setLineWidth(0.5);
                    doc.line(totalBlockX, currentTotalY - 4, vAlignX, currentTotalY - 4);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(...inkDark);
                    doc.setFontSize(11);
                    doc.text(row.label.toUpperCase(), totalBlockX, currentTotalY);
                    doc.text(formatCurrencySafe(row.value), vAlignX, currentTotalY, { align: "right" });
                } else {
                    doc.setTextColor(...inkMuted);
                    doc.setFont("helvetica", "normal");
                    doc.text(row.label, totalBlockX, currentTotalY);
                    doc.setTextColor(...inkDark);
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
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...inkDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...inkMuted);
            doc.text("Thank you for your business.", 14, pageHeight - 12);

        } else if (theme === 'professional-green') {
            const greenPrimary: [number, number, number] = [6, 95, 70]; // emerald-800
            const greenAccent: [number, number, number] = [16, 185, 129]; // emerald-500
            const textDark: [number, number, number] = [30, 41, 59];
            const textLight: [number, number, number] = [100, 116, 139];
            const lineGreen: [number, number, number] = [209, 250, 229]; // emerald-100

            doc.setFillColor(...greenPrimary);
            doc.rect(0, 0, 210, 40, "F");

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
            doc.text("INVOICE", 196, 20, { align: "right" });
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`No. ${safeText(data.invoice_number)}`, 196, 27, { align: "right" });
            doc.text(`Date: ${dateFormatted}`, 196, 32, { align: "right" });

            doc.setTextColor(...textDark);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("BILL TO", 14, 55);

            doc.setDrawColor(...greenAccent);
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
                headStyles: { fillColor: greenPrimary, textColor: 255, fontStyle: 'bold', fontSize: 10, cellPadding: 4 },
                bodyStyles: { textColor: textDark, fontSize: 9, cellPadding: 4, lineColor: [237, 247, 242] },
                alternateRowStyles: { fillColor: [244, 252, 248] },
                columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
                margin: { left: 14, right: 14 },
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
            totalRows.slice(1).forEach(row => {
                currentTotalY += 7;
                doc.setTextColor(...(row.bold ? greenPrimary : textLight));
                doc.setFont("helvetica", row.bold ? "bold" : "normal");
                if (row.bold) {
                    const totalBoxY = currentTotalY - 5;
                    doc.setFillColor(236, 253, 245); // emerald-50
                    doc.setDrawColor(...greenAccent);
                    doc.roundedRect(totalBlockX - 5, totalBoxY, 87, 14, 2, 2, "FD");
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
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(...lineGreen);
            doc.line(14, pageHeight - 20, 196, pageHeight - 20);
            doc.setFontSize(9);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "italic");
            doc.text("Thank you for your green business support. Contact us for questions.", 105, pageHeight - 12, { align: "center" });

        } else if (theme === 'premium-gold') {
            const goldPrimary: [number, number, number] = [153, 115, 30]; // dark gold
            const goldAccent: [number, number, number] = [180, 142, 60]; // medium gold
            const textDark: [number, number, number] = [31, 41, 55]; // charcoal
            const textLight: [number, number, number] = [156, 163, 175]; // light gray
            const lineGold: [number, number, number] = [254, 243, 199]; // amber-100

            doc.setFillColor(...goldAccent);
            doc.rect(0, 0, 210, 8, "F");

            doc.setTextColor(...textDark);
            doc.setFont("helvetica", "bold");

            let currentHeaderY = 32;

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

                doc.setFontSize(18);
                doc.text(bizName, 18 + renderW, 25);

                currentHeaderY = 31;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(...textLight);
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
                doc.text(bizName, 14, 25);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(...textLight);
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
            doc.setTextColor(...goldPrimary);
            doc.text("INVOICE", 196, 25, { align: "right" });
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...textDark);
            doc.text(`No. ${safeText(data.invoice_number)}`, 196, 32, { align: "right" });
            doc.setTextColor(...textLight);
            doc.text(`Date: ${dateFormatted}`, 196, 37, { align: "right" });

            doc.setDrawColor(...goldAccent);
            doc.setLineWidth(0.8);
            doc.line(14, 52, 196, 52);

            doc.setTextColor(...textDark);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("BILL TO", 14, 63);

            doc.setFontSize(11);
            doc.text(safeText(data.customer_name), 14, 70);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(...textLight);
            doc.setFontSize(10);
            let billY = 75;
            if (data.customer_phone) { doc.text(`Phone: ${safeText(data.customer_phone)}`, 14, billY); billY += 5; }
            if (data.customer_email) { doc.text(`Email: ${safeText(data.customer_email)}`, 14, billY); billY += 5; }
            if (custGSTIN) { doc.text(`GSTIN/UIN: ${custGSTIN}`, 14, billY); billY += 5; }

            autoTable(doc, {
                startY: Math.max(92, billY + 8),
                head: [["Item Description", "Qty", "Price", "Amount"]],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: goldPrimary, textColor: 255, fontStyle: 'bold', fontSize: 10, cellPadding: 4 },
                bodyStyles: { textColor: textDark, fontSize: 9, cellPadding: 4, lineColor: [253, 251, 244] },
                alternateRowStyles: { fillColor: [255, 254, 250] },
                columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
                margin: { left: 14, right: 14 },
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
            totalRows.slice(1).forEach(row => {
                currentTotalY += 7;
                doc.setTextColor(...(row.bold ? goldPrimary : textLight));
                doc.setFont("helvetica", row.bold ? "bold" : "normal");
                if (row.bold) {
                    const totalBoxY = currentTotalY - 5;
                    doc.setFillColor(255, 251, 235); // amber-50
                    doc.setDrawColor(...goldAccent);
                    doc.roundedRect(totalBlockX - 5, totalBoxY, 87, 14, 2, 2, "FD");
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
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(...lineGold);
            doc.line(14, pageHeight - 20, 196, pageHeight - 20);
            doc.setFontSize(9);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "italic");
            doc.text("Your business is highly valued. Premium Quality Guaranteed.", 105, pageHeight - 12, { align: "center" });

        } else if (theme === 'creative-purple') {
            const purplePrimary: [number, number, number] = [109, 40, 217]; // violet-700
            const purpleAccent: [number, number, number] = [139, 92, 246]; // violet-500
            const textDark: [number, number, number] = [30, 41, 59];
            const textLight: [number, number, number] = [100, 116, 139];
            const linePurple: [number, number, number] = [245, 243, 255]; // violet-50

            doc.setFillColor(...purplePrimary);
            doc.rect(0, 0, 210, 40, "F");

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
            doc.text("INVOICE", 196, 20, { align: "right" });
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`No. ${safeText(data.invoice_number)}`, 196, 27, { align: "right" });
            doc.text(`Date: ${dateFormatted}`, 196, 32, { align: "right" });

            doc.setTextColor(...textDark);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("BILL TO", 14, 55);

            doc.setDrawColor(...purpleAccent);
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
                headStyles: { fillColor: purplePrimary, textColor: 255, fontStyle: 'bold', fontSize: 10, cellPadding: 4 },
                bodyStyles: { textColor: textDark, fontSize: 9, cellPadding: 4, lineColor: [243, 232, 255] },
                alternateRowStyles: { fillColor: [250, 245, 255] },
                columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
                margin: { left: 14, right: 14 },
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
            totalRows.slice(1).forEach(row => {
                currentTotalY += 7;
                doc.setTextColor(...(row.bold ? purplePrimary : textLight));
                doc.setFont("helvetica", row.bold ? "bold" : "normal");
                if (row.bold) {
                    const totalBoxY = currentTotalY - 5;
                    doc.setFillColor(250, 245, 255); // violet-50
                    doc.setDrawColor(...purpleAccent);
                    doc.roundedRect(totalBlockX - 5, totalBoxY, 87, 14, 2, 2, "FD");
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
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(...linePurple);
            doc.line(14, pageHeight - 20, 196, pageHeight - 20);
            doc.setFontSize(9);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "italic");
            doc.text("Thank you for your creative collaboration. Best wishes!", 105, pageHeight - 12, { align: "center" });

        } else if (theme === 'startup-gradient') {
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
                doc.rect(0, i, 210, 1, "F");
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
            doc.text("INVOICE", 196, 20, { align: "right" });
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`No. ${safeText(data.invoice_number)}`, 196, 27, { align: "right" });
            doc.text(`Date: ${dateFormatted}`, 196, 32, { align: "right" });

            doc.setTextColor(...textDark);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("BILL TO", 14, 55);

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

            autoTable(doc, {
                startY: Math.max(85, billY + 10),
                head: [["Item Description", "Qty", "Price", "Amount"]],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: indigoColor, textColor: 255, fontStyle: 'bold', fontSize: 10, cellPadding: 4 },
                bodyStyles: { textColor: textDark, fontSize: 9, cellPadding: 4, lineColor: [243, 244, 246] },
                alternateRowStyles: { fillColor: [249, 250, 251] },
                columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
                margin: { left: 14, right: 14 },
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
            totalRows.slice(1).forEach(row => {
                currentTotalY += 7;
                doc.setTextColor(...(row.bold ? pinkColor : textLight));
                doc.setFont("helvetica", row.bold ? "bold" : "normal");
                if (row.bold) {
                    const totalBoxY = currentTotalY - 5;
                    doc.setFillColor(253, 244, 245); // pink-50
                    doc.setDrawColor(...pinkColor);
                    doc.roundedRect(totalBlockX - 5, totalBoxY, 87, 14, 2, 2, "FD");
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
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(243, 244, 246);
            doc.line(14, pageHeight - 20, 196, pageHeight - 20);
            doc.setFontSize(9);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "italic");
            doc.text("Generated with love via FinFlow Ledger. Growth is a habit.", 105, pageHeight - 12, { align: "center" });

        } else if (theme === 'elegant-mono') {
            const textDark: [number, number, number] = [0, 0, 0];
            const textLight: [number, number, number] = [75, 85, 99];

            doc.setFont("times", "normal");

            let currentHeaderY = 24;

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
                doc.setFont("times", "bold");
                doc.setFontSize(18);
                doc.text(bizName, 18 + renderW, 25);

                currentHeaderY = 32;
                doc.setFont("times", "normal");
                doc.setFontSize(9.5);
                if (data.business_details?.address) {
                    doc.text(safeText(data.business_details.address), 18 + renderW, currentHeaderY);
                    currentHeaderY += 5;
                }
                if (data.business_details?.phone || data.business_details?.gst) {
                    const extraDetails = [
                        data.business_details.phone ? `Phone: ${safeText(data.business_details.phone)}` : '',
                        data.business_details.gst ? `GST: ${safeText(data.business_details.gst)}` : ''
                    ].filter(Boolean).join(" | ");
                    if (extraDetails) doc.text(extraDetails, 18 + renderW, currentHeaderY);
                }
            } else {
                doc.setTextColor(...textDark);
                doc.setFont("times", "bold");
                doc.setFontSize(26);
                doc.text(bizName, 14, 25);

                doc.setFont("times", "normal");
                doc.setFontSize(10);
                if (data.business_details?.address) {
                    doc.text(safeText(data.business_details.address), 14, currentHeaderY + 8);
                    currentHeaderY += 13;
                }
                if (data.business_details?.phone || data.business_details?.gst) {
                    const extraDetails = [
                        data.business_details.phone ? `Phone: ${safeText(data.business_details.phone)}` : '',
                        data.business_details.gst ? `GST: ${safeText(data.business_details.gst)}` : ''
                    ].filter(Boolean).join(" | ");
                    if (extraDetails) doc.text(extraDetails, 14, currentHeaderY + 8);
                }
            }

            doc.setFont("times", "bold");
            doc.setFontSize(30);
            doc.text("INVOICE", 196, 25, { align: "right" });
            doc.setFontSize(11);
            doc.setFont("times", "normal");
            doc.text(`No. ${safeText(data.invoice_number)}`, 196, 32, { align: "right" });
            doc.text(`Date: ${dateFormatted}`, 196, 37, { align: "right" });

            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(1.2);
            doc.line(14, 52, 196, 52);
            doc.setLineWidth(0.4);
            doc.line(14, 54, 196, 54);

            doc.setTextColor(...textDark);
            doc.setFontSize(11);
            doc.setFont("times", "bold");
            doc.text("CLIENT / BUYER", 14, 63);

            doc.setFontSize(12);
            doc.text(safeText(data.customer_name), 14, 70);

            doc.setFont("times", "normal");
            doc.setFontSize(10.5);
            let billY = 75;
            if (data.customer_phone) { doc.text(`Phone: ${safeText(data.customer_phone)}`, 14, billY); billY += 5; }
            if (data.customer_email) { doc.text(`Email: ${safeText(data.customer_email)}`, 14, billY); billY += 5; }
            if (custGSTIN) { doc.text(`GSTIN: ${custGSTIN}`, 14, billY); billY += 5; }

            autoTable(doc, {
                startY: Math.max(90, billY + 8),
                head: [["Item Description", "Qty", "Price", "Amount"]],
                body: tableRows,
                theme: 'plain',
                headStyles: { font: 'times', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 10, cellPadding: 3, lineWidth: { bottom: 1 }, lineColor: [0, 0, 0] },
                bodyStyles: { font: 'times', textColor: [0, 0, 0], fontSize: 9.5, cellPadding: 3, lineWidth: { bottom: 0.5 }, lineColor: [220, 220, 220] },
                columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
                margin: { left: 14, right: 14 },
            });

            doc.setFont("times", "normal");
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            const totalBlockX = 120;
            const vAlignX = 196;

            doc.setFontSize(10.5);
            doc.text("Subtotal:", totalBlockX, finalY);
            doc.text(formatCurrencySafe(data.subtotal), vAlignX, finalY, { align: "right" });

            let currentTotalY = finalY;
            totalRows.slice(1).forEach(row => {
                currentTotalY += 7;
                doc.setFont("times", row.bold ? "bold" : "normal");
                if (row.bold) {
                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(0.6);
                    doc.line(totalBlockX, currentTotalY - 4, vAlignX, currentTotalY - 4);
                    doc.text(row.label + ":", totalBlockX, currentTotalY + 1);
                    doc.text(formatCurrencySafe(row.value), vAlignX, currentTotalY + 1, { align: "right" });
                    doc.line(totalBlockX, currentTotalY + 3, vAlignX, currentTotalY + 3);
                    currentTotalY += 7;
                } else {
                    doc.text(row.label + ":", totalBlockX, currentTotalY);
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
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9.5);
                doc.setTextColor(...textDark);
                doc.setFont("times", "normal");
                doc.text("Authorized Signature", 196, sigY + renderH + 5, { align: "right" });
            }

            doc.setFontSize(9);
            doc.setFont("times", "italic");
            doc.text("This document constitutes an official record. Thank you for your custom.", 105, pageHeight - 12, { align: "center" });

        } else if (theme === 'retail') {
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
                margin: { left: 14, right: 86 }, 
            });

            let trayY = Math.max(85, cliY + 15);

            doc.setFontSize(10);
            totalRows.forEach(row => {
                doc.setFont("helvetica", row.bold ? "bold" : "normal");
                if (row.bold) {
                    trayY += 4;
                    doc.setDrawColor(...accentColor);
                    doc.setLineWidth(1);
                    doc.line(140, trayY - 2, 196, trayY - 2);
                    doc.setTextColor(...accentColor);
                    doc.text(row.label, 140, trayY + 4);
                    doc.text(formatCurrencySafe(row.value), 196, trayY + 4, { align: "right" });
                    trayY += 8;
                } else {
                    doc.setTextColor(...textDark);
                    doc.text(row.label, 140, trayY);
                    doc.text((row.value < 0 ? "-" : "") + formatCurrencySafe(Math.abs(row.value)), 196, trayY, { align: "right" });
                    trayY += 6;
                }
            });

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

        } else if (theme === 'construction') {
            const orangeAccent: [number, number, number] = [234, 88, 12]; // safety orange
            const charcoalDark: [number, number, number] = [31, 41, 55]; // charcoal slate-800
            const textLight: [number, number, number] = [107, 114, 128]; // gray-500
            const lineBorder: [number, number, number] = [75, 85, 99]; // gray-600

            doc.setFillColor(...orangeAccent);
            doc.rect(0, 0, 210, 8, "F");

            doc.setDrawColor(...lineBorder);
            doc.setLineWidth(0.4);
            doc.rect(10, 14, 190, pageHeight - 24);

            doc.setTextColor(...charcoalDark);
            doc.setFont("helvetica", "bold");

            let currentHeaderY = 32;

            if (logoBase64) {
                const maxDim = 20;
                let renderW = logoBase64.width;
                let renderH = logoBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                const startY = 18;
                doc.addImage(logoBase64.dataUrl, "PNG", 14, startY, renderW, renderH);

                doc.setFontSize(16);
                doc.text(bizName, 18 + renderW, 26);

                currentHeaderY = 31;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(...textLight);
                if (data.business_details?.address) {
                    doc.text(safeText(data.business_details.address), 18 + renderW, currentHeaderY);
                    currentHeaderY += 5.5;
                }
                if (data.business_details?.phone || data.business_details?.gst) {
                    const extraDetails = [
                        data.business_details.phone ? `Phone: ${safeText(data.business_details.phone)}` : '',
                        data.business_details.gst ? `GSTIN: ${safeText(data.business_details.gst)}` : ''
                    ].filter(Boolean).join(" | ");
                    if (extraDetails) doc.text(extraDetails, 18 + renderW, currentHeaderY);
                }
            } else {
                doc.setFontSize(20);
                doc.text(bizName, 14, 26);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9.5);
                doc.setTextColor(...textLight);
                if (data.business_details?.address) {
                    doc.text(safeText(data.business_details.address), 14, currentHeaderY);
                    currentHeaderY += 5.5;
                }
                if (data.business_details?.phone || data.business_details?.gst) {
                    const extraDetails = [
                        data.business_details.phone ? `Phone: ${safeText(data.business_details.phone)}` : '',
                        data.business_details.gst ? `GSTIN: ${safeText(data.business_details.gst)}` : ''
                    ].filter(Boolean).join(" | ");
                    if (extraDetails) doc.text(extraDetails, 14, currentHeaderY);
                }
            }

            doc.line(110, 14, 110, 52);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(...orangeAccent);
            doc.text("ENGINEERING INVOICE", 114, 23);
            doc.setFontSize(9.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...charcoalDark);
            doc.text(`Invoice No: ${safeText(data.invoice_number)}`, 114, 30);
            doc.text(`Date: ${dateFormatted}`, 114, 35);
            doc.text(`Project Code: ${safeText(data.invoice_number.slice(-4))}`, 114, 40);

            doc.line(10, 52, 200, 52);

            doc.setFont("helvetica", "bold");
            doc.text("CLIENT / CONTRACTOR", 14, 59);

            doc.setFontSize(11);
            doc.text(safeText(data.customer_name), 14, 65);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(...textLight);
            doc.setFontSize(9.5);
            let billY = 70;
            if (data.customer_phone) { doc.text(`Phone: ${safeText(data.customer_phone)}`, 14, billY); billY += 5; }
            if (data.customer_email) { doc.text(`Email: ${safeText(data.customer_email)}`, 14, billY); billY += 5; }
            if (custGSTIN) { doc.text(`GSTIN/UIN: ${custGSTIN}`, 14, billY); billY += 5; }

            autoTable(doc, {
                startY: Math.max(88, billY + 8),
                head: [["Item Description / Task Code", "Qty", "Price", "Amount"]],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: charcoalDark, textColor: 255, fontStyle: 'bold', fontSize: 9.5, cellPadding: 3 },
                bodyStyles: { textColor: charcoalDark, fontSize: 9, cellPadding: 3, lineColor: [156, 163, 175] },
                alternateRowStyles: { fillColor: [243, 244, 246] },
                columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } },
                margin: { left: 14, right: 14 },
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            const totalBlockX = 120;
            const vAlignX = 196;

            doc.setFontSize(10);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "normal");
            doc.text("Subtotal:", totalBlockX, finalY);
            doc.setTextColor(...charcoalDark);
            doc.text(formatCurrencySafe(data.subtotal), vAlignX, finalY, { align: "right" });

            let currentTotalY = finalY;
            totalRows.slice(1).forEach(row => {
                currentTotalY += 7;
                doc.setTextColor(...(row.bold ? orangeAccent : textLight));
                doc.setFont("helvetica", row.bold ? "bold" : "normal");
                if (row.bold) {
                    const totalBoxY = currentTotalY - 5;
                    doc.setFillColor(255, 247, 237); // orange-50
                    doc.setDrawColor(...orangeAccent);
                    doc.roundedRect(totalBlockX - 5, totalBoxY, 87, 14, 1, 1, "FD");
                    doc.text(row.label + ":", totalBlockX, totalBoxY + 9);
                    doc.text(formatCurrencySafe(row.value), vAlignX, totalBoxY + 9, { align: "right" });
                    currentTotalY += 7;
                } else {
                    doc.text(row.label + ":", totalBlockX, currentTotalY);
                    doc.setTextColor(...charcoalDark);
                    doc.text((row.value < 0 ? "-" : "") + formatCurrencySafe(Math.abs(row.value)), vAlignX, currentTotalY, { align: "right" });
                }
            });

            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(...textLight);
            doc.text("Declaration / Verification:", 14, pageHeight - 38);
            doc.setFont("helvetica", "normal");
            doc.text("All materials and works certified to be completed and billed according to standard terms.", 14, pageHeight - 33, { maxWidth: 100 });

            if (signatureBase64) {
                const maxDim = 28;
                let renderW = signatureBase64.width;
                let renderH = signatureBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                const sigY = pageHeight - 42;
                const sigX = 196 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...charcoalDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Representative", 196, sigY + renderH + 5, { align: "right" });
            }
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
