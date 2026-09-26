import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface SoftwareBillData {
  billNumber: string;
  paymentDateTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number;
  paymentMethod: string;
  paymentSource: string;
  paymentId: string;
  orderId?: string;
  validityMonths: number;
  licenseStartDate: string;
  licenseEndDate: string;
}

export function generateSoftwareBillPDF(data: SoftwareBillData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryIndigo: [number, number, number] = [79, 70, 229]; // #4f46e5
  const slate900: [number, number, number] = [15, 23, 42];
  const slate600: [number, number, number] = [71, 85, 105];
  const slate400: [number, number, number] = [148, 163, 184];
  const slate100: [number, number, number] = [241, 245, 249];
  const emeraldColor: [number, number, number] = [16, 185, 129];

  // 1. Top Decorative Brand Bar
  doc.setFillColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.rect(0, 0, 210, 6, "F");

  // 2. Header Section - RupeeBill Branding
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("RupeeBill", 14, 20);

  doc.setFontSize(9);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text("Business Accounting & Storefront Operating System", 14, 25);
  doc.text("Official Software Purchase Bill & License Certificate", 14, 29);

  // Right Side: Bill Metadata Box
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text("SOFTWARE PURCHASE BILL", 196, 20, { align: "right" });

  doc.setFontSize(8.5);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Bill Number: ${data.billNumber}`, 196, 25, { align: "right" });
  doc.text(`Date & Time: ${data.paymentDateTime}`, 196, 29, { align: "right" });
  doc.text(`Payment Source: ${data.paymentSource}`, 196, 33, { align: "right" });

  // Divider Line
  doc.setDrawColor(slate400[0], slate400[1], slate400[2]);
  doc.setLineWidth(0.3);
  doc.line(14, 38, 196, 38);

  // 3. Information Columns (Provider & Customer Details)
  // Left Column: Software Provider
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text("ISSUED BY:", 14, 46);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("RupeeBill Technologies", 14, 51);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text("Commercial Software Licensing Dept.", 14, 55);
  doc.text("Support: supportrupeebill@gmail.com", 14, 59);
  doc.text("Helpline: +91 8102545007", 14, 63);

  // Right Column: Customer & Transaction
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text("LICENSED TO (BUYER):", 115, 46);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text(data.customerName || "Valued Merchant", 115, 51);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Email: ${data.customerEmail || "customer@rupeebill.com"}`, 115, 55);
  if (data.customerPhone) {
    doc.text(`Mobile: ${data.customerPhone}`, 115, 59);
  }
  doc.text(`License Validity: ${data.licenseStartDate} to ${data.licenseEndDate} (${data.validityMonths} Mo)`, 115, data.customerPhone ? 63 : 59);

  // 4. Payment & Gateway Audit Bar
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.roundedRect(14, 70, 182, 14, 2, 2, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text("Payment ID:", 18, 76);
  doc.setFont("Helvetica", "normal");
  doc.text(data.paymentId, 38, 76);

  if (data.orderId) {
    doc.setFont("Helvetica", "bold");
    doc.text("Order ID:", 18, 81);
    doc.setFont("Helvetica", "normal");
    doc.text(data.orderId, 38, 81);
  }

  doc.setFont("Helvetica", "bold");
  doc.text("Payment Mode:", 120, 76);
  doc.setFont("Helvetica", "normal");
  doc.text(data.paymentMethod, 144, 76);

  doc.setFont("Helvetica", "bold");
  doc.text("Status:", 120, 81);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.text("SUCCESS / PAID", 144, 81);

  // 5. Item Table using autoTable
  autoTable(doc, {
    startY: 88,
    head: [["Item Description", "License Term", "Qty", "Unit Price", "Total Amount"]],
    body: [
      [
        {
          content:
            "RupeeBill Business Pro — Commercial Software License\n" +
            "• Full Unlimited Billing & Invoicing (Thermal POS & A4/A5 Print Studio)\n" +
            "• 100% Offline Host-Disk OPFS Persistence & Automatic Cloud Backup\n" +
            "• Digital Storefront with Live Online Order Synchronization\n" +
            "• Customer & Vendor Parties Ledgers with Automatic Balance Tracking\n" +
            "• AI Receipt Scanning & Multi-Role Staff/Salesman Access Delegation",
          styles: { fontStyle: "normal", fontSize: 8.5 },
        },
        `${data.validityMonths} Months`,
        "1",
        `Rs. ${data.amount.toFixed(2)}`,
        `Rs. ${data.amount.toFixed(2)}`,
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
      halign: "left",
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 8.5,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 28, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 22, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // 6. Total and Payment Summary
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Left Note Box
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.roundedRect(14, finalY, 110, 36, 2, 2, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text("Software License Terms:", 18, finalY + 7);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text("• Official software bill generated upon verified payment receipt.", 18, finalY + 13);
  doc.text("• Direct software license purchase (Exempt / No GST applicable).", 18, finalY + 18);
  doc.text("• Non-transferable single-tenant commercial software license.", 18, finalY + 23);
  doc.text(`• Valid from ${data.licenseStartDate} until ${data.licenseEndDate}.`, 18, finalY + 28);

  // Right Total Breakdown Box
  const summaryX = 135;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text("Software Subtotal:", summaryX, finalY + 6);
  doc.text(`Rs. ${data.amount.toFixed(2)}`, 196, finalY + 6, { align: "right" });

  doc.text("Taxes & Surcharges:", summaryX, finalY + 13);
  doc.text("Rs. 0.00", 196, finalY + 13, { align: "right" });

  doc.text("Discount Applied:", summaryX, finalY + 20);
  doc.text("Rs. 0.00", 196, finalY + 20, { align: "right" });

  doc.setDrawColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.setLineWidth(0.5);
  doc.line(summaryX, finalY + 24, 196, finalY + 24);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
  doc.text("Total Paid:", summaryX, finalY + 31);
  doc.text(`Rs. ${data.amount.toFixed(2)}`, 196, finalY + 31, { align: "right" });

  // 7. Payment Verification Stamp Box
  const stampY = finalY + 45;

  doc.setDrawColor(16, 185, 129); // Green
  doc.setLineWidth(0.8);
  doc.roundedRect(14, stampY, 182, 24, 3, 3, "D");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(16, 185, 129);
  doc.text("VERIFIED PAYMENT CONFIRMATION (PAID)", 20, stampY + 8);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Payment Gateway: Razorpay Secured | Source: ${data.paymentSource}`, 20, stampY + 14);
  doc.text(`Transaction Reference: ${data.paymentId} | Timestamp: ${data.paymentDateTime}`, 20, stampY + 19);

  // 8. Footer
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.text("Thank you for choosing RupeeBill. For support or queries: supportrupeebill@gmail.com | Helpline: +91 8102545007", 105, 285, { align: "center" });

  // Save the PDF
  doc.save(`RupeeBill_Software_Bill_${data.billNumber}.pdf`);
}
