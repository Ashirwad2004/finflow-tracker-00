import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Wallet } from "lucide-react";
import { CustomerSection } from "./CustomerSection";
import { ProductCombobox, ProductItem } from "@/features/purchases/components/purchase/ProductCombobox";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface QuickInvoiceFormSectionProps {
  watchCustomerName: string;
  watchCustomerPhone: string;
  watchCustomerEmail: string;
  watchCustomerGstin: string;
  watchPlaceOfSupply?: string;
  watchQuickItemName?: string;
  watchQuickTotalAmount?: number;
  watch: any;
  register: any;
  setValue: any;
  errors: any;
  parties: any[];
  products: ProductItem[];
  currentUserId?: string;
  salesSettings?: SalesSettings;
  selectedParty: any;
  partyPreviousBalance: number;
  currentInvoiceDue: number;
  partyClosingDue: number;
  handleCustomerSelect: (customerName: string) => void;
  handleQuickAddProduct: (newProd: ProductItem) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export const QuickInvoiceFormSection: React.FC<QuickInvoiceFormSectionProps> = ({
  watchCustomerName,
  watchCustomerPhone,
  watchCustomerEmail,
  watchCustomerGstin,
  watchPlaceOfSupply,
  watchQuickItemName,
  watchQuickTotalAmount,
  watch,
  register,
  setValue,
  errors,
  parties,
  products,
  currentUserId,
  salesSettings,
  selectedParty,
  partyPreviousBalance,
  currentInvoiceDue,
  partyClosingDue,
  handleCustomerSelect,
  handleQuickAddProduct,
  formatCurrency,
}) => {
  return (
    <div className="flex-1 px-8 py-6 max-w-xl mx-auto w-full space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-5 shadow-sm">
        {/* Customer Section */}
        <CustomerSection
          customerName={watchCustomerName}
          customerPhone={watchCustomerPhone}
          customerEmail={watchCustomerEmail}
          customerGstin={watchCustomerGstin}
          placeOfSupply={watchPlaceOfSupply}
          onCustomerNameChange={(val) => {
            setValue("customer_name", val, {
              shouldValidate: true,
              shouldDirty: true,
            });
            handleCustomerSelect(val);
          }}
          onCustomerPhoneChange={(val) =>
            setValue("customer_phone", val, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onCustomerEmailChange={(val) =>
            setValue("customer_email", val, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onCustomerGstinChange={(val) =>
            setValue("customer_gstin", val, {
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
          userId={currentUserId}
          error={errors.customer_name?.message}
          onPartySelected={(party) => {
            if (party.phone) setValue("customer_phone", party.phone, { shouldDirty: true });
            if (party.email) setValue("customer_email", party.email, { shouldDirty: true });
            const gst = party.gst_number || party.gstin;
            if (gst) {
              setValue("customer_gstin", gst, { shouldDirty: true });
              if (!watchPlaceOfSupply && gst.length >= 2) {
                setValue("place_of_supply", gst.slice(0, 2), { shouldDirty: true });
              }
            }
            if (party.address) {
              setValue("billing_address", party.address, { shouldDirty: true });
              setValue("shipping_address", party.address, { shouldDirty: true });
            }
          }}
        />

        {/* Product */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Product / Service Description
          </Label>

          <ProductCombobox
            value={watchQuickItemName || ""}
            products={products}
            onChange={(val) => {
              setValue("quick_item_name", val, {
                shouldDirty: true,
              });
            }}
            onSelectProduct={(p) => {
              setValue("quick_item_name", p.name, {
                shouldDirty: true,
              });
              if (p.price) {
                setValue(
                  "quick_total_amount",
                  Number(p.price),
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  }
                );
              }
              if (p.tax_rate !== undefined) {
                setValue(
                  "tax_rate",
                  Number(p.tax_rate),
                  {
                    shouldDirty: true,
                  }
                );
              }
            }}
            onQuickAddProduct={handleQuickAddProduct}
            placeholder="Search or select product/service..."
            mode="sale"
            className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950"
          />
        </div>

        {/* Amount / Tax */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Total Amount (₹){" "}
              <span className="text-destructive">*</span>
            </Label>

            <Input
              type="number"
              min={0.01}
              step="any"
              className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950 font-semibold"
              {...register(
                "quick_total_amount",
                {
                  required: "Amount is required",
                  valueAsNumber: true,
                  validate: (v: any) =>
                    Number(v) > 0 || "Amount must be greater than 0",
                }
              )}
              placeholder="0.00"
            />

            {errors.quick_total_amount && (
              <span className="text-destructive text-xs block">
                {errors.quick_total_amount.message}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              GST Tax Rate (%)
            </Label>

            <select
              {...register("tax_rate")}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white dark:bg-slate-950 px-3 py-1 text-sm shadow-sm font-semibold"
            >
              <option value="0">0% (Exempt)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
              <option value="28">28% GST</option>
            </select>
          </div>
        </div>

        {/* Invoice Number / Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Invoice Number</Label>

            <Input
              className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950"
              {...register("invoice_number", {
                required: "Required",
              })}
            />

            {errors.invoice_number && (
              <span className="text-destructive text-xs block">
                {errors.invoice_number.message}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date</Label>

            <Input
              type="date"
              className="h-10 rounded-md border-slate-300 bg-white dark:bg-slate-950"
              {...register("date")}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-slate-950 border-slate-200 mt-2">
          <div>
            <Label className="text-sm font-semibold">Payment Status</Label>
            <p className="text-[11px] text-slate-400">
              Mark this invoice as immediately paid, partial, or pending.
            </p>
          </div>

          <select
            {...register("status")}
            className="h-9 rounded-md border border-slate-300 bg-white dark:bg-slate-950 px-3 text-sm font-semibold"
          >
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Amount Paid (shown only for Partial status) */}
        {watch("status") === "partial" && (
          <div className="space-y-3 p-4 rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Amount Paid Now (₹){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                className="h-10 rounded-md border-blue-300 bg-white dark:bg-slate-950 font-semibold"
                {...register("amount_paid", {
                  valueAsNumber: true,
                  min: { value: 0, message: "Cannot be negative" },
                })}
                placeholder="0.00"
              />
              {errors.amount_paid && (
                <span className="text-destructive text-xs block">
                  {errors.amount_paid.message}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-sm pt-1 border-t border-blue-200">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Balance Due</span>
              <span className="font-bold text-rose-600">
                {formatCurrency(
                  Math.max(
                    0,
                    (Number(watchQuickTotalAmount) || 0) -
                    (Number(watch("amount_paid")) || 0)
                  )
                )}
              </span>
            </div>
          </div>
        )}

        {/* FinFlow CA-Grade Party Previous Due & Net Balance Box */}
        {((salesSettings?.showPartyPendingBalance ?? salesSettings?.showPartyPreviousBalance) ?? true) && watchCustomerName.trim() && !["cash customer", "cash sale", "walk-in", "cash"].includes(watchCustomerName.trim().toLowerCase()) && (
          <div className="p-3.5 rounded-lg border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-slate-50 dark:from-indigo-950/20 dark:to-slate-900 dark:border-indigo-800/60 shadow-xs space-y-2 mt-3">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/50 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                Party Balance (Ledger Status)
              </span>
              <span className="text-[10px] font-medium text-slate-500 lowercase truncate max-w-[140px]">
                {selectedParty?.name || watchCustomerName}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-400">Previous Pending:</span>
              <span className={`font-semibold ${partyPreviousBalance > 0 ? "text-rose-600 dark:text-rose-400" : partyPreviousBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700"}`}>
                {partyPreviousBalance > 0 
                  ? `${formatCurrency(partyPreviousBalance)} Dr (Pending)` 
                  : partyPreviousBalance < 0 
                    ? `${formatCurrency(Math.abs(partyPreviousBalance))} Cr (Advance)` 
                    : formatCurrency(0)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-400">Current Bill Due:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(currentInvoiceDue)}
              </span>
            </div>

            <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight block">
                  Pending Balance:
                </span>
                <span className="text-[10px] text-slate-400">
                  (Previous + Current Bill)
                </span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                  partyClosingDue > 0 
                    ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800" 
                    : partyClosingDue < 0 
                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}>
                  {partyClosingDue > 0 
                    ? `${formatCurrency(partyClosingDue)} Dr` 
                    : partyClosingDue < 0 
                      ? `${formatCurrency(Math.abs(partyClosingDue))} Cr` 
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
