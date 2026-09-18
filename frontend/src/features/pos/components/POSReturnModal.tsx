import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RotateCcw,
  Receipt,
  AlertCircle,
  CheckCircle2,
  PackageX,
  Printer,
  ArrowRight,
  ShieldCheck,
  User,
  Calendar,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/core/integrations/supabase/client";
import { useBusiness } from "@/core/contexts/BusinessContext";
import apiClient from "@/core/api/apiClient";
import { POSReceiptModal } from "./POSReceiptModal";

interface POSReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShiftId?: string | null;
  onReturnSuccess?: (result: any) => void;
}

interface SaleItemLine {
  id?: string;
  product_id?: string;
  name: string;
  quantity: number;
  price: number;
  tax_rate?: number;
  tax_amount?: number;
  total?: number;
  unit?: string;
  hsn_code?: string;
  // State for return
  return_quantity: number;
  restock_inventory: boolean;
  is_selected: boolean;
}

interface SaleRecord {
  id: string;
  invoice_number: string;
  date: string;
  customer_name: string;
  customer_phone?: string;
  party_id?: string;
  total_amount: number;
  amount_paid: number;
  payment_method: string;
  items: any[];
}

export const POSReturnModal: React.FC<POSReturnModalProps> = ({
  isOpen,
  onClose,
  activeShiftId,
  onReturnSuccess,
}) => {
  const { currentStoreId } = useBusiness();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [returnLines, setReturnLines] = useState<SaleItemLine[]>([]);
  const [refundMethod, setRefundMethod] = useState<string>("cash");
  const [reasonCategory, setReasonCategory] = useState<string>("Defective / Damaged");
  const [reasonNotes, setReasonNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Search original sales
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter an invoice number, customer name, or phone number");
      return;
    }

    const storeId = currentStoreId || "";
    if (!storeId) {
      toast.error("Store context is missing");
      return;
    }

    setIsSearching(true);
    try {
      let query = supabase
        .from("sales")
        .select("*")
        .eq("user_id", storeId)
        .eq("document_type", "invoice")
        .order("created_at", { ascending: false })
        .limit(10);

      // Check if search query looks like invoice number
      if (searchQuery.toUpperCase().startsWith("INV-") || searchQuery.toUpperCase().startsWith("OFF-")) {
        query = query.ilike("invoice_number", `%${searchQuery.trim()}%`);
      } else {
        query = query.or(
          `invoice_number.ilike.%${searchQuery.trim()}%,customer_name.ilike.%${searchQuery.trim()}%,customer_phone.ilike.%${searchQuery.trim()}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted: SaleRecord[] = (data || []).map((d: any) => ({
        id: d.id,
        invoice_number: d.invoice_number,
        date: d.date || d.created_at,
        customer_name: d.customer_name || "Walk-in Customer",
        customer_phone: d.customer_phone || undefined,
        party_id: d.party_id || undefined,
        total_amount: Number(d.total_amount || 0),
        amount_paid: Number(d.amount_paid ?? d.total_amount ?? 0),
        payment_method: d.payment_method || "cash",
        items: Array.isArray(d.items) ? d.items : [],
      }));

      setSearchResults(formatted);
      if (!data || data.length === 0) {
        toast.info("No matching invoices found");
      }
    } catch (err: any) {
      console.error("Failed to search invoices:", err);
      toast.error("Error searching invoices: " + (err.message || "Unknown error"));
    } finally {
      setIsSearching(false);
    }
  };

  // Select a sale for return
  const handleSelectSale = (sale: SaleRecord) => {
    setSelectedSale(sale);
    const parsedItems: SaleItemLine[] = (sale.items || []).map((item: any, idx: number) => ({
      id: item.id || `item-${idx}`,
      product_id: item.product_id || item.id,
      name: item.name || "Item",
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
      tax_rate: Number(item.tax_rate) || 0,
      tax_amount: Number(item.tax_amount) || 0,
      total: Number(item.total || item.amount) || Number(item.quantity) * Number(item.price),
      unit: item.unit || "pc",
      hsn_code: item.hsn_code,
      return_quantity: 0,
      restock_inventory: true,
      is_selected: false,
    }));
    setReturnLines(parsedItems);
    setRefundMethod(sale.payment_method === "credit" ? "credit" : "cash");
  };

  const handleToggleItem = (index: number) => {
    setReturnLines((prev) => {
      const next = [...prev];
      const target = next[index];
      const newSelected = !target.is_selected;
      target.is_selected = newSelected;
      target.return_quantity = newSelected ? target.quantity : 0;
      return next;
    });
  };

  const handleQtyChange = (index: number, qty: number) => {
    setReturnLines((prev) => {
      const next = [...prev];
      const target = next[index];
      const clamped = Math.min(Math.max(0, qty), target.quantity);
      target.return_quantity = clamped;
      target.is_selected = clamped > 0;
      return next;
    });
  };

  const handleToggleRestock = (index: number) => {
    setReturnLines((prev) => {
      const next = [...prev];
      next[index].restock_inventory = !next[index].restock_inventory;
      return next;
    });
  };

  // Calculate return totals
  const selectedReturnItems = returnLines.filter((l) => l.is_selected && l.return_quantity > 0);
  const totalRefundAmount = selectedReturnItems.reduce((acc, item) => {
    const lineSubtotal = item.return_quantity * item.price;
    const lineTax = (lineSubtotal * (item.tax_rate || 0)) / 100;
    return acc + (lineSubtotal + lineTax);
  }, 0);

  // Submit return to backend
  const handleSubmitReturn = async () => {
    if (!selectedSale) return;
    if (selectedReturnItems.length === 0) {
      toast.error("Please select at least one item and quantity to return");
      return;
    }

    if (refundMethod === "cash" && !activeShiftId) {
      toast.warning("No active register shift is open for cash refund recording. Please open a shift first or choose another refund method.");
    }

    setIsSubmitting(true);
    try {
      const finalReason = reasonNotes.trim()
        ? `${reasonCategory}: ${reasonNotes.trim()}`
        : reasonCategory;

      const payload = {
        sale_id: selectedSale.id,
        shift_id: activeShiftId || null,
        refund_method: refundMethod,
        reason: finalReason,
        return_items: selectedReturnItems.map((item) => ({
          original_sale_item_id: item.id,
          product_id: item.product_id,
          product_name: item.name,
          quantity: item.return_quantity,
          unit_price: item.price,
          tax_rate: item.tax_rate || 0,
          restock_inventory: item.restock_inventory,
        })),
      };

      const res = await apiClient.post(`/api/v1/pos/sales/${selectedSale.id}/return`, payload);
      const resultData = res.data;

      toast.success(
        `Return processed! Credit Note #${resultData.credit_note?.invoice_number || resultData.return?.return_number} issued.`
      );

      setCompletedReturn({
        ...resultData,
        originalSale: selectedSale,
        returnItems: selectedReturnItems,
        totalRefund: totalRefundAmount,
      });

      if (onReturnSuccess) {
        onReturnSuccess(resultData);
      }
    } catch (err: any) {
      console.error("Return processing failed:", err);
      const errorMsg =
        err.response?.data?.detail || err.message || "Failed to process return. Check stock and permissions.";
      toast.error("Return Failed: " + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedSale(null);
    setReturnLines([]);
    setSearchResults([]);
    setSearchQuery("");
    setCompletedReturn(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-card border-border text-foreground flex flex-col max-h-[90vh] shadow-2xl rounded-2xl">
          {/* Header */}
          <DialogHeader className="p-5 border-b border-border/80 bg-muted/30 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    Sales Return & Credit Note
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Look up customer invoice, select items to return, restock inventory, and issue an official GST Credit Note.
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 font-display">
            {completedReturn ? (
              /* Success State Screen */
              <div className="py-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Return Successfully Processed</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Credit Note #{completedReturn.credit_note?.invoice_number || "CN-GENERATED"} has been recorded into the sales ledger.
                  </p>
                </div>

                <div className="bg-muted/40 border border-border/80 rounded-2xl p-5 max-w-md mx-auto text-left space-y-3 shadow-xs">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Return Reference:</span>
                    <span className="font-mono text-primary font-semibold">{completedReturn.return?.return_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Original Invoice:</span>
                    <span className="font-medium text-foreground">{completedReturn.originalSale?.invoice_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Refund Method:</span>
                    <span className="capitalize font-medium text-foreground">{completedReturn.return?.refund_method}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border/80">
                    <span className="text-foreground font-semibold">Total Refund:</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹{completedReturn.totalRefund.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="border-border hover:bg-muted text-foreground font-semibold"
                    onClick={handleReset}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Process Another Return
                  </Button>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                    onClick={() => setShowReceipt(true)}
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print Credit Note Receipt
                  </Button>
                </div>
              </div>
            ) : !selectedSale ? (
              /* Step 1: Search Invoice */
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter Invoice Number (e.g. INV-202609-001) or customer name / mobile..."
                      className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl text-sm focus-visible:ring-primary"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSearching}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 font-semibold rounded-xl shadow-xs"
                  >
                    {isSearching ? "Searching..." : "Find Invoice"}
                  </Button>
                </form>

                {/* Search Results List */}
                <div className="space-y-2 mt-4">
                  {searchResults.length > 0 && (
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                      Matching Invoices ({searchResults.length})
                    </p>
                  )}
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {searchResults.map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className="p-4 rounded-xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {sale.invoice_number}
                            </span>
                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground uppercase font-semibold">
                              {sale.payment_method}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5 text-foreground font-medium">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              {sale.customer_name || "Walk-in Customer"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              {new Date(sale.date).toLocaleDateString()}
                            </span>
                            <span>{sale.items?.length || 0} line items</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-base font-black text-foreground font-mono">₹{Number(sale.total_amount).toFixed(2)}</div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Paid</span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Select Items for Return */
              <div className="space-y-6">
                {/* Original Invoice Summary Bar */}
                <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Invoice:</span>
                      <span className="font-mono text-sm font-bold text-foreground">{selectedSale.invoice_number}</span>
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
                      <span className="text-base font-black text-foreground font-mono">₹{Number(selectedSale.total_amount).toFixed(2)}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-border hover:bg-background font-semibold"
                      onClick={() => setSelectedSale(null)}
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
                              onCheckedChange={() => handleToggleItem(idx)}
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
                              onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
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
                              onCheckedChange={() => handleToggleRestock(idx)}
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
                      {selectedReturnItems.length} item{selectedReturnItems.length !== 1 ? 's' : ''} selected for return
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-primary tracking-tight font-mono">
                      ₹{totalRefundAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 border-t border-border/80 bg-muted/30 flex-shrink-0 flex items-center justify-between">
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted font-semibold"
              onClick={handleClose}
            >
              {completedReturn ? "Close" : "Cancel"}
            </Button>

            {selectedSale && !completedReturn && (
              <Button
                disabled={isSubmitting || selectedReturnItems.length === 0}
                onClick={handleSubmitReturn}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-xs rounded-xl"
              >
                {isSubmitting ? (
                  "Processing Return..."
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" /> Issue Credit Note (₹{totalRefundAmount.toFixed(2)})
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Note Receipt Modal */}
      {completedReturn && (
        <POSReceiptModal
          open={showReceipt}
          onOpenChange={setShowReceipt}
          onNewSale={handleReset}
          saleData={{
            ...completedReturn.credit_note,
            invoice_number: completedReturn.credit_note?.invoice_number || completedReturn.return?.return_number,
            items: completedReturn.returnItems || [],
            total_amount: completedReturn.totalRefund,
            amount_paid: completedReturn.totalRefund,
            payment_method: completedReturn.return?.refund_method || "cash",
            customer_name: completedReturn.originalSale?.customer_name,
            customer_phone: completedReturn.originalSale?.customer_phone,
            date: new Date().toISOString(),
          }}
        />
      )}
    </>
  );
};
