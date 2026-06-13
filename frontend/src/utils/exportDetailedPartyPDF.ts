import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { LedgerTransaction } from "@/features/business/components/DetailedPartyReport";

const sanitizeText = (text: string) => {
    return text.replace(/[^\x00-\x7F]/g, "");
};

const formatCurrencySafe = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return "0.00";
    return `Rs. ${num.toFixed(2)}`;
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
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 33, 33);
        doc.text("PARTY LEDGER", 196, 20, { align: "right" });

        // Brand / Business Details
        if (businessDetails?.name) {
            doc.setFontSize(16);
            doc.setTextColor(37, 99, 235);
            doc.text(sanitizeText(businessDetails.name), 14, 20);

            doc.setFontSize(10);
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
                yPos += 5;
            }

            if (businessDetails.gst) {
                doc.text(`GST: ${sanitizeText(businessDetails.gst)}`, 14, yPos);
            }
        } else {
            doc.setFontSize(18);
            doc.setTextColor(37, 99, 235);
            doc.text("FinFlow Business", 14, 20);
        }

        // --- Line ---
        const headerBottom = 55;
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, headerBottom, 196, headerBottom);

        // --- Report Meta ---
        const infoStartY = 65;
        const generatedDate = format(new Date(), "dd MMM yyyy, HH:mm");
        let dateRangeStr = "All Time";

        if (dateRange.from && dateRange.to) {
            dateRangeStr = `${format(dateRange.from, "dd MMM yy")} - ${format(dateRange.to, "dd MMM yy")}`;
        } else if (dateRange.from) {
            dateRangeStr = `Since ${format(dateRange.from, "dd MMM yy")}`;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text("Ledger Details:", 14, infoStartY);

        doc.setFont("helvetica", "normal");
        doc.text(`Party Name: `, 14, infoStartY + 6);
        doc.setFont("helvetica", "bold");
        doc.text(sanitizeText(partyName), 35, infoStartY + 6);

        doc.setFont("helvetica", "normal");
        doc.text(`Period: ${dateRangeStr}`, 14, infoStartY + 11);
        doc.text(`Generated On: ${generatedDate}`, 14, infoStartY + 16);

        // --- Summary Stats ---
        const finalBalance = data.length > 0 ? data[data.length - 1].runningBalance : 0;
        doc.setFont("helvetica", "bold");
        doc.text("Net Balance:", 140, infoStartY + 6);
        doc.setTextColor(finalBalance >= 0 ? 37 : 239, finalBalance >= 0 ? 99 : 68, finalBalance >= 0 ? 235 : 68); // Blue or Red
        doc.text(formatCurrencySafe(finalBalance), 196, infoStartY + 6, { align: "right" });

        // --- Table ---
        const tableRows = data.map(tx => [
            format(new Date(tx.date), "dd MMM yyyy"),
            sanitizeText(tx.ref),
            tx.type === 'sale' ? "Sale" : "Purchase",
            tx.type === 'sale' ? formatCurrencySafe(tx.amount) : "-",
            tx.type === 'purchase' ? formatCurrencySafe(tx.amount) : "-",
            formatCurrencySafe(tx.runningBalance)
        ]);

        autoTable(doc, {
            startY: 90,
            head: [["Date", "Reference", "Type", "Credit (Sale)", "Debit (Buy)", "Net Balance"]],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: 255,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 25 }, // Date
                1: { cellWidth: 35 }, // Ref
                2: { cellWidth: 20 }, // Type
                3: { cellWidth: 30, halign: 'right' }, // Credit
                4: { cellWidth: 30, halign: 'right' }, // Debit
                5: { cellWidth: 40, halign: 'right' }  // Balance
            },
            styles: {
                font: "helvetica",
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak'
            },
            margin: { top: 70, left: 14, right: 14 },
            didParseCell: (hookData) => {
                // Formatting data body
                if (hookData.section === 'body') {
                    // Type column color
                    if (hookData.column.index === 2) {
                        if (hookData.cell.raw === "Sale") hookData.cell.styles.textColor = [34, 197, 94]; // Green
                        else hookData.cell.styles.textColor = [239, 68, 68]; // Red
                    }
                    // Balance column color
                    if (hookData.column.index === 5) {
                        const valStr = hookData.cell.raw as string;
                        if (valStr.includes("-")) hookData.cell.styles.textColor = [239, 68, 68]; // Negative red
                        else if (valStr !== "Rs. 0.00") hookData.cell.styles.textColor = [37, 99, 235]; // Positive blue
                    }
                }
            }
        });

        // --- Footer ---
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "italic");
        doc.text("Generated by FinFlow Business Tracker", 105, 280, { align: "center" });

        // Save
        const sanitizedFileNameName = sanitizeText(partyName).replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Ledger_${sanitizedFileNameName}_${format(new Date(), "yyyyMMdd")}.pdf`);

    } catch (e) {
        console.error("PDF generation failed", e);
        alert("Failed to generate PDF. Please try again.");
    }
};
