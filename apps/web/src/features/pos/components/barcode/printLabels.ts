import { toast } from "sonner";
import { LabelProductItem, LabelPresetConfig } from "./types";

export interface PrintLabelsOptions {
  items: LabelProductItem[];
  preset: LabelPresetConfig;
  storeName: string;
  showStoreName: boolean;
  showProductName: boolean;
  showPrice: boolean;
  showMRP: boolean;
  showSKU: boolean;
  customSubtitle: string;
}

export function printBarcodeLabels({
  items,
  preset,
  storeName,
  showStoreName,
  showProductName,
  showPrice,
  showMRP,
  showSKU,
  customSubtitle,
}: PrintLabelsOptions): void {
  if (items.length === 0) {
    toast.error("No products selected for barcode printing");
    return;
  }

  const printWindow = window.open("", "_blank", "width=800,height=700");
  if (!printWindow) {
    toast.error("Popup blocked! Please allow popups to print barcode labels.");
    return;
  }

  // Build the expanded items array based on copies
  const expandedList: LabelProductItem[] = [];
  items.forEach((item) => {
    for (let i = 0; i < item.copies; i++) {
      expandedList.push(item);
    }
  });

  const isRoll = preset.type === "roll";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Barcode Labels - FinFlow</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page {
            size: ${isRoll ? `${preset.widthMm}mm ${preset.heightMm}mm` : "A4 portrait"};
            margin: ${isRoll ? "0" : "5mm"};
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          body {
            background: #fff;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          ${
            isRoll
              ? `
              .label-page {
                width: ${preset.widthMm}mm;
                height: ${preset.heightMm}mm;
                padding: 1.5mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                text-align: center;
                page-break-after: always;
                break-after: page;
                overflow: hidden;
              }
              `
              : `
              .sheet-grid {
                display: grid;
                grid-template-columns: repeat(${preset.cols}, ${preset.widthMm}mm);
                grid-auto-rows: ${preset.heightMm}mm;
                gap: 1.5mm;
                justify-content: center;
              }
              .label-page {
                width: ${preset.widthMm}mm;
                height: ${preset.heightMm}mm;
                padding: 1.5mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                text-align: center;
                border: 1px dashed #ccc;
                overflow: hidden;
              }
              `
          }
          .store-title {
            font-size: ${preset.fontSize - 1}px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 95%;
          }
          .product-title {
            font-size: ${preset.fontSize}px;
            font-weight: 600;
            line-height: 1.1;
            max-height: 2.2em;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 95%;
          }
          .barcode-svg {
            width: 90%;
            max-height: ${preset.barcodeHeight}px;
            margin: 0 auto;
          }
          .price-line {
            font-size: ${preset.fontSize}px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }
          .mrp-strike {
            text-decoration: line-through;
            font-weight: normal;
            font-size: ${preset.fontSize - 1}px;
            color: #555;
          }
          .subtitle {
            font-size: ${preset.fontSize - 2}px;
            color: #444;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div class="${isRoll ? "roll-container" : "sheet-grid"}">
          ${expandedList
            .map(
              (item, idx) => `
            <div class="label-page">
              ${showStoreName && storeName ? `<div class="store-title">${storeName}</div>` : ""}
              ${showProductName ? `<div class="product-title">${item.name}</div>` : ""}
              
              <svg id="barcode-${idx}" class="barcode-svg"></svg>

              <div class="price-line">
                ${showPrice ? `<span>₹${item.price.toFixed(2)}</span>` : ""}
                ${showMRP && item.mrp && item.mrp > item.price ? `<span class="mrp-strike">₹${item.mrp.toFixed(2)}</span>` : ""}
                ${showSKU && item.sku ? `<span style="font-weight:normal; font-size:${preset.fontSize - 2}px">(${item.sku})</span>` : ""}
              </div>

              ${customSubtitle ? `<div class="subtitle">${customSubtitle}</div>` : ""}
            </div>
          `
            )
            .join("")}
        </div>

        <script>
          window.onload = function() {
            const itemsData = ${JSON.stringify(expandedList.map((l) => ({ barcode: l.barcode, type: l.barcode_type })))};
            itemsData.forEach((item, idx) => {
              const el = document.getElementById('barcode-' + idx);
              if (el && item.barcode) {
                try {
                  JsBarcode(el, item.barcode.trim(), {
                    format: (item.type || 'CODE128').toUpperCase(),
                    width: 1.4,
                    height: ${preset.barcodeHeight},
                    displayValue: true,
                    fontSize: ${preset.fontSize},
                    margin: 1
                  });
                } catch (e) {
                  console.warn(e);
                }
              }
            });

            setTimeout(() => {
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
