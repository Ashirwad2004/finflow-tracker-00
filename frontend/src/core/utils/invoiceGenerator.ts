import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeGst?: string;
  storeLogo?: string;
  storeSignature?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  deliveryCharge: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  orderId?: string;
}

export function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
  const textColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const mutedTextColor: [number, number, number] = [71, 85, 105]; // Slate 600
  const borderColor: [number, number, number] = [226, 232, 240]; // Slate 200

  // 1. TOP HEADER BRANDING & INVOICE LABEL
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 8, 'F'); // Top colored accent bar

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('FinFlow', 15, 22);

  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('GST Compliant Retail Store Invoice', 15, 27);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('TAX INVOICE', 195, 22, { align: 'right' });

  // Order meta info
  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Order ID:  ${data.orderId || 'N/A'}`, 195, 27, { align: 'right' });

  // Divider Line
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.line(15, 32, 195, 32);

  // 2. METADATA INFO CARDS (SOLD BY / BILL TO)
  const infoStartY = 38;
  const boxHeight = 44;

  // Draw Sold By Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, infoStartY, 86, boxHeight, 2, 2, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(15, infoStartY, 86, boxHeight, 2, 2, 'D');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('SOLD BY (SELLER)', 19, infoStartY + 6);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(data.storeName.toUpperCase(), 19, infoStartY + 13);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  
  const splitSellerAddr = doc.splitTextToSize(data.storeAddress || 'Storefront Pickup', 78);
  doc.text(splitSellerAddr, 19, infoStartY + 19);
  
  const sellerPhone = data.storePhone ? `Phone: ${data.storePhone}` : '';
  doc.text(sellerPhone, 19, infoStartY + boxHeight - 11);

  if (data.storeGst) {
    doc.setFont('Helvetica', 'bold');
    doc.text(`GSTIN: ${data.storeGst}`, 19, infoStartY + boxHeight - 5);
    doc.setFont('Helvetica', 'normal');
  }

  // Draw Bill To Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(109, infoStartY, 86, boxHeight, 2, 2, 'F');
  doc.roundedRect(109, infoStartY, 86, boxHeight, 2, 2, 'D');

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('BILLED TO (BUYER)', 113, infoStartY + 6);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text((data.customerName || 'Valued Customer').toUpperCase(), 113, infoStartY + 13);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

  const splitCustAddr = doc.splitTextToSize(data.customerAddress || 'Storefront Pickup', 78);
  doc.text(splitCustAddr, 113, infoStartY + 19);

  doc.text(`Phone: ${data.customerPhone || 'N/A'}`, 113, infoStartY + boxHeight - 5);

  // 3. INVOICE PARAMETERS BLOCK
  const paramStartY = infoStartY + boxHeight + 6;
  
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, paramStartY, 180, 16, 1.5, 1.5, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('Invoice Number', 20, paramStartY + 6);
  doc.text('Invoice Date', 65, paramStartY + 6);
  doc.text('Payment Mode', 110, paramStartY + 6);
  doc.text('Payment Status', 155, paramStartY + 6);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(data.invoiceNumber, 20, paramStartY + 11);
  doc.text(data.date, 65, paramStartY + 11);
  doc.text(data.paymentMethod.toUpperCase(), 110, paramStartY + 11);
  
  // Color code status
  if (data.status.toLowerCase() === 'success' || data.status.toLowerCase() === 'paid') {
    doc.setTextColor(16, 124, 65); // Emerald Green
  } else {
    doc.setTextColor(220, 100, 30); // Amber
  }
  doc.text(data.status.toUpperCase(), 155, paramStartY + 11);

  // 4. TAX ITEMIZED TABLE (Flipkart/Blinkit Style)
  const gstPercent = 18;
  const factor = 1 + gstPercent / 100;
  
  let totalTaxableValue = 0;
  let totalCgst = 0;
  let totalSgst = 0;

  const tableHeaders = [['#', 'Item Description', 'Qty', 'Unit Price', 'GST %', 'CGST (9%)', 'SGST (9%)', 'Net Amount']];
  const tableRows = data.items.map((item, idx) => {
    const qty = Number(item.quantity || 1);
    const unitPriceInclTax = Number(item.price || 0);
    const totalInclTax = unitPriceInclTax * qty;
    
    const unitPriceExclTax = unitPriceInclTax / factor;
    const taxableValue = unitPriceExclTax * qty;
    const totalGst = totalInclTax - taxableValue;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    
    totalTaxableValue += taxableValue;
    totalCgst += cgst;
    totalSgst += sgst;

    return [
      (idx + 1).toString(),
      item.name,
      qty.toString(),
      `Rs. ${unitPriceExclTax.toFixed(2)}`,
      `${gstPercent}%`,
      `Rs. ${cgst.toFixed(2)}`,
      `Rs. ${sgst.toFixed(2)}`,
      `Rs. ${totalInclTax.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: paramStartY + 22,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249], // Cool grey bg
      textColor: [51, 65, 85], // Slate 700
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      lineWidth: 0.1,
      lineColor: borderColor,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
      lineWidth: 0.1,
      lineColor: borderColor,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 23, halign: 'right' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 23, halign: 'right' },
      6: { cellWidth: 23, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // 5. TOTALS CALCULATIONS BLOCK
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  
  // Left: Tax Summary Box
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(15, finalY, 86, 26, 1, 1, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(15, finalY, 86, 26, 1, 1, 'D');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TAX ANALYSIS BREAKDOWN', 19, finalY + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(`Total Taxable Value:`, 19, finalY + 11);
  doc.text(`Total CGST (9%):`, 19, finalY + 16);
  doc.text(`Total SGST (9%):`, 19, finalY + 21);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Rs. ${totalTaxableValue.toFixed(2)}`, 85, finalY + 11, { align: 'right' });
  doc.text(`Rs. ${totalCgst.toFixed(2)}`, 85, finalY + 16, { align: 'right' });
  doc.text(`Rs. ${totalSgst.toFixed(2)}`, 85, finalY + 21, { align: 'right' });

  // Right: Price Summary Table
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  
  doc.text('Subtotal (Taxable):', 125, finalY + 5);
  doc.text(`Rs. ${totalTaxableValue.toFixed(2)}`, 195, finalY + 5, { align: 'right' });

  doc.text('IGST / CGST + SGST:', 125, finalY + 11);
  doc.text(`Rs. ${(totalCgst + totalSgst).toFixed(2)}`, 195, finalY + 11, { align: 'right' });

  doc.text('Delivery Fee:', 125, finalY + 17);
  doc.text(`Rs. ${data.deliveryCharge.toFixed(2)}`, 195, finalY + 17, { align: 'right' });

  // Grand Total separator line
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(125, finalY + 21, 195, finalY + 21);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Total Amount:', 125, finalY + 26);
  doc.text(`Rs. ${data.totalAmount.toFixed(2)}`, 195, finalY + 26, { align: 'right' });

  // 6. DECLARATION, BARCODE & SIGNATORY (Bottom)
  const footerY = 246;

  // Terms and Conditions
  doc.setFontSize(7.5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Terms & Conditions:', 15, footerY);
  
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('1. This is a computer-generated Tax Invoice/Bill of Supply under GST Rules.', 15, footerY + 4);
  doc.text('2. All disputes are subject to the local jurisdiction of the merchant.', 15, footerY + 7);
  doc.text('3. If you have any return queries, please contact the store within the return window.', 15, footerY + 10);

  // Barcode Section (placed on bottom-left, below Terms & Conditions to avoid overlap)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('TRANSACTION BARCODE', 15, footerY + 16);

  let barcodeX = 15;
  const barcodeY = footerY + 18.5;
  const barcodeHeight = 7;
  const barcodePattern = [1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 1, 2, 1, 1, 3, 2, 1];
  
  doc.setDrawColor(0, 0, 0);
  barcodePattern.forEach((width, index) => {
    doc.setLineWidth(width * 0.25);
    doc.line(barcodeX, barcodeY, barcodeX, barcodeY + barcodeHeight);
    barcodeX += (width * 0.25) + 0.5;
  });
  doc.text(data.invoiceNumber, 15, footerY + 28.5);

  // Signatory stamp
  const signatureY = footerY;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`For ${data.storeName.toUpperCase()}`, 195, signatureY, { align: 'right' });

  if (data.storeSignature) {
    try {
      doc.addImage(data.storeSignature, 'PNG', 165, signatureY + 2, 30, 9);
    } catch (e) {
      console.warn("Failed to embed store signature image", e);
    }
  } else {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text('Authorized Signatory', 195, signatureY + 12, { align: 'right' });
    doc.text('(Digitally Generated Signature)', 195, signatureY + 15, { align: 'right' });
  }

  // Save the PDF
  doc.save(`invoice_${data.invoiceNumber}.pdf`);
}
