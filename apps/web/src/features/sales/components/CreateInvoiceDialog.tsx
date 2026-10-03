import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { InvoicePreview } from "./InvoicePreview";
import {
    QuickInvoiceFormSection,
    FullInvoiceFormSection,
    InvoiceTotalsFooter,
    useCreateInvoiceDialog,
} from "./create-invoice";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface CreateInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceToEdit?: any;
    salesSettings?: SalesSettings;
    initialParty?: any;
    onSuccess?: (savedInvoice: any) => void;
}

export const CreateInvoiceDialog = ({
    open,
    onOpenChange,
    invoiceToEdit,
    salesSettings,
    initialParty,
    onSuccess,
}: CreateInvoiceDialogProps) => {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        errors,
        fields,
        remove,
        addEmptyItemRow,
        descriptionRefs,
        handleItemKeyDown,
        isQuickBilling,
        setIsQuickBilling,
        activeStep,
        setActiveStep,
        savedInvoiceData,
        draftPreviewData,
        sendWhatsApp,
        setSendWhatsApp,
        currentUserId,
        profile,
        parties,
        products,
        selectedParty,
        formatCurrency,
        isItemWiseTax,
        subtotal,
        overallDiscountAmount,
        taxAmount,
        taxRate,
        roundOffDiff,
        totalAmount,
        currentInvoiceDue,
        partyPreviousBalance,
        partyClosingDue,
        watchItems,
        watchCustomerName,
        watchCustomerPhone,
        watchCustomerEmail,
        watchCustomerGstin,
        watchPlaceOfSupply,
        watchQuickItemName,
        watchQuickTotalAmount,
        watchStatus,
        handleCustomerSelect,
        handleProductSelect,
        handleQuickAddProduct,
        handleSmartParse,
        handlePreviewDraft,
        onSubmit,
        handleCloseDialog,
        isPending,
    } = useCreateInvoiceDialog({
        open,
        onOpenChange,
        invoiceToEdit,
        salesSettings,
        initialParty,
        onSuccess,
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    handleCloseDialog();
                } else {
                    onOpenChange(isOpen);
                }
            }}
        >
            <DialogContent className="sm:max-w-[1100px] max-h-[92vh] p-0 flex flex-col bg-background border-slate-200 shadow-xl overflow-hidden rounded-md">
                {activeStep === "preview" ? (
                    <InvoicePreview
                        invoice={savedInvoiceData || draftPreviewData}
                        profile={profile}
                        salesSettings={salesSettings}
                        onEdit={() => setActiveStep("form")}
                        onClose={handleCloseDialog}
                        isDraft={!savedInvoiceData}
                        onSave={!savedInvoiceData ? handleSubmit(onSubmit) : undefined}
                    />
                ) : (
                    <>
                        <DialogHeader className="px-8 py-5 border-b border-border/60 bg-slate-50/50">
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-800">
                                        {invoiceToEdit ? "Edit Invoice" : "New Invoice"}
                                    </DialogTitle>
                                </div>

                                <div className="flex items-center gap-4">
                                    {!invoiceToEdit && (
                                        <div className="flex items-center space-x-1 border rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsQuickBilling(true);
                                                    setValue("quick_total_amount", 0);
                                                }}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                                    isQuickBilling
                                                        ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                                                        : "text-slate-500 hover:text-slate-700"
                                                }`}
                                            >
                                                Quick Billing
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setIsQuickBilling(false)}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                                    !isQuickBilling
                                                        ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                                                        : "text-slate-500 hover:text-slate-700"
                                                }`}
                                            >
                                                Full Billing
                                            </button>
                                        </div>
                                    )}

                                    <span
                                        className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${
                                            watchStatus === "paid"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : watchStatus === "partial"
                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                    : "bg-orange-50 text-orange-700 border-orange-200"
                                        }`}
                                    >
                                        {watchStatus === "paid"
                                            ? "PAID"
                                            : watchStatus === "partial"
                                                ? "PARTIAL"
                                                : "PENDING"}
                                    </span>
                                </div>
                            </div>
                        </DialogHeader>

                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="flex-1 overflow-y-auto flex flex-col"
                        >
                            {isQuickBilling ? (
                                <QuickInvoiceFormSection
                                    watchCustomerName={watchCustomerName}
                                    watchCustomerPhone={watchCustomerPhone}
                                    watchCustomerEmail={watchCustomerEmail}
                                    watchCustomerGstin={watchCustomerGstin}
                                    watchPlaceOfSupply={watchPlaceOfSupply}
                                    watchQuickItemName={watchQuickItemName}
                                    watchQuickTotalAmount={watchQuickTotalAmount}
                                    watch={watch}
                                    register={register}
                                    setValue={setValue}
                                    errors={errors}
                                    parties={parties}
                                    products={products}
                                    currentUserId={currentUserId}
                                    salesSettings={salesSettings}
                                    selectedParty={selectedParty}
                                    partyPreviousBalance={partyPreviousBalance}
                                    currentInvoiceDue={currentInvoiceDue}
                                    partyClosingDue={partyClosingDue}
                                    handleCustomerSelect={handleCustomerSelect}
                                    handleQuickAddProduct={handleQuickAddProduct}
                                    formatCurrency={formatCurrency}
                                />
                            ) : (
                                <FullInvoiceFormSection
                                    invoiceToEdit={invoiceToEdit}
                                    products={products}
                                    handleSmartParse={handleSmartParse}
                                    watchCustomerName={watchCustomerName}
                                    watchCustomerPhone={watchCustomerPhone}
                                    watchCustomerEmail={watchCustomerEmail}
                                    watchCustomerGstin={watchCustomerGstin}
                                    watchPlaceOfSupply={watchPlaceOfSupply}
                                    setValue={setValue}
                                    handleCustomerSelect={handleCustomerSelect}
                                    parties={parties}
                                    currentUserId={currentUserId}
                                    errors={errors}
                                    register={register}
                                    watch={watch}
                                    watchItems={watchItems}
                                    totalAmount={totalAmount}
                                    formatCurrency={formatCurrency}
                                    fields={fields}
                                    salesSettings={salesSettings}
                                    handleProductSelect={handleProductSelect}
                                    handleQuickAddProduct={handleQuickAddProduct}
                                    descriptionRefs={descriptionRefs}
                                    handleItemKeyDown={handleItemKeyDown}
                                    remove={remove}
                                    addEmptyItemRow={addEmptyItemRow}
                                    subtotal={subtotal}
                                    overallDiscountAmount={overallDiscountAmount}
                                    isItemWiseTax={isItemWiseTax}
                                    taxRate={taxRate}
                                    taxAmount={taxAmount}
                                    roundOffDiff={roundOffDiff}
                                    selectedParty={selectedParty}
                                    partyPreviousBalance={partyPreviousBalance}
                                    currentInvoiceDue={currentInvoiceDue}
                                    partyClosingDue={partyClosingDue}
                                />
                            )}

                            {/* FOOTER */}
                            <InvoiceTotalsFooter
                                sendWhatsApp={sendWhatsApp}
                                onSendWhatsAppChange={setSendWhatsApp}
                                onCancel={handleCloseDialog}
                                onPreview={handlePreviewDraft}
                                isPending={isPending}
                                isEditing={Boolean(invoiceToEdit)}
                            />
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default CreateInvoiceDialog;