import {
  POSPaymentModal,
  POSReceiptModal,
  POSShiftModal,
  POSHoldResumeModal,
  POSReturnModal,
  POSCustomerModal,
  POSShortcutsModal,
} from "../../components";

interface POSPageModalsProps {
  // Customer Modal
  isCustomerModalOpen: boolean;
  setIsCustomerModalOpen: (open: boolean) => void;
  customerName: string;
  customerPhone: string;
  onApplyCustomer: (name: string, phone: string) => void;

  // Shortcuts Modal
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (open: boolean) => void;

  // Payment Modal
  isPaymentOpen: boolean;
  setIsPaymentOpen: (open: boolean) => void;
  totalAmount: number;
  currentStore: any;
  handleCompleteSale: any;

  // Receipt Modal
  isReceiptOpen: boolean;
  setIsReceiptOpen: (open: boolean) => void;
  lastCompletedSale: any;
  handleClearCart: () => void;

  // Shift Modal
  isShiftOpen: boolean;
  setIsShiftOpen: (open: boolean) => void;
  activeShift: any;
  shiftSummary: any;
  cashierName: string;
  handleOpenShift: any;
  handleCloseShift: any;
  handleRecordCashMovement: any;

  // Hold Resume Modal
  isHoldResumeOpen: boolean;
  setIsHoldResumeOpen: (open: boolean) => void;
  heldBills: any[];
  handleResumeBill: (bill: any, onDone: () => void) => void;
  handleDeleteHeldBill: (billId: string) => void;

  // Return Modal
  isReturnOpen: boolean;
  setIsReturnOpen: (open: boolean) => void;
  handleReturnSuccess: () => void;
}

export function POSPageModals({
  isCustomerModalOpen,
  setIsCustomerModalOpen,
  customerName,
  customerPhone,
  onApplyCustomer,
  isShortcutsOpen,
  setIsShortcutsOpen,
  isPaymentOpen,
  setIsPaymentOpen,
  totalAmount,
  currentStore,
  handleCompleteSale,
  isReceiptOpen,
  setIsReceiptOpen,
  lastCompletedSale,
  handleClearCart,
  isShiftOpen,
  setIsShiftOpen,
  activeShift,
  shiftSummary,
  cashierName,
  handleOpenShift,
  handleCloseShift,
  handleRecordCashMovement,
  isHoldResumeOpen,
  setIsHoldResumeOpen,
  heldBills,
  handleResumeBill,
  handleDeleteHeldBill,
  isReturnOpen,
  setIsReturnOpen,
  handleReturnSuccess,
}: POSPageModalsProps) {
  return (
    <>
      {/* Customer Quick Edit Modal (F2) */}
      <POSCustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        customerName={customerName}
        customerPhone={customerPhone}
        onApplyCustomer={onApplyCustomer}
      />

      {/* Keyboard Shortcuts Helper Modal */}
      <POSShortcutsModal
        open={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
      />

      {/* Payment Modal (F4) */}
      <POSPaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        totalAmount={totalAmount}
        customerName={customerName}
        upiId={currentStore?.upi_id || "retail@upi"}
        businessName={currentStore?.name || "FinFlow Retail Store"}
        onCompleteSale={handleCompleteSale}
      />

      {/* Thermal & A4 Receipt Modal */}
      <POSReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        saleData={lastCompletedSale}
        profileData={currentStore}
        onNewSale={() => {
          setIsReceiptOpen(false);
          handleClearCart();
        }}
      />

      {/* Shift Register Management Modal */}
      <POSShiftModal
        open={isShiftOpen}
        onOpenChange={setIsShiftOpen}
        activeShift={activeShift}
        shiftSummary={shiftSummary}
        cashierName={cashierName}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        onRecordCashMovement={handleRecordCashMovement}
      />

      {/* Parked / Held Bills Drawer (F8) */}
      <POSHoldResumeModal
        open={isHoldResumeOpen}
        onOpenChange={setIsHoldResumeOpen}
        heldBills={heldBills}
        onResumeBill={(bill) => handleResumeBill(bill, () => setIsHoldResumeOpen(false))}
        onDeleteHeldBill={handleDeleteHeldBill}
      />

      {/* Returns & Credit Notes Modal (F10) */}
      <POSReturnModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        activeShiftId={activeShift?.id}
        onReturnSuccess={handleReturnSuccess}
      />
    </>
  );
}
