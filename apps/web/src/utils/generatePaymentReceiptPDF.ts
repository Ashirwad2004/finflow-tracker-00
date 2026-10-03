import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { convertAmountToIndianWords } from "./generateInvoicePDF";
import { printPdfDirectly } from "./directPrint";

export interface SettledBillDetail {
  billNumber: string;
  date?: string;
  totalAmount?: number;
  allocatedAmount: number;
  remainingBalance?: number;
}

export interface PaymentReceiptDetails {
  voucherNumber: string;
  type: "receipt" | "payment"; // 'receipt' = Payment In, 'payment' = Payment Out
  date: string;
  time?: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  partyName: string;
  partyPhone?: string | null;
  partyEmail?: string | null;
  partyGstin?: string | null;
  partyAddress?: string | null;
  linkedBills?: SettledBillDetail[];
  partyCurrentBalance?: number;
  businessDetails?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    gst?: string;
    logo_url?: string;
  };
}

export interface PaymentReceiptOptions {
  action?: "url" | "download" | "print" | "blob";
}

export async function generatePaymentReceiptPDF(
  data: PaymentReceiptDetails,
  options?: PaymentReceiptOptions
): Promise<string | Blob | URL | void> {
  const isReceipt = data.type === "receipt";
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const marginY = 14;
  const contentWidth = pageWidth - 2 * marginX;

  // Primary Theme Colors
  // Emerald / Teal for Payment In (Receipt), Indigo / Slate for Payment Out (Voucher)
  const primaryColor: [number, number, number] = isReceipt ? [16, 122, 87] : [67, 56, 202];
  const primaryLight: [number, number, number] = isReceipt ? [236, 253, 245] : [238, 242, 255];
  const borderLight: [number, number, number] = isReceipt ? [167, 243, 208] : [199, 210, 254];
  const textDark: [number, number, number] = [30, 41, 59];
  const textMuted: [number, number, number] = [100, 116, 139];

  // 1. Outer Border
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.6);
  doc.rect(marginX, marginY, contentWidth, pageHeight - 2 * marginY);

  // Inner subtle border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(marginX + 1.5, marginY + 1.5, contentWidth - 3, pageHeight - 2 * marginY - 3);

  // 2. Company Header Box
  doc.setFillColor(...primaryLight);
  doc.rect(marginX + 2, marginY + 2, contentWidth - 4, 30, "F");

  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.3);
  doc.line(marginX + 2, marginY + 32, marginX + contentWidth - 2, marginY + 32);

  // Company Name & Info (Left)
  const bizName = data.businessDetails?.name || "FinFlow Billing Services";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...textDark);
  doc.text(bizName, marginX + 6, marginY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);

  let compY = marginY + 14;
  if (data.businessDetails?.address) {
    const addr = doc.splitTextToSize(data.businessDetails.address, 110);
    doc.text(addr[0] || "", marginX + 6, compY);
    compY += 4;
  }
  const contactParts = [
    data.businessDetails?.phone ? `Ph: ${data.businessDetails.phone}` : null,
    data.businessDetails?.email ? `Email: ${data.businessDetails.email}` : null,
    data.businessDetails?.gst ? `GSTIN: ${data.businessDetails.gst}` : null,
  ].filter(Boolean);
  if (contactParts.length > 0) {
    doc.text(contactParts.join("  |  "), marginX + 6, compY);
  }

  // Right Header Badge: "RECEIPT VOUCHER" / "PAYMENT VOUCHER"
  const titleText = isReceipt ? "RECEIPT VOUCHER" : "PAYMENT VOUCHER";
  const subTitle = isReceipt ? "PAYMENT IN" : "PAYMENT OUT";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text(titleText, marginX + contentWidth - 6, marginY + 10, { align: "right" });

  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text(`[ ${subTitle} ]`, marginX + contentWidth - 6, marginY + 15, { align: "right" });
  doc.text("ORIGINAL FOR RECIPIENT", marginX + contentWidth - 6, marginY + 20, { align: "right" });

  // 3. Voucher Reference Strip (Two Column Grid)
  let y = marginY + 37;

  // Box 1: Voucher Details
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX + 4, y, (contentWidth - 11) / 2, 24, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX + 4, y, (contentWidth - 11) / 2, 24, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text("VOUCHER DETAILS", marginX + 8, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text("Voucher No:", marginX + 8, y + 11);
  doc.setFont("helvetica", "bold");
  doc.text(data.voucherNumber, marginX + 32, y + 11);

  doc.setFont("helvetica", "normal");
  doc.text("Date:", marginX + 8, y + 16);
  doc.text(`${data.date}${data.time ? "  " + data.time : ""}`, marginX + 32, y + 16);

  doc.text("Mode:", marginX + 8, y + 21);
  doc.setFont("helvetica", "bold");
  const modeLabel = data.paymentMethod ? data.paymentMethod.toUpperCase() : "CASH";
  doc.text(`${modeLabel}${data.referenceNumber ? ` (Ref: ${data.referenceNumber})` : ""}`, marginX + 32, y + 21);

  // Box 2: Party Details (Received From / Paid To)
  const box2X = marginX + 4 + (contentWidth - 11) / 2 + 3;
  const box2W = (contentWidth - 11) / 2;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(box2X, y, box2W, 24, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(box2X, y, box2W, 24, 2, 2, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text(isReceipt ? "RECEIVED FROM (CUSTOMER)" : "PAID TO (VENDOR)", box2X + 4, y + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text(data.partyName || "Cash Customer", box2X + 4, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  const pContact = [
    data.partyPhone ? `Ph: ${data.partyPhone}` : null,
    data.partyGstin ? `GSTIN: ${data.partyGstin}` : null,
  ].filter(Boolean);
  doc.text(pContact.join("  |  ") || "Contact: —", box2X + 4, y + 16);

  if (data.partyAddress) {
    const pAddr = doc.splitTextToSize(data.partyAddress, box2W - 8);
    doc.text(pAddr[0] || "", box2X + 4, y + 21);
  } else {
    doc.text("Address: —", box2X + 4, y + 21);
  }

  // 4. Prominent Amount Highlight Box
  y += 28;
  doc.setFillColor(...primaryLight);
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX + 4, y, contentWidth - 8, 20, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text(isReceipt ? "AMOUNT RECEIVED:" : "AMOUNT PAID:", marginX + 8, y + 7);

  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  const formattedAmt = `Rs. ${Number(data.amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  doc.text(formattedAmt, marginX + contentWidth - 10, y + 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  const words = convertAmountToIndianWords(Number(data.amount || 0));
  doc.text(`In Words: ${words}`, marginX + 8, y + 15);

  // 5. Settlement Particulars Table
  y += 25;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text("SETTLEMENT BREAKDOWN & BILL ALLOCATION", marginX + 4, y);

  y += 2;
  const tableData: any[] = [];
  if (data.linkedBills && data.linkedBills.length > 0) {
    data.linkedBills.forEach((b, idx) => {
      tableData.push([
        String(idx + 1),
        b.billNumber || "—",
        b.date || "—",
        b.totalAmount != null ? `Rs. ${Number(b.totalAmount).toFixed(2)}` : "—",
        `Rs. ${Number(b.allocatedAmount).toFixed(2)}`,
        b.remainingBalance != null
          ? Number(b.remainingBalance) <= 0
            ? "Rs. 0.00 (SETTLED)"
            : `Rs. ${Number(b.remainingBalance).toFixed(2)}`
          : "—",
      ]);
    });
  } else {
    tableData.push([
      "1",
      "On Account / Advance",
      data.date,
      `Rs. ${Number(data.amount).toFixed(2)}`,
      `Rs. ${Number(data.amount).toFixed(2)}`,
      "Advance Credit",
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [["#", "Bill / Invoice Ref", "Bill Date", "Bill Amount", "Settled Amount", "Balance Due"]],
    body: tableData,
    margin: { left: marginX + 4, right: marginX + 4 },
    theme: "grid",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: textDark,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left" },
      2: { halign: "center", cellWidth: 26 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28, fontStyle: "bold" },
      5: { halign: "right", cellWidth: 36 },
    },
  });

  let postTableY = (doc as any).lastAutoTable.finalY + 6;

  // 6. Running Balance & Narration Box
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX + 4, postTableY, marginX + contentWidth - 4, postTableY);
  postTableY += 4;

  // Left: Narration / Notes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text("Narration / Notes:", marginX + 4, postTableY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  const noteStr = data.notes?.trim() || (isReceipt ? "Payment received in full/part settlement." : "Payment made in full/part settlement.");
  const splitNotes = doc.splitTextToSize(noteStr, 110);
  doc.text(splitNotes, marginX + 4, postTableY + 4.5);

  // Right: Net Party Outstanding Box
  const balBoxX = marginX + contentWidth - 76;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(balBoxX, postTableY - 2, 72, 18, 1.5, 1.5, "FD");

  const curBal = Number(data.partyCurrentBalance ?? 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text(isReceipt ? "Customer Remaining Balance:" : "Vendor Remaining Balance:", balBoxX + 3, postTableY + 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  if (curBal > 0) {
    doc.setTextColor(185, 28, 28); // Red
    doc.text(`Rs. ${curBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} Dr`, balBoxX + 3, postTableY + 11);
  } else if (curBal < 0) {
    doc.setTextColor(22, 101, 52); // Green
    doc.text(`Rs. ${Math.abs(curBal).toLocaleString("en-IN", { minimumFractionDigits: 2 })} Cr (Advance)`, balBoxX + 3, postTableY + 11);
  } else {
    doc.setTextColor(22, 101, 52);
    doc.text("Rs. 0.00 (All Dues Cleared)", balBoxX + 3, postTableY + 11);
  }

  // 7. Footer: Signatory & Terms
  const footerY = pageHeight - marginY - 24;

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX + 4, footerY, marginX + contentWidth - 4, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text("Terms: 1. Subject to realization of cheque / online clearance.", marginX + 4, footerY + 5);
  doc.text("2. This is a computer-generated official receipt voucher.", marginX + 4, footerY + 9);

  // Signatory Stamp Box
  const sigX = marginX + contentWidth - 55;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);
  doc.text(`For ${bizName.slice(0, 30)}`, sigX, footerY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text("Authorized Signatory", sigX, footerY + 18);

  // Action Dispatch
  const action = options?.action || "url";
  if (action === "print") {
    const pdfBlob = doc.output("blob");
    await printPdfDirectly(pdfBlob);
    return;
  }
  if (action === "download") {
    doc.save(`${data.voucherNumber || "Receipt"}.pdf`);
    return;
  }
  if (action === "blob") {
    return doc.output("blob");
  }

  return doc.output("bloburl").toString();
}
