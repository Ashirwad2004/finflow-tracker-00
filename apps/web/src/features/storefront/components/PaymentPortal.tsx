import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  PaymentPortalProps,
  customAnimations,
  usePaymentPortal,
  PaymentSimulationOverlay,
  PaymentProgressTracker,
  PaymentHeader,
  PaymentMethodTabs,
  PaymentFooter,
} from "./payment-portal";

export type { PaymentPortalProps };

export function PaymentPortal({
  isOpen,
  onClose,
  orderId,
  amount,
  currency = "INR",
  storeName,
  customerName,
  customerPhone,
  storeUpiId,
  onPaymentSuccess,
}: PaymentPortalProps) {
  const {
    activeTab,
    setActiveTab,
    isProcessing,
    errorMessage,
    setErrorMessage,
    showOrderSummary,
    setShowOrderSummary,
    simulatedApp,
    simulationStep,
    gatewayOrderId,
    cardNumber,
    cardExpiry,
    cardCVV,
    setCardCVV,
    cardName,
    setCardName,
    upiId,
    setUpiId,
    qrCountdown,
    formatCountdown,
    selectedBank,
    setSelectedBank,
    selectedWallet,
    setSelectedWallet,
    handleCardNumberChange,
    handleExpiryChange,
    handlePaymentSubmit,
    triggerUpiSimulation,
    getSimulatedAppColor,
  } = usePaymentPortal({
    isOpen,
    orderId,
    customerPhone,
    onPaymentSuccess,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-card border border-border shadow-2xl overflow-hidden p-0 rounded-3xl animate-in fade-in zoom-in-95 duration-200">
        <style>{customAnimations}</style>

        {/* Simulation Overlay */}
        {simulatedApp && (
          <PaymentSimulationOverlay
            simulatedApp={simulatedApp}
            simulationStep={simulationStep}
            getSimulatedAppColor={getSimulatedAppColor}
          />
        )}

        {/* Progress Tracker (Timeline) */}
        <PaymentProgressTracker />

        {/* Dynamic Header & Order Summary */}
        <PaymentHeader
          storeName={storeName}
          amount={amount}
          currency={currency}
          orderId={orderId}
          customerName={customerName}
          customerPhone={customerPhone}
          showOrderSummary={showOrderSummary}
          setShowOrderSummary={setShowOrderSummary}
        />

        {/* Content Panel */}
        <div className="p-6 pt-2">
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold">Transaction Failed</div>
                <div className="opacity-90 mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {isProcessing && !gatewayOrderId ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-muted-foreground animate-pulse">
                Initializing payment session...
              </p>
            </div>
          ) : (
            <form onSubmit={handlePaymentSubmit}>
              <PaymentMethodTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isProcessing={isProcessing}
                triggerUpiSimulation={triggerUpiSimulation}
                setErrorMessage={setErrorMessage}
                cardNumber={cardNumber}
                cardExpiry={cardExpiry}
                cardCVV={cardCVV}
                cardName={cardName}
                handleCardNumberChange={handleCardNumberChange}
                handleExpiryChange={handleExpiryChange}
                setCardCVV={setCardCVV}
                setCardName={setCardName}
                upiId={upiId}
                setUpiId={setUpiId}
                qrCountdown={qrCountdown}
                formatCountdown={formatCountdown}
                storeUpiId={storeUpiId}
                storeName={storeName}
                amount={amount}
                currency={currency}
                orderId={orderId}
                selectedBank={selectedBank}
                setSelectedBank={setSelectedBank}
                selectedWallet={selectedWallet}
                setSelectedWallet={setSelectedWallet}
              />

              <PaymentFooter isProcessing={isProcessing} onClose={onClose} />
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentPortal;
