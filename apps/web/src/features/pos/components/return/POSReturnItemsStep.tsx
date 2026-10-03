import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SaleItemLine, SaleRecord } from "./types";

interface POSReturnItemsStepProps {
  selectedSale: SaleRecord;
  returnLines: SaleItemLine[];
  selectedReturnItems: SaleItemLine[];
  totalRefundAmount: number;
  refundMethod: string;
  setRefundMethod: (method: string) => void;
  reasonCategory: string;
  setReasonCategory: (cat: string) => void;
  reasonNotes: string;
  setReasonNotes: (notes: string) => void;
  onToggleItem: (idx: number) => void;
  onQtyChange: (idx: number, qty: number) => void;
  onToggleRestock: (idx: number) => void;
  onChangeInvoice: () => void;
}

export const POSReturnItemsStep = ({
  selectedSale,
  returnLines,
  selectedReturnItems,
  totalRefundAmount,
  refundMethod,
  setRefundMethod,
  reasonCategory,
  setReasonCategory,
  reasonNotes,
  setReasonNotes,
  onToggleItem,
  onQtyChange,
  onToggleRestock,
  onChangeInvoice,
}: POSReturnItemsStepProps) => {
  return (
    <div className="space-y-6">
      {/* Original Invoice Summary Bar */}
      <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Invoice:</span>
            <span className="font-mono text-sm font-bold text-foreground">
              {selectedSale.invoice_number}
            </span>
            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
              {new Date(selectedSale.date).toLocaleDateString()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Customer: <strong className="text-foreground">{selectedSale.customer_name}</strong>
            {selectedSale.customer_phone && ` (${selectedSale.customer_phone})`}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Original Total</span>
            <span className="text-base font-black text-foreground font-mono">
              ₹{Number(selectedSale.total_amount).toFixed(2)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-border hover:bg-background font-semibold"
            onClick={onChangeInvoice}
          >
            Change Invoice
          </Button>
        </div>
      </div>

      {/* Line Items Selection Table */}
      <div className="border border-border/80 rounded-2xl overflow-hidden bg-background shadow-xs">
        <div className="p-3 bg-muted/40 border-b border-border/80 text-xs font-bold text-muted-foreground uppercase tracking-wider grid grid-cols-12 gap-2 items-center">
          <div className="col-span-1 text-center">Select</div>
          <div className="col-span-4">Item Name & SKU</div>
          <div className="col-span-2 text-center">Sold Qty</div>
          <div className="col-span-2 text-center">Return Qty</div>
          <div className="col-span-2 text-right">Line Refund</div>
          <div className="col-span-1 text-center" title="Restock item back to store inventory">
            Restock
          </div>
        </div>

        <div className="divide-y divide-border/60 max-h-64 overflow-y-auto">
          {returnLines.map((item, idx) => {
            const lineSubtotal = item.return_quantity * item.price;
            const lineTax = (lineSubtotal * (item.tax_rate || 0)) / 100;
            const lineRefund = lineSubtotal + lineTax;

            return (
              <div
                key={item.id || idx}
                className={`p-3 grid grid-cols-12 gap-2 items-center text-sm transition-colors ${
                  item.is_selected ? "bg-primary/5" : "hover:bg-muted/30"
                }`}
              >
                <div className="col-span-1 flex justify-center">
                  <Checkbox
                    checked={item.is_selected}
                    onCheckedChange={() => onToggleItem(idx)}
                    className="border-border data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="col-span-4 space-y-0.5">
                  <span className="font-semibold text-foreground block truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ₹{item.price.toFixed(2)} + {item.tax_rate || 0}% GST
                    {item.hsn_code ? ` | HSN: ${item.hsn_code}` : ""}
                  </span>
                </div>

                <div className="col-span-2 text-center font-mono text-muted-foreground font-semibold">
                  {item.quantity} {item.unit || "pc"}
                </div>

                <div className="col-span-2 flex justify-center">
                  <Input
                    type="number"
                    min="0"
                    max={item.quantity}
                    step="any"
                    value={item.return_quantity}
                    onChange={(e) => onQtyChange(idx, parseFloat(e.target.value) || 0)}
                    className="w-20 text-center h-8 bg-background border-border text-foreground font-mono font-bold rounded-lg"
                  />
                </div>

                <div className="col-span-2 text-right font-mono font-bold text-foreground">
                  ₹{lineRefund.toFixed(2)}
                </div>

                <div className="col-span-1 flex justify-center">
                  <Checkbox
                    checked={item.restock_inventory}
                    disabled={!item.is_selected}
                    onCheckedChange={() => onToggleRestock(idx)}
                    title="Check to add quantity back to store inventory"
                    className="border-border data-[state=checked]:bg-emerald-600"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Refund Options & Reason */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3 bg-card border border-border/80 p-4 rounded-2xl shadow-xs">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Refund Payment Method
          </Label>
          <Select value={refundMethod} onValueChange={setRefundMethod}>
            <SelectTrigger className="bg-background border-border text-foreground rounded-xl">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              <SelectItem value="cash">Cash (from Register Float)</SelectItem>
              <SelectItem value="upi">UPI / Instant Online Refund</SelectItem>
              <SelectItem value="card">Card Refund Reversal</SelectItem>
              <SelectItem value="bank_transfer">Direct Bank Transfer</SelectItem>
              <SelectItem value="credit">Store Credit (Customer Ledger)</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>An immutable GST Credit Note will be generated with full audit trail.</span>
          </div>
        </div>

        <div className="space-y-3 bg-card border border-border/80 p-4 rounded-2xl shadow-xs">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Return Reason
          </Label>
          <Select value={reasonCategory} onValueChange={setReasonCategory}>
            <SelectTrigger className="bg-background border-border text-foreground rounded-xl">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              <SelectItem value="Defective / Damaged">Defective / Damaged Product</SelectItem>
              <SelectItem value="Wrong Item Sold">Wrong Item Sold</SelectItem>
              <SelectItem value="Customer Changed Mind">Customer Changed Mind</SelectItem>
              <SelectItem value="Expired Product">Expired Product</SelectItem>
              <SelectItem value="Other">Other / Special Exception</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Additional notes or reason details (optional)..."
            value={reasonNotes}
            onChange={(e) => setReasonNotes(e.target.value)}
            className="bg-background border-border text-foreground text-xs h-9 rounded-xl"
          />
        </div>
      </div>

      {/* Total Refund Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs text-primary font-bold uppercase tracking-wider block">
            Total Refund to Customer
          </span>
          <span className="text-xs text-muted-foreground">
            {selectedReturnItems.length} item{selectedReturnItems.length !== 1 ? "s" : ""} selected for return
          </span>
        </div>
        <div className="text-right">
          <span className="text-2xl sm:text-3xl font-black text-primary tracking-tight font-mono">
            ₹{totalRefundAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
