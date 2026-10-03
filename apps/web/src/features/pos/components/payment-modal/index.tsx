import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  QrCode,
  CreditCard,
  Landmark,
  HandCoins,
  Split,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { POSPaymentMethodType } from "../../types";
import { POSPaymentModalProps } from "./types";
import { usePOSPaymentState } from "./usePOSPaymentState";
import { POSCashView } from "./POSCashView";
import { POSUpiView } from "./POSUpiView";
import { POSOtherMethodsView } from "./POSOtherMethodsView";

export type { POSPaymentModalProps };

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi", label: "UPI / QR Code", icon: QrCode },
  { id: "card", label: "Debit / Credit Card", icon: CreditCard },
  { id: "bank_transfer", label: "Bank Transfer", icon: Landmark },
  { id: "credit", label: "Store Credit (Udhaar)", icon: HandCoins },
  { id: "split", label: "Split Payment", icon: Split },
] as const;

export const POSPaymentModal: React.FC<POSPaymentModalProps> = (props) => {
  const { open, onOpenChange, totalAmount, customerName } = props;
  const {
    formatCurrency,
    selectedMethod,
    setSelectedMethod,
    isSubmitting,
    cashReceived,
    setCashReceived,
    cashChange,
    upiConfirmed,
    setUpiConfirmed,
    upiReference,
    setUpiReference,
    cardReference,
    setCardReference,
    bankReference,
    setBankReference,
    creditAmountPaid,
    setCreditAmountPaid,
    splitCash,
    setSplitCash,
    splitUpi,
    setSplitUpi,
    splitCard,
    setSplitCard,
    splitCredit,
    setSplitCredit,
    splitRemaining,
    upiUri,
    handleQuickCash,
    handleExactCash,
    handleSubmit,
  } = usePOSPaymentState(props);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-card border-border text-foreground rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 pr-14 sm:pr-16 border-b border-border/80 bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground">
                Sale Settlement
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                Customer:{" "}
                <span className="font-semibold text-foreground">
                  {customerName}
                </span>
              </DialogDescription>
            </div>
            <div className="text-right flex-shrink-0 bg-background/80 px-3.5 py-1.5 rounded-xl border border-border/70 shadow-2xs">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                Payable Total
              </span>
              <span className="text-lg sm:text-xl font-black text-primary tracking-tight font-mono">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 min-h-[340px] font-display">
          {/* Payment Method Selector */}
          <div className="p-3 border-r border-border/80 space-y-1 bg-muted/20">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 block mb-1.5">
              Payment Method
            </span>

            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethod(m.id as POSPaymentMethodType)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Payment Method Details */}
          <div className="p-5 md:col-span-2 flex flex-col justify-between space-y-4">
            {selectedMethod === "cash" && (
              <POSCashView
                cashReceived={cashReceived}
                onCashReceivedChange={setCashReceived}
                totalAmount={totalAmount}
                cashChange={cashChange}
                formatCurrency={formatCurrency}
                onExactCash={handleExactCash}
                onQuickCash={handleQuickCash}
              />
            )}

            {selectedMethod === "upi" && (
              <POSUpiView
                upiUri={upiUri}
                upiReference={upiReference}
                onUpiReferenceChange={setUpiReference}
                upiConfirmed={upiConfirmed}
                onUpiConfirmedChange={setUpiConfirmed}
              />
            )}

            {(selectedMethod === "card" ||
              selectedMethod === "bank_transfer" ||
              selectedMethod === "credit" ||
              selectedMethod === "split") && (
              <POSOtherMethodsView
                selectedMethod={selectedMethod}
                cardReference={cardReference}
                onCardReferenceChange={setCardReference}
                bankReference={bankReference}
                onBankReferenceChange={setBankReference}
                creditAmountPaid={creditAmountPaid}
                onCreditAmountPaidChange={setCreditAmountPaid}
                totalAmount={totalAmount}
                customerName={customerName}
                splitCash={splitCash}
                onSplitCashChange={setSplitCash}
                splitUpi={splitUpi}
                onSplitUpiChange={setSplitUpi}
                splitCard={splitCard}
                onSplitCardChange={setSplitCard}
                splitCredit={splitCredit}
                onSplitCreditChange={setSplitCredit}
                splitRemaining={splitRemaining}
                formatCurrency={formatCurrency}
              />
            )}

            {/* Complete Sale Button */}
            <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs h-10 px-4 border-border text-foreground hover:bg-muted font-medium"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-10 px-6 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Sale...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Sale ({formatCurrency(totalAmount)})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default POSPaymentModal;
