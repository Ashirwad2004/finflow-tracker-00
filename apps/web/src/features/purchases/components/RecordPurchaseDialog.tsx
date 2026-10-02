import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    PurchaseHeader,
    PurchaseStickyFooter,
    QuickPurchaseFormSection,
    FullPurchaseFormSection,
    useRecordPurchaseDialog,
} from "./purchase";

interface RecordPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseToEdit?: any;
    startWithScanner?: boolean;
    initialParty?: any;
}

export const RecordPurchaseDialog = (props: RecordPurchaseDialogProps) => {
    const { open, onOpenChange, purchaseToEdit } = props;
    const {
        user,
        formatCurrency,
        currency,
        isQuickBilling,
        setIsQuickBilling,
        isAiFillOpen,
        setIsAiFillOpen,
        isScannerOpen,
        setIsScannerOpen,
        scannedNotification,
        setScannedNotification,
        register,
        handleSubmit,
        setValue,
        errors,
        watchItems,
        watchPaymentStatus,
        watchAmountPaid,
        watchDate,
        watchDueDate,
        watchBillDiscount,
        watchDefaultTaxRate,
        watchVendorName,
        watchVendorGstin,
        watchVendorPhone,
        watchPlaceOfSupply,
        watchBillNumber,
        watchNotes,
        watchAttachmentUrl,
        watchQuickItemName,
        parties,
        products,
        selectedParty,
        subtotal,
        itemDiscounts,
        totalTaxAmount,
        finalTotalAmount,
        effectiveBillTotal,
        balanceDue,
        vendorPreviousBalance,
        vendorClosingPayable,
        handlePaymentStatusChange,
        handleBillDateChange,
        handleItemChange,
        handleProductSelect,
        handleAddItem,
        handleRemoveItem,
        handleQuickAddProduct,
        handleSmartParse,
        handleScannerExtract,
        onSubmit,
        isPending,
    } = useRecordPurchaseDialog(props);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full sm:max-w-[1150px] max-h-[94vh] h-[94vh] sm:h-auto p-0 flex flex-col bg-background border-border/80 shadow-2xl rounded-2xl overflow-hidden">
                {/* Header */}
                <PurchaseHeader
                    isEditing={Boolean(purchaseToEdit)}
                    paymentStatus={watchPaymentStatus}
                    isAiFillOpen={isAiFillOpen}
                    isScannerOpen={isScannerOpen}
                    isQuickBilling={isQuickBilling}
                    onToggleQuickBilling={(val) => {
                        setIsQuickBilling(val);
                        if (val) {
                            setIsScannerOpen(false);
                            setIsAiFillOpen(false);
                        }
                    }}
                    onToggleAiFill={() => {
                        setIsAiFillOpen((prev) => !prev);
                        if (!isAiFillOpen) {
                            setIsScannerOpen(false);
                            setIsQuickBilling(false);
                        }
                    }}
                    onToggleScanner={() => {
                        setIsScannerOpen((prev) => !prev);
                        if (!isScannerOpen) {
                            setIsAiFillOpen(false);
                            setIsQuickBilling(false);
                        }
                    }}
                    onClose={() => onOpenChange(false)}
                />

                {/* Form Body */}
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex-1 flex flex-col overflow-hidden min-h-0"
                >
                    {isQuickBilling ? (
                        <QuickPurchaseFormSection
                            watchVendorName={watchVendorName}
                            watchVendorGstin={watchVendorGstin}
                            watchVendorPhone={watchVendorPhone}
                            watchPlaceOfSupply={watchPlaceOfSupply}
                            watchQuickItemName={watchQuickItemName}
                            watchPaymentStatus={watchPaymentStatus}
                            selectedParty={selectedParty}
                            parties={parties}
                            products={products}
                            userId={user?.id}
                            errors={errors}
                            currency={currency}
                            balanceDue={balanceDue}
                            vendorPreviousBalance={vendorPreviousBalance}
                            vendorClosingPayable={vendorClosingPayable}
                            register={register}
                            setValue={setValue}
                            formatCurrency={formatCurrency}
                            handleQuickAddProduct={handleQuickAddProduct}
                            handleBillDateChange={handleBillDateChange}
                            handlePaymentStatusChange={handlePaymentStatusChange}
                        />
                    ) : (
                        <FullPurchaseFormSection
                            purchaseToEdit={purchaseToEdit}
                            isScannerOpen={isScannerOpen}
                            setIsScannerOpen={setIsScannerOpen}
                            handleScannerExtract={handleScannerExtract}
                            isAiFillOpen={isAiFillOpen}
                            handleSmartParse={handleSmartParse}
                            watchVendorName={watchVendorName}
                            watchVendorGstin={watchVendorGstin}
                            watchVendorPhone={watchVendorPhone}
                            watchPlaceOfSupply={watchPlaceOfSupply}
                            setValue={setValue}
                            parties={parties}
                            userId={user?.id}
                            errors={errors}
                            watchBillNumber={watchBillNumber}
                            watchDate={watchDate}
                            watchDueDate={watchDueDate}
                            watchPaymentStatus={watchPaymentStatus}
                            handleBillDateChange={handleBillDateChange}
                            handlePaymentStatusChange={handlePaymentStatusChange}
                            scannedNotification={scannedNotification}
                            setScannedNotification={setScannedNotification}
                            watchItems={watchItems}
                            products={products}
                            watchDefaultTaxRate={watchDefaultTaxRate}
                            handleItemChange={handleItemChange}
                            handleProductSelect={handleProductSelect}
                            handleAddItem={handleAddItem}
                            handleRemoveItem={handleRemoveItem}
                            handleQuickAddProduct={handleQuickAddProduct}
                            watchNotes={watchNotes}
                            watchAttachmentUrl={watchAttachmentUrl}
                            subtotal={subtotal}
                            itemDiscounts={itemDiscounts}
                            watchBillDiscount={watchBillDiscount}
                            totalTaxAmount={totalTaxAmount}
                            finalTotalAmount={finalTotalAmount}
                            watchAmountPaid={watchAmountPaid}
                            balanceDue={balanceDue}
                            vendorPreviousBalance={vendorPreviousBalance}
                            vendorClosingPayable={vendorClosingPayable}
                        />
                    )}

                    {/* Sticky Footer */}
                    <PurchaseStickyFooter
                        grandTotal={effectiveBillTotal}
                        balanceDue={balanceDue}
                        itemsCount={isQuickBilling ? 1 : watchItems.length}
                        isEditing={Boolean(purchaseToEdit)}
                        isSubmitting={isPending}
                        onCancel={() => onOpenChange(false)}
                    />
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default RecordPurchaseDialog;