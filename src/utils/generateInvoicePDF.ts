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

export const generateInvoicePDF = (data: InvoiceDetails) => {
    try {
        const doc = new jsPDF();

        // --- Header ---
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 33, 33);
        doc.text("INVOICE", 150, 20, { align: "right" });

        // Brand
        doc.setFontSize(18);
        doc.setTextColor(37, 99, 235);
        doc.text("FinFlow Business", 14, 20);

        // Line
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 28, 196, 28);

        // --- Info --
        const dateFormatted = data.date ? format(new Date(data.date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy");

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);

        doc.text("Invoice Details:", 14, 40);
        doc.setFont("helvetica", "normal");
        doc.text(`Invoice No: ${sanitizeText(data.invoice_number)}`, 14, 46);
        doc.text(`Date: ${dateFormatted}`, 14, 51);

        doc.setFont("helvetica", "bold");
        doc.text("Bill To:", 120, 40);
        doc.setFont("helvetica", "normal");
        doc.text(sanitizeText(data.customer_name), 120, 46);

        let yPos = 51;
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
            startY: 70,
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

        doc.save(`Invoice-${sanitizeText(data.invoice_number)}.pdf`);
    } catch (e) {
        console.error("PDF generation failed", e);
        alert("Failed to generate PDF. Please try again.");
    }
};
