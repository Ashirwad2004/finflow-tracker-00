import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { SaleOrder, PurchaseOrder } from "@/features/business/types/orders";

export function generateSaleOrderPDF(order: SaleOrder, businessDetails?: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Background Accent
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, pageWidth, 8, "F");

    // Title & Order Number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text("SALE ORDER", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Order #: ${order.order_number}`, 14, 28);
    doc.text(`Date: ${format(new Date(order.order_date || new Date()), "dd/MM/yyyy")}`, 14, 33);
    if (order.expected_delivery_date) {
        doc.text(`Expected Delivery: ${format(new Date(order.expected_delivery_date), "dd/MM/yyyy")}`, 14, 38);
    }

    // Business Details (Top Right)
    const bizName = businessDetails?.business_name || businessDetails?.display_name || "BUSINESS FIRM";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(bizName, pageWidth - 14, 22, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    let rightY = 27;
    if (businessDetails?.business_address) {
        doc.text(String(businessDetails.business_address).slice(0, 45), pageWidth - 14, rightY, { align: "right" });
        rightY += 4.5;
    }
    if (businessDetails?.gst_number) {
        doc.text(`GSTIN: ${businessDetails.gst_number}`, pageWidth - 14, rightY, { align: "right" });
        rightY += 4.5;
    }
    if (businessDetails?.phone || businessDetails?.business_phone) {
        doc.text(`Phone: ${businessDetails.phone || businessDetails.business_phone}`, pageWidth - 14, rightY, { align: "right" });
    }

    // Horizontal Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 44, pageWidth - 14, 44);

    // Customer / Bill To Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 48, pageWidth - 28, 26, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text("CUSTOMER DETAILS (BILL TO):", 18, 54);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(order.customer_name || "Cash Customer", 18, 60);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    let custY = 65;
    const contactParts = [
        order.customer_phone ? `Mob: ${order.customer_phone}` : null,
        order.customer_gstin ? `GSTIN: ${order.customer_gstin}` : null,
        order.customer_email ? `Email: ${order.customer_email}` : null,
    ].filter(Boolean);
    if (contactParts.length > 0) {
        doc.text(contactParts.join("  |  "), 18, custY);
        custY += 4;
    }
    if (order.billing_address) {
        doc.text(`Address: ${order.billing_address}`, 18, custY);
    }

    // Status Badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const statusText = (order.status || "confirmed").toUpperCase().replace("_", " ");
    doc.setTextColor(79, 70, 229);
    doc.text(`STATUS: ${statusText}`, pageWidth - 20, 54, { align: "right" });

    // Line Items Table
    const tableHeaders = [["#", "Item Description", "HSN", "Qty", "Rate (₹)", "Tax %", "Total (₹)"]];
    const tableData = (order.items || []).map((it, idx) => [
        idx + 1,
        it.name + (it.description ? `\n${it.description}` : ""),
        it.hsn_code || "-",
        `${it.quantity || 1} ${it.unit || "pcs"}`,
        (Number(it.price) || 0).toFixed(2),
        it.tax_rate ? `${it.tax_rate}%` : "0%",
        (Number(it.total) || (Number(it.quantity) || 1) * (Number(it.price) || 0)).toFixed(2),
    ]);

    autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 79,
        theme: "striped",
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8.5,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: "auto" },
            2: { cellWidth: 20, halign: "center" },
            3: { cellWidth: 22, halign: "right" },
            4: { cellWidth: 25, halign: "right" },
            5: { cellWidth: 18, halign: "center" },
            6: { cellWidth: 28, halign: "right" },
        },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Financial Totals Summary (Right-aligned)
    const summaryX = pageWidth - 80;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    let sumY = finalY;
    doc.text("Subtotal:", summaryX, sumY);
    doc.text(`₹${(Number(order.subtotal) || 0).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
    sumY += 5;

    if (order.discount_amount && Number(order.discount_amount) > 0) {
        doc.text("Discount:", summaryX, sumY);
        doc.text(`- ₹${Number(order.discount_amount).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
        sumY += 5;
    }

    if (order.tax_amount && Number(order.tax_amount) > 0) {
        doc.text("Tax Amount:", summaryX, sumY);
        doc.text(`₹${Number(order.tax_amount).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
        sumY += 5;
    }

    doc.setLineWidth(0.3);
    doc.line(summaryX, sumY, pageWidth - 14, sumY);
    sumY += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Total Order Value:", summaryX, sumY);
    doc.text(`₹${(Number(order.total_amount) || 0).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
    sumY += 6;

    if (order.advance_paid && Number(order.advance_paid) > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(16, 185, 129);
        doc.text("Advance Received:", summaryX, sumY);
        doc.text(`₹${Number(order.advance_paid).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
        sumY += 5;

        const balDue = Math.max(0, (Number(order.total_amount) || 0) - Number(order.advance_paid));
        doc.setFont("helvetica", "bold");
        doc.setTextColor(225, 29, 72);
        doc.text("Balance on Delivery:", summaryX, sumY);
        doc.text(`₹${balDue.toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
    }

    // Notes & Signatory Box
    if (order.notes || order.terms_conditions) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("NOTES & TERMS:", 14, finalY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const text = [order.notes, order.terms_conditions].filter(Boolean).join("\n");
        doc.text(doc.splitTextToSize(text, summaryX - 25), 14, finalY + 4);
    }

    // Signatory
    const signY = Math.max(sumY + 15, finalY + 30);
    if (signY < 275) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`For ${bizName}`, pageWidth - 14, signY, { align: "right" });
        doc.text("Authorized Signatory", pageWidth - 14, signY + 12, { align: "right" });
    }

    doc.save(`Sale_Order_${order.order_number}.pdf`);
}

export function generatePurchaseOrderPDF(po: PurchaseOrder, businessDetails?: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Background Accent
    doc.setFillColor(15, 118, 110); // Teal 700
    doc.rect(0, 0, pageWidth, 8, "F");

    // Title & Order Number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text("PURCHASE ORDER", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`PO #: ${po.po_number}`, 14, 28);
    doc.text(`Date: ${format(new Date(po.order_date || new Date()), "dd/MM/yyyy")}`, 14, 33);
    if (po.expected_delivery_date) {
        doc.text(`Expected Delivery: ${format(new Date(po.expected_delivery_date), "dd/MM/yyyy")}`, 14, 38);
    }

    // Business Details (Top Right)
    const bizName = businessDetails?.business_name || businessDetails?.display_name || "BUSINESS FIRM";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(bizName, pageWidth - 14, 22, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    let rightY = 27;
    if (businessDetails?.business_address) {
        doc.text(String(businessDetails.business_address).slice(0, 45), pageWidth - 14, rightY, { align: "right" });
        rightY += 4.5;
    }
    if (businessDetails?.gst_number) {
        doc.text(`GSTIN: ${businessDetails.gst_number}`, pageWidth - 14, rightY, { align: "right" });
        rightY += 4.5;
    }
    if (businessDetails?.phone || businessDetails?.business_phone) {
        doc.text(`Phone: ${businessDetails.phone || businessDetails.business_phone}`, pageWidth - 14, rightY, { align: "right" });
    }

    // Horizontal Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 44, pageWidth - 14, 44);

    // Vendor / Supplier Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 48, pageWidth - 28, 26, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text("VENDOR / SUPPLIER DETAILS:", 18, 54);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(po.vendor_name || "Supplier", 18, 60);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    let vendY = 65;
    const contactParts = [
        po.vendor_phone ? `Mob: ${po.vendor_phone}` : null,
        po.vendor_gstin ? `GSTIN: ${po.vendor_gstin}` : null,
        po.vendor_email ? `Email: ${po.vendor_email}` : null,
    ].filter(Boolean);
    if (contactParts.length > 0) {
        doc.text(contactParts.join("  |  "), 18, vendY);
        vendY += 4;
    }
    if (po.billing_address) {
        doc.text(`Address: ${po.billing_address}`, 18, vendY);
    }

    // Status Badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const statusText = (po.status || "sent").toUpperCase().replace("_", " ");
    doc.setTextColor(15, 118, 110);
    doc.text(`STATUS: ${statusText}`, pageWidth - 20, 54, { align: "right" });

    // Line Items Table
    const tableHeaders = [["#", "Item Description", "HSN", "Qty", "Cost Rate (₹)", "Tax %", "Total (₹)"]];
    const tableData = (po.items || []).map((it, idx) => [
        idx + 1,
        it.name + (it.description ? `\n${it.description}` : ""),
        it.hsn_code || "-",
        `${it.quantity || 1} ${it.unit || "pcs"}`,
        (Number(it.price) || 0).toFixed(2),
        it.tax_rate ? `${it.tax_rate}%` : "0%",
        (Number(it.total) || (Number(it.quantity) || 1) * (Number(it.price) || 0)).toFixed(2),
    ]);

    autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 79,
        theme: "striped",
        headStyles: {
            fillColor: [15, 118, 110],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8.5,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: "auto" },
            2: { cellWidth: 20, halign: "center" },
            3: { cellWidth: 22, halign: "right" },
            4: { cellWidth: 25, halign: "right" },
            5: { cellWidth: 18, halign: "center" },
            6: { cellWidth: 28, halign: "right" },
        },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Financial Totals Summary
    const summaryX = pageWidth - 80;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    let sumY = finalY;
    doc.text("Subtotal:", summaryX, sumY);
    doc.text(`₹${(Number(po.subtotal) || 0).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
    sumY += 5;

    if (po.discount_amount && Number(po.discount_amount) > 0) {
        doc.text("Discount:", summaryX, sumY);
        doc.text(`- ₹${Number(po.discount_amount).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
        sumY += 5;
    }

    if (po.tax_amount && Number(po.tax_amount) > 0) {
        doc.text("Tax Amount:", summaryX, sumY);
        doc.text(`₹${Number(po.tax_amount).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
        sumY += 5;
    }

    doc.setLineWidth(0.3);
    doc.line(summaryX, sumY, pageWidth - 14, sumY);
    sumY += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Total PO Value:", summaryX, sumY);
    doc.text(`₹${(Number(po.total_amount) || 0).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
    sumY += 6;

    if (po.advance_paid && Number(po.advance_paid) > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(16, 185, 129);
        doc.text("Advance Paid:", summaryX, sumY);
        doc.text(`₹${Number(po.advance_paid).toFixed(2)}`, pageWidth - 14, sumY, { align: "right" });
    }

    // Notes
    if (po.notes || po.terms_conditions) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("PROCUREMENT INSTRUCTIONS:", 14, finalY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const text = [po.notes, po.terms_conditions].filter(Boolean).join("\n");
        doc.text(doc.splitTextToSize(text, summaryX - 25), 14, finalY + 4);
    }

    // Signatory
    const signY = Math.max(sumY + 15, finalY + 30);
    if (signY < 275) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`For ${bizName}`, pageWidth - 14, signY, { align: "right" });
        doc.text("Authorized Procurement Officer", pageWidth - 14, signY + 12, { align: "right" });
    }

    doc.save(`Purchase_Order_${po.po_number}.pdf`);
}

export function generateOrderPDF(
    order: SaleOrder | PurchaseOrder,
    type: "sale_order" | "purchase_order",
    businessDetails?: any
) {
    if (type === "sale_order") {
        return generateSaleOrderPDF(order as SaleOrder, businessDetails);
    } else {
        return generatePurchaseOrderPDF(order as PurchaseOrder, businessDetails);
    }
}
