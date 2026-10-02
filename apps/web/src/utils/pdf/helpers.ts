import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    UniversalDocumentType,
    DocumentDescriptor,
    DOCUMENT_DESCRIPTORS,
    BankDetailsInfo,
    ImageBase64Info,
} from "./types";

export function resolveDocumentDescriptor(
    documentType?: UniversalDocumentType, 
    documentTitle?: string, 
    docNumber?: string
): DocumentDescriptor {
    if (documentType && DOCUMENT_DESCRIPTORS[documentType]) {
        const desc = { ...DOCUMENT_DESCRIPTORS[documentType] };
        if (documentTitle) desc.title = documentTitle;
        return desc;
    }

    const titleUpper = (documentTitle || "").trim().toUpperCase();
    if (titleUpper.includes("PURCHASE ORDER") || titleUpper === "PO") {
        return { ...DOCUMENT_DESCRIPTORS['purchase_order'], title: documentTitle || "PURCHASE ORDER" };
    }
    if (titleUpper.includes("SALE ORDER") || titleUpper.includes("SALES ORDER") || titleUpper === "SO") {
        return { ...DOCUMENT_DESCRIPTORS['sale_order'], title: documentTitle || "SALE ORDER" };
    }
    if (titleUpper.includes("PURCHASE BILL") || titleUpper.includes("PURCHASE INVOICE") || titleUpper.includes("INWARD")) {
        return { ...DOCUMENT_DESCRIPTORS['purchase_bill'], title: documentTitle || "PURCHASE BILL" };
    }
    if (titleUpper.includes("DELIVERY CHALLAN")) {
        return { ...DOCUMENT_DESCRIPTORS['delivery_challan'], title: documentTitle || "DELIVERY CHALLAN" };
    }
    if (titleUpper.includes("PROFORMA")) {
        return { ...DOCUMENT_DESCRIPTORS['proforma'], title: documentTitle || "PROFORMA INVOICE" };
    }

    const numUpper = (docNumber || "").trim().toUpperCase();
    if (numUpper.startsWith("PO-") || numUpper.startsWith("PO/")) {
        return { ...DOCUMENT_DESCRIPTORS['purchase_order'], title: documentTitle || "PURCHASE ORDER" };
    }
    if (numUpper.startsWith("SO-") || numUpper.startsWith("ORD-") || numUpper.startsWith("SO/")) {
        return { ...DOCUMENT_DESCRIPTORS['sale_order'], title: documentTitle || "SALE ORDER" };
    }
    if (numUpper.startsWith("BILL-") || numUpper.startsWith("PB-") || numUpper.startsWith("PUR-")) {
        return { ...DOCUMENT_DESCRIPTORS['purchase_bill'], title: documentTitle || "PURCHASE BILL" };
    }

    return { ...DOCUMENT_DESCRIPTORS['invoice'], title: documentTitle || "TAX INVOICE" };
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
 * Reads bank accounts from tenant-isolated storage
 */
export const getStoredBankAccounts = (userId?: string): any[] => {
    try {
        const storageKey = userId ? `finflow_bank_accounts_${userId}` : "rupeebill_bank_accounts";
        const saved = localStorage.getItem(storageKey);
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
 */
export const resolveInvoiceBankDetails = (options?: {
    printBankDetails?: boolean;
    bankDetails?: BankDetailsInfo;
    selectedBankAccountId?: string;
    bankAccounts?: any[];
    profile?: any;
    businessDetails?: any;
    userId?: string;
}): BankDetailsInfo | null => {
    const printSetting = options?.printBankDetails !== undefined 
        ? options.printBankDetails 
        : localStorage.getItem("rupeebill_print_bank_details") !== "false";

    if (!printSetting) {
        return null;
    }

    if (options?.bankDetails?.bankName && options?.bankDetails?.accountNumber) {
        return options.bankDetails;
    }

    const accounts = options?.bankAccounts || getStoredBankAccounts(options?.userId);
    if (accounts.length > 0) {
        const preferredId = options?.selectedBankAccountId || localStorage.getItem("rupeebill_selected_bank_account_id");
        let target = accounts.find((a: any) => a.id === preferredId);
        if (!target) {
            target = accounts.find((a: any) => a.isDefault || a.is_default) || accounts[0];
        }
        if (target && (target.bankName || target.bank_name) && (target.accountNumber || target.account_number)) {
            return {
                bankName: target.bankName || target.bank_name,
                accountNumber: target.accountNumber || target.account_number,
                ifscCode: target.ifscCode || target.ifsc_code || "",
                branchName: target.branchName || target.branch_name || ""
            };
        }
    }

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

    return null;
};

export const parseSafeDate = (d: any): Date => {
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

export const sanitizeText = (text: string) => {
    return text.replace(/[^\x00-\x7F]/g, "");
};

export const formatAmountClean = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatCurrencySafe = (amount: number | string) => {
    return `Rs. ${formatAmountClean(amount)}`;
};

export const fetchImageAsBase64 = async (url: string): Promise<ImageBase64Info | null> => {
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

export const runAutoTable = (pdfDoc: jsPDF, opts: any) => {
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
