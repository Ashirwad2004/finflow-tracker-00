import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { POSPaymentMethodType, POSSplitPaymentBreakdown } from "../../types";
import { POSPaymentModalProps } from "./types";

export function usePOSPaymentState({
  open,
  onOpenChange,
  totalAmount,
  customerName,
  upiId = "",
  businessName = "FinFlow Store",
  onCompleteSale,
}: POSPaymentModalProps) {
  const { formatCurrency } = useCurrency();
  const [selectedMethod, setSelectedMethod] = useState<POSPaymentMethodType>("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cash state
  const [cashReceived, setCashReceived] = useState<number>(totalAmount);

  // UPI state
  const [upiConfirmed, setUpiConfirmed] = useState(false);
  const [upiReference, setUpiReference] = useState("");

  // Card & Bank state
  const [cardReference, setCardReference] = useState("");
  const [bankReference, setBankReference] = useState("");

  // Credit / Partial state
  const [creditAmountPaid, setCreditAmountPaid] = useState<number>(0);

  // Split state
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitCredit, setSplitCredit] = useState<number>(0);

  // Sync totalAmount on open
  useEffect(() => {
    if (open) {
      setCashReceived(totalAmount);
      setCreditAmountPaid(0);
      setSplitCash(totalAmount);
      setSplitUpi(0);
      setSplitCard(0);
      setSplitCredit(0);
      setUpiConfirmed(false);
      setUpiReference("");
      setCardReference("");
      setBankReference("");
      setIsSubmitting(false);
    }
  }, [open, totalAmount]);

  // Cash change calculation
  const cashChange = useMemo(() => {
    return Math.max(0, Math.round((cashReceived - totalAmount) * 100) / 100);
  }, [cashReceived, totalAmount]);

  // Dynamic UPI URI
  const effectiveUpi = upiId || localStorage.getItem("rupeebill_upi_id") || "";
  const upiUri = useMemo(() => {
    if (!effectiveUpi) return "";
    return `upi://pay?pa=${encodeURIComponent(effectiveUpi)}&pn=${encodeURIComponent(
      businessName
    )}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
      `POS Bill ${customerName}`
    )}`;
  }, [effectiveUpi, businessName, totalAmount, customerName]);

  // Split sum & remaining
  const splitTotalPaid = splitCash + splitUpi + splitCard;
  const splitRemaining = Math.max(
    0,
    Math.round((totalAmount - splitTotalPaid - splitCredit) * 100) / 100
  );

  const handleQuickCash = (amountToAdd: number) => {
    setCashReceived((prev) => prev + amountToAdd);
  };

  const handleExactCash = () => {
    setCashReceived(totalAmount);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate methods
    if (selectedMethod === "cash" && cashReceived < totalAmount) {
      toast.error(
        `Cash received (${formatCurrency(
          cashReceived
        )}) cannot be less than total (${formatCurrency(totalAmount)})`
      );
      return;
    }

    if (selectedMethod === "upi" && !upiConfirmed) {
      toast.error(
        "Please verify that UPI payment was received before completing the sale."
      );
      return;
    }

    if (selectedMethod === "split") {
      const totalSettled = splitCash + splitUpi + splitCard + splitCredit;
      if (Math.abs(totalSettled - totalAmount) > 0.05) {
        toast.error(
          `Split allocation (${formatCurrency(
            totalSettled
          )}) must equal total (${formatCurrency(totalAmount)})`
        );
        return;
      }
    }

    setIsSubmitting(true);
    const idempotencyKey = uuidv4();

    try {
      let amountPaid = totalAmount;
      let notes = "";
      let splitBreakdown: POSSplitPaymentBreakdown | undefined = undefined;

      if (selectedMethod === "cash") {
        amountPaid = totalAmount;
        notes = `Cash Received: ${formatCurrency(
          cashReceived
        )}, Change Returned: ${formatCurrency(cashChange)}`;
      } else if (selectedMethod === "upi") {
        amountPaid = totalAmount;
        notes = `UPI Payment confirmed. Ref/UTR: ${
          upiReference || "Verified by Cashier"
        }`;
      } else if (selectedMethod === "card") {
        amountPaid = totalAmount;
        notes = `Card Transaction Ref: ${cardReference || "N/A"}`;
      } else if (selectedMethod === "bank_transfer") {
        amountPaid = totalAmount;
        notes = `Bank Transfer Ref: ${bankReference || "N/A"}`;
      } else if (selectedMethod === "credit") {
        amountPaid = creditAmountPaid;
        notes = `Credit Sale for ${customerName}. Initial payment: ${formatCurrency(
          creditAmountPaid
        )}, Balance due: ${formatCurrency(totalAmount - creditAmountPaid)}`;
      } else if (selectedMethod === "split") {
        amountPaid = splitTotalPaid;
        splitBreakdown = {
          cash: splitCash,
          upi: splitUpi,
          card: splitCard,
          bank_transfer: 0,
          credit: splitCredit,
          upi_reference: upiReference,
        };
        notes = `Split Payment: Cash ${formatCurrency(
          splitCash
        )}, UPI ${formatCurrency(splitUpi)}, Card ${formatCurrency(
          splitCard
        )}, Credit ${formatCurrency(splitCredit)}`;
      }

      await onCompleteSale({
        paymentMethod: selectedMethod,
        amountPaid,
        splitBreakdown,
        notes,
        idempotencyKey,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("[POSPayment] Sale completion failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}
