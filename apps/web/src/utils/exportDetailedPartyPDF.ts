import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { LedgerTransaction } from "@/features/parties/components/DetailedPartyReport";

export interface BusinessDetails {
    name: string;
    address?: string;
    phone?: string;
    gst?: string;
    email?: string;
}

export interface PartyDetails {
    name?: string;
    phone?: string;
    gst?: string;
    address?: string;
    type?: string;
}

export interface ExportPDFOptions {
    isPrint?: boolean;
}

const safeStr = (text: any): string => {
    if (text == null) return "";
    return String(text).trim();
};

const formatCurrencySafe = (amount: number | string): string => {
    const num = Number(amount);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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

const getVoucherTypeLabel = (type: string): string => {
    switch (type) {
        case 'sale': return 'Sales Invoice';
        case 'purchase': return 'Purchase Bill';
        case 'payment_received': return 'Payment In (Receipt)';
        case 'payment_made': return 'Payment Out';
        case 'credit_note': return 'Credit Note (Return)';
        case 'debit_note': return 'Debit Note';
        case 'opening_balance': return 'Opening Balance';
        default: return type.replace(/_/g, ' ');
    }
};

export const exportDetailedPartyPDF = (
    data: LedgerTransaction[],
    partyName: string,
    dateRange: { from: Date | undefined; to: Date | undefined },
    businessDetails?: BusinessDetails,
    partyDetails?: PartyDetails,
    options?: ExportPDFOptions
) => {
    try {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
        const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
        const leftMargin = 14;
        const rightMargin = 14;
        const usableWidth = pageWidth - leftMargin - rightMargin; // 182mm

        // ============================================================
        // 1. HEADER SECTION (BUSINESS BRANDING & STATEMENT BADGE)
        // ============================================================
        let currentY = 16;

        // Document Title Badge on top right
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text("PARTY STATEMENT / LEDGER", pageWidth - rightMargin, currentY, { align: "right" });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, pageWidth - rightMargin, currentY + 5, { align: "right" });

        // Business Name on top left
        const bizName = safeStr(businessDetails?.name) || "RupeeBill Business";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text(bizName, leftMargin, currentY);

        let bizY = currentY + 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105); // Slate-600

        if (businessDetails?.address) {
            const splitAddress = doc.splitTextToSize(safeStr(businessDetails.address), 105);
            doc.text(splitAddress, leftMargin, bizY);
            bizY += (splitAddress.length * 3.8);
        }

        const bizContactParts: string[] = [];
        if (businessDetails?.phone) bizContactParts.push(`Phone: ${safeStr(businessDetails.phone)}`);
        if (businessDetails?.gst) bizContactParts.push(`GSTIN: ${safeStr(businessDetails.gst)}`);
        if (businessDetails?.email) bizContactParts.push(`Email: ${safeStr(businessDetails.email)}`);

        if (bizContactParts.length > 0) {
            doc.text(bizContactParts.join(" | "), leftMargin, bizY);
            bizY += 4.5;
        }

        // Horizontal Separator Line
        currentY = Math.max(bizY + 2, 32);
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setLineWidth(0.5);
        doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
        currentY += 5;

        // ============================================================
        // 2. PARTY PROFILE & FINANCIAL POSITION DUAL-COLUMN CARD
        // ============================================================
        const boxStartY = currentY;
        const boxWidth = (usableWidth - 6) / 2; // 88mm each

        // Calculate Totals and Net Balance accurately:
        // Distinguish Opening Balance b/f from Period Activity
        let openingBfAmount = 0;
        let hasBf = false;
        let periodDebit = 0;
        let periodCredit = 0;

        data.forEach(tx => {
            if (tx.id === 'opening-balance-bfwd') {
                hasBf = true;
                openingBfAmount = tx.runningBalance;
            } else if (tx.type === 'opening_balance' && !hasBf) {
                // If it's a regular opening balance without date range
                hasBf = true;
                openingBfAmount = (tx.debit || 0) - (tx.credit || 0);
                periodDebit += (tx.debit || 0);
                periodCredit += (tx.credit || 0);
            } else {
                periodDebit += (tx.debit || 0);
                periodCredit += (tx.credit || 0);
            }
        });

        // The final balance is the running balance of the last chronological transaction
        const lastTx = data[data.length - 1];
        const finalBalance = lastTx ? lastTx.runningBalance : 0;
        const isDr = finalBalance > 0;
        const isCr = finalBalance < 0;

        // --- Left Column: Party Master Information ---
        const partyBoxX = leftMargin;
        let partyY = boxStartY + 4;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("STATEMENT FOR:", partyBoxX, partyY);
        partyY += 4.5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(safeStr(partyName), partyBoxX, partyY);
        partyY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);

        const pPhone = safeStr(partyDetails?.phone);
        const pGst = safeStr(partyDetails?.gst);
        const pType = safeStr(partyDetails?.type || "Customer/Vendor");
        const pAddr = safeStr(partyDetails?.address);

        if (pPhone) {
            doc.text(`Mobile: ${pPhone}`, partyBoxX, partyY);
            partyY += 3.8;
        }

        if (pGst) {
            doc.setFont("helvetica", "bold");
            doc.text(`GSTIN: ${pGst}`, partyBoxX, partyY);
            doc.setFont("helvetica", "normal");
            partyY += 3.8;
        }

        if (pAddr) {
            const splitPartyAddr = doc.splitTextToSize(`Address: ${pAddr}`, boxWidth - 4);
            doc.text(splitPartyAddr, partyBoxX, partyY);
            partyY += (splitPartyAddr.length * 3.8);
        }

        doc.text(`Category: ${pType.toUpperCase()}`, partyBoxX, partyY);
        partyY += 4;

        // --- Right Column: Statement Period & Closing Position ---
        const metaBoxX = leftMargin + boxWidth + 6;
        let metaY = boxStartY + 4;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("STATEMENT SUMMARY:", metaBoxX, metaY);
        metaY += 4.5;

        let dateRangeStr = "All Time (Complete History)";
        if (dateRange?.from && dateRange?.to) {
            dateRangeStr = `${format(dateRange.from, "dd MMM yyyy")} to ${format(dateRange.to, "dd MMM yyyy")}`;
        } else if (dateRange?.from) {
            dateRangeStr = `Since ${format(dateRange.from, "dd MMM yyyy")}`;
        } else if (dateRange?.to) {
            dateRangeStr = `Up to ${format(dateRange.to, "dd MMM yyyy")}`;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Period: ${dateRangeStr}`, metaBoxX, metaY);
        metaY += 4;

        if (hasBf) {
            const bfLabel = openingBfAmount > 0 
                ? `Rs. ${formatCurrencySafe(openingBfAmount)} Dr` 
                : openingBfAmount < 0 
                ? `Rs. ${formatCurrencySafe(Math.abs(openingBfAmount))} Cr` 
                : "Rs. 0.00";
            doc.text(`Opening Balance b/f: ${bfLabel}`, metaBoxX, metaY);
            metaY += 4;
        }

        doc.text(`Period Turnover: Dr Rs. ${formatCurrencySafe(periodDebit)} | Cr Rs. ${formatCurrencySafe(periodCredit)}`, metaBoxX, metaY);
        metaY += 5;

        // Prominent Closing Balance Callout Box
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text("Net Closing Balance:", metaBoxX, metaY);
        metaY += 4.5;

        doc.setFontSize(11);
        if (isDr) {
            doc.setTextColor(29, 78, 216); // Blue-700
            doc.text(`Rs. ${formatCurrencySafe(finalBalance)} Dr  (Receivable)`, metaBoxX, metaY);
        } else if (isCr) {
            doc.setTextColor(180, 83, 9); // Amber-700
            doc.text(`Rs. ${formatCurrencySafe(Math.abs(finalBalance))} Cr  (Payable)`, metaBoxX, metaY);
        } else {
            doc.setTextColor(21, 128, 61); // Emerald-700
            doc.text(`Rs. 0.00 (Account Settled)`, metaBoxX, metaY);
        }
        metaY += 5;

        // Determine starting Y for table
        currentY = Math.max(partyY, metaY) + 3;

        // ============================================================
        // 3. TRANSACTION LEDGER TABLE (CHRONOLOGICAL AUTO-TABLE)
        // ============================================================
        const tableRows: any[] = [];

        if (!data || data.length === 0) {
            tableRows.push([
                "-",
                "No transaction entries recorded for this party in the selected period.",
                "-",
                "-",
                "-",
                "Rs. 0.00"
            ]);
        } else {
            data.forEach((tx) => {
                const bal = tx.runningBalance;
                const balStr = `Rs. ${formatCurrencySafe(Math.abs(bal))} ${bal > 0 ? "Dr" : bal < 0 ? "Cr" : ""}`.trim();
                
                let dateDisplay = "-";
                try {
                    dateDisplay = format(parseSafeDate(tx.date), "dd/MM/yyyy");
                } catch {
                    dateDisplay = safeStr(tx.date);
                }

                tableRows.push([
                    dateDisplay,
                    safeStr(tx.ref),
                    getVoucherTypeLabel(tx.type),
                    tx.debit > 0 ? `Rs. ${formatCurrencySafe(tx.debit)}` : "-",
                    tx.credit > 0 ? `Rs. ${formatCurrencySafe(tx.credit)}` : "-",
                    balStr
                ]);
            });
        }

        // Summary Total Rows
        const netBalSummary = `Rs. ${formatCurrencySafe(Math.abs(finalBalance))} ${isDr ? "Dr" : isCr ? "Cr" : "Nil"}`;
        
        tableRows.push([
            "TOTAL",
            "Total Period Activity & Net Closing Position",
            "",
            `Rs. ${formatCurrencySafe(periodDebit)}`,
            `Rs. ${formatCurrencySafe(periodCredit)}`,
            netBalSummary
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [["Date", "Particulars / Voucher Reference", "Voucher Type", "Debit (Dr)", "Credit (Cr)", "Running Balance"]],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [30, 41, 59], // Slate-800
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'left'
            },
            columnStyles: {
                0: { cellWidth: 22, halign: 'center' }, // Date
                1: { cellWidth: 64, halign: 'left' },   // Ref
                2: { cellWidth: 26, halign: 'left' },   // Voucher Type
                3: { cellWidth: 24, halign: 'right' },  // Debit
                4: { cellWidth: 24, halign: 'right' },  // Credit
                5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' } // Balance
            },
            styles: {
                font: "helvetica",
                fontSize: 7.5,
                cellPadding: 2,
                overflow: 'linebreak',
                lineColor: [226, 232, 240],
                lineWidth: 0.2
            },
            margin: { top: 18, left: leftMargin, right: rightMargin, bottom: 18 },
            didParseCell: (hookData) => {
                // Style the summary total row
                if (hookData.section === 'body' && hookData.row.index === tableRows.length - 1) {
                    hookData.cell.styles.fontStyle = 'bold';
                    hookData.cell.styles.fillColor = [241, 245, 249]; // Slate-100
                    hookData.cell.styles.textColor = [15, 23, 42];    // Slate-900
                }
            }
        });

        // ============================================================
        // 4. FOOTER WITH RUNNING PAGE NUMBERS & AUDIT STAMP
        // ============================================================
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184); // Slate-400
            doc.setFont("helvetica", "normal");
            
            // Footer separator
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(leftMargin, pageHeight - 12, pageWidth - rightMargin, pageHeight - 12);

            doc.text(
                `Page ${i} of ${totalPages}  •  This is an authenticated computer-generated ledger statement.`,
                pageWidth / 2,
                pageHeight - 7,
                { align: "center" }
            );
        }

        // ============================================================
        // 5. OUTPUT (PRINT OR DOWNLOAD)
        // ============================================================
        const sanitizedFileName = safeStr(partyName).replace(/[^a-zA-Z0-9]/g, '_') || "Party";
        const dateStamp = format(new Date(), "yyyyMMdd");
        const fileName = `Ledger_${sanitizedFileName}_${dateStamp}.pdf`;

        if (options?.isPrint) {
            doc.autoPrint();
            const blobUrl = doc.output("bloburl");
            window.open(blobUrl, "_blank");
        } else {
            doc.save(fileName);
        }

    } catch (e) {
        console.error("[exportDetailedPartyPDF] Error generating PDF:", e);
        alert("Failed to generate PDF statement. Please verify that browser pop-ups are allowed.");
    }
};
