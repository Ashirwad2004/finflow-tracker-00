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
        unit?: string;
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
    notes?: string;
    irn?: string;
    eway_bill_number?: string;
    qr_code?: string;
    business_details?: {
        name: string;
        address?: string;
        phone?: string;
        gst?: string;
        logo_url?: string;
        signature_url?: string;
    };
}

export type InvoicePdfTheme = 'startup-gradient' | 'tally-accounting';

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
    if (!url) return null;
    try {
        if (url.startsWith("data:")) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        dataUrl: url,
                        width: img.width,
                        height: img.height
                    });
                };
                img.onerror = () => resolve(null);
                img.src = url;
            });
        }

        const response = await fetch(url);
        if (!response.ok) {
            console.warn("Failed to fetch image status:", response.status, url);
            return null;
        }
        const blob = await response.blob();
        return new Promise((resolve) => {
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
                img.onerror = () => resolve(null);
                img.src = reader.result as string;
            };
            reader.onerror = () => resolve(null);
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
                
                pdfDoc.setFontSize(9.5);
                pdfDoc.setFont("helvetica", "normal");
                pdfDoc.setTextColor(30, 41, 59);
                pdfDoc.text(info.name, cell.x + paddingLeft, cell.y + paddingTop + 3.5, {
                    maxWidth: cell.width - paddingLeft - (cell.styles.cellPadding?.right ?? 4)
                });

                pdfDoc.setFontSize(7.5);
                pdfDoc.setFont("helvetica", "normal");
                pdfDoc.setTextColor(148, 163, 184);
                pdfDoc.text(`HSN: ${info.hsn}`, cell.x + paddingLeft, cell.y + cell.height - paddingBottom);
                
                pdfDoc.restoreGraphicsState();
            }
        }
    };

    autoTable(pdfDoc, opts);
};

export type PageSize = 'a4' | 'a5';

export const handleContinuationPage = (
    doc: jsPDF, 
    finalY: number, 
    pageHeight: number, 
    pageWidth: number, 
    brandColor: [number, number, number] | null, 
    themeName: string, 
    invoiceNum: string, 
    bizName: string
): number => {
    if (finalY + 55 > pageHeight - 15) {
        doc.addPage();
        if (themeName === 'tally-accounting') {
            const scale = pageWidth / 210;
            const tallyMarginX = 10 * scale;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(tallyMarginX, tallyMarginX, pageWidth - 2 * tallyMarginX, pageHeight - 2 * tallyMarginX);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(`${bizName} - Invoice ${invoiceNum} (Continuation)`, tallyMarginX + 2, 16);
            doc.line(tallyMarginX, 19, pageWidth - tallyMarginX, 19);
            return 24;
        } else {
            const color = brandColor || [79, 70, 229];
            doc.setFillColor(...color);
            doc.rect(0, 0, pageWidth, 15, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(`${bizName} - Invoice ${invoiceNum} (Continuation)`, 14, 10);
            return 25;
        }
    }
    return finalY;
};

export const generateInvoicePDF = async (
    data: InvoiceDetails,
    options?: { action?: 'download' | 'preview', theme?: InvoicePdfTheme, documentTitle?: string, pageSize?: PageSize, customTerms?: string, fontSizeFactor?: number }
) => {
    try {
        const autoTable = runAutoTable;
        const action = options?.action || 'download';
        const savedTheme = options?.theme || localStorage.getItem("rupeebill_invoice_theme") || 'startup-gradient';
        const theme = (savedTheme === 'tally-accounting' || savedTheme === 'startup-gradient') ? savedTheme : 'startup-gradient';
        const documentTitle = options?.documentTitle;
        const pageSize = options?.pageSize || (localStorage.getItem("rupeebill_invoice_pagesize") as PageSize) || 'a4';
        const customTerms = data.notes || options?.customTerms || localStorage.getItem("rupeebill_invoice_terms") || "";
        
        const savedFontSizeFactor = (options?.fontSizeFactor ?? Number(localStorage.getItem("rupeebill_invoice_fontsize_factor"))) || 1.0;
        const autoFitFactor = pageSize === 'a5' ? 0.75 : 1.0;
        const finalFontScale = savedFontSizeFactor * autoFitFactor;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: pageSize
        });

        // Intercept setFontSize to scale text dynamically
        const originalSetFontSize = doc.setFontSize;
        doc.setFontSize = function(size: number) {
            return originalSetFontSize.call(this, size * finalFontScale);
        };

        const safeText = (txt: string | undefined | null) => sanitizeText(txt || "");
        const dateFormatted = data.date ? format(new Date(data.date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy");
        const bizName = safeText(data.business_details?.name || "RupeeBill Business");
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const scale = pageWidth / 210;

        let taxRateVal = Number(data.tax_rate) || 0;
        if (taxRateVal === 0 && data.tax_amount && data.tax_amount > 0) {
            const taxableAmount = Math.max(1, Number(data.subtotal || 0) - Number(data.discount_amount || 0));
            taxRateVal = Math.round((Number(data.tax_amount) / taxableAmount) * 100);
        }
        const getScaledColumnStyles = (baseStyles: Record<number, any>) => {
            const scaled: any = {};
            for (const key in baseStyles) {
                const style = baseStyles[key];
                scaled[key] = {
                    ...style,
                    cellWidth: style.cellWidth ? style.cellWidth * scale : undefined
                };
            }
            return scaled;
        };
        const marginX = 14 * scale;

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
            const splitRate = taxRateVal ? taxRateVal / 2 : 0;
            const cgstLabel = splitRate ? (style === "at" ? `CGST @ ${splitRate}%` : `CGST (${splitRate}%)`) : "CGST";
            const sgstLabel = splitRate ? (style === "at" ? `SGST @ ${splitRate}%` : `SGST (${splitRate}%)`) : "SGST";
            const igstLabel = taxRateVal ? (style === "at" ? `IGST @ ${taxRateVal}%` : `IGST (${taxRateVal}%)`) : "IGST";

            if (isInterState && igstVal > 0) {
                rows.push({ label: igstLabel, value: igstVal });
            } else if (!isInterState && (cgstVal > 0 || sgstVal > 0)) {
                if (cgstVal > 0) rows.push({ label: cgstLabel, value: cgstVal });
                if (sgstVal > 0) rows.push({ label: sgstLabel, value: sgstVal });
            } else if (data.tax_amount && data.tax_amount > 0) {
                rows.push({ label: taxRateVal ? `Tax (${taxRateVal}%)` : "Tax", value: data.tax_amount });
            }

            return rows;
        };

        const totalRows: TotalRow[] = [
            { label: "Subtotal", value: data.subtotal },
            ...(data.discount_amount && data.discount_amount > 0 ? [{ label: "Discount", value: -data.discount_amount }] : []),
            ...getTaxRows("at"),
            { label: "Grand Total", value: data.total_amount, bold: true }
        ];

        if (theme === 'tally-accounting') {
            // --- TALLY ERP GST TAX INVOICE FORMAT ---
            const lineDark: [number, number, number] = [0, 0, 0];
            const textDark: [number, number, number] = [0, 0, 0];
            const fontStyle = "helvetica";
            const tallyMarginX = 10 * scale;

            // Outer border around the page
            doc.setDrawColor(...lineDark);
            doc.setLineWidth(0.5);
            doc.rect(tallyMarginX, tallyMarginX, pageWidth - 2 * tallyMarginX, pageHeight - 2 * tallyMarginX);

            // Centered Header Label: "TAX INVOICE"
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(11);
            doc.text(documentTitle || "TAX INVOICE", pageWidth / 2, 16, { align: "center" });
            doc.line(tallyMarginX, 19, pageWidth - tallyMarginX, 19);

            // Quadrants: Vertical divider
            doc.line(pageWidth / 2, 19, pageWidth / 2, 75);

            // Quadrant 1: Seller Details (Top Left)
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(7.5);
            doc.text("Sender / Company Details:", tallyMarginX + 2, 23);
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(11);
            doc.text(bizName, tallyMarginX + 2, 28);
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8);
            let sellerY = 32;
            if (data.business_details?.address) {
                const addrLines = doc.splitTextToSize(safeText(data.business_details.address), pageWidth / 2 - tallyMarginX - 5);
                doc.text(addrLines, tallyMarginX + 2, sellerY);
                sellerY += addrLines.length * 3.6 + 1.2;
            }
            if (data.business_details?.phone) {
                doc.text(`Phone: ${safeText(data.business_details.phone)}`, tallyMarginX + 2, sellerY);
                sellerY += 4;
            }
            if (data.business_details?.gst) {
                doc.text(`GSTIN/UIN: ${safeText(data.business_details.gst)}`, tallyMarginX + 2, sellerY);
            }

            // Quadrant 2: Invoice Details (Top Right)
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8);
            doc.text(`Invoice No:`, pageWidth / 2 + 2, 24);
            doc.setFont(fontStyle, "bold");
            doc.text(safeText(data.invoice_number), pageWidth / 2 + 38, 24);
            
            doc.setFont(fontStyle, "normal");
            doc.text(`Dated:`, pageWidth / 2 + 2, 30);
            doc.text(dateFormatted, pageWidth / 2 + 38, 30);

            doc.text(`Delivery Note:`, pageWidth / 2 + 2, 36);
            doc.text("Direct Delivery", pageWidth / 2 + 38, 36);

            doc.text(`Mode/Terms of Payment:`, pageWidth / 2 + 2, 42);
            doc.text("Immediate / Paid", pageWidth / 2 + 38, 42);

            // Horizontal border separating Quadrants 1/2 from 3/4
            doc.line(tallyMarginX, 47, pageWidth - tallyMarginX, 47);

            // Quadrant 3: Buyer Details (Bottom Left)
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8);
            doc.text("Buyer (Bill to):", tallyMarginX + 2, 51);
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(10);
            doc.text(safeText(data.customer_name), tallyMarginX + 2, 56);
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8.5);
            let buyerY = 61;
            if (data.customer_phone) {
                doc.text(`Phone: ${safeText(data.customer_phone)}`, tallyMarginX + 2, buyerY);
                buyerY += 4.5;
            }
            if (data.customer_email) {
                doc.text(`Email: ${safeText(data.customer_email)}`, tallyMarginX + 2, buyerY);
                buyerY += 4.5;
            }
            if (custGSTIN) {
                doc.text(`GSTIN/UIN: ${custGSTIN}`, tallyMarginX + 2, buyerY);
            }

            // Quadrant 4: Dispatch Details (Bottom Right)
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8);
            doc.text("Consignee (Ship to):", pageWidth / 2 + 2, 51);
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(9.5);
            doc.text(safeText(data.customer_name), pageWidth / 2 + 2, 56);
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8.5);
            doc.text("Same as billing address", pageWidth / 2 + 2, 61);

            // Border above table
            doc.line(tallyMarginX, 75, pageWidth - tallyMarginX, 75);

            // Autotable
            const tableRowsTally = data.items.map((item, index) => [
                (index + 1).toString(),
                safeText(item.description) + (item.hsn_code ? `\nHSN: ${safeText(item.hsn_code)}` : ""),
                item.quantity.toString(),
                formatCurrencySafe(item.price),
                safeText(item.unit || ""),
                formatCurrencySafe(item.total ?? (Number(item.quantity) * Number(item.price)))
            ]);

            autoTable(doc, {
                startY: 75,
                head: [["S.No", "Description of Goods", "Qty", "Rate", "per", "Amount"]],
                body: tableRowsTally,
                theme: 'grid',
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3, lineWidth: 0.5, lineColor: [0, 0, 0] },
                bodyStyles: { textColor: [0, 0, 0], fontSize: 8.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5 },
                columnStyles: { 
                    0: { cellWidth: 12 * scale, halign: 'center' }, 
                    2: { cellWidth: 15 * scale, halign: 'center' }, 
                    3: { cellWidth: 28 * scale, halign: 'right' }, 
                    4: { cellWidth: 15 * scale, halign: 'center' },
                    5: { cellWidth: 30 * scale, halign: 'right' } 
                },
                margin: { left: tallyMarginX, right: tallyMarginX },
            });

            let finalY = (doc as any).lastAutoTable.finalY;
            finalY = handleContinuationPage(doc, finalY, pageHeight, pageWidth, lineDark, theme, data.invoice_number, bizName);

            const footerHeight = 70;
            const footerStartY = Math.max(finalY, pageHeight - 10 - footerHeight);

            doc.setDrawColor(...lineDark);
            doc.setLineWidth(0.5);
            if (finalY < footerStartY) {
                const colXs = [
                    tallyMarginX + 12 * scale,
                    tallyMarginX + 102 * scale,
                    tallyMarginX + 117 * scale,
                    tallyMarginX + 145 * scale,
                    tallyMarginX + 160 * scale
                ];
                colXs.forEach(x => {
                    doc.line(x, finalY, x, footerStartY);
                });
            }

            // Box for bank/amount details starting at footerStartY
            doc.rect(tallyMarginX, footerStartY, pageWidth - 2 * tallyMarginX, pageHeight - 10 - footerStartY);
            
            // Vertical split
            const splitX = pageWidth - 85 * scale;
            doc.line(splitX, footerStartY, splitX, pageHeight - 10);
            
            // Left Column: Bank / Words / Declarations
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8);
            doc.text("Amount Chargeable (in words):", tallyMarginX + 2, footerStartY + 5);
            doc.setFont(fontStyle, "bold");
            doc.text(`INR ${formatCurrencySafe(data.total_amount).replace("Rs. ", "")} Only`, tallyMarginX + 2, footerStartY + 10);

            // Horizontal line in left column
            doc.line(tallyMarginX, footerStartY + 15, splitX, footerStartY + 15);
            
            // GST Tax split details
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8);
            doc.text("Tax Summary & CGST/SGST splitting computed internally under GST rules.", tallyMarginX + 2, footerStartY + 20);

            // Bank details
            let bankNameText = "Bank Name: State Bank of India";
            let bankAccText = "A/c No: 332405891234";
            let bankIfscText = "Branch & IFSC: SBI0001609";

            try {
                const savedBanks = localStorage.getItem("rupeebill_bank_accounts");
                if (savedBanks) {
                    const accounts = JSON.parse(savedBanks);
                    const defaultAcc = accounts.find((a: any) => a.isDefault) || accounts[0];
                    if (defaultAcc) {
                        bankNameText = `Bank Name: ${defaultAcc.bankName || ""}`;
                        bankAccText = `A/c No: ${defaultAcc.accountNumber || ""}`;
                        bankIfscText = `Branch & IFSC: ${defaultAcc.branchName || ""} / ${defaultAcc.ifscCode || ""}`;
                    }
                }
            } catch (e) {
                console.error("Error reading bank details", e);
            }

            doc.text(bankNameText, tallyMarginX + 2, footerStartY + 28);
            doc.text(bankAccText, tallyMarginX + 2, footerStartY + 32);
            doc.text(bankIfscText, tallyMarginX + 2, footerStartY + 36);

            // Horizontal line above declaration
            doc.line(tallyMarginX, footerStartY + 40, splitX, footerStartY + 40);
            
            // Declaration
            doc.setFont(fontStyle, "bold");
            doc.text("Declaration:", tallyMarginX + 2, footerStartY + 44);
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(7.5);
            const termsText = customTerms || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";
            doc.text(doc.splitTextToSize(termsText, splitX - tallyMarginX - 4), tallyMarginX + 2, footerStartY + 49);

            // Right Column: Summary & Signatory
            let rightY = footerStartY + 5;
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(9);
            
            doc.text("Subtotal:", splitX + 2, rightY);
            doc.text(formatCurrencySafe(data.subtotal), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
            rightY += 5;
            
            if (data.discount_amount && data.discount_amount > 0) {
                doc.text("Discount:", splitX + 2, rightY);
                doc.text(`-${formatCurrencySafe(data.discount_amount)}`, pageWidth - tallyMarginX - 2, rightY, { align: "right" });
                rightY += 5;
            }
            if (data.tax_amount && data.tax_amount > 0) {
                const tr = taxRateVal;
                doc.text(`CGST (${tr/2}%):`, splitX + 2, rightY);
                doc.text(formatCurrencySafe(cgstVal), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
                rightY += 5;
                doc.text(`SGST (${tr/2}%):`, splitX + 2, rightY);
                doc.text(formatCurrencySafe(sgstVal), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
                rightY += 5;
            }
            
            doc.line(splitX, rightY - 2, pageWidth - tallyMarginX, rightY - 2);
            doc.setFont(fontStyle, "bold");
            doc.text("Total:", splitX + 2, rightY + 3);
            doc.text(formatCurrencySafe(data.total_amount), pageWidth - tallyMarginX - 2, rightY + 3, { align: "right" });
            rightY += 8;

            doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);

            // Signatory Block
            const sigY = pageHeight - 35;
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8.5);
            doc.text(`for ${bizName.toUpperCase()}`, splitX + 2, Math.max(rightY + 5, sigY - 6));
            
            const signatoryCenterX = splitX + (pageWidth - tallyMarginX - splitX) / 2;
            if (signatureBase64) {
                const maxDim = 28 * scale;
                let renderW = signatureBase64.width;
                let renderH = signatureBase64.height;
                if (renderW > maxDim || renderH > maxDim) {
                    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
                    renderW *= ratio;
                    renderH *= ratio;
                }
                doc.addImage(signatureBase64.dataUrl, "PNG", signatoryCenterX - renderW/2, sigY - 2, renderW, renderH);
            }
            
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8);
            doc.text("Authorized Signatory", signatoryCenterX, pageHeight - 14, { align: "center" });

        } else {
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
            doc.text(documentTitle || "INVOICE", 196, 20, { align: "right" });
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
                columnStyles: getScaledColumnStyles({ 0: { cellWidth: 90 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } }),
                margin: { left: marginX, right: marginX },
            });

            let finalY = (doc as any).lastAutoTable.finalY + 10;
            finalY = handleContinuationPage(doc, finalY, pageHeight, pageWidth, indigoColor, theme, data.invoice_number, bizName);
            
            const totalBlockX = pageWidth - 90;
            const vAlignX = pageWidth - 14;

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
                const sigX = pageWidth - 14 - renderW;
                doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
                doc.setFontSize(9);
                doc.setTextColor(...textDark);
                doc.setFont("helvetica", "normal");
                doc.text("Authorized Signature", pageWidth - 14, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(243, 244, 246);
            doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
            doc.setFontSize(9);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "italic");
            const termsText = customTerms || "Generated with love via RupeeBill Ledger. Growth is a habit.";
            doc.text(doc.splitTextToSize(termsText, pageWidth - 28), pageWidth / 2, pageHeight - 12, { align: "center" });
        }

        // --- E-INVOICE DETAILS PAGE ---
        if (data.irn) {
            doc.addPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text("E-INVOICE DETAILS", 14 * scale, 20 * scale);

            doc.setDrawColor(200, 200, 200);
            doc.line(14 * scale, 25 * scale, pageWidth - 14 * scale, 25 * scale);

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Invoice Reference Number (IRN):", 14 * scale, 35 * scale);
            doc.setFont("helvetica", "normal");
            
            const splitIrn = doc.splitTextToSize(data.irn, pageWidth - 28 * scale);
            doc.text(splitIrn, 14 * scale, 42 * scale);

            if (data.eway_bill_number) {
                doc.setFont("helvetica", "bold");
                doc.text("E-Way Bill Number:", 14 * scale, 42 * scale + (splitIrn.length * 5 * scale) + 5 * scale);
                doc.setFont("helvetica", "normal");
                doc.text(data.eway_bill_number, 14 * scale, 42 * scale + (splitIrn.length * 5 * scale) + 12 * scale);
            }
            
            if (data.qr_code) {
                const qrY = 42 * scale + (splitIrn.length * 5 * scale) + (data.eway_bill_number ? 25 * scale : 10 * scale);
                doc.setFont("helvetica", "bold");
                doc.text("QR Code Data:", 14 * scale, qrY);
                doc.setFont("helvetica", "normal");
                const splitQr = doc.splitTextToSize(data.qr_code, pageWidth - 28 * scale);
                doc.text(splitQr, 14 * scale, qrY + 7 * scale);
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