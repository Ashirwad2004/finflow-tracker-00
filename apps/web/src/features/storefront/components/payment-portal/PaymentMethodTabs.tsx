import React from "react";
import { CreditCard, Smartphone, QrCode, Landmark, Sparkles, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QRCodeSVG } from "qrcode.react";

interface PaymentMethodTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isProcessing: boolean;
  triggerUpiSimulation: (app: string) => void;
  setErrorMessage: (msg: string | null) => void;
  cardNumber: string;
  cardExpiry: string;
  cardCVV: string;
  cardName: string;
  handleCardNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExpiryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setCardCVV: (val: string) => void;
  setCardName: (val: string) => void;
  upiId: string;
  setUpiId: (val: string) => void;
  qrCountdown: number;
  formatCountdown: (sec: number) => string;
  storeUpiId?: string;
  storeName: string;
  amount: number;
  currency: string;
  orderId: string;
  selectedBank: string;
  setSelectedBank: (bank: string) => void;
  selectedWallet: string;
  setSelectedWallet: (wallet: string) => void;
}

export const PaymentMethodTabs = ({
  activeTab,
  setActiveTab,
  isProcessing,
  triggerUpiSimulation,
  setErrorMessage,
  cardNumber,
  cardExpiry,
  cardCVV,
  cardName,
  handleCardNumberChange,
  handleExpiryChange,
  setCardCVV,
  setCardName,
  upiId,
  setUpiId,
  qrCountdown,
  formatCountdown,
  storeUpiId,
  storeName,
  amount,
  currency,
  orderId,
  selectedBank,
  setSelectedBank,
  selectedWallet,
  setSelectedWallet,
}: PaymentMethodTabsProps) => {
  return (
    <>
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
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setErrorMessage(null);
        }}
        className="w-full"
      >
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
            <Label htmlFor="card-number" className="text-xs font-bold text-slate-600">
              Card Number
            </Label>
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
              <Label htmlFor="card-expiry" className="text-xs font-bold text-slate-600">
                Expiry Date
              </Label>
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
              <Label htmlFor="card-cvv" className="text-xs font-bold text-slate-600">
                CVV
              </Label>
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
            <Label htmlFor="card-name" className="text-xs font-bold text-slate-600">
              Cardholder Name
            </Label>
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
            <Label htmlFor="upi-id" className="text-xs font-bold text-slate-600">
              Enter UPI ID / VPA
            </Label>
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
            <div className="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-md flex items-center justify-center relative overflow-hidden">
              <QRCodeSVG
                value={`upi://pay?pa=${encodeURIComponent(storeUpiId || "rupeebill@upi")}&pn=${encodeURIComponent(storeName)}&am=${Number(amount).toFixed(2)}&cu=${currency}&tn=Order-${orderId.substring(0, 8)}`}
                size={160}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
              <div
                className="absolute left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_8px_#10b981]"
                style={{
                  animation: "scan-laser 3s infinite linear",
                  top: 0,
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
    </>
  );
};
