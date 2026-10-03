import { ThemeRenderContext } from "../../types";
import { convertAmountToIndianWords, formatCurrencySafe } from "../../helpers";
import { FONT_STYLE, TEXT_DARK } from "./constants";

export function renderTallyFooterLeft(
  ctx: ThemeRenderContext,
  footerStartY: number,
  splitX: number,
  tallyMarginX: number,
  tallyMarginY: number
): void {
  const {
    doc,
    data,
    descriptor,
    resolvedBank,
    upiQrBase64,
    balanceDue,
    totalAmount,
    pageHeight,
    scale,
    bizName,
    resolvedUpiId,
    customTerms,
  } = ctx;

  const hasBankOrUpi = Boolean(resolvedBank || upiQrBase64);

  // --- LEFT COLUMN: Words, Bank Details (if active), Declaration ---
  doc.setFont(FONT_STYLE, "normal");
  doc.setFontSize(7.5);
  doc.text("Amount Chargeable (in words):", tallyMarginX + 2, footerStartY + 4.5);

  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(8);
  const wordsText = convertAmountToIndianWords(data.total_amount);
  const splitWords = doc.splitTextToSize(wordsText, splitX - tallyMarginX - 4);
  doc.text(splitWords, tallyMarginX + 2, footerStartY + 8.5);

  if (hasBankOrUpi) {
    // Divider 1: between words and Bank/UPI
    const line1Y = footerStartY + 14 * scale;
    doc.line(tallyMarginX, line1Y, splitX, line1Y);

    const qrSize = upiQrBase64 ? 20 * scale : 0;
    const qrX = splitX - qrSize - 3 * scale;
    const qrY = line1Y + 2.5 * scale;

    if (upiQrBase64) {
      doc.addImage(upiQrBase64.dataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      doc.setFontSize(5.5);
      doc.setFont(FONT_STYLE, "bold");
      doc.text("SCAN TO PAY (UPI)", qrX + qrSize / 2, qrY + qrSize + 2.5 * scale, { align: "center" });
    }

    let textY = line1Y + 4 * scale;

    if (resolvedBank) {
      doc.setFont(FONT_STYLE, "bold");
      doc.setFontSize(7.5);
      doc.text("Company's Bank Details:", tallyMarginX + 2, textY);
      textY += 3.5 * scale;
      doc.setFont(FONT_STYLE, "normal");
      doc.setFontSize(7);
      doc.text(`Bank Name : ${resolvedBank.bankName}`, tallyMarginX + 2, textY);
      textY += 3.1 * scale;
      doc.text(`A/c No.   : ${resolvedBank.accountNumber}`, tallyMarginX + 2, textY);
      textY += 3.1 * scale;
      const branchIfsc = [
        resolvedBank.branchName ? `Branch: ${resolvedBank.branchName}` : "",
        resolvedBank.ifscCode ? `IFSC: ${resolvedBank.ifscCode}` : "",
      ]
        .filter(Boolean)
        .join("  |  ");
      if (branchIfsc) {
        doc.text(branchIfsc, tallyMarginX + 2, textY);
        textY += 3.1 * scale;
      }
    } else if (upiQrBase64) {
      doc.setFont(FONT_STYLE, "bold");
      doc.setFontSize(7.5);
      doc.text("Instant Payment via UPI:", tallyMarginX + 2, textY);
      textY += 3.5 * scale;
      doc.setFont(FONT_STYLE, "normal");
      doc.setFontSize(7);
      doc.text(`UPI ID / VPA : ${resolvedUpiId}`, tallyMarginX + 2, textY);
      textY += 3.1 * scale;
      doc.text(`Payee Name   : ${bizName.slice(0, 32)}`, tallyMarginX + 2, textY);
      textY += 3.1 * scale;
      doc.text(
        `Amount       : ${formatCurrencySafe(balanceDue > 0 ? balanceDue : totalAmount)}`,
        tallyMarginX + 2,
        textY
      );
      textY += 3.1 * scale;
    }

    // Divider 2: between Bank/UPI and Declaration
    const line2Y = line1Y + 28 * scale;
    doc.line(tallyMarginX, line2Y, splitX, line2Y);

    // Declaration
    const declY = line2Y + 3.8 * scale;
    doc.setFont(FONT_STYLE, "bold");
    doc.setFontSize(7.5);
    doc.text(descriptor.declarationTitle, tallyMarginX + 2, declY);

    doc.setFont(FONT_STYLE, "normal");
    doc.setFontSize(6.8);
    const termsText = customTerms || descriptor.defaultDeclaration;
    const splitTerms = doc.splitTextToSize(termsText, splitX - tallyMarginX - 4);
    doc.text(splitTerms, tallyMarginX + 2, declY + 3.5 * scale);

    // Seal note at bottom left
    doc.setFont(FONT_STYLE, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text(
      descriptor.isPurchaseFlow ? "Receiver's / Store's Seal & Signature" : "Customer's Seal and Signature",
      tallyMarginX + 2,
      pageHeight - tallyMarginY - 2.5 * scale
    );
    doc.setTextColor(...TEXT_DARK);
  } else {
    // Divider 1: between words and Declaration
    const line1Y = footerStartY + 15 * scale;
    doc.line(tallyMarginX, line1Y, splitX, line1Y);

    // Declaration
    const declY = line1Y + 4 * scale;
    doc.setFont(FONT_STYLE, "bold");
    doc.setFontSize(7.5);
    doc.text(descriptor.declarationTitle, tallyMarginX + 2, declY);

    doc.setFont(FONT_STYLE, "normal");
    doc.setFontSize(6.8);
    const termsText = customTerms || descriptor.defaultDeclaration;
    const splitTerms = doc.splitTextToSize(termsText, splitX - tallyMarginX - 4);
    doc.text(splitTerms, tallyMarginX + 2, declY + 3.5 * scale);

    // Seal note at bottom left
    doc.setFont(FONT_STYLE, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text(
      descriptor.isPurchaseFlow ? "Receiver's / Store's Seal & Signature" : "Customer's Seal and Signature",
      tallyMarginX + 2,
      pageHeight - tallyMarginY - 2.5 * scale
    );
    doc.setTextColor(...TEXT_DARK);
  }
}
