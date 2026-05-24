import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  deliveryCharge: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
}

export function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Theme colors
  const primaryColor = [79, 70, 229]; // Indigo
  const textColor = [31, 41, 55];
  const mutedTextColor = [107, 114, 128];

  // Header Background Accent Bar
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 8, 'F');

  // Title & Brand
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('FinFlow', 15, 25);

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('Digital Business Ledger & Invoicing', 15, 30);

  // Invoice label
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('TAX INVOICE', 140, 25);

  // Shop / Store Name
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(data.storeName.toUpperCase(), 15, 45);

  // Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(15, 52, 195, 52);

  // Metadata block (Invoice details left, Customer details right)
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INVOICE INFORMATION', 15, 60);
  doc.text('BILL TO (CUSTOMER)', 115, 60);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  // Left Column (Invoice Info)
  doc.text(`Invoice No:      ${data.invoiceNumber}`, 15, 66);
  doc.text(`Date:                  ${data.date}`, 15, 72);
  doc.text(`Payment:          ${data.paymentMethod.toUpperCase()}`, 15, 78);
  doc.text(`Status:              ${data.status.toUpperCase()}`, 15, 84);

  // Right Column (Customer Info)
  doc.text(`Name:       ${data.customerName}`, 115, 66);
  doc.text(`Phone:      ${data.customerPhone}`, 115, 72);
  if (data.customerAddress) {
    const splitAddress = doc.splitTextToSize(`Address:   ${data.customerAddress}`, 80);
    doc.text(splitAddress, 115, 78);
  } else {
    doc.text('Address:   Storefront Pickup', 115, 78);
  }

  // Items table
  const tableHeaders = [['#', 'Item Details', 'Qty', 'Unit Price', 'Total']];
  const tableRows = data.items.map((item, idx) => [
    (idx + 1).toString(),
    item.name,
    item.quantity.toString(),
    `INR ${Number(item.price).toFixed(2)}`,
    `INR ${(Number(item.price) * item.quantity).toFixed(2)}`,
  ]);

  (doc as any).autoTable({
    startY: 95,
    head: tableHeaders,
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [55, 65, 81],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 90 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // Calculate totals Y coordinate
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Add Totals section
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  
  doc.text('Subtotal:', 130, finalY);
  doc.text(`INR ${data.subtotal.toFixed(2)}`, 195, finalY, { align: 'right' });

  doc.text('Delivery Charge:', 130, finalY + 6);
  doc.text(`INR ${data.deliveryCharge.toFixed(2)}`, 195, finalY + 6, { align: 'right' });

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(130, finalY + 10, 195, finalY + 10);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Grand Total:', 130, finalY + 16);
  doc.text(`INR ${data.totalAmount.toFixed(2)}`, 195, finalY + 16, { align: 'right' });

  // Footer notes & simulated Barcode
  const footerY = 250;
  
  // Terms and Conditions
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Terms & Conditions:', 15, footerY);
  
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('1. This is a computer-generated tax invoice and requires no physical signature.', 15, footerY + 5);
  doc.text('2. Goods once sold cannot be returned unless verified by the merchant.', 15, footerY + 9);
  doc.text('3. For refund claims, please quote the Invoice Number shown above.', 15, footerY + 13);

  // Barcode Generation (Draw custom thick and thin lines)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('TRANSACTION BARCODE ID', 150, footerY);

  let barcodeX = 150;
  const barcodeY = footerY + 3;
  const barcodeHeight = 10;
  
  const barcodePattern = [1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 1, 2, 1, 1, 3, 2, 1]; // Line widths
  doc.setDrawColor(0, 0, 0);
  barcodePattern.forEach((width, index) => {
    doc.setLineWidth(width * 0.3);
    doc.line(barcodeX, barcodeY, barcodeX, barcodeY + barcodeHeight);
    barcodeX += (width * 0.3) + 0.6; // step forward
  });

  doc.setFontSize(8);
  doc.text(data.invoiceNumber, 150, footerY + 16);

  // Save the PDF file
  doc.save(`invoice_${data.invoiceNumber}.pdf`);
}
