import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreatePurchaseOrderDialogProps } from "./types";
import { useCreatePurchaseOrderForm } from "./useCreatePurchaseOrderForm";
import { PoHeader } from "./PoHeader";
import { PoVendorFields } from "./PoVendorFields";
import { PoItemsTable } from "./PoItemsTable";
import { PoSummaryFooter } from "./PoSummaryFooter";

export const CreatePurchaseOrderDialog: React.FC<CreatePurchaseOrderDialogProps> = ({
  open,
  onOpenChange,
  purchaseOrderToEdit,
  parties = [],
  products: productsProp = [],
  userId,
}) => {
  const {
    poNumber,
    setPoNumber,
    vendorName,
    setVendorName,
    vendorPhone,
    setVendorPhone,
    vendorGstin,
    setVendorGstin,
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
    items,
    products,
    subtotal,
    taxTotal,
    netTotal,
    handleVendorSelect,
    updateItem,
    handleProductSelect,
    addItem,
    removeItem,
    handleSubmit,
    isSubmitting,
  } = useCreatePurchaseOrderForm({
    open,
    onOpenChange,
    purchaseOrderToEdit,
    parties,
    productsProp,
    userId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <form onSubmit={handleSubmit}>
          <PoHeader
            isEditing={!!purchaseOrderToEdit}
            poNumber={poNumber}
            onPoNumberChange={setPoNumber}
          />

          <div className="p-6 space-y-6">
            <PoVendorFields
              vendorName={vendorName}
              onVendorNameChange={setVendorName}
              vendorPhone={vendorPhone}
              onVendorPhoneChange={setVendorPhone}
              vendorGstin={vendorGstin}
              onVendorGstinChange={setVendorGstin}
              orderDate={orderDate}
              onOrderDateChange={setOrderDate}
              expectedDeliveryDate={expectedDeliveryDate}
              onExpectedDeliveryDateChange={setExpectedDeliveryDate}
              parties={parties}
              onVendorSelect={handleVendorSelect}
            />

            <PoItemsTable
              items={items}
              products={products}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onUpdateItem={updateItem}
              onProductSelect={handleProductSelect}
            />

            <PoSummaryFooter
              notes={notes}
              onNotesChange={setNotes}
              termsConditions={termsConditions}
              onTermsConditionsChange={setTermsConditions}
              subtotal={subtotal}
              taxTotal={taxTotal}
              discountAmount={discountAmount}
              onDiscountAmountChange={setDiscountAmount}
              netTotal={netTotal}
              advancePaid={advancePaid}
              onAdvancePaidChange={setAdvancePaid}
              isSubmitting={isSubmitting}
              isEditing={!!purchaseOrderToEdit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePurchaseOrderDialog;
export * from "./types";
export * from "./useCreatePurchaseOrderForm";
