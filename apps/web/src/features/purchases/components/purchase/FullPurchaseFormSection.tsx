import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Wand2, CheckCircle2, FileText } from "lucide-react";
import { SmartPurchaseInput } from "../SmartPurchaseInput";
import { SupplierSection } from "./SupplierSection";
import { PurchaseDetailsSection } from "./PurchaseDetailsSection";
import { PurchaseBillScanner } from "./PurchaseBillScanner";
import { PurchaseItemsTable } from "./PurchaseItemsTable";
import { PurchaseAdditionalDetails } from "./PurchaseAdditionalDetails";
import { PurchaseSummarySection } from "./PurchaseSummarySection";

export interface FullPurchaseFormSectionProps {
    purchaseToEdit?: any;
    isScannerOpen: boolean;
    setIsScannerOpen: (val: boolean) => void;
    handleScannerExtract: (data: any, autoSave?: boolean) => void;
    isAiFillOpen: boolean;
    handleSmartParse: (data: any) => void;
    watchVendorName: string;
    watchVendorGstin: string;
    watchVendorPhone: string;
    watchPlaceOfSupply: string;
    setValue: any;
    parties: any[];
    userId?: string;
    errors: any;
    watchBillNumber: string;
    watchDate: string;
    watchDueDate: string;
    watchPaymentStatus: "paid" | "partial" | "pending";
    handleBillDateChange: (dateVal: string) => void;
    handlePaymentStatusChange: (status: "paid" | "partial" | "pending") => void;
    scannedNotification: any;
    setScannedNotification: (val: any) => void;
    watchItems: any[];
    products: any[];
    watchDefaultTaxRate: number;
    handleItemChange: (index: number, field: any, value: any) => void;
    handleProductSelect: (index: number, product: any) => void;
    handleAddItem: () => void;
    handleRemoveItem: (index: number) => void;
    handleQuickAddProduct: (newProd: any) => Promise<void>;
    watchNotes: string;
    watchAttachmentUrl: string;
    subtotal: number;
    itemDiscounts: number;
    watchBillDiscount: number;
    totalTaxAmount: number;
    finalTotalAmount: number;
    watchAmountPaid: number;
    balanceDue: number;
    vendorPreviousBalance: number;
    vendorClosingPayable: number;
}

export const FullPurchaseFormSection: React.FC<FullPurchaseFormSectionProps> = ({
    purchaseToEdit,
    isScannerOpen,
    setIsScannerOpen,
    handleScannerExtract,
    isAiFillOpen,
    handleSmartParse,
    watchVendorName,
    watchVendorGstin,
    watchVendorPhone,
    watchPlaceOfSupply,
    setValue,
    parties,
    userId,
    errors,
    watchBillNumber,
    watchDate,
    watchDueDate,
    watchPaymentStatus,
    handleBillDateChange,
    handlePaymentStatusChange,
    scannedNotification,
    setScannedNotification,
    watchItems,
    products,
    watchDefaultTaxRate,
    handleItemChange,
    handleProductSelect,
    handleAddItem,
    handleRemoveItem,
    handleQuickAddProduct,
    watchNotes,
    watchAttachmentUrl,
    subtotal,
    itemDiscounts,
    watchBillDiscount,
    totalTaxAmount,
    finalTotalAmount,
    watchAmountPaid,
    balanceDue,
    vendorPreviousBalance,
    vendorClosingPayable,
}) => {
    return (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            {/* 1-Click AI Purchase Bill Scanner */}
            {!purchaseToEdit && isScannerOpen && (
                <PurchaseBillScanner
                    onExtract={handleScannerExtract}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}

            {/* AI Smart Fill Bill Input (Collapsible) */}
            {!purchaseToEdit && isAiFillOpen && (
                <div className="bg-violet-500/10 border border-violet-500/30 p-4 rounded-xl space-y-2 animate-in fade-in-0 duration-150">
                    <Label className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <Wand2 className="w-3.5 h-3.5 text-violet-500 animate-pulse" />{" "}
                        AI Natural Language Bill Extractor
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                        Paste raw purchase messages or type naturally, e.g. "Purchased 20 bags of cement from Apex Traders at 380 each, bill ref AT-504".
                    </p>
                    <SmartPurchaseInput onParse={handleSmartParse} />
                </div>
            )}

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

            {/* Purchase Details Section */}
            <PurchaseDetailsSection
                billNumber={watchBillNumber}
                date={watchDate}
                dueDate={watchDueDate}
                paymentStatus={watchPaymentStatus}
                onBillNumberChange={(val) =>
                    setValue("bill_number", val, {
                        shouldValidate: true,
                        shouldDirty: true,
                    })
                }
                onDateChange={handleBillDateChange}
                onDueDateChange={(val) =>
                    setValue("due_date", val, {
                        shouldValidate: true,
                        shouldDirty: true,
                    })
                }
                onPaymentStatusChange={handlePaymentStatusChange}
            />

            {/* Scanned Items Notification Banner */}
            {scannedNotification && (
                <div className="flex items-center justify-between gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 animate-in fade-in-0 duration-200">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
                            {scannedNotification.isPdf ? <FileText className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div>
                            <p className="font-bold text-foreground flex items-center gap-1.5">
                                <span>{scannedNotification.itemCount} Items Loaded into Columns</span>
                                <span className="text-muted-foreground font-normal">
                                    from {scannedNotification.fileName ? `"${scannedNotification.fileName}"` : scannedNotification.vendor}
                                </span>
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Product names, units, quantities, rates and GST are populated in the columns below. You can edit any field before saving.
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setScannedNotification(null)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Items Section */}
            <PurchaseItemsTable
                items={watchItems}
                products={products}
                defaultTaxRate={watchDefaultTaxRate}
                onItemChange={handleItemChange}
                onProductSelect={handleProductSelect}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                onQuickAddProduct={handleQuickAddProduct}
            />

            {/* Additional Details & Supplier Notes */}
            <PurchaseAdditionalDetails
                notes={watchNotes}
                attachmentUrl={watchAttachmentUrl}
                onNotesChange={(val) =>
                    setValue("notes", val, {
                        shouldValidate: true,
                        shouldDirty: true,
                    })
                }
                onAttachmentUrlChange={(val) =>
                    setValue("attachment_url", val, {
                        shouldValidate: true,
                        shouldDirty: true,
                    })
                }
            />

            {/* Summary & Ledger Settlement Section */}
            <PurchaseSummarySection
                subtotal={subtotal}
                itemDiscounts={itemDiscounts}
                overallDiscount={watchBillDiscount}
                taxAmount={totalTaxAmount}
                grandTotal={finalTotalAmount}
                amountPaid={watchAmountPaid}
                balanceDue={balanceDue}
                paymentStatus={watchPaymentStatus}
                vendorName={watchVendorName || "Supplier"}
                placeOfSupply={watchPlaceOfSupply}
                vendorPreviousBalance={vendorPreviousBalance}
                totalNetPayable={vendorClosingPayable}
                onOverallDiscountChange={(val) =>
                    setValue("discount_amount", val, {
                        shouldValidate: true,
                        shouldDirty: true,
                    })
                }
                onAmountPaidChange={(val) => {
                    setValue("amount_paid", val, {
                        shouldValidate: true,
                        shouldDirty: true,
                    });
                }}
                onPaymentStatusChange={handlePaymentStatusChange}
            />
        </div>
    );
};
