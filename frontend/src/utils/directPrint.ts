import { generateInvoicePDF, InvoiceDetails, InvoicePdfTheme, PageSize, UniversalDocumentType } from "./generateInvoicePDF";
import { printThermalReceipt } from "./printThermalReceipt";

export interface DirectPrintOptions {
    action?: 'print';
    theme?: InvoicePdfTheme | 'thermal';
    documentType?: UniversalDocumentType;
    documentTitle?: string;
    pageSize?: PageSize;
    customTerms?: string;
    fontSizeFactor?: number;
    printBankDetails?: boolean;
    bankDetails?: any;
    selectedBankAccountId?: string;
    printUpiQr?: boolean;
    upiId?: string;
    showItemTaxRateOnBill?: boolean;
    showPartyPreviousBalance?: boolean;
    showPartyPendingBalance?: boolean;
    forceThermal?: boolean;
    profile?: any;
}

/**
 * Sends a PDF Blob or Blob URL directly to the printer machine via a background hidden iframe.
 * Avoids opening separate browser tabs or blank preview windows.
 * In Chrome/Edge with --kiosk-printing enabled, this triggers zero-dialog automatic printing.
 */
export const printPdfDirectly = async (urlOrBlob: string | Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const blobUrl = typeof urlOrBlob === 'string' ? urlOrBlob : URL.createObjectURL(urlOrBlob);
            const shouldRevoke = typeof urlOrBlob !== 'string';

            // Clean up any stale print iframes from previous jobs
            const oldIframe = document.getElementById('finflow-direct-print-frame');
            if (oldIframe && oldIframe.parentNode) {
                oldIframe.parentNode.removeChild(oldIframe);
            }

            const iframe = document.createElement('iframe');
            iframe.id = 'finflow-direct-print-frame';
            // Invisible to user, but kept active in DOM layout
            iframe.style.position = 'fixed';
            iframe.style.left = '-9999px';
            iframe.style.top = '-9999px';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.border = '0';
            iframe.style.opacity = '0';
            iframe.style.pointerEvents = 'none';
            iframe.setAttribute('aria-hidden', 'true');

            document.body.appendChild(iframe);

            let hasPrinted = false;

            const executePrint = () => {
                if (hasPrinted) return;
                hasPrinted = true;

                try {
                    const win = iframe.contentWindow;
                    if (win) {
                        win.focus();
                        win.print();
                    }
                    resolve();
                } catch (e) {
                    console.warn("Direct iframe print invocation failed, attempting fallback:", e);
                    // Fallback to focused window print if iframe was blocked by browser sandbox
                    try {
                        const fallbackWin = window.open(blobUrl, '_blank');
                        if (fallbackWin) {
                            fallbackWin.focus();
                            fallbackWin.print();
                        }
                        resolve();
                    } catch (fallbackErr) {
                        console.error("Print fallback failed:", fallbackErr);
                        reject(fallbackErr);
                    }
                } finally {
                    // Retain the iframe in the DOM for 60 seconds so slow spoolers can finish buffering
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                        if (shouldRevoke) {
                            try {
                                URL.revokeObjectURL(blobUrl);
                            } catch (_) {}
                        }
                    }, 60000);
                }
            };

            iframe.onload = () => {
                // Give the browser's PDF engine 350ms to parse and render the document
                setTimeout(executePrint, 350);
            };

            // Safety timeout in case iframe onload event is swallowed by the browser
            setTimeout(() => {
                if (!hasPrinted) {
                    executePrint();
                }
            }, 1200);

            iframe.src = blobUrl;
        } catch (err) {
            console.error("Failed to initialize direct print:", err);
            reject(err);
        }
    });
};

/**
 * Directly prints arbitrary HTML content via a hidden background iframe without opening blank tabs.
 */
export const printHtmlDirectly = async (htmlContent: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        try {
            const oldIframe = document.getElementById('finflow-direct-html-print-frame');
            if (oldIframe && oldIframe.parentNode) {
                oldIframe.parentNode.removeChild(oldIframe);
            }

            const iframe = document.createElement('iframe');
            iframe.id = 'finflow-direct-html-print-frame';
            iframe.style.position = 'fixed';
            iframe.style.left = '-9999px';
            iframe.style.top = '-9999px';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.border = '0';
            iframe.style.opacity = '0';
            iframe.style.pointerEvents = 'none';
            iframe.setAttribute('aria-hidden', 'true');

            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
                throw new Error("Unable to access iframe document for printing.");
            }

            doc.open();
            doc.write(htmlContent);
            doc.close();

            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    resolve();
                } catch (e) {
                    console.error("HTML print error:", e);
                    reject(e);
                } finally {
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 60000);
                }
            }, 350);
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * High-level automatic invoice printing.
 * Detects whether the user is configured for thermal receipts (POS mode) or standard A4/A5 PDF invoices,
 * and prints directly to the printer machine without opening extra browser tabs or preview windows.
 */
export const printInvoiceDirectly = async (
    invoiceData: InvoiceDetails,
    options?: DirectPrintOptions
): Promise<void> => {
    const savedTheme = options?.theme || (localStorage.getItem("rupeebill_invoice_theme") as InvoicePdfTheme | 'thermal') || 'startup-gradient';

    if (savedTheme === 'thermal' || options?.forceThermal) {
        // Dispatch to thermal printer machine layout (58mm/80mm)
        await printThermalReceipt(invoiceData);
    } else {
        // Dispatch to standard A4/A5 laser/inkjet printer layout
        const pdfUrl = await generateInvoicePDF(invoiceData, {
            ...options,
            theme: savedTheme,
            action: 'print'
        });

        if (pdfUrl) {
            await printPdfDirectly(String(pdfUrl));
        } else {
            throw new Error("Could not generate invoice PDF for printing.");
        }
    }
};
