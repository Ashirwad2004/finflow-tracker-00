import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Smartphone,
  CreditCard,
  Building,
  AlertTriangle,
  Sparkles,
  Download,
  Lock,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { PricingAuthCard } from "./PricingAuthCard";

interface PricingCheckoutCardProps {
  user: User | null;
  isTrialActive: boolean;
  trialDaysLeft: number;
  isPaidSubscriber: boolean;
  name: string;
  setName: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  paymentMethod: "upi" | "card" | "netbanking";
  setPaymentMethod: (method: "upi" | "card" | "netbanking") => void;
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
  paymentError: string | null;
  isProcessing: boolean;
  isSubLoading: boolean;
  displayTotal: number;
  onSubscribe: () => void;
  onDownloadBill: () => void;
  // Inline Auth props
  authMode: "login" | "signup";
  setAuthMode: (mode: "login" | "signup") => void;
  authName: string;
  setAuthName: (val: string) => void;
  authEmail: string;
  setAuthEmail: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  authLoading: boolean;
  authError: string;
  onAuthSubmit: (e: React.FormEvent) => void;
}

export const PricingCheckoutCard: React.FC<PricingCheckoutCardProps> = ({
  user,
  isTrialActive,
  trialDaysLeft,
  isPaidSubscriber,
  name,
  setName,
  phone,
  setPhone,
  paymentMethod,
  setPaymentMethod,
  termsAccepted,
  setTermsAccepted,
  paymentError,
  isProcessing,
  isSubLoading,
  displayTotal,
  onSubscribe,
  onDownloadBill,
  authMode,
  setAuthMode,
  authName,
  setAuthName,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authLoading,
  authError,
  onAuthSubmit,
}) => {
  const navigate = useNavigate();
  const [showFeatures, setShowFeatures] = useState(false);

  return (
    <div id="checkout-section" className="w-full max-w-xl mx-auto scroll-mt-24">
      {/* Active Trial Notice */}
      {user && isTrialActive && (
        <div className="mb-4 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Free trial active ({trialDaysLeft} days left) — Purchase now for 6 months access
          </span>
        </div>
      )}

      <div className="bg-card text-card-foreground border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />

        {/* Direct Plan Header */}
        <div className="flex items-start justify-between pb-6 border-b border-border gap-4">
          <div>
            <span className="inline-block text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
              RupeeBill Business
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              6-Month License
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full billing, thermal POS, digital store, and offline sync
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-3xl sm:text-4xl font-black text-foreground">₹299</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Flat for 6 Months
            </span>
          </div>
        </div>

        {/* If Not Logged In: Fast In-Line Auth */}
        {!user ? (
          <PricingAuthCard
            authMode={authMode}
            setAuthMode={setAuthMode}
            authName={authName}
            setAuthName={setAuthName}
            authEmail={authEmail}
            setAuthEmail={setAuthEmail}
            authPassword={authPassword}
            setAuthPassword={setAuthPassword}
            authLoading={authLoading}
            authError={authError}
            onSubmit={onAuthSubmit}
          />
        ) : (
          /* If Logged In: Direct Straightforward Payment */
          <div className="py-6 space-y-5">
            {/* User Pre-filled Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="billingName" className="text-xs text-foreground">
                  Name on Bill
                </Label>
                <Input
                  id="billingName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-background border-input rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billingPhone" className="text-xs text-foreground">
                  Mobile Number
                </Label>
                <Input
                  id="billingPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="bg-background border-input rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Direct Payment Mode Tabs */}
            <div className="space-y-2">
              <Label className="text-xs text-foreground">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === "upi"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs">UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("netbanking")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === "netbanking"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  <Building className="w-5 h-5" />
                  <span className="text-xs">Net Banking</span>
                </button>
              </div>
            </div>

            {/* Itemized Amount Breakdown Box */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/60">
                <span className="font-semibold text-foreground">Commercial License Breakdown</span>
                <span className="font-semibold text-primary">6 Months (180 Days)</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Base 6-Month Software License</span>
                <span className="font-medium text-foreground">₹299.00</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Statutory GST / Taxes (Software Exemption)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">₹0.00 (Exempt)</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Payment Gateway &amp; Setup Surcharges</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">₹0.00 (Free)</span>
              </div>
              <div className="pt-2.5 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">Total Amount Payable</span>
                  <span className="text-[10px] text-muted-foreground">Zero hidden fees · Official PDF Bill on payment</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-foreground">₹299.00</span>
                  <span className="text-[10px] text-muted-foreground block font-medium">Flat for 6 Months</span>
                </div>
              </div>
            </div>

            {/* Consent & Agreement Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0"
                />
                <span className="leading-snug">
                  I have read and agree to the{" "}
                  <a
                    href="#terms-section"
                    className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80"
                  >
                    Terms &amp; Conditions
                  </a>
                  , Offline Device Storage Responsibility, and 6-Month Software License Agreement.
                </span>
              </label>
            </div>

            {paymentError && (
              <div className="text-destructive text-xs bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Direct Action Button */}
            {isPaidSubscriber ? (
              <div className="space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> You have an active RupeeBill license!
                </div>

                <Button
                  onClick={onDownloadBill}
                  variant="outline"
                  className="w-full h-11 border-primary/30 text-primary hover:bg-primary/10 font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Official Software Bill (PDF)
                </Button>

                <Button
                  onClick={() => navigate("/business-dashboard")}
                  className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl"
                >
                  Go to Business Dashboard
                </Button>
              </div>
            ) : (
              <Button
                onClick={onSubscribe}
                disabled={isProcessing || isSubLoading || !termsAccepted}
                className="w-full h-14 bg-primary text-primary-foreground font-black text-base rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Opening Razorpay...</span>
                  </div>
                ) : (
                  `Pay ₹${displayTotal} for 6 Months`
                )}
              </Button>
            )}

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest pt-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>Razorpay 256-Bit SSL Secured • Official Bill on Payment</span>
            </div>
          </div>
        )}

        {/* Optional Collapsible Features */}
        <div className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setShowFeatures(!showFeatures)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground font-semibold py-1"
          >
            <span>What&apos;s included in RupeeBill Business?</span>
            {showFeatures ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFeatures && (
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3 animate-fade-in">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Unlimited Invoicing &amp; POS Billing (Thermal &amp; A4 Print Studio)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>100% Offline Host-Disk OPFS Storage &amp; Auto Cloud Backup</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Digital Storefront with Live Online Order Sync</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Customer &amp; Vendor Parties Ledgers &amp; Account Statements</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>AI Receipt OCR Scanning &amp; Expense Categorization</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Multi-Role Salesman &amp; Staff Access Delegations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Official verified Software Purchase Bill issued upon payment</span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
