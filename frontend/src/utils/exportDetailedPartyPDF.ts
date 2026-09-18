import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { LedgerTransaction } from "@/features/business/components/DetailedPartyReport";

const sanitizeText = (text: string) => {
    return (text || "").replace(/[^\x00-\x7F]/g, "");
};

const formatCurrencySafe = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return "0.00";
    return `Rs. ${num.toFixed(2)}`;
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
        case 'payment_received': return 'Payment In';
        case 'payment_made': return 'Payment Out';
        case 'credit_note': return 'Credit Note';
        case 'debit_note': return 'Debit Note';
        case 'opening_balance': return 'Opening Balance';
        default: return type.replace(/_/g, ' ');
    }
};

export const exportDetailedPartyPDF = (
    data: LedgerTransaction[],
    partyName: string,
    dateRange: { from: Date | undefined; to: Date | undefined },
    businessDetails?: { name: string; address?: string; phone?: string; gst?: string; }
) => {
    try {
        if (!data || data.length === 0) {
            alert("No ledger data to export.");
            return;
        }

        const doc = new jsPDF();

        // --- Header ---
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 33, 33);
        doc.text("PARTY LEDGER", 196, 20, { align: "right" });

        // Brand / Business Details
        if (businessDetails?.name) {
            doc.setFontSize(15);
            doc.setTextColor(37, 99, 235);
            doc.text(sanitizeText(businessDetails.name), 14, 20);

            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.setFont("helvetica", "normal");

            let yPos = 26;
            if (businessDetails.address) {
                const splitAddress = doc.splitTextToSize(sanitizeText(businessDetails.address), 100);
                doc.text(splitAddress, 14, yPos);
                yPos += (splitAddress.length * 4) + 2;
            }

            if (businessDetails.phone) {
                doc.text(`Phone: ${sanitizeText(businessDetails.phone)}`, 14, yPos);
                yPos += 4;
            }

            if (businessDetails.gst) {
                doc.text(`GSTIN: ${sanitizeText(businessDetails.gst)}`, 14, yPos);
            }
        } else {
            doc.setFontSize(16);
            doc.setTextColor(37, 99, 235);
            doc.text("Business Ledger Statement", 14, 20);
        }

        // --- Divider Line ---
        const headerBottom = 50;
        doc.setLineWidth(0.5);
        doc.setDrawColor(210, 215, 225);
        doc.line(14, headerBottom, 196, headerBottom);

        // --- Report Meta ---
        const infoStartY = 58;
        const generatedDate = format(new Date(), "dd MMM yyyy, HH:mm");
        let dateRangeStr = "All Time (Complete History)";

        if (dateRange.from && dateRange.to) {
            dateRangeStr = `${format(dateRange.from, "dd MMM yyyy")} to ${format(dateRange.to, "dd MMM yyyy")}`;
        } else if (dateRange.from) {
            dateRangeStr = `Since ${format(dateRange.from, "dd MMM yyyy")}`;
        } else if (dateRange.to) {
            dateRangeStr = `Up to ${format(dateRange.to, "dd MMM yyyy")}`;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text("Statement Of Account:", 14, infoStartY);

        doc.setFont("helvetica", "normal");
        doc.text(`Party: `, 14, infoStartY + 6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 20, 20);
        doc.text(sanitizeText(partyName), 28, infoStartY + 6);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(`Period: ${dateRangeStr}`, 14, infoStartY + 11);
        doc.text(`Generated: ${generatedDate}`, 14, infoStartY + 16);

        // Calculate Totals
        let totalDebit = 0;
        let totalCredit = 0;
        data.forEach(tx => {
            // If it's the opening balance row, its debit/credit is already assigned
            totalDebit += (tx.debit || 0);
            totalCredit += (tx.credit || 0);
        });

        // The final closing balance is the running balance of the last chronological transaction
        // (If data is passed in chronological order, last item; if reverse, first item)
        const finalBalance = data[data.length - 1]?.runningBalance ?? (totalDebit - totalCredit);
        const isDr = finalBalance > 0;
        const isCr = finalBalance < 0;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text("Closing Position:", 140, infoStartY);

        doc.setFontSize(12);
        if (isDr) {
            doc.setTextColor(37, 99, 235); // Blue Dr
            doc.text(`${formatCurrencySafe(Math.abs(finalBalance))} Dr`, 196, infoStartY + 7, { align: "right" });
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("(Receivable - Party owes you)", 196, infoStartY + 12, { align: "right" });
        } else if (isCr) {
            doc.setTextColor(217, 119, 6); // Amber Cr
            doc.text(`${formatCurrencySafe(Math.abs(finalBalance))} Cr`, 196, infoStartY + 7, { align: "right" });
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("(Payable - You owe party)", 196, infoStartY + 12, { align: "right" });
        } else {
            doc.setTextColor(16, 185, 129); // Green Nil
            doc.text(`Rs. 0.00 (Settled)`, 196, infoStartY + 7, { align: "right" });
        }

        // --- Table ---
        const tableRows = data.map(tx => {
            const bal = tx.runningBalance;
            const balStr = `${formatCurrencySafe(Math.abs(bal))} ${bal > 0 ? "Dr" : bal < 0 ? "Cr" : ""}`.trim();
            return [
                format(parseSafeDate(tx.date), "dd MMM yyyy"),
                sanitizeText(tx.ref),
                getVoucherTypeLabel(tx.type),
                tx.debit > 0 ? formatCurrencySafe(tx.debit) : "-",
                tx.credit > 0 ? formatCurrencySafe(tx.credit) : "-",
                balStr
            ];
        });

        // Add summary total row
        const netBalStr = `${formatCurrencySafe(Math.abs(finalBalance))} ${isDr ? "Dr" : isCr ? "Cr" : "Nil"}`;
        tableRows.push([
            "TOTAL",
            "Period Turnover & Closing Balance",
            "",
            formatCurrencySafe(totalDebit),
            formatCurrencySafe(totalCredit),
            netBalStr
        ]);

        autoTable(doc, {
            startY: 82,
            head: [["Date", "Particulars / Reference", "Type", "Debit (Dr)", "Credit (Cr)", "Running Balance"]],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 8.5
            },
            columnStyles: {
                0: { cellWidth: 24 }, // Date
                1: { cellWidth: 62 }, // Ref
                2: { cellWidth: 26 }, // Type
                3: { cellWidth: 24, halign: 'right' }, // Debit
                4: { cellWidth: 24, halign: 'right' }, // Credit
                5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }  // Balance
            },
            styles: {
                font: "helvetica",
                fontSize: 8,
                cellPadding: 2.5,
                overflow: 'linebreak'
            },
            margin: { top: 82, left: 14, right: 14 },
            didParseCell: (hookData) => {
                // Formatting total row
                if (hookData.section === 'body' && hookData.row.index === tableRows.length - 1) {
                    hookData.cell.styles.fontStyle = 'bold';
                    hookData.cell.styles.fillColor = [241, 245, 249];
                    hookData.cell.styles.textColor = [15, 23, 42];
                }
            }
        });

        // --- Footer ---
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(140, 140, 140);
            doc.setFont("helvetica", "italic");
            doc.text(`Page ${i} of ${pageCount} — Generated via FinFlow Business Ledger`, 105, 290, { align: "center" });
        }

        // Save
        const sanitizedFileName = sanitizeText(partyName).replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Ledger_${sanitizedFileName}_${format(new Date(), "yyyyMMdd")}.pdf`);

    } catch (e) {
        console.error("PDF generation failed", e);
        alert("Failed to generate PDF. Please try again.");
    }
};
