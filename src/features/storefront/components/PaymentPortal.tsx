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
  CheckCircle2
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
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    let mockPaymentId = `mock_pay_${activeTab}_${Math.random().toString(36).substring(2, 10)}`;
    
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
          onClose();
        }
      } catch (err: any) {
        console.error("Payment Verification Error:", err);
        setErrorMessage(err.response?.data?.error ?? "Payment verification failed. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-card border border-border shadow-2xl overflow-hidden p-0 rounded-2xl">
        {/* Header Summary */}
        <div className="bg-primary/5 border-b p-6 flex items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Secure Checkout
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Paying to <span className="font-semibold text-foreground">{storeName}</span>
            </DialogDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-primary">
              {currency === "INR" ? "₹" : "$"}
              {Number(amount).toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Order ID: #{orderId.substring(0, 8)}
            </div>
          </div>
        </div>

        {/* Content Panel */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Transaction Error</div>
                <div className="text-xs opacity-90 mt-1">{errorMessage}</div>
              </div>
            </div>
          )}

          {isProcessing && !gatewayOrderId ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">
                Initializing payment session...
              </p>
            </div>
          ) : (
            <form onSubmit={handlePaymentSubmit}>
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setErrorMessage(null); }} className="w-full">
                <TabsList className="grid grid-cols-5 h-12 bg-muted/50 p-1 mb-6 rounded-xl border">
                  <TabsTrigger value="card" className="rounded-lg text-xs" title="Cards">
                    <CreditCard className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="upi" className="rounded-lg text-xs" title="UPI Pay">
                    <Smartphone className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="upi_qr" className="rounded-lg text-xs" title="UPI QR">
                    <QrCode className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="netbanking" className="rounded-lg text-xs" title="Netbanking">
                    <Landmark className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="rounded-lg text-xs" title="Wallets">
                    <Smartphone className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>

                {/* ── CARD TAB ── */}
                <TabsContent value="card" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <div className="relative">
                      <Input
                        id="card-number"
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        disabled={isProcessing}
                        required
                        className="pr-10"
                      />
                      <CreditCard className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="card-expiry">Expiry Date</Label>
                      <Input
                        id="card-expiry"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        disabled={isProcessing}
                        maxLength={5}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-cvv">CVV</Label>
                      <Input
                        id="card-cvv"
                        type="password"
                        placeholder="•••"
                        value={cardCVV}
                        onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, "").substring(0, 3))}
                        disabled={isProcessing}
                        maxLength={3}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-name">Cardholder Name</Label>
                    <Input
                      id="card-name"
                      placeholder="Jane Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      disabled={isProcessing}
                      required
                    />
                  </div>
                </TabsContent>

                {/* ── UPI ID TAB ── */}
                <TabsContent value="upi" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID / VPA</Label>
                    <Input
                      id="upi-id"
                      placeholder="username@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      disabled={isProcessing}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      Examples: customer@okhdfcbank, user@paytm
                    </p>
                  </div>
                </TabsContent>

                {/* ── UPI QR CODE TAB ── */}
                <TabsContent value="upi_qr" className="space-y-4 text-center">
                  <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-2xl bg-muted/20">
                    {/* Real UPI QR Code */}
                    <div className="bg-white border p-4 rounded-xl shadow-inner flex items-center justify-center">
                      <QRCodeSVG
                        value={`upi://pay?pa=${encodeURIComponent(storeUpiId || "finflow@upi")}&pn=${encodeURIComponent(storeName)}&am=${Number(amount).toFixed(2)}&cu=${currency}&tn=Order-${orderId.substring(0, 8)}`}
                        size={160}
                        level="H"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#1e1b4b"
                        imageSettings={{
                          src: "",
                          height: 0,
                          width: 0,
                          excavate: false,
                        }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-semibold text-foreground">
                        Scan with GooglePay, PhonePe, or Paytm
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      QR expires in <span className="font-bold text-red-500">{formatCountdown(qrCountdown)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-2">
                      Amount: <span className="font-bold text-foreground">{currency === "INR" ? "₹" : "$"}{Number(amount).toFixed(2)}</span>
                    </p>
                  </div>
                </TabsContent>

                {/* ── NET BANKING TAB ── */}
                <TabsContent value="netbanking" className="space-y-4">
                  <Label>Select Bank</Label>
                  <RadioGroup value={selectedBank} onValueChange={setSelectedBank} className="grid grid-cols-2 gap-3 mt-1">
                    <Label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/40 transition-colors [&:has(button[aria-checked=true])]:border-primary [&:has(button[aria-checked=true])]:bg-primary/5">
                      <RadioGroupItem value="sbi" className="sr-only" />
                      <Landmark className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">State Bank of India</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/40 transition-colors [&:has(button[aria-checked=true])]:border-primary [&:has(button[aria-checked=true])]:bg-primary/5">
                      <RadioGroupItem value="hdfc" className="sr-only" />
                      <Landmark className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">HDFC Bank</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/40 transition-colors [&:has(button[aria-checked=true])]:border-primary [&:has(button[aria-checked=true])]:bg-primary/5">
                      <RadioGroupItem value="icici" className="sr-only" />
                      <Landmark className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">ICICI Bank</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/40 transition-colors [&:has(button[aria-checked=true])]:border-primary [&:has(button[aria-checked=true])]:bg-primary/5">
                      <RadioGroupItem value="axis" className="sr-only" />
                      <Landmark className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">Axis Bank</span>
                    </Label>
                  </RadioGroup>
                </TabsContent>

                {/* ── WALLETS TAB ── */}
                <TabsContent value="wallet" className="space-y-4">
                  <Label>Select Wallet</Label>
                  <RadioGroup value={selectedWallet} onValueChange={setSelectedWallet} className="grid grid-cols-2 gap-3 mt-1">
                    <Label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/40 transition-colors [&:has(button[aria-checked=true])]:border-primary [&:has(button[aria-checked=true])]:bg-primary/5">
                      <RadioGroupItem value="paytm" className="sr-only" />
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold">Paytm Wallet</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/40 transition-colors [&:has(button[aria-checked=true])]:border-primary [&:has(button[aria-checked=true])]:bg-primary/5">
                      <RadioGroupItem value="phonepe" className="sr-only" />
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold">PhonePe Wallet</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/40 transition-colors [&:has(button[aria-checked=true])]:border-primary [&:has(button[aria-checked=true])]:bg-primary/5">
                      <RadioGroupItem value="amazonpay" className="sr-only" />
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold">Amazon Pay</span>
                    </Label>
                  </RadioGroup>
                </TabsContent>
              </Tabs>

              {/* Action Button */}
              <div className="mt-8 flex gap-3 border-t pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl h-12"
                  disabled={isProcessing}
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl h-12 shadow-lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
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
      </DialogContent>
    </Dialog>
  );
}
