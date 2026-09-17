import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import QRCode from "qrcode";

export interface InvoiceDetails {
    invoice_number: string;
    date: string;
    due_date?: string;
    status?: 'paid' | 'pending' | 'overdue' | 'draft' | 'partial' | string;
    amount_paid?: number;
    balance_due?: number;
    payment_method?: string;
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
        tax_rate?: number | string;
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
        bank_name?: string;
        bank_account_no?: string;
        bank_ifsc?: string;
        bank_branch?: string;
        upi_id?: string;
    };
}

export type InvoicePdfTheme = 'startup-gradient' | 'tally-accounting';

export interface BankDetailsInfo {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName?: string;
}

export interface TotalRow {
    label: string;
    value: number;
    bold?: boolean;
    isPaid?: boolean;
    isDue?: boolean;
}

/**
 * Converts a numeric amount to Indian English Words (Rupees and Paise)
 * e.g. 15340 -> "INR Fifteen Thousand Three Hundred Forty Rupees Only"
 */
export function convertAmountToIndianWords(amount: number): string {
    if (!amount || isNaN(amount) || amount <= 0) return "Zero Rupees Only";

    const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertChunk = (n: number): string => {
        let str = "";
        if (n >= 100) {
            str += singleDigits[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n >= 10 && n <= 19) {
            str += teens[n - 10] + " ";
        } else if (n >= 20) {
            str += tens[Math.floor(n / 10)] + " ";
            if (n % 10 > 0) str += singleDigits[n % 10] + " ";
        } else if (n > 0) {
            str += singleDigits[n] + " ";
        }
        return str.trim();
    };

    const whole = Math.floor(amount);
    const paise = Math.round((amount - whole) * 100);

    let res = "";
    const crore = Math.floor(whole / 10000000);
    let rem = whole % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;
    const thousand = Math.floor(rem / 1000);
    rem = rem % 1000;
    const hundredAndBelow = rem;

    if (crore > 0) res += convertChunk(crore) + " Crore ";
    if (lakh > 0) res += convertChunk(lakh) + " Lakh ";
    if (thousand > 0) res += convertChunk(thousand) + " Thousand ";
    if (hundredAndBelow > 0) res += convertChunk(hundredAndBelow) + " ";

    res = res.trim();
    if (!res) res = "Zero";

    res = `INR ${res} Rupees`;

    if (paise > 0) {
        res += ` and ${convertChunk(paise)} Paise`;
    }

    res += " Only";
    return res.replace(/\s+/g, " ");
}

/**
 * Reads bank accounts from localStorage
 */
export const getStoredBankAccounts = (): any[] => {
    try {
        const saved = localStorage.getItem("rupeebill_bank_accounts");
        if (saved) {
            const list = JSON.parse(saved);
            if (Array.isArray(list)) return list;
        }
    } catch (e) {
        console.error("Error reading stored bank accounts", e);
    }
    return [];
};

/**
 * Resolves the real bank account to print on the invoice.
 * Returns null if user turned off printing or if no real bank account is found.
 * Never returns hardcoded dummy accounts.
 */
export const resolveInvoiceBankDetails = (options?: {
    printBankDetails?: boolean;
    bankDetails?: BankDetailsInfo;
    selectedBankAccountId?: string;
    profile?: any;
    businessDetails?: any;
}): BankDetailsInfo | null => {
    // 1. Check setting
    const printSetting = options?.printBankDetails !== undefined 
        ? options.printBankDetails 
        : localStorage.getItem("rupeebill_print_bank_details") !== "false";

    if (!printSetting) {
        return null;
    }

    // 2. Explicit bankDetails passed
    if (options?.bankDetails?.bankName && options?.bankDetails?.accountNumber) {
        return options.bankDetails;
    }

    // 3. Check customer added bank accounts from localStorage
    const accounts = getStoredBankAccounts();
    if (accounts.length > 0) {
        const preferredId = options?.selectedBankAccountId || localStorage.getItem("rupeebill_selected_bank_account_id");
        let target = accounts.find((a: any) => a.id === preferredId);
        if (!target) {
            target = accounts.find((a: any) => a.isDefault) || accounts[0];
        }
        if (target && target.bankName && target.accountNumber) {
            return {
                bankName: target.bankName,
                accountNumber: target.accountNumber,
                ifscCode: target.ifscCode || "",
                branchName: target.branchName || ""
            };
        }
    }

    // 4. Check business_details or profile
    const biz = options?.businessDetails;
    if (biz?.bank_name && biz?.bank_account_no) {
        return {
            bankName: biz.bank_name,
            accountNumber: biz.bank_account_no,
            ifscCode: biz.bank_ifsc || "",
            branchName: biz.bank_branch || ""
        };
    }

    const profile = options?.profile;
    if (profile?.bank_name && profile?.bank_account_no) {
        return {
            bankName: profile.bank_name,
            accountNumber: profile.bank_account_no,
            ifscCode: profile.bank_ifsc || "",
            branchName: profile.bank_branch || ""
        };
    }

    // 5. No real bank details found -> return null
    return null;
};

const parseSafeDate = (d: any): Date => {
    if (!d) return new Date();
    if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
    if (typeof d === 'string') {
        const s = d.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, day] = s.split('-').map(Number);
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

const sanitizeText = (text: string) => {
    return text.replace(/[^\x00-\x7F]/g, "");
};

const formatAmountClean = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCurrencySafe = (amount: number | string) => {
    return `Rs. ${formatAmountClean(amount)}`;
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

const getBase64Image = fetchImageAsBase64;

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
    bizName: string,
    footerHeight: number = 72
): number => {
    if (finalY + footerHeight > pageHeight - 12) {
        doc.addPage();
        if (themeName === 'tally-accounting') {
            const scale = pageWidth / 210;
            const tallyMarginX = 10 * scale;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(tallyMarginX, tallyMarginX, pageWidth - 2 * tallyMarginX, pageHeight - 2 * tallyMarginX);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(`${bizName} - Invoice ${invoiceNum} (Continuation)`, tallyMarginX + 2, 16 * scale);
            doc.line(tallyMarginX, 19 * scale, pageWidth - tallyMarginX, 19 * scale);
            return 24 * scale;
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
    options?: { 
        action?: 'download' | 'preview', 
        theme?: InvoicePdfTheme, 
        documentTitle?: string, 
        pageSize?: PageSize, 
        customTerms?: string, 
        fontSizeFactor?: number,
        printBankDetails?: boolean,
        bankDetails?: BankDetailsInfo,
        selectedBankAccountId?: string,
        printUpiQr?: boolean,
        upiId?: string,
        showItemTaxRateOnBill?: boolean
    }
) => {
    try {
        const autoTable = runAutoTable;
        const action = options?.action || 'download';
        const savedTheme = options?.theme || localStorage.getItem("rupeebill_invoice_theme") || 'startup-gradient';
        const theme = (savedTheme === 'tally-accounting' || savedTheme === 'startup-gradient') ? savedTheme : 'startup-gradient';
        const documentTitle = options?.documentTitle;
        const isPurchaseBill = Boolean(
            documentTitle === 'PURCHASE BILL' || 
            documentTitle?.toUpperCase().includes('PURCHASE BILL') ||
            data.invoice_number?.startsWith('BILL-')
        );
        const resolvedDocTitle = documentTitle || (isPurchaseBill ? "PURCHASE BILL" : (theme === 'tally-accounting' ? "TAX INVOICE" : "INVOICE"));
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
        const dateFormatted = format(parseSafeDate(data.date), "dd MMM yyyy");
        const dueDateFormatted = data.due_date ? format(parseSafeDate(data.due_date), "dd MMM yyyy") : undefined;

        const totalAmount = Number(data.total_amount) || 0;
        const isFullyPaid = data.status === 'paid' || (data.balance_due !== undefined && Number(data.balance_due) <= 0 && data.status !== 'pending' && data.status !== 'overdue');
        const amountPaid = data.amount_paid !== undefined 
            ? Number(data.amount_paid) 
            : (isFullyPaid ? totalAmount : 0);
        const balanceDue = data.balance_due !== undefined 
            ? Number(data.balance_due) 
            : Math.max(0, totalAmount - amountPaid);

        // Resolve real bank account details (no hardcoded fallback)
        const resolvedBank = resolveInvoiceBankDetails({
            printBankDetails: options?.printBankDetails,
            bankDetails: options?.bankDetails,
            selectedBankAccountId: options?.selectedBankAccountId,
            businessDetails: data.business_details
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const scale = pageSize === 'a5' ? 0.72 : 1.0;
        const marginX = (pageSize === 'a5' ? 10 : 14);

        const logoBase64 = data.business_details?.logo_url ? await getBase64Image(data.business_details.logo_url) : null;
        const signatureBase64 = data.business_details?.signature_url ? await getBase64Image(data.business_details.signature_url) : null;

        const bizName = safeText(data.business_details?.name || "Business Name");
        const custGSTIN = safeText(data.customer_gstin);

        // Resolve UPI QR Code details (Skip generating buyer collection QR for inward purchase bills)
        const printUpiSetting = options?.printUpiQr !== undefined
            ? options.printUpiQr
            : localStorage.getItem("rupeebill_print_upi_qr") !== "false";

        const resolvedUpiId = (
            options?.upiId ||
            data.business_details?.upi_id ||
            localStorage.getItem("rupeebill_upi_id") ||
            ""
        ).trim();

        let upiQrBase64: { dataUrl: string; width: number; height: number } | null = null;
        if (printUpiSetting && resolvedUpiId && !isPurchaseBill) {
            try {
                const payeeVpa = resolvedUpiId;
                const payeeName = encodeURIComponent(bizName.slice(0, 50));
                const amountToPay = (balanceDue > 0 ? balanceDue : totalAmount).toFixed(2);
                const note = encodeURIComponent(`Invoice ${safeText(data.invoice_number)}`);
                const upiUri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${payeeName}&am=${amountToPay}&cu=INR&tn=${note}`;
                const dataUrl = await QRCode.toDataURL(upiUri, {
                    errorCorrectionLevel: 'M',
                    margin: 1,
                    width: 300,
                    color: { dark: '#000000', light: '#ffffff' }
                });
                upiQrBase64 = { dataUrl, width: 300, height: 300 };
            } catch (err) {
                console.warn("Failed to generate UPI QR code for invoice:", err);
            }
        }

        const showItemTaxRate = options?.showItemTaxRateOnBill !== undefined
            ? options.showItemTaxRateOnBill
            : (localStorage.getItem("rupeebill_show_item_tax_rate_on_bill") === "true");

        let taxRateVal = Number(data.tax_rate) || 0;
        if (taxRateVal === 0 && data.tax_amount && data.tax_amount > 0) {
            const taxableAmount = Math.max(1, Number(data.subtotal || 0) - Number(data.discount_amount || 0));
            taxRateVal = Math.round((Number(data.tax_amount) / taxableAmount) * 100);
        }
        if (taxRateVal === 0 && data.items.length > 0 && data.items[0].tax_rate) {
            taxRateVal = Number(data.items[0].tax_rate) || 0;
        }

        const cgstVal = data.cgst !== undefined ? Number(data.cgst) : ((Number(data.tax_amount) || 0) / 2);
        const sgstVal = data.sgst !== undefined ? Number(data.sgst) : ((Number(data.tax_amount) || 0) / 2);

        const getTaxRows = (prefix: string) => {
            if (!data.tax_amount || data.tax_amount <= 0) return [];
            const tr = taxRateVal;
            if (data.igst !== undefined && Number(data.igst) > 0) {
                return [{ label: `IGST (${tr}%)`, value: Number(data.igst) }];
            }
            return [
                { label: `CGST (${tr/2}%)`, value: cgstVal },
                { label: `SGST (${tr/2}%)`, value: sgstVal }
            ];
        };

        const totalRows: TotalRow[] = [
            { label: "Subtotal", value: data.subtotal },
            ...(data.discount_amount && data.discount_amount > 0 ? [{ label: "Discount", value: -data.discount_amount }] : []),
            ...getTaxRows("at"),
            { label: "Grand Total", value: data.total_amount, bold: true },
            { label: "Amount Paid", value: amountPaid, isPaid: true },
            { label: "Balance Due (Pending)", value: balanceDue, isDue: true, bold: balanceDue > 0 }
        ];

        if (theme === 'tally-accounting') {
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

            // Centered Header Label: "TAX INVOICE" or "PURCHASE BILL"
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(11);
            doc.text(resolvedDocTitle, pageWidth / 2, 16 * scale, { align: "center" });
            doc.line(tallyMarginX, 19 * scale, pageWidth - tallyMarginX, 19 * scale);

            const midX = pageWidth / 2;

            // Quadrant 1: Seller / Company Details (Top Left)
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(80, 80, 80);
            doc.text(isPurchaseBill ? "Recipient / Consignee (Purchaser):" : "Sender / Company Details:", tallyMarginX + 2, 23 * scale);
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
            doc.text(isPurchaseBill ? "Bill No:" : "Invoice No:", metaLabelX, metaY);
            doc.setFont(fontStyle, "bold");
            doc.text(safeText(data.invoice_number), metaValX, metaY, { align: "right" });
            metaY += 4.8 * scale;

            doc.setFont(fontStyle, "normal");
            doc.text(isPurchaseBill ? "Bill Date:" : "Dated:", metaLabelX, metaY);
            doc.setFont(fontStyle, "bold");
            doc.text(dateFormatted, metaValX, metaY, { align: "right" });
            metaY += 4.8 * scale;

            doc.setFont(fontStyle, "normal");
            doc.text(isPurchaseBill ? "Payment Due:" : "Delivery Note:", metaLabelX, metaY);
            doc.text(dueDateFormatted ? `Due: ${dueDateFormatted}` : (isPurchaseBill ? "Immediate / Net 0" : "Direct Delivery"), metaValX, metaY, { align: "right" });
            metaY += 4.8 * scale;

            doc.text(isPurchaseBill ? "Bill Status:" : "Mode/Terms:", metaLabelX, metaY);
            const statusLabel = balanceDue <= 0 ? "Immediate / Paid" : (amountPaid > 0 ? `Partial (Due: Rs. ${balanceDue.toFixed(2)})` : "Pending / Due");
            doc.setFont(fontStyle, "bold");
            if (balanceDue <= 0) doc.setTextColor(22, 101, 52);
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
            doc.text(isPurchaseBill ? "Supplier / Vendor (Billed By):" : "Buyer (Bill to):", tallyMarginX + 2, buyerY);
            doc.setTextColor(...textDark);
            buyerY += 4.2 * scale;
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(10);
            doc.text(safeText(data.customer_name || (isPurchaseBill ? "Vendor / Supplier" : "Walk-in Guest")), tallyMarginX + 2, buyerY);
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
            doc.text(isPurchaseBill ? "Delivery / Goods Inward At:" : "Consignee (Ship to):", midX + 2, shipY);
            doc.setTextColor(...textDark);
            shipY += 4.2 * scale;
            doc.setFont(fontStyle, "bold");
            doc.setFontSize(9.5);
            doc.text(isPurchaseBill ? bizName : safeText(data.customer_name || "Walk-in Guest"), midX + 2, shipY);
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(7.5);
            shipY += 4 * scale;
            doc.text(isPurchaseBill ? (data.business_details?.address ? safeText(data.business_details.address).slice(0, 45) : "Business Premises") : "Same as billing address", midX + 2, shipY);
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
                doc.text("Declaration:", tallyMarginX + 2, declY);

                doc.setFont(fontStyle, "normal");
                doc.setFontSize(6.8);
                const termsText = customTerms || (isPurchaseBill
                    ? "We acknowledge receipt of inward goods/services as per the quantities and rates invoiced above, subject to internal verification and GST ITC eligibility."
                    : "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.");
                const splitTerms = doc.splitTextToSize(termsText, splitX - tallyMarginX - 4);
                doc.text(splitTerms, tallyMarginX + 2, declY + 3.5 * scale);

                // Seal note at bottom left
                doc.setFont(fontStyle, "normal");
                doc.setFontSize(6.5);
                doc.setTextColor(110, 110, 110);
                doc.text(isPurchaseBill ? "Receiver's / Store's Seal & Signature" : "Customer's Seal and Signature", tallyMarginX + 2, pageHeight - tallyMarginY - 2.5 * scale);
                doc.setTextColor(...textDark);

            } else {
                // Divider 1: between words and Declaration
                const line1Y = footerStartY + 15 * scale;
                doc.line(tallyMarginX, line1Y, splitX, line1Y);

                // Declaration
                const declY = line1Y + 4 * scale;
                doc.setFont(fontStyle, "bold");
                doc.setFontSize(7.5);
                doc.text("Declaration:", tallyMarginX + 2, declY);

                doc.setFont(fontStyle, "normal");
                doc.setFontSize(6.8);
                const termsText = customTerms || (isPurchaseBill
                    ? "We acknowledge receipt of inward goods/services as per the quantities and rates invoiced above, subject to internal verification and GST ITC eligibility."
                    : "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.");
                const splitTerms = doc.splitTextToSize(termsText, splitX - tallyMarginX - 4);
                doc.text(splitTerms, tallyMarginX + 2, declY + 3.5 * scale);

                // Seal note at bottom left
                doc.setFont(fontStyle, "normal");
                doc.setFontSize(6.5);
                doc.setTextColor(110, 110, 110);
                doc.text(isPurchaseBill ? "Receiver's / Store's Seal & Signature" : "Customer's Seal and Signature", tallyMarginX + 2, pageHeight - tallyMarginY - 2.5 * scale);
                doc.setTextColor(...textDark);
            }

            // --- RIGHT COLUMN: Summary & Signatory ---
            let rightY = footerStartY + 4.2 * scale;
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(8);
            
            doc.text("Subtotal:", splitX + 2, rightY);
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
            doc.text("Total:", splitX + 2, rightY + 3.8 * scale);
            doc.text(formatCurrencySafe(data.total_amount), pageWidth - tallyMarginX - 2, rightY + 3.8 * scale, { align: "right" });
            rightY += 5.8 * scale;

            // Partial Payment Breakdown
            doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(22, 101, 52); // Forest green
            doc.text("Amount Paid:", splitX + 2, rightY + 3.2 * scale);
            doc.text(formatCurrencySafe(amountPaid), pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
            rightY += 4.8 * scale;

            doc.setFont(fontStyle, "bold");
            if (balanceDue > 0) {
                doc.setTextColor(185, 28, 28); // Crimson red
                doc.text("Balance Due:", splitX + 2, rightY + 3.2 * scale);
                doc.text(formatCurrencySafe(balanceDue), pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
            } else {
                doc.setTextColor(22, 101, 52); // Forest green
                doc.text("Balance Due:", splitX + 2, rightY + 3.2 * scale);
                doc.text("0.00 (PAID)", pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
            }
            doc.setTextColor(...textDark);
            rightY += 5.2 * scale;

            doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);

            // Signatory Box
            const signatoryBoxTop = rightY;
            const signatoryBoxBottom = pageHeight - tallyMarginY;
            const rightColWidth = (pageWidth - tallyMarginX) - splitX;
            const signatoryCenterX = splitX + rightColWidth / 2;

            doc.setFont(fontStyle, "bold");
            doc.setFontSize(7.5);
            const forBizText = isPurchaseBill ? `for ${bizName.toUpperCase()} (Purchaser)` : `for ${bizName.toUpperCase()}`;
            const splitForBiz = doc.splitTextToSize(forBizText, rightColWidth - 4);
            doc.text(splitForBiz, splitX + 2, signatoryBoxTop + 3.5 * scale);
            const bizTextH = splitForBiz.length * 3.2 * scale;

            // Authorized Signatory anchor at bottom
            doc.setFont(fontStyle, "normal");
            doc.setFontSize(7.5);
            doc.text(isPurchaseBill ? "Authorized Receiver / Signatory" : "Authorized Signatory", signatoryCenterX, signatoryBoxBottom - 2.5 * scale, { align: "center" });

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
            doc.text(resolvedDocTitle, 196, 20, { align: "right" });
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(isPurchaseBill ? `Bill # ${safeText(data.invoice_number)}` : `No. ${safeText(data.invoice_number)}`, 196, 27, { align: "right" });
            doc.text(`Date: ${dateFormatted}`, 196, 32, { align: "right" });
            if (dueDateFormatted) {
                doc.text(`Due Date: ${dueDateFormatted}`, 196, 37, { align: "right" });
            }
            const statusLineY = dueDateFormatted ? 42 : 37;
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            if (balanceDue <= 0) {
                doc.setTextColor(22, 101, 52);
                doc.text("STATUS: FULLY PAID", 196, statusLineY, { align: "right" });
            } else if (amountPaid > 0) {
                doc.setTextColor(180, 83, 9);
                doc.text(`STATUS: PARTIALLY PAID (Pending: ${formatCurrencySafe(balanceDue)})`, 196, statusLineY, { align: "right" });
            } else {
                doc.setTextColor(220, 38, 38);
                doc.text("STATUS: UNPAID / DUE", 196, statusLineY, { align: "right" });
            }

            doc.setTextColor(...textDark);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(isPurchaseBill ? "VENDOR / SUPPLIER (BILLED BY)" : "BILL TO", 14, 55);

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
                if (row.isPaid) {
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
                doc.text(isPurchaseBill ? "Receiver's Verification / Signature" : "Authorized Signature", pageWidth - 14, sigY + renderH + 5, { align: "right" });
            }

            doc.setDrawColor(243, 244, 246);
            doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
            doc.setFontSize(9);
            doc.setTextColor(...textLight);
            doc.setFont("helvetica", "italic");
            const termsText = customTerms || (isPurchaseBill ? "Inward Purchase Voucher recorded for accounting and ITC compliance." : "Generated with love via RupeeBill Ledger. Growth is a habit.");
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