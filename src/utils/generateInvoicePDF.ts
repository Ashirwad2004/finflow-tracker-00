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
    };
}

const sanitizeText = (text: string) => {
    // Remove non-ASCII characters to prevent PDF font issues
    return text.replace(/[^\x00-\x7F]/g, "");
};

const formatCurrencySafe = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return "0.00";
    // basic toFixed to avoid locale-specific unicode characters (like non-breaking spaces)
    return `Rs. ${num.toFixed(2)}`;
};

export const generateInvoicePDF = (data: InvoiceDetails, options?: { action?: 'download' | 'preview' }) => {
    try {
        const doc = new jsPDF();
        const action = options?.action || 'download';

        // --- Header ---
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 33, 33);
        doc.text("INVOICE", 196, 20, { align: "right" });

        // Brand / Business Details
        if (data.business_details?.name) {
            doc.setFontSize(18);
            doc.setTextColor(37, 99, 235);
            doc.text(sanitizeText(data.business_details.name), 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.setFont("helvetica", "normal");

            let yPos = 26;
            if (data.business_details.address) {
                // Split address into lines if too long
                const splitAddress = doc.splitTextToSize(sanitizeText(data.business_details.address), 100);
                doc.text(splitAddress, 14, yPos);
                yPos += (splitAddress.length * 4) + 2;
            }

            if (data.business_details.phone) {
                doc.text(`Phone: ${sanitizeText(data.business_details.phone)}`, 14, yPos);
                yPos += 5;
            }

            if (data.business_details.gst) {
                doc.text(`GST: ${sanitizeText(data.business_details.gst)}`, 14, yPos);
            }

        } else {
            // Fallback
            doc.setFontSize(18);
            doc.setTextColor(37, 99, 235);
            doc.text("FinFlow Business", 14, 20);
        }

        // Line
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);

        // Adjust line start based on content roughly, or keep fixed but push content down
        const headerBottom = 55; // Pushed down to make room for address
        doc.line(14, headerBottom, 196, headerBottom);

        // --- Info --
        const infoStartY = 65;
        const dateFormatted = data.date ? format(new Date(data.date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy");

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);

        doc.text("Invoice Details:", 14, infoStartY);
        doc.setFont("helvetica", "normal");
        doc.text(`Invoice No: ${sanitizeText(data.invoice_number)}`, 14, infoStartY + 6);
        doc.text(`Date: ${dateFormatted}`, 14, infoStartY + 11);

        doc.setFont("helvetica", "bold");
        doc.text("Bill To:", 120, infoStartY);
        doc.setFont("helvetica", "normal");
        doc.text(sanitizeText(data.customer_name), 120, infoStartY + 6);

        let yPos = infoStartY + 11;
        if (data.customer_phone) {
            doc.text(`Phone: ${sanitizeText(data.customer_phone)}`, 120, yPos);
            yPos += 5;
        }
        if (data.customer_email) {
            doc.text(`Email: ${sanitizeText(data.customer_email)}`, 120, yPos);
        }

        // --- Table ---
        const tableRows = data.items.map(item => [
            sanitizeText(item.description),
            item.quantity.toString(),
            formatCurrencySafe(item.price),
            formatCurrencySafe(Number(item.quantity) * Number(item.price))
        ]);

        autoTable(doc, {
            startY: 95,
            head: [["Description", "Qty", "Price", "Total"]],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: 255,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 80 }, // Description
                1: { cellWidth: 20, halign: 'center' }, // Qty
                2: { cellWidth: 40, halign: 'right' }, // Price
                3: { cellWidth: 40, halign: 'right' }  // Total
            },
            styles: {
                font: "helvetica", // Enforcing font
                fontSize: 9,
                cellPadding: 3,
                overflow: 'linebreak'
            },
            margin: { top: 70, left: 14, right: 14 }
        });

        // --- Totals ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const rightColX = 140;
        const valueX = 196;

        doc.setFont("helvetica", "normal");
        doc.text("Subtotal:", rightColX, finalY);
        doc.text(formatCurrencySafe(data.subtotal), valueX, finalY, { align: "right" });

        doc.text(`Tax (${data.tax_rate || 0}%):`, rightColX, finalY + 6);
        doc.text(formatCurrencySafe(data.tax_amount || 0), valueX, finalY + 6, { align: "right" });

        doc.line(rightColX, finalY + 9, valueX, finalY + 9);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Total:", rightColX, finalY + 16);
        doc.text(formatCurrencySafe(data.total_amount), valueX, finalY + 16, { align: "right" });

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "italic");
        doc.text("Thank you for your business!", 105, 280, { align: "center" });

        if (action === 'download') {
            doc.save(`Invoice-${sanitizeText(data.invoice_number)}.pdf`);
            return null;
        } else {
            // Preview
            return doc.output('bloburl');
        }

    } catch (e) {
        console.error("PDF generation failed", e);
        alert("Failed to generate PDF. Please try again.");
        return null;
    }
};
