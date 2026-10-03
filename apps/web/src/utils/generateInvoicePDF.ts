import jsPDF from "jspdf";
import { format } from "date-fns";
import QRCode from "qrcode";
import {
    InvoiceDetails,
    InvoicePdfTheme,
    UniversalDocumentType,
    PageSize,
    BankDetailsInfo,
    TotalRow,
    ThemeRenderContext,
    resolveDocumentDescriptor,
    resolveInvoiceBankDetails,
    fetchImageAsBase64,
    parseSafeDate,
    sanitizeText,
    renderTallyAccounting,
    renderSaleInvoice,
    renderStartupGradient,
} from "./pdf";

export * from "./pdf";

export const generateInvoicePDF = async (
    data: InvoiceDetails,
    options?: {
        action?: 'download' | 'preview' | 'print' | 'base64';
        theme?: InvoicePdfTheme;
        documentType?: UniversalDocumentType;
        documentTitle?: string;
        pageSize?: PageSize;
        customTerms?: string;
        fontSizeFactor?: number;
        printBankDetails?: boolean;
        bankDetails?: BankDetailsInfo;
        selectedBankAccountId?: string;
        printUpiQr?: boolean;
        upiId?: string;
        showItemTaxRateOnBill?: boolean;
        showPartyPreviousBalance?: boolean;
        showPartyPendingBalance?: boolean;
        profile?: any;
    }
) => {
    try {
        let cachedProfile: any = null;
        try {
            const raw = localStorage.getItem("rupeebill_profile") || localStorage.getItem("finflow_cached_profile");
            if (raw) cachedProfile = JSON.parse(raw);
        } catch (_) {}
        const profile = options?.profile || cachedProfile || null;

        const action = options?.action || 'download';
        const savedTheme = options?.theme || localStorage.getItem("rupeebill_invoice_theme") || 'startup-gradient';
        const theme = (savedTheme === 'tally-accounting' || savedTheme === 'startup-gradient' || savedTheme === 'sale-invoice')
            ? savedTheme
            : 'startup-gradient';

        const descriptor = resolveDocumentDescriptor(options?.documentType, options?.documentTitle, data.invoice_number);
        const pageSize = options?.pageSize || (localStorage.getItem("rupeebill_invoice_pagesize") as PageSize) || 'a4';

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
            businessDetails: data.business_details,
            profile
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const scale = pageSize === 'a5' ? 0.72 : 1.0;
        const marginX = (pageSize === 'a5' ? 10 : 14);

        const logoBase64 = data.business_details?.logo_url ? await fetchImageAsBase64(data.business_details.logo_url) : null;
        const signatureBase64 = data.business_details?.signature_url ? await fetchImageAsBase64(data.business_details.signature_url) : null;

        const bizName = safeText(data.business_details?.name || "Business Name");
        const custGSTIN = safeText(data.customer_gstin);

        // Resolve UPI QR Code details
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
        if (printUpiSetting && resolvedUpiId && descriptor.enableUpiQr) {
            try {
                const payeeVpa = resolvedUpiId;
                const payeeName = encodeURIComponent(bizName.slice(0, 50));
                const amountToPay = (balanceDue > 0 ? balanceDue : totalAmount).toFixed(2);
                const note = encodeURIComponent(`${descriptor.title} ${safeText(data.invoice_number)}`);
                const upiUri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${payeeName}&am=${amountToPay}&cu=INR&tn=${note}`;
                const dataUrl = await QRCode.toDataURL(upiUri, {
                    errorCorrectionLevel: 'M',
                    margin: 1,
                    width: 300,
                    color: { dark: '#000000', light: '#ffffff' }
                });
                upiQrBase64 = { dataUrl, width: 300, height: 300 };
            } catch (err) {
                console.warn("Failed to generate UPI QR code for document:", err);
            }
        }

        const showItemTaxRate = options?.showItemTaxRateOnBill !== undefined
            ? options.showItemTaxRateOnBill
            : (localStorage.getItem("rupeebill_show_item_tax_rate_on_bill") === "true");

        const showPartyPendingBalance = options?.showPartyPendingBalance !== undefined
            ? options.showPartyPendingBalance
            : (options?.showPartyPreviousBalance !== undefined
                ? options.showPartyPreviousBalance
                : (localStorage.getItem("rupeebill_show_party_pending_balance") !== null
                    ? localStorage.getItem("rupeebill_show_party_pending_balance") !== "false"
                    : localStorage.getItem("rupeebill_show_party_previous_balance") !== "false"));

        const customerNameLower = (data.customer_name || "").trim().toLowerCase();
        const isAnonymousCustomer = !customerNameLower || 
            customerNameLower === "cash customer" || 
            customerNameLower === "cash sale" || 
            customerNameLower === "walk-in" ||
            customerNameLower === "walk-in guest" ||
            customerNameLower === "cash";

        const shouldShowPartyBalance = showPartyPendingBalance && !isAnonymousCustomer;
        let prevBalanceVal = data.previous_balance !== undefined ? Number(data.previous_balance) : undefined;
        let closingNetDueVal = data.party_pending_balance !== undefined
            ? Number(data.party_pending_balance)
            : (data.total_due_balance !== undefined ? Number(data.total_due_balance) : undefined);

        if (prevBalanceVal === undefined && closingNetDueVal !== undefined) {
            prevBalanceVal = closingNetDueVal - balanceDue;
        } else if (prevBalanceVal !== undefined && closingNetDueVal === undefined) {
            closingNetDueVal = prevBalanceVal + balanceDue;
        }
        if (prevBalanceVal === undefined) prevBalanceVal = 0;
        if (closingNetDueVal === undefined) closingNetDueVal = prevBalanceVal + balanceDue;

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

        const getTaxRows = () => {
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
            { label: descriptor.subtotalLabel.replace(/:$/, ''), value: data.subtotal },
            ...(data.discount_amount && data.discount_amount > 0 ? [{ label: "Discount", value: -data.discount_amount }] : []),
            ...getTaxRows(),
            { label: descriptor.totalLabel.replace(/:$/, ''), value: data.total_amount, bold: true },
            { label: descriptor.paidLabel.replace(/:$/, ''), value: amountPaid, isPaid: true },
            { label: descriptor.balanceLabel.replace(/:$/, ''), value: balanceDue, isDue: true, bold: balanceDue > 0 },
            ...(shouldShowPartyBalance ? [
                { 
                    label: prevBalanceVal >= 0 ? "Previous Pending (Dr)" : "Previous Advance (Cr)", 
                    value: prevBalanceVal, 
                    isPrevBal: true 
                },
                { 
                    label: closingNetDueVal > 0 
                        ? "Pending Balance" 
                        : closingNetDueVal < 0 
                            ? "Pending Balance (Cr)" 
                            : "Pending Balance", 
                    value: closingNetDueVal, 
                    isNetDue: true, 
                    bold: true 
                }
            ] : [])
        ];

        const customTerms = data.notes || options?.customTerms || localStorage.getItem("rupeebill_invoice_terms") || "";

        const ctx: ThemeRenderContext = {
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
        };

        if (theme === 'tally-accounting') {
            renderTallyAccounting(ctx);
        } else if (theme === 'sale-invoice') {
            renderSaleInvoice(ctx);
        } else {
            renderStartupGradient(ctx);
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
        } else if (action === 'base64') {
            return doc.output('datauristring');
        } else if (action === 'print') {
            try {
                doc.autoPrint();
            } catch (autoPrintErr) {
                console.warn("jsPDF autoPrint failed, falling back to bloburl", autoPrintErr);
            }
            return doc.output('bloburl');
        } else {
            return doc.output('bloburl');
        }

    } catch (e) {
        console.error("PDF generation failed", e);
        alert("Failed to generate PDF. Please try again.");
        return null;
    }
};