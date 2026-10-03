import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Wand2 } from "lucide-react";
import { SmartSaleInput } from "../SmartSaleInput";
import { CustomerSection } from "./CustomerSection";
import { InvoiceDetailsSection } from "./InvoiceDetailsSection";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSummaryTotals } from "./InvoiceSummaryTotals";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

export interface FullInvoiceFormSectionProps {
    invoiceToEdit?: any;
    products: any[];
    handleSmartParse: (data: any) => void;
    watchCustomerName: string;
    watchCustomerPhone: string;
    watchCustomerEmail: string;
    watchCustomerGstin: string;
    watchPlaceOfSupply: string;
    setValue: any;
    handleCustomerSelect: (name: string) => void;
    parties: any[];
    currentUserId?: string;
    errors: any;
    register: any;
    watch: any;
    watchItems: any;
    totalAmount: number;
    formatCurrency: (amount: number) => string;
    fields: any[];
    salesSettings?: SalesSettings;
    handleProductSelect: (index: number, product: any) => void;
    handleQuickAddProduct: (newProd: any) => Promise<void>;
    descriptionRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    handleItemKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
    remove: (index: number) => void;
    addEmptyItemRow: () => void;
    subtotal: number;
    overallDiscountAmount: number;
    isItemWiseTax: boolean;
    taxRate: number;
    taxAmount: number;
    roundOffDiff: number;
    selectedParty: any;
    partyPreviousBalance: number;
    currentInvoiceDue: number;
    partyClosingDue: number;
}

export const FullInvoiceFormSection: React.FC<FullInvoiceFormSectionProps> = ({
    invoiceToEdit,
    products,
    handleSmartParse,
    watchCustomerName,
    watchCustomerPhone,
    watchCustomerEmail,
    watchCustomerGstin,
    watchPlaceOfSupply,
    setValue,
    handleCustomerSelect,
    parties,
    currentUserId,
    errors,
    register,
    watch,
    watchItems,
    totalAmount,
    formatCurrency,
    fields,
    salesSettings,
    handleProductSelect,
    handleQuickAddProduct,
    descriptionRefs,
    handleItemKeyDown,
    remove,
    addEmptyItemRow,
    subtotal,
    overallDiscountAmount,
    isItemWiseTax,
    taxRate,
    taxAmount,
    roundOffDiff,
    selectedParty,
    partyPreviousBalance,
    currentInvoiceDue,
    partyClosingDue,
}) => {
    return (
        <div className="flex-1 px-8 py-6 space-y-10">
            {/* AI SMART FILL */}
            {!invoiceToEdit && (
                <div className="bg-violet-500/5 border border-violet-500/10 p-4 rounded-lg">
                    <Label className="text-xs font-semibold text-violet-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                        <Wand2 className="w-3 h-3" />
                        AI Smart Fill Invoice
                    </Label>
                    <SmartSaleInput
                        onParse={handleSmartParse}
                        products={products.map((p) => ({
                            name: p.name,
                            price: Number(p.price ?? p.cost_price ?? 0),
                        }))}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
                        Try typing: "Sold 3 cups at 200 each to Rahul, unpaid"
                    </p>
                </div>
            )}

            {/* CUSTOMER + INVOICE DETAILS */}
            <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-16">
                <div className="flex-1 space-y-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-slate-500">
                                Billing Address (Optional)
                            </Label>
                            <Input
                                {...register("billing_address")}
                                placeholder="Street address, city, pin code"
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-slate-500">
                                Shipping Address (Optional)
                            </Label>
                            <Input
                                {...register("shipping_address")}
                                placeholder="Leave blank if same as billing"
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                            <input
                                type="checkbox"
                                {...register("is_reverse_charge")}
                                className="rounded border-slate-300 w-4 h-4 text-primary focus:ring-primary"
                            />
                            <span className="text-xs font-medium">
                                Reverse Charge (RCM)
                            </span>
                        </label>
                    </div>
                </div>

                <InvoiceDetailsSection
                    register={register}
                    watch={watch}
                    errors={errors}
                    totalAmount={totalAmount}
                    formatCurrency={formatCurrency}
                />
            </div>

            {/* ITEMS TABLE */}
            <InvoiceItemsTable
                fields={fields}
                register={register}
                errors={errors}
                watch={watch}
                watchItems={watchItems}
                setValue={setValue}
                products={products}
                salesSettings={salesSettings}
                handleProductSelect={handleProductSelect}
                handleQuickAddProduct={handleQuickAddProduct}
                descriptionRefs={descriptionRefs}
                handleItemKeyDown={handleItemKeyDown}
                remove={remove}
                addEmptyItemRow={addEmptyItemRow}
                formatCurrency={formatCurrency}
            />

            {/* NOTES + TOTALS */}
            <InvoiceSummaryTotals
                register={register}
                subtotal={subtotal}
                overallDiscountAmount={overallDiscountAmount}
                isItemWiseTax={isItemWiseTax}
                salesSettings={salesSettings}
                taxRate={taxRate}
                taxAmount={taxAmount}
                roundOffDiff={roundOffDiff}
                totalAmount={totalAmount}
                watchCustomerName={watchCustomerName}
                selectedParty={selectedParty}
                partyPreviousBalance={partyPreviousBalance}
                currentInvoiceDue={currentInvoiceDue}
                partyClosingDue={partyClosingDue}
                formatCurrency={formatCurrency}
            />
        </div>
    );
};
