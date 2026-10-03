import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Clock, AlertCircle, Wallet } from "lucide-react";
import { SupplierSection } from "./SupplierSection";
import { ProductCombobox, ProductItem } from "./ProductCombobox";

interface QuickPurchaseFormSectionProps {
  watchVendorName: string;
  watchVendorGstin: string;
  watchVendorPhone: string;
  watchPlaceOfSupply: string;
  watchQuickItemName: string;
  watchPaymentStatus: "paid" | "partial" | "pending";
  selectedParty: any;
  parties: any[];
  products: any[];
  userId: string | undefined;
  errors: any;
  currency: { symbol: string };
  balanceDue: number;
  vendorPreviousBalance: number;
  vendorClosingPayable: number;
  register: any;
  setValue: any;
  formatCurrency: (amount: number) => string;
  handleQuickAddProduct: (prod: ProductItem) => Promise<void>;
  handleBillDateChange: (dateVal: string) => void;
  handlePaymentStatusChange: (status: "paid" | "partial" | "pending") => void;
}

export const QuickPurchaseFormSection: React.FC<QuickPurchaseFormSectionProps> = ({
  watchVendorName,
  watchVendorGstin,
  watchVendorPhone,
  watchPlaceOfSupply,
  watchQuickItemName,
  watchPaymentStatus,
  selectedParty,
  parties,
  products,
  userId,
  errors,
  currency,
  balanceDue,
  vendorPreviousBalance,
  vendorClosingPayable,
  register,
  setValue,
  formatCurrency,
  handleQuickAddProduct,
  handleBillDateChange,
  handlePaymentStatusChange,
}) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 max-w-2xl mx-auto w-full space-y-5">
      <div className="bg-card border border-border/80 p-5 sm:p-6 rounded-2xl space-y-4 sm:space-y-5 shadow-xs">
        {/* Supplier Section */}
        <SupplierSection
          vendorName={watchVendorName}
          vendorGstin={watchVendorGstin}
          vendorPhone={watchVendorPhone}
          placeOfSupply={watchPlaceOfSupply}
          onVendorNameChange={(val) =>
            setValue("vendor_name", val, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onVendorGstinChange={(val) =>
            setValue("vendor_gstin", val, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onVendorPhoneChange={(val) =>
            setValue("vendor_phone", val, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onPlaceOfSupplyChange={(val) =>
            setValue("place_of_supply", val, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          parties={parties}
          userId={userId}
          error={errors.vendor_name?.message}
        />

        {/* Product / Material Combobox */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            Product / Raw Material Description
          </Label>
          <ProductCombobox
            value={watchQuickItemName || ""}
            products={products}
            onChange={(val) => {
              setValue("quick_item_name", val, { shouldDirty: true });
            }}
            onSelectProduct={(p) => {
              setValue("quick_item_name", p.name, { shouldDirty: true });
              const cost = Number(p.cost_price ?? p.price ?? 0);
              if (cost > 0) {
                setValue("quick_total_amount", cost, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
              if (p.tax_rate !== undefined) {
                setValue("tax_rate", Number(p.tax_rate), { shouldDirty: true });
              }
            }}
            onQuickAddProduct={handleQuickAddProduct}
            placeholder="Search or enter purchased product..."
            className="h-10 rounded-md bg-background"
          />
        </div>

        {/* Amount / Tax */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Total Bill Amount ({currency.symbol}) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={0.01}
              step="any"
              className="h-10 rounded-md bg-background font-bold text-base"
              {...register("quick_total_amount", {
                required: "Amount is required",
                valueAsNumber: true,
                validate: (v: any) => Number(v) > 0 || "Amount must be greater than 0",
              })}
              placeholder="0.00"
            />
            {errors.quick_total_amount && (
              <span className="text-destructive text-xs block">
                {errors.quick_total_amount.message}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              GST Tax Rate (%)
            </Label>
            <select
              {...register("tax_rate", { valueAsNumber: true })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs font-semibold"
            >
              <option value="0">0% (Exempt)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
              <option value="28">28% GST</option>
            </select>
          </div>
        </div>

        {/* Bill Number / Date / Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Bill / Ref #</Label>
            <Input
              className="h-9 text-xs font-mono uppercase bg-background"
              {...register("bill_number", { required: "Required" })}
              placeholder="e.g. BILL-001"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Bill Date</Label>
            <Input
              type="date"
              className="h-9 text-xs bg-background"
              {...register("date", { required: "Required" })}
              onChange={(e) => handleBillDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Payment Due Date</Label>
            <Input
              type="date"
              className="h-9 text-xs bg-background"
              {...register("due_date")}
            />
          </div>
        </div>

        {/* Payment Status Toggle */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <Label className="text-xs font-semibold text-foreground block">
            Payment Settlement Status
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handlePaymentStatusChange("paid")}
              className={`h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                watchPaymentStatus === "paid"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-background text-muted-foreground border-border hover:bg-muted/50"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Paid
            </button>
            <button
              type="button"
              onClick={() => handlePaymentStatusChange("partial")}
              className={`h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                watchPaymentStatus === "partial"
                  ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                  : "bg-background text-muted-foreground border-border hover:bg-muted/50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Partial
            </button>
            <button
              type="button"
              onClick={() => handlePaymentStatusChange("pending")}
              className={`h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                watchPaymentStatus === "pending"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-background text-muted-foreground border-border hover:bg-muted/50"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" /> Unpaid
            </button>
          </div>
        </div>

        {/* Amount Paid (if Partial) */}
        {watchPaymentStatus === "partial" && (
          <div className="space-y-2.5 p-3.5 rounded-lg border border-sky-200 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-800">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-sky-800 dark:text-sky-300">
                Amount Paid Now ({currency.symbol}) *
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                className="h-9 rounded-md bg-background font-bold text-sm"
                {...register("amount_paid", {
                  valueAsNumber: true,
                  min: { value: 0, message: "Cannot be negative" },
                })}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-sky-200 dark:border-sky-800">
              <span className="font-semibold text-sky-700 dark:text-sky-400">Balance Due:</span>
              <span className="font-bold text-rose-600 font-mono">
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>
        )}

        {/* FinFlow CA-Grade Vendor Previous Due & Net Balance Box */}
        {watchVendorName.trim() && (
          <div className="p-3.5 rounded-lg border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-background dark:from-indigo-950/20 dark:to-background dark:border-indigo-800/60 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/50 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                Vendor Ledger Balance
              </span>
              <span className="text-[10px] font-medium text-muted-foreground lowercase truncate max-w-[140px]">
                {selectedParty?.name || watchVendorName}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Previous Payable:</span>
              <span className={`font-semibold ${vendorPreviousBalance > 0 ? "text-rose-600 dark:text-rose-400" : vendorPreviousBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {vendorPreviousBalance > 0 
                  ? `${formatCurrency(vendorPreviousBalance)} Cr (Payable)` 
                  : vendorPreviousBalance < 0 
                    ? `${formatCurrency(Math.abs(vendorPreviousBalance))} Dr (Advance)` 
                    : formatCurrency(0)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Current Bill Due:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(balanceDue)}
              </span>
            </div>

            <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-foreground uppercase tracking-tight block">
                  Total Net Payable:
                </span>
                <span className="text-[10px] text-muted-foreground">
                  (Previous + Current Bill)
                </span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                  vendorClosingPayable > 0 
                    ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800" 
                    : vendorClosingPayable < 0 
                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                      : "bg-muted text-muted-foreground border border-border"
                }`}>
                  {vendorClosingPayable > 0 
                    ? `${formatCurrency(vendorClosingPayable)} Cr` 
                    : vendorClosingPayable < 0 
                      ? `${formatCurrency(Math.abs(vendorClosingPayable))} Dr` 
                      : "₹0.00 (Settled)"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
