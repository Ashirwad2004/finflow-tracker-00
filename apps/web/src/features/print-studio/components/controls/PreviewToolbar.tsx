import { Eye, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalDocumentType, resolveDocumentDescriptor } from "@/utils/generateInvoicePDF";
import { cn } from "@/core/lib/utils";
import { InvoiceTheme } from "../../types";

interface PreviewToolbarProps {
  selectedDocType: UniversalDocumentType;
  onSelectDocType: (docType: UniversalDocumentType) => void;
  activeSaleData: any;
  selectedTheme: InvoiceTheme;
  onPrintSale: (sale: any) => void;
  onDownloadSale: (sale: any) => void;
  onPreviewSale: () => void;
}

export function PreviewToolbar({
  selectedDocType,
  onSelectDocType,
  activeSaleData,
  selectedTheme,
  onPrintSale,
  onDownloadSale,
  onPreviewSale,
}: PreviewToolbarProps) {
  const descriptor = resolveDocumentDescriptor(selectedDocType, undefined, activeSaleData?.invoice_number);

  return (
    <div className="bg-card border rounded-xl p-3 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 shrink-0">
      <div>
        <h3 className="font-bold text-xs flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          Live Document Preview
        </h3>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          Showing: {activeSaleData.invoice_number} ({descriptor.title})
        </p>
      </div>

      {/* Document Type Switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border text-xs overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => onSelectDocType("invoice")}
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
            selectedDocType === "invoice"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          🧾 Sale Bill
        </button>
        <button
          type="button"
          onClick={() => onSelectDocType("purchase_bill")}
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
            selectedDocType === "purchase_bill"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          📦 Purchase Bill
        </button>
        <button
          type="button"
          onClick={() => onSelectDocType("sale_order")}
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
            selectedDocType === "sale_order"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          📋 Sale Order
        </button>
        <button
          type="button"
          onClick={() => onSelectDocType("purchase_order")}
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
            selectedDocType === "purchase_order"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          🛒 Purchase Order
        </button>
      </div>

      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          onClick={() => onPrintSale(activeSaleData)}
          className="bg-primary hover:bg-primary/95 text-white font-bold rounded-lg text-xs h-8.5 px-3 flex items-center gap-1.5 flex-1 sm:flex-initial"
        >
          <Printer className="w-3.5 h-3.5" />
          {selectedTheme === "thermal" ? "Print Thermal" : "Print to Machine"}
        </Button>

        {selectedTheme !== "thermal" && (
          <Button
            variant="outline"
            onClick={() => onDownloadSale(activeSaleData)}
            className="rounded-lg text-xs h-8.5 border-border flex items-center gap-1.5 flex-1 sm:flex-initial"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </Button>
        )}

        {selectedTheme !== "thermal" && (
          <Button
            variant="outline"
            onClick={onPreviewSale}
            className="rounded-lg text-xs h-8.5 border-border flex items-center gap-1.5 flex-1 sm:flex-initial"
          >
            <Eye className="w-3.5 h-3.5" />
            Print Preview
          </Button>
        )}
      </div>
    </div>
  );
}
