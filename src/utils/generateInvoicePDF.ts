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
        signature_url?: string | null;
    };
}

const sanitizeText = (text: string) => {
    // Remove non-ASCII characters to prevent PDF font issues
    return text.replace(/[^\x00-\x7F]/g, "");
};

const formatCurrencySafe = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return "0.00";
    return `${num.toFixed(2)}`;
};

export const generateInvoicePDF = async (data: InvoiceDetails, options?: { action?: 'download' | 'preview' }) => {
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
            doc.setFontSize(18);
            doc.setTextColor(37, 99, 235);
            doc.text("FinFlow Business", 14, 20);
        }

        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        const headerBottom = 55;
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
                fontStyle: 'bold',
                halign: 'left' // Ensure headers align with content
            },
            columnStyles: {
                0: { cellWidth: 80, halign: 'left' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 40, halign: 'right' },
                3: { cellWidth: 40, halign: 'right' }
            },
            styles: {
                font: "helvetica",
                fontSize: 9,
                cellPadding: 3,
                overflow: 'linebreak'
            },
            margin: { top: 70, left: 14, right: 14 }
        });

        // --- Totals ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        // Table geometry:
        // Left Margin: 14
        // Columns: 80 + 20 + 40 + 40 = 180 width.
        // Right Edge of Table = 14 + 180 = 194.

        const rightEdge = 194;
        const colWidth = 40; // Width of the 'Total' column
        const labelX = rightEdge - colWidth - 5; // Start labels slightly before the column starts, or align with previous column?
        // Let's try aligning Labels to the 'Price' column roughly.

        doc.setFont("helvetica", "normal");

        // Subtotal
        doc.text("Subtotal:", labelX, finalY, { align: 'right' });
        doc.text(formatCurrencySafe(data.subtotal), rightEdge, finalY, { align: "right" });

        // Tax
        doc.text(`Tax (${data.tax_rate || 0}%):`, labelX, finalY + 6, { align: 'right' });
        doc.text(formatCurrencySafe(data.tax_amount || 0), rightEdge, finalY + 6, { align: "right" });

        doc.line(labelX + 5, finalY + 9, rightEdge, finalY + 9); // Underline values

        // Total
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Total:", labelX, finalY + 16, { align: 'right' });
        doc.text(`Rs. ${formatCurrencySafe(data.total_amount)}`, rightEdge, finalY + 16, { align: "right" });


        // --- Signature ---
        if (data.business_details?.signature_url) {
            try {
                const imgResult = await fetch(data.business_details.signature_url);
                if (imgResult.ok) {
                    const imgBlob = await imgResult.blob();
                    const imgUrl = URL.createObjectURL(imgBlob);

                    const sigY = finalY + 30;
                    // Center signature over the totals area roughly, or to the right
                    // Let's place it aligned with the right edge
                    doc.addImage(imgUrl, 'PNG', rightEdge - 40, sigY, 40, 20);

                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.text("Authorized Signature", rightEdge - 20, sigY + 25, { align: "center" });
                }
            } catch (err) {
                console.error("Error loading signature image", err);
            }
        }

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "italic");
        doc.text("Thank you for your business!", 105, 280, { align: "center" });

        if (action === 'download') {
            doc.save(`Invoice-${sanitizeText(data.invoice_number)}.pdf`);
            return null;
        } else {
            return doc.output('bloburl');
        }

    } catch (e) {
        console.error("PDF generation failed", e);
        alert("Failed to generate PDF. Please try again.");
        return null;
    }
};
