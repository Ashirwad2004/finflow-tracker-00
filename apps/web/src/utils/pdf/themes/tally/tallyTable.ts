import autoTable from "jspdf-autotable";
import { ThemeRenderContext } from "../../types";
import { formatAmountClean, handleContinuationPage } from "../../helpers";
import { LINE_DARK } from "./constants";

export function renderTallyTable(
  ctx: ThemeRenderContext,
  tableStartY: number,
  tallyMarginX: number,
  tallyMarginY: number
): { footerStartY: number; splitX: number } {
  const {
    doc,
    data,
    resolvedBank,
    upiQrBase64,
    taxRateVal,
    showItemTaxRate,
    pageWidth,
    pageHeight,
    scale,
    bizName,
    safeText,
  } = ctx;

  // Standard Tally Table: support showing or hiding individual product Tax % column
  const tableHeadTally = showItemTaxRate
    ? [
        [
          { content: "S.No", styles: { halign: "center" as const } },
          { content: "Description of Goods", styles: { halign: "left" as const } },
          { content: "Qty", styles: { halign: "center" as const } },
          { content: "Rate", styles: { halign: "right" as const } },
          { content: "per", styles: { halign: "center" as const } },
          { content: "Tax %", styles: { halign: "center" as const } },
          { content: "Amount", styles: { halign: "right" as const } },
        ],
      ]
    : [
        [
          { content: "S.No", styles: { halign: "center" as const } },
          { content: "Description of Goods", styles: { halign: "left" as const } },
          { content: "Qty", styles: { halign: "center" as const } },
          { content: "Rate", styles: { halign: "right" as const } },
          { content: "per", styles: { halign: "center" as const } },
          { content: "Amount", styles: { halign: "right" as const } },
        ],
      ];

  const tableRowsTally = data.items.map((item, index) => {
    const itemTax =
      item.tax_rate !== undefined && item.tax_rate !== null && item.tax_rate !== ""
        ? `${Number(item.tax_rate)}%`
        : taxRateVal > 0
        ? `${taxRateVal}%`
        : "0%";
    return showItemTaxRate
      ? [
          (index + 1).toString(),
          safeText(item.description) + (item.hsn_code ? `\nHSN: ${safeText(item.hsn_code)}` : ""),
          item.quantity.toString(),
          formatAmountClean(item.price),
          safeText(item.unit || "pcs"),
          itemTax,
          formatAmountClean(item.total ?? Number(item.quantity) * Number(item.price)),
        ]
      : [
          (index + 1).toString(),
          safeText(item.description) + (item.hsn_code ? `\nHSN: ${safeText(item.hsn_code)}` : ""),
          item.quantity.toString(),
          formatAmountClean(item.price),
          safeText(item.unit || "pcs"),
          formatAmountClean(item.total ?? Number(item.quantity) * Number(item.price)),
        ];
  });

  const columnStylesTally = showItemTaxRate
    ? {
        0: { cellWidth: 10 * scale, halign: "center" as const },
        2: { cellWidth: 14 * scale, halign: "center" as const },
        3: { cellWidth: 24 * scale, halign: "right" as const },
        4: { cellWidth: 12 * scale, halign: "center" as const },
        5: { cellWidth: 16 * scale, halign: "center" as const },
        6: { cellWidth: 28 * scale, halign: "right" as const },
      }
    : {
        0: { cellWidth: 12 * scale, halign: "center" as const },
        2: { cellWidth: 16 * scale, halign: "center" as const },
        3: { cellWidth: 28 * scale, halign: "right" as const },
        4: { cellWidth: 14 * scale, halign: "center" as const },
        5: { cellWidth: 32 * scale, halign: "right" as const },
      };

  autoTable(doc, {
    startY: tableStartY,
    head: tableHeadTally,
    body: tableRowsTally,
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2.8,
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 8,
      cellPadding: 2.8,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    columnStyles: columnStylesTally,
    didParseCell: (hookData: any) => {
      const colIdx = hookData.column.index;
      if (showItemTaxRate) {
        if (colIdx === 0 || colIdx === 2 || colIdx === 4 || colIdx === 5) {
          hookData.cell.styles.halign = "center";
        } else if (colIdx === 3 || colIdx === 6) {
          hookData.cell.styles.halign = "right";
        } else if (colIdx === 1) {
          hookData.cell.styles.halign = "left";
        }
      } else {
        if (colIdx === 0 || colIdx === 2 || colIdx === 4) {
          hookData.cell.styles.halign = "center";
        } else if (colIdx === 3 || colIdx === 5) {
          hookData.cell.styles.halign = "right";
        } else if (colIdx === 1) {
          hookData.cell.styles.halign = "left";
        }
      }
    },
    margin: { left: tallyMarginX, right: tallyMarginX },
  });

  let finalY = (doc as any).lastAutoTable.finalY;

  // Footer height: dynamically accommodate Bank details, UPI QR, words, totals, and signature
  const hasBankOrUpi = Boolean(resolvedBank || upiQrBase64);
  const footerHeight = (hasBankOrUpi ? 72 : 54) * scale;
  finalY = handleContinuationPage(
    doc,
    finalY,
    pageHeight,
    pageWidth,
    LINE_DARK,
    "tally-accounting",
    data.invoice_number,
    bizName,
    footerHeight
  );

  const footerStartY = Math.max(finalY, pageHeight - tallyMarginY - footerHeight);

  doc.setDrawColor(...LINE_DARK);
  doc.setLineWidth(0.5);

  // Dynamic continuation vertical lines derived from actual table columns
  const headCells = (doc as any).lastAutoTable?.head?.[0]?.cells;
  if (headCells && finalY < footerStartY) {
    const cellKeys = Object.keys(headCells);
    for (let i = 0; i < cellKeys.length - 1; i++) {
      const c = headCells[cellKeys[i]];
      if (c && typeof c.x === "number" && typeof c.width === "number") {
        const lineX = c.x + c.width;
        doc.line(lineX, finalY, lineX, footerStartY);
      }
    }
  }

  // Box for bank/amount details starting at footerStartY
  doc.rect(tallyMarginX, footerStartY, pageWidth - 2 * tallyMarginX, pageHeight - tallyMarginY - footerStartY);

  // Vertical split: left column for words/bank/declaration, right for financial breakdown & signature
  const splitX = pageWidth - 80 * scale;
  doc.line(splitX, footerStartY, splitX, pageHeight - tallyMarginY);

  return { footerStartY, splitX };
}
