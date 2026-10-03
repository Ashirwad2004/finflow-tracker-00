import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "@/core/hooks/use-toast";
import { PaymentPortalProps, SimulationStep } from "./types";

export function usePaymentPortal({
  isOpen,
  orderId,
  customerPhone,
  onPaymentSuccess,
}: Pick<PaymentPortalProps, "isOpen" | "orderId" | "customerPhone" | "onPaymentSuccess">) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("card");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOrderSummary, setShowOrderSummary] = useState<boolean>(false);

  // UPI Redirection Simulation states
  const [simulatedApp, setSimulatedApp] = useState<string | null>(null);
  const [simulationStep, setSimulationStep] = useState<SimulationStep>("idle");

  // Gateway states
  const [gatewayOrderId, setGatewayOrderId] = useState<string | null>(null);
  const [idempotencyKey] = useState<string>(() => `idem_${orderId}_${Date.now()}`);

  // Card form inputs
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardName, setCardName] = useState("");

  // UPI inputs
  const [upiId, setUpiId] = useState("");
  const [qrCountdown, setQrCountdown] = useState(300); // 5 minutes

  // Netbanking selection
  const [selectedBank, setSelectedBank] = useState("sbi");

  // Wallet selection
  const [selectedWallet, setSelectedWallet] = useState("paytm");

  // 1. Create Gateway Order on Load
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setErrorMessage(null);
    setIsProcessing(true);
    setSimulatedApp(null);
    setSimulationStep("idle");

    async function initPayment() {
      try {
        const response = await axios.post("/api/v1/payments/create-order", {
          orderId,
          idempotencyKey,
          customerPhone,
        });

        if (isMounted && response.data.success) {
          setGatewayOrderId(response.data.gatewayOrderId);
        }
      } catch (err: any) {
        console.error("Payment Init Error:", err);
        if (isMounted) {
          setErrorMessage(err.response?.data?.error ?? "Failed to initialize payment gateway order.");
        }
      } finally {
        if (isMounted) setIsProcessing(false);
      }
    }

    initPayment();

    return () => {
      isMounted = false;
    };
  }, [isOpen, orderId, idempotencyKey, customerPhone]);

  // UPI QR Code countdown timer
  useEffect(() => {
    if (!isOpen || activeTab !== "upi_qr") return;

    const timer = setInterval(() => {
      setQrCountdown((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, activeTab]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Helper: Card number formatting
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    val = val.substring(0, 16);
    const parts: string[] = [];
    for (let i = 0; i < val.length; i += 4) {
      parts.push(val.substring(i, i + 4));
    }
    setCardNumber(parts.join(" "));
  };

  // Helper: Expiry formatting
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    val = val.substring(0, 4);
    if (val.length > 2) {
      setCardExpiry(`${val.substring(0, 2)}/${val.substring(2, 4)}`);
    } else {
      setCardExpiry(val);
    }
  };

  // 2. Submit payment and verify on backend
  const handlePaymentSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gatewayOrderId) {
      toast({
        title: "Order not ready",
        description: "Payment session hasn't initialized correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const mockPaymentId = `mock_pay_${activeTab}_${Math.random().toString(36).substring(2, 10)}`;

    setTimeout(async () => {
      try {
        const response = await axios.post("/api/v1/payments/verify-payment", {
          gatewayOrderId,
          gatewayPaymentId: mockPaymentId,
          gatewaySignature: "mock_signature_hash",
        });

        if (response.data.success) {
          toast({
            title: "🎉 Payment Successful",
            description: "Your transaction has been verified securely.",
          });
          onPaymentSuccess(response.data.paymentId, response.data.invoiceNumber);
        }
      } catch (err: any) {
        console.error("Backend payment verification failed:", err);
        setErrorMessage(
          err.response?.data?.detail ??
            err.response?.data?.error ??
            "Payment verification failed. Please try again."
        );
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  // 3. Simulated Mobile UPI App flow
  const triggerUpiSimulation = (appName: string) => {
    if (!gatewayOrderId) return;
    setSimulatedApp(appName);
    setSimulationStep("opening");
    setIsProcessing(true);

    setTimeout(() => {
      setSimulationStep("approving");

      setTimeout(() => {
        setSimulationStep("verifying");

        const mockPaymentId = `mock_pay_upi_${appName.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;

        setTimeout(async () => {
          try {
            const response = await axios.post("/api/v1/payments/verify-payment", {
              gatewayOrderId,
              gatewayPaymentId: mockPaymentId,
              gatewaySignature: "mock_signature_hash",
            });

            if (response.data.success) {
              toast({
                title: "🎉 Payment Confirmed!",
                description: `Successfully processed via ${appName}.`,
              });
              onPaymentSuccess(response.data.paymentId, response.data.invoiceNumber);
            }
          } catch (err: any) {
            console.error("Simulation verification error:", err);
            setErrorMessage(err.response?.data?.error ?? "Verification failed.");
            setSimulatedApp(null);
            setSimulationStep("idle");
            setIsProcessing(false);
          }
        }, 1200);
      }, 1500);
    }, 800);
  };

  const getSimulatedAppColor = () => {
    switch (simulatedApp) {
      case "Google Pay":
        return "from-blue-600 via-red-500 to-yellow-500";
      case "PhonePe":
        return "from-purple-700 to-indigo-600";
      case "Paytm":
        return "from-sky-500 to-blue-700";
      default:
        return "from-primary to-violet-600";
    }
  };

  return {
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
  };
}
