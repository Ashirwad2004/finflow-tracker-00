import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  CreditCard, 
  Smartphone, 
  Landmark, 
  QrCode, 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  SmartphoneCharging
} from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";

interface PaymentPortalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  currency: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  storeUpiId?: string;
  onPaymentSuccess: (paymentId: string, invoiceNumber: string) => void;
}

const customAnimations = `
@keyframes scan-laser {
  0% { transform: translateY(0); opacity: 0.8; }
  50% { transform: translateY(160px); opacity: 1; filter: drop-shadow(0 0 8px #10b981); }
  100% { transform: translateY(0); opacity: 0.8; }
}
@keyframes pulse-border {
  0%, 100% { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 0 0 0px rgba(99, 102, 241, 0.2); }
  50% { border-color: rgba(99, 102, 241, 0.8); box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
`;

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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("card");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOrderSummary, setShowOrderSummary] = useState<boolean>(false);
  
  // UPI Redirection Simulation states
  const [simulatedApp, setSimulatedApp] = useState<string | null>(null);
  const [simulationStep, setSimulationStep] = useState<"idle" | "opening" | "approving" | "verifying">("idle");
  
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
        const response = await axios.post("/api/payments/create-order", {
          orderId,
          idempotencyKey
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
  }, [isOpen, orderId, idempotencyKey]);

  // UPI QR Code countdown timer
  useEffect(() => {
    if (!isOpen || activeTab !== "upi_qr") return;

    const timer = setInterval(() => {
      setQrCountdown(prev => (prev > 0 ? prev - 1 : 300));
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
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Prepare simulated transaction details
    const mockPaymentId = `mock_pay_${activeTab}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Simulate minor network delays to mimic actual validation gateway roundtrip
    setTimeout(async () => {
      try {
        const response = await axios.post("/api/payments/verify-payment", {
          gatewayOrderId,
          gatewayPaymentId: mockPaymentId,
          gatewaySignature: "mock_signature_hash"
        });

        if (response.data.success) {
          toast({
            title: "🎉 Payment Successful",
            description: "Your transaction has been verified securely.",
          });
          onPaymentSuccess(response.data.paymentId, response.data.invoiceNumber);
        }
      } catch (err: any) {
        console.error("Payment Verification Error:", err);
        setErrorMessage(err.response?.data?.error ?? "Payment verification failed. Please try again.");
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
    
    // Step 1: Open App Simulation (0.8s)
    setTimeout(() => {
      setSimulationStep("approving");
      
      // Step 2: Waiting for PIN Approval (1.2s)
      setTimeout(() => {
        setSimulationStep("verifying");
        
        // Step 3: Call backend verification
        const mockPaymentId = `mock_pay_upi_${appName.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;
        
        setTimeout(async () => {
          try {
            const response = await axios.post("/api/payments/verify-payment", {
              gatewayOrderId,
              gatewayPaymentId: mockPaymentId,
              gatewaySignature: "mock_signature_hash"
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
      case "Google Pay": return "from-blue-600 via-red-500 to-yellow-500";
      case "PhonePe": return "from-purple-700 to-indigo-600";
      case "Paytm": return "from-sky-500 to-blue-700";
      default: return "from-primary to-violet-600";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-card border border-border shadow-2xl overflow-hidden p-0 rounded-3xl animate-in fade-in zoom-in-95 duration-200">
        <style>{customAnimations}</style>

        {/* SIMULATION OVERLAY */}
        {simulatedApp && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center text-white select-none animate-in fade-in duration-300">
            <div className={`w-24 h-24 rounded-[2rem] bg-gradient-to-br ${getSimulatedAppColor()} p-0.5 shadow-2xl flex items-center justify-center mb-6 animate-pulse`} style={{ animationDuration: '2s' }}>
              <div className="w-full h-full bg-slate-900 rounded-[1.9rem] flex items-center justify-center">
                <SmartphoneCharging className="w-10 h-10 text-white animate-bounce" style={{ animationDuration: '1.5s' }} />
              </div>
            </div>

            <h3 className="text-xl font-black tracking-tight mb-2">
              {simulationStep === "opening" && `Launching ${simulatedApp}...`}
              {simulationStep === "approving" && "Waiting for approval..."}
              {simulationStep === "verifying" && "Verifying Payment Integrity..."}
            </h3>

            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              {simulationStep === "opening" && "Securely handshaking with your UPI provider. Please wait."}
              {simulationStep === "approving" && `We've sent a collect request to your ${simulatedApp} App. Please authorize it inside the app using your secure UPI PIN.`}
              {simulationStep === "verifying" && "Confirming signature hash and secure tokens with gateway driver..."}
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              {simulationStep === "approving" && (
                <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest animate-pulse">
                  Do not hit back or close the browser
                </span>
              )}
            </div>

            {/* Secure Footer in Simulation */}
            <div className="absolute bottom-6 flex items-center gap-1.5 text-slate-500 text-[10px] font-bold tracking-widest uppercase">
              <Lock className="w-3.5 h-3.5" /> Secure UPI Collect Engine
            </div>
          </div>
        )}

        {/* Progress Tracker (Timeline) */}
        <div className="bg-slate-50 border-b border-border py-3.5 px-6 flex items-center justify-between text-xs font-semibold text-muted-foreground select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-black">1</span>
            <span>Cart details</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-200 flex-1 mx-2" />
          <div className="flex items-center gap-1.5 text-primary">
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[9px] font-black shadow-sm animate-pulse">2</span>
            <span className="font-bold">Secure payment</span>
          </div>
          <div className="w-8 h-[1px] bg-slate-200 flex-1 mx-2" />
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[9px] font-black">3</span>
            <span>Order placed</span>
          </div>
        </div>

        {/* Dynamic Header */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Secure Checkout
            </h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <span>Paying</span>
              <span className="font-semibold text-slate-800">{storeName}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-indigo-600">
              {currency === "INR" ? "₹" : "$"}
              {Number(amount).toFixed(2)}
            </div>
            <button 
              onClick={() => setShowOrderSummary(!showOrderSummary)}
              className="text-[10px] text-muted-foreground font-bold hover:text-indigo-600 transition-colors flex items-center gap-0.5 mt-0.5 ml-auto border border-dashed px-1.5 py-0.5 rounded-md hover:bg-slate-50"
            >
              Order Details
              {showOrderSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Collapsible Order Summary & Quick Delivery Notice */}
        <div className="px-6 pb-2">
          {showOrderSummary && (
            <div className="mb-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-2 animate-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Reference</span>
                <span className="font-mono text-slate-800">#{orderId.substring(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="font-medium text-slate-800">{customerName} ({customerPhone})</span>
              </div>
            </div>
          )}

          {/* Blinkit Style Delivery Notice */}
          <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-3.5 flex items-center gap-3 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 animate-pulse" style={{ animationDuration: '2.5s' }}>
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest">Delivery in 10 - 15 Mins</p>
              <p className="text-[10px] text-emerald-700/80 mt-0.5 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-600/70 flex-shrink-0" />
                Shipping to your saved address
              </p>
            </div>
          </div>
        </div>

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
              {/* ⚡ PREFERRED QUICK PAY (UPI shortcuts) ⚡ */}
              <div className="mb-4">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Preferred Fast UPI App Options
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => triggerUpiSimulation("Google Pay")}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border bg-white hover:bg-slate-50 active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600 text-xs">
                      G
                    </div>
                    <span className="text-[10px] font-black text-slate-700">Google Pay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerUpiSimulation("PhonePe")}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border bg-white hover:bg-slate-50 active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-700 text-xs">
                      P
                    </div>
                    <span className="text-[10px] font-black text-slate-700">PhonePe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerUpiSimulation("Paytm")}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border bg-white hover:bg-slate-50 active:scale-95 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center font-black text-sky-600 text-xs">
                      Py
                    </div>
                    <span className="text-[10px] font-black text-slate-700">Paytm</span>
                  </button>
                </div>
              </div>

              {/* Standard Options Stepper/Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setErrorMessage(null); }} className="w-full">
                <TabsList className="grid grid-cols-5 h-11 bg-slate-100 p-1 mb-4 rounded-xl border border-slate-200">
                  <TabsTrigger value="card" className="rounded-lg text-xs" title="Cards">
                    <CreditCard className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="upi" className="rounded-lg text-xs" title="UPI ID">
                    <Smartphone className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="upi_qr" className="rounded-lg text-xs" title="Scan QR">
                    <QrCode className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="netbanking" className="rounded-lg text-xs" title="Netbanking">
                    <Landmark className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="rounded-lg text-xs" title="Wallets">
                    <Sparkles className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>

                {/* ── CARD TAB ── */}
                <TabsContent value="card" className="space-y-3.5 focus-visible:outline-none animate-in fade-in-50 duration-150">
                  <div className="space-y-1.5">
                    <Label htmlFor="card-number" className="text-xs font-bold text-slate-600">Card Number</Label>
                    <div className="relative">
                      <Input
                        id="card-number"
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        disabled={isProcessing}
                        required
                        className="pr-10 h-11 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                      />
                      <CreditCard className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="card-expiry" className="text-xs font-bold text-slate-600">Expiry Date</Label>
                      <Input
                        id="card-expiry"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        disabled={isProcessing}
                        maxLength={5}
                        required
                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="card-cvv" className="text-xs font-bold text-slate-600">CVV</Label>
                      <Input
                        id="card-cvv"
                        type="password"
                        placeholder="•••"
                        value={cardCVV}
                        onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, "").substring(0, 3))}
                        disabled={isProcessing}
                        maxLength={3}
                        required
                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="card-name" className="text-xs font-bold text-slate-600">Cardholder Name</Label>
                    <Input
                      id="card-name"
                      placeholder="Jane Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      disabled={isProcessing}
                      required
                      className="h-11 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                    />
                  </div>
                </TabsContent>

                {/* ── UPI ID TAB ── */}
                <TabsContent value="upi" className="space-y-3 focus-visible:outline-none animate-in fade-in-50 duration-150">
                  <div className="space-y-1.5">
                    <Label htmlFor="upi-id" className="text-xs font-bold text-slate-600">Enter UPI ID / VPA</Label>
                    <Input
                      id="upi-id"
                      placeholder="username@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      disabled={isProcessing}
                      required
                      className="h-11 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                    />
                    <p className="text-[10px] text-muted-foreground italic mt-1.5">
                      Examples: customer@okhdfcbank, user@paytm
                    </p>
                  </div>
                </TabsContent>

                {/* ── UPI QR CODE TAB ── */}
                <TabsContent value="upi_qr" className="space-y-3.5 focus-visible:outline-none text-center animate-in fade-in-50 duration-150">
                  <div className="flex flex-col items-center justify-center p-5 border border-dashed rounded-3xl bg-slate-50/50">
                    {/* QR Code Container with Scanner effect */}
                    <div className="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-md flex items-center justify-center relative overflow-hidden">
                      <QRCodeSVG
                        value={`upi://pay?pa=${encodeURIComponent(storeUpiId || "finflow@upi")}&pn=${encodeURIComponent(storeName)}&am=${Number(amount).toFixed(2)}&cu=${currency}&tn=Order-${orderId.substring(0, 8)}`}
                        size={160}
                        level="H"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                      />
                      {/* Laser Bar Scanner Effect */}
                      <div 
                        className="absolute left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_8px_#10b981]"
                        style={{
                          animation: 'scan-laser 3s infinite linear',
                          top: 0
                        }}
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800">
                        Scan with any UPI App
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      QR expires in <span className="font-black text-red-500">{formatCountdown(qrCountdown)}</span>
                    </div>
                  </div>
                </TabsContent>

                {/* ── NET BANKING TAB ── */}
                <TabsContent value="netbanking" className="space-y-3 focus-visible:outline-none animate-in fade-in-50 duration-150">
                  <Label className="text-xs font-bold text-slate-600">Select Bank</Label>
                  <RadioGroup value={selectedBank} onValueChange={setSelectedBank} className="grid grid-cols-2 gap-2 mt-1">
                    <Label className="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98] [&:has(button[aria-checked=true])]:border-indigo-600 [&:has(button[aria-checked=true])]:bg-indigo-50/20">
                      <RadioGroupItem value="sbi" className="sr-only" />
                      <Landmark className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">State Bank of India</span>
                    </Label>
                    <Label className="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98] [&:has(button[aria-checked=true])]:border-indigo-600 [&:has(button[aria-checked=true])]:bg-indigo-50/20">
                      <RadioGroupItem value="hdfc" className="sr-only" />
                      <Landmark className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">HDFC Bank</span>
                    </Label>
                    <Label className="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98] [&:has(button[aria-checked=true])]:border-indigo-600 [&:has(button[aria-checked=true])]:bg-indigo-50/20">
                      <RadioGroupItem value="icici" className="sr-only" />
                      <Landmark className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">ICICI Bank</span>
                    </Label>
                    <Label className="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98] [&:has(button[aria-checked=true])]:border-indigo-600 [&:has(button[aria-checked=true])]:bg-indigo-50/20">
                      <RadioGroupItem value="axis" className="sr-only" />
                      <Landmark className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">Axis Bank</span>
                    </Label>
                  </RadioGroup>
                </TabsContent>

                {/* ── WALLETS TAB ── */}
                <TabsContent value="wallet" className="space-y-3 focus-visible:outline-none animate-in fade-in-50 duration-150">
                  <Label className="text-xs font-bold text-slate-600">Select Wallet</Label>
                  <RadioGroup value={selectedWallet} onValueChange={setSelectedWallet} className="grid grid-cols-2 gap-2 mt-1">
                    <Label className="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98] [&:has(button[aria-checked=true])]:border-indigo-600 [&:has(button[aria-checked=true])]:bg-indigo-50/20">
                      <RadioGroupItem value="paytm" className="sr-only" />
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">Paytm Wallet</span>
                    </Label>
                    <Label className="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98] [&:has(button[aria-checked=true])]:border-indigo-600 [&:has(button[aria-checked=true])]:bg-indigo-50/20">
                      <RadioGroupItem value="phonepe" className="sr-only" />
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">PhonePe Wallet</span>
                    </Label>
                    <Label className="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98] [&:has(button[aria-checked=true])]:border-indigo-600 [&:has(button[aria-checked=true])]:bg-indigo-50/20">
                      <RadioGroupItem value="amazonpay" className="sr-only" />
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">Amazon Pay</span>
                    </Label>
                  </RadioGroup>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="mt-8 flex gap-3 border-t pt-5">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-2xl h-12 text-slate-600 hover:bg-slate-150 border-slate-200 text-sm font-bold"
                  disabled={isProcessing}
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-2xl h-12 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 hover:shadow-indigo-600/35 transition-all active:scale-[0.98]"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      Pay Securely
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Secure PCI-DSS badge in Footer */}
        <div className="bg-slate-50/80 border-t border-slate-100 py-3.5 px-6 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>PCI-DSS Secured · 128-bit Encrypted Connection</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
