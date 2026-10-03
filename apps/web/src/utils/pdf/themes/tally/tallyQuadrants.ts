import { ThemeRenderContext } from "../../types";
import { FONT_STYLE, LINE_DARK, TEXT_DARK } from "./constants";

export function renderTallyQuadrants(
  ctx: ThemeRenderContext,
  tallyMarginX: number,
  tallyMarginY: number
): number {
  const {
    doc,
    data,
    descriptor,
    amountPaid,
    balanceDue,
    pageWidth,
    pageHeight,
    scale,
    dateFormatted,
    dueDateFormatted,
    bizName,
    custGSTIN,
    safeText,
    isFullyPaid,
  } = ctx;

  // Outer border around the page
  doc.setDrawColor(...LINE_DARK);
  doc.setLineWidth(0.5);
  doc.rect(tallyMarginX, tallyMarginY, pageWidth - 2 * tallyMarginX, pageHeight - 2 * tallyMarginY);

  // Centered Header Label: e.g. "TAX INVOICE", "PURCHASE BILL", "SALE ORDER", "PURCHASE ORDER"
  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(11);
  doc.text(descriptor.title, pageWidth / 2, 16 * scale, { align: "center" });
  doc.line(tallyMarginX, 19 * scale, pageWidth - tallyMarginX, 19 * scale);

  const midX = pageWidth / 2;

  // Quadrant 1: Seller / Company Details (Top Left)
  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(descriptor.senderLabel, tallyMarginX + 2, 23 * scale);
  doc.setTextColor(...TEXT_DARK);
  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(11);
  doc.text(bizName, tallyMarginX + 2, 27.5 * scale);
  doc.setFont(FONT_STYLE, "normal");
  doc.setFontSize(7.5);
  let sellerY = 31.5 * scale;
  if (data.business_details?.address) {
    const addrLines = doc.splitTextToSize(safeText(data.business_details.address), midX - tallyMarginX - 4);
    doc.text(addrLines, tallyMarginX + 2, sellerY);
    sellerY += addrLines.length * 3.4 * scale;
  }
  if (data.business_details?.phone) {
    doc.text(`Phone: ${safeText(data.business_details.phone)}`, tallyMarginX + 2, sellerY);
    sellerY += 3.6 * scale;
  }
  if (data.business_details?.gst) {
    doc.setFont(FONT_STYLE, "bold");
    doc.text(`GSTIN/UIN: ${safeText(data.business_details.gst)}`, tallyMarginX + 2, sellerY);
    doc.setFont(FONT_STYLE, "normal");
    sellerY += 3.6 * scale;
  }

  // Quadrant 2: Invoice / Bill Metadata (Top Right)
  let metaY = 23 * scale;
  const metaLabelX = midX + 2;
  const metaValX = pageWidth - tallyMarginX - 2;

  doc.setFont(FONT_STYLE, "normal");
  doc.setFontSize(7.5);
  doc.text(descriptor.numberLabel, metaLabelX, metaY);
  doc.setFont(FONT_STYLE, "bold");
  doc.text(safeText(data.invoice_number), metaValX, metaY, { align: "right" });
  metaY += 4.8 * scale;

  doc.setFont(FONT_STYLE, "normal");
  doc.text(descriptor.dateLabel, metaLabelX, metaY);
  doc.setFont(FONT_STYLE, "bold");
  doc.text(dateFormatted, metaValX, metaY, { align: "right" });
  metaY += 4.8 * scale;

  doc.setFont(FONT_STYLE, "normal");
  doc.text(descriptor.dueDateLabel, metaLabelX, metaY);
  doc.text(dueDateFormatted ? dueDateFormatted : descriptor.defaultDueDateText, metaValX, metaY, { align: "right" });
  metaY += 4.8 * scale;

  doc.text(descriptor.statusHeaderLabel, metaLabelX, metaY);
  const statusLabel =
    balanceDue <= 0 && isFullyPaid
      ? descriptor.isOrder
        ? "Confirmed / Settled"
        : "Immediate / Paid"
      : amountPaid > 0
      ? `Partial (Due: Rs. ${balanceDue.toFixed(2)})`
      : data.status
      ? safeText(data.status).toUpperCase().replace("_", " ")
      : "Pending / Due";
  doc.setFont(FONT_STYLE, "bold");
  if (balanceDue <= 0 && isFullyPaid) doc.setTextColor(22, 101, 52);
  else if (amountPaid > 0) doc.setTextColor(180, 83, 9);
  else doc.setTextColor(220, 38, 38);
  doc.text(statusLabel, metaValX, metaY, { align: "right" });
  doc.setTextColor(...TEXT_DARK);
  metaY += 4.8 * scale;

  // Horizontal dividing line between Quadrants 1/2 and 3/4
  const middleY = Math.max(sellerY + 2, metaY + 2, 45 * scale);
  doc.line(tallyMarginX, middleY, pageWidth - tallyMarginX, middleY);

  // Quadrant 3: Buyer Details or Supplier Details (Bottom Left)
  let buyerY = middleY + 4 * scale;
  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(descriptor.partyLabel, tallyMarginX + 2, buyerY);
  doc.setTextColor(...TEXT_DARK);
  buyerY += 4.2 * scale;
  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(10);
  doc.text(
    safeText(data.customer_name || (descriptor.isPurchaseFlow ? "Vendor / Supplier" : "Walk-in Guest")),
    tallyMarginX + 2,
    buyerY
  );
  doc.setFont(FONT_STYLE, "normal");
  doc.setFontSize(7.5);
  buyerY += 4 * scale;
  if (data.customer_phone) {
    doc.text(`Phone: ${safeText(data.customer_phone)}`, tallyMarginX + 2, buyerY);
    buyerY += 3.6 * scale;
  }
  if (data.customer_email) {
    doc.text(`Email: ${safeText(data.customer_email)}`, tallyMarginX + 2, buyerY);
    buyerY += 3.6 * scale;
  }
  if (custGSTIN) {
    doc.setFont(FONT_STYLE, "bold");
    doc.text(`GSTIN/UIN: ${custGSTIN}`, tallyMarginX + 2, buyerY);
    doc.setFont(FONT_STYLE, "normal");
    buyerY += 3.6 * scale;
  }

  // Quadrant 4: Consignee Details (Bottom Right)
  let shipY = middleY + 4 * scale;
  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(descriptor.consigneeLabel, midX + 2, shipY);
  doc.setTextColor(...TEXT_DARK);
  shipY += 4.2 * scale;
  doc.setFont(FONT_STYLE, "bold");
  doc.setFontSize(9.5);
  doc.text(descriptor.isPurchaseFlow ? bizName : safeText(data.customer_name || "Walk-in Guest"), midX + 2, shipY);
  doc.setFont(FONT_STYLE, "normal");
  doc.setFontSize(7.5);
  shipY += 4 * scale;
  const consigneeAddress = descriptor.isPurchaseFlow
    ? data.business_details?.address
      ? safeText(data.business_details.address).slice(0, 45)
      : "Business Premises / Receiving Bay"
    : "Same as billing address";
  doc.text(consigneeAddress, midX + 2, shipY);
  shipY += 4 * scale;

  // Compute table start Y
  const tableStartY = Math.max(buyerY + 3, shipY + 3, middleY + 24 * scale);

  // Vertical divider between quadrants
  doc.line(midX, 19 * scale, midX, tableStartY);

  // Border above table
  doc.line(tallyMarginX, tableStartY, pageWidth - tallyMarginX, tableStartY);

  return tableStartY;
}
