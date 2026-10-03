import { ThemeRenderContext } from "../../types";
import { formatCurrencySafe } from "../../helpers";
import { FONT_STYLE, TEXT_DARK } from "./constants";

export function renderTallyFooterRight(
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
    signatureBase64,
    taxRateVal,
    cgstVal,
    sgstVal,
    amountPaid,
    balanceDue,
    shouldShowPartyBalance,
    prevBalanceVal,
    closingNetDueVal,
    pageWidth,
    pageHeight,
    scale,
    bizName,
  } = ctx;

  // --- RIGHT COLUMN: Summary & Signatory ---
  let rightY = footerStartY + 4.2 * scale;
  doc.setFont(FONT_STYLE, "normal");
  doc.setFontSize(8);

  doc.text(descriptor.subtotalLabel, splitX + 2, rightY);
  doc.text(formatCurrencySafe(data.subtotal), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
  rightY += 4.2 * scale;

  if (data.discount_amount && data.discount_amount > 0) {
    doc.text("Discount:", splitX + 2, rightY);
    doc.text(`-${formatCurrencySafe(data.discount_amount)}`, pageWidth - tallyMarginX - 2, rightY, {
      align: "right",
    });
    rightY += 4.2 * scale;
  }
  if (data.tax_amount && data.tax_amount > 0) {
    const tr = taxRateVal;
    if (data.igst !== undefined && Number(data.igst) > 0) {
      doc.text(`IGST (${tr}%):`, splitX + 2, rightY);
      doc.text(formatCurrencySafe(Number(data.igst)), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
      rightY += 4.0 * scale;
    } else {
      doc.text(`CGST (${tr / 2}%):`, splitX + 2, rightY);
      doc.text(formatCurrencySafe(cgstVal), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
      rightY += 4.0 * scale;
      doc.text(`SGST (${tr / 2}%):`, splitX + 2, rightY);
      doc.text(formatCurrencySafe(sgstVal), pageWidth - tallyMarginX - 2, rightY, { align: "right" });
      rightY += 4.0 * scale;
    }
  }

  doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);
  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(9);
  doc.text(descriptor.totalLabel, splitX + 2, rightY + 3.8 * scale);
  doc.text(formatCurrencySafe(data.total_amount), pageWidth - tallyMarginX - 2, rightY + 3.8 * scale, {
    align: "right",
  });
  rightY += 5.8 * scale;

  // Partial Payment Breakdown
  doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);
  doc.setFont(FONT_STYLE, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52); // Forest green
  doc.text(descriptor.paidLabel, splitX + 2, rightY + 3.2 * scale);
  doc.text(formatCurrencySafe(amountPaid), pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
  rightY += 4.8 * scale;

  doc.setFont(FONT_STYLE, "bold");
  if (balanceDue > 0) {
    doc.setTextColor(185, 28, 28); // Crimson red
    doc.text(descriptor.balanceLabel, splitX + 2, rightY + 3.2 * scale);
    doc.text(formatCurrencySafe(balanceDue), pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
  } else {
    doc.setTextColor(22, 101, 52); // Forest green
    doc.text(descriptor.balanceLabel, splitX + 2, rightY + 3.2 * scale);
    doc.text("0.00 (PAID / SETTLED)", pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
  }
  doc.setTextColor(...TEXT_DARK);
  rightY += 5.2 * scale;

  // CA-Grade Party Previous Due & Net Balance Breakdown (FinFlow Billing Standard)
  if (shouldShowPartyBalance) {
    doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);
    doc.setFont(FONT_STYLE, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    const prevBalLabel = prevBalanceVal >= 0 ? "Previous Pending (Dr):" : "Previous Advance (Cr):";
    doc.text(prevBalLabel, splitX + 2, rightY + 3.2 * scale);
    const prevBalFormatted = (prevBalanceVal < 0 ? "-" : "") + formatCurrencySafe(Math.abs(prevBalanceVal));
    doc.text(prevBalFormatted, pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
    rightY += 4.5 * scale;

    doc.setFont(FONT_STYLE, "bold");
    doc.setFontSize(8);
    if (closingNetDueVal > 0) {
      doc.setTextColor(185, 28, 28); // Crimson red
      doc.text("Current Pending Balance:", splitX + 2, rightY + 3.2 * scale);
      doc.text(`${formatCurrencySafe(closingNetDueVal)} Dr`, pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, {
        align: "right",
      });
    } else if (closingNetDueVal < 0) {
      doc.setTextColor(22, 101, 52); // Forest green
      doc.text("Current Advance Balance:", splitX + 2, rightY + 3.2 * scale);
      doc.text(`${formatCurrencySafe(Math.abs(closingNetDueVal))} Cr`, pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, {
        align: "right",
      });
    } else {
      doc.setTextColor(22, 101, 52);
      doc.text("Current Pending Balance:", splitX + 2, rightY + 3.2 * scale);
      doc.text("0.00 (SETTLED)", pageWidth - tallyMarginX - 2, rightY + 3.2 * scale, { align: "right" });
    }
    doc.setTextColor(...TEXT_DARK);
    rightY += 5.2 * scale;
  }

  doc.line(splitX, rightY, pageWidth - tallyMarginX, rightY);

  // Signatory Box
  const signatoryBoxTop = rightY;
  const signatoryBoxBottom = pageHeight - tallyMarginY;
  const rightColWidth = pageWidth - tallyMarginX - splitX;
  const signatoryCenterX = splitX + rightColWidth / 2;

  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(7.5);
  const forBizText = descriptor.signatoryCompanyText(bizName);
  const splitForBiz = doc.splitTextToSize(forBizText, rightColWidth - 4);
  doc.text(splitForBiz, splitX + 2, signatoryBoxTop + 3.5 * scale);
  const bizTextH = splitForBiz.length * 3.2 * scale;

  // Authorized Signatory anchor at bottom
  doc.setFont(FONT_STYLE, "normal");
  doc.setFontSize(7.5);
  doc.text(descriptor.signatoryRoleText, signatoryCenterX, signatoryBoxBottom - 2.5 * scale, { align: "center" });

  // Signature Image strictly placed in the available slot between forBizText and Authorized Signatory
  if (signatureBase64) {
    const sigSlotTop = signatoryBoxTop + 3.5 * scale + bizTextH + 1.5 * scale;
    const sigSlotBottom = signatoryBoxBottom - 6.5 * scale;
    const maxSigH = Math.max(6, sigSlotBottom - sigSlotTop);
    const maxSigW = rightColWidth - 8 * scale;

    let renderW = signatureBase64.width;
    let renderH = signatureBase64.height;
    const ratio = Math.min(maxSigW / renderW, maxSigH / renderH);
    renderW *= ratio;
    renderH *= ratio;

    const sigY = sigSlotTop + (maxSigH - renderH) / 2;
    const sigX = signatoryCenterX - renderW / 2;
    doc.addImage(signatureBase64.dataUrl, "PNG", sigX, sigY, renderW, renderH);
  }
}
