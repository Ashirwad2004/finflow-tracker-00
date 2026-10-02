import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, AlertCircle } from "lucide-react";
import {
    CreateSaleOrderDialogProps,
    useCreateSaleOrder,
    SaleOrderCustomerSection,
    SaleOrderTimelineSection,
    SaleOrderItemsTable,
    SaleOrderTotalsSection,
} from "./sale-order";

export * from "./sale-order/types";

export const CreateSaleOrderDialog: React.FC<CreateSaleOrderDialogProps> = (props) => {
    const { open, onOpenChange, saleOrderToEdit } = props;
    const {
        parties,
        products,
        orderNumber,
        setOrderNumber,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        customerGstin,
        setCustomerGstin,
        orderDate,
        setOrderDate,
        expectedDeliveryDate,
        setExpectedDeliveryDate,
        discountAmount,
        setDiscountAmount,
        advancePaid,
        setAdvancePaid,
        notes,
        setNotes,
        termsConditions,
        setTermsConditions,
        isPartyDropdownOpen,
        setIsPartyDropdownOpen,
        partyDropdownRef,
        activeProductIdx,
        setActiveProductIdx,
        productDropdownRefs,
        items,
        filteredParties,
        handleSelectParty,
        updateItem,
        getFilteredProducts,
        handleSelectProduct,
        handleProductInputChange,
        addItem,
        removeItem,
        setPresetDeliveryDays,
        deliveryGapDays,
        subtotal,
        taxTotal,
        netTotal,
        handleSubmit,
        isPending,
    } = useCreateSaleOrder(props);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                        {saleOrderToEdit ? "Edit Sale Order" : "New Customer Sale Order"}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Book advance order, reserve stock, and convert to GST Tax Invoice upon fulfillment.
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order No.</span>
                                <Input
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
                                    className="h-8 font-mono text-xs font-bold w-36 text-right bg-white dark:bg-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        {/* CA Stock Accounting Notice */}
                        <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                                <strong>Inventory & Tax Invariant:</strong> Saving this Sale Order books a customer commitment and reserves stock. It does <em>not</em> deduct warehouse physical inventory or generate tax liability until converted to a Sale Invoice.
                            </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Customer & Party Details Section */}
                        <SaleOrderCustomerSection
                            customerName={customerName}
                            setCustomerName={setCustomerName}
                            customerPhone={customerPhone}
                            setCustomerPhone={setCustomerPhone}
                            customerGstin={customerGstin}
                            setCustomerGstin={setCustomerGstin}
                            partiesCount={parties.length}
                            filteredParties={filteredParties}
                            isPartyDropdownOpen={isPartyDropdownOpen}
                            setIsPartyDropdownOpen={setIsPartyDropdownOpen}
                            partyDropdownRef={partyDropdownRef}
                            handleSelectParty={handleSelectParty}
                        />

                        {/* Order & Expected Delivery Dates Section */}
                        <SaleOrderTimelineSection
                            orderDate={orderDate}
                            setOrderDate={setOrderDate}
                            expectedDeliveryDate={expectedDeliveryDate}
                            setExpectedDeliveryDate={setExpectedDeliveryDate}
                            deliveryGapDays={deliveryGapDays}
                            setPresetDeliveryDays={setPresetDeliveryDays}
                        />

                        {/* Items Section */}
                        <SaleOrderItemsTable
                            items={items}
                            addItem={addItem}
                            removeItem={removeItem}
                            updateItem={updateItem}
                            products={products}
                            activeProductIdx={activeProductIdx}
                            setActiveProductIdx={setActiveProductIdx}
                            productDropdownRefs={productDropdownRefs}
                            getFilteredProducts={getFilteredProducts}
                            handleSelectProduct={handleSelectProduct}
                            handleProductInputChange={handleProductInputChange}
                        />

                        {/* Summary and Payment Notes */}
                        <SaleOrderTotalsSection
                            notes={notes}
                            setNotes={setNotes}
                            termsConditions={termsConditions}
                            setTermsConditions={setTermsConditions}
                            subtotal={subtotal}
                            taxTotal={taxTotal}
                            discountAmount={discountAmount}
                            setDiscountAmount={setDiscountAmount}
                            netTotal={netTotal}
                            advancePaid={advancePaid}
                            setAdvancePaid={setAdvancePaid}
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-xs text-slate-500 hover:text-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-6 shadow-md shadow-indigo-500/20"
                        >
                            {isPending ? "Saving Order..." : saleOrderToEdit ? "Update Sale Order" : "Confirm & Save Order"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateSaleOrderDialog;
