import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ThermalReceipt } from "@/features/business/components/ThermalReceipt";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { Printer, Download, Share2, PlusCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface POSReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleData: any;
  profileData?: any;
  onNewSale: () => void;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  open,
  onOpenChange,
  saleData,
  profileData,
  onNewSale,
}) => {
  const [thermalWidth, setThermalWidth] = useState<"58mm" | "80mm">("80mm");
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!saleData) return null;

  const receiptPayload = {
    invoice_number: saleData.invoice_number || "POS-BILL",
    date: saleData.date || new Date().toISOString(),
    customer_name: saleData.customer_name || "Walk-in Customer",
    items: (saleData.items || []).map((it: any) => ({
      description: it.name || it.description || "Item",
      quantity: it.quantity || 1,
      price: it.price || 0,
      total: it.total || (it.quantity * it.price) || 0,
    })),
    subtotal: Number(saleData.subtotal || 0),
    tax_rate: Number(saleData.tax_rate || 0),
    tax_amount: Number(saleData.tax_amount || 0),
    total_amount: Number(saleData.total_amount || 0),
    amount_paid: Number(saleData.amount_paid || saleData.total_amount || 0),
    balance_due: Number(saleData.balance_due || 0),
    status: saleData.status || "paid",
    business_details: {
      name: profileData?.business_name || profileData?.display_name || "FinFlow Store",
      address: profileData?.business_address || profileData?.address || "",
      phone: profileData?.business_phone || profileData?.phone || "",
      gst: profileData?.gst_number || "",
      upi_id: profileData?.upi_id || localStorage.getItem("rupeebill_upi_id") || "",
    },
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      await generateInvoicePDF({
        invoice: {
          ...saleData,
          items: saleData.items || [],
        },
        profile: profileData,
      });
      toast.success("Invoice PDF downloaded");
    } catch (err) {
      console.warn("PDF generation fallback:", err);
      window.print();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt for ${saleData.invoice_number}`,
          text: `Bill of ${saleData.total_amount} at ${profileData?.business_name || "Store"}. Invoice: ${saleData.invoice_number}`,
        });
      } catch (err) {
        // Ignored or cancelled
      }
    } else {
      navigator.clipboard.writeText(
        `Bill ${saleData.invoice_number} | Amount: ₹${saleData.total_amount} | Date: ${saleData.date}`
      );
      toast.success("Receipt summary copied to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-card border-border text-foreground max-h-[92vh] flex flex-col rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/30 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Sale Completed Successfully</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Invoice: <span className="font-semibold text-foreground font-mono">{saleData.invoice_number}</span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-semibold border border-border/60">
            <button
              type="button"
              onClick={() => setThermalWidth("58mm")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                thermalWidth === "58mm" ? "bg-background shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              58mm
            </button>
            <button
              type="button"
              onClick={() => setThermalWidth("80mm")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                thermalWidth === "80mm" ? "bg-background shadow-xs text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              80mm
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/40 flex justify-center print:p-0 print:bg-white">
          <div
            ref={receiptRef}
            className={`transition-all duration-200 shadow-md rounded-md overflow-hidden ${
              thermalWidth === "58mm" ? "max-w-[260px]" : "max-w-[340px]"
            }`}
          >
            <ThermalReceipt data={receiptPayload} />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-3.5 border-t border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="h-9 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs"
            >
              <Printer className="w-4 h-4" /> Print Thermal
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="h-9 text-xs gap-1.5 border-border rounded-xl font-medium"
            >
              <Download className="w-4 h-4" /> A4 PDF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-9 text-xs gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
              title="Share receipt"
            >
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onNewSale();
            }}
            className="h-9 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
          >
            <PlusCircle className="w-4 h-4" /> New Sale (F9)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
