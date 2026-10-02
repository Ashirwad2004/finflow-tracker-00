import { CreditCard, Shield, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentSettingsTabProps {
  isLoadingPaySettings: boolean;
  payOnlineEnabled: boolean;
  setPayOnlineEnabled: (enabled: boolean) => void;
  payUpiId: string;
  setPayUpiId: (id: string) => void;
  payGateway: string;
  setPayGateway: (gateway: string) => void;
  payRazorpayKeyId: string;
  setPayRazorpayKeyId: (key: string) => void;
  payStripeKey: string;
  setPayStripeKey: (key: string) => void;
  onSavePaymentSettings: () => void;
  isSaving: boolean;
}

export function PaymentSettingsTab({
  isLoadingPaySettings,
  payOnlineEnabled,
  setPayOnlineEnabled,
  payUpiId,
  setPayUpiId,
  payGateway,
  setPayGateway,
  payRazorpayKeyId,
  setPayRazorpayKeyId,
  payStripeKey,
  setPayStripeKey,
  onSavePaymentSettings,
  isSaving,
}: PaymentSettingsTabProps) {
  return (
    <div className="bg-card border rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Payment Gateway Settings</h3>
          <p className="text-xs text-muted-foreground">Configure how you receive online payments from customers</p>
        </div>
      </div>

      {isLoadingPaySettings ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Enable/Disable Online Payments */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
            <div className="space-y-1">
              <p className="text-sm font-bold">Enable Online Payments</p>
              <p className="text-xs text-muted-foreground">
                Allow customers to pay online via UPI, Cards, Netbanking, and Wallets
              </p>
            </div>
            <Switch checked={payOnlineEnabled} onCheckedChange={setPayOnlineEnabled} />
          </div>

          {/* UPI VPA Address */}
          <div className="space-y-2">
            <Label htmlFor="upi-id" className="text-sm font-bold">
              Your UPI ID (VPA)
            </Label>
            <Input
              id="upi-id"
              placeholder="yourshop@upi or yourshop@okhdfcbank"
              value={payUpiId}
              onChange={(e) => setPayUpiId(e.target.value)}
              className="h-11 rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground">
              This UPI ID will be embedded in QR codes shown to your customers during checkout. Payments will be sent
              directly to this address.
            </p>
          </div>

          {/* Payment Gateway Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-bold">Payment Gateway</Label>
            <Select value={payGateway} onValueChange={setPayGateway}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select gateway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">Mock Gateway (Testing)</SelectItem>
                <SelectItem value="razorpay">Razorpay (India)</SelectItem>
                <SelectItem value="stripe">Stripe (International)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Use Mock Gateway for testing. Switch to Razorpay or Stripe for live payments.
            </p>
          </div>

          {/* Conditional Gateway Keys */}
          {payGateway === "razorpay" && (
            <div className="space-y-2 p-4 rounded-xl border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
              <Label htmlFor="rzp-key" className="text-sm font-bold">
                Razorpay Key ID
              </Label>
              <Input
                id="rzp-key"
                placeholder="rzp_live_xxxxxxxxxxxxxxx"
                value={payRazorpayKeyId}
                onChange={(e) => setPayRazorpayKeyId(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Find this in your Razorpay Dashboard &rarr; Settings &rarr; API Keys
              </p>
            </div>
          )}

          {payGateway === "stripe" && (
            <div className="space-y-2 p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
              <Label htmlFor="stripe-key" className="text-sm font-bold">
                Stripe Publishable Key
              </Label>
              <Input
                id="stripe-key"
                placeholder="pk_live_xxxxxxxxxxxxxxx"
                value={payStripeKey}
                onChange={(e) => setPayStripeKey(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Find this in your Stripe Dashboard &rarr; Developers &rarr; API Keys
              </p>
            </div>
          )}

          {/* Status Summary */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Current Configuration
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${payOnlineEnabled ? "bg-green-500" : "bg-red-400"}`} />
                <span className="text-muted-foreground">Online Payments:</span>
                <span className="font-bold">{payOnlineEnabled ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Gateway:</span>
                <span className="font-bold capitalize">{payGateway}</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <CreditCard className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">UPI ID:</span>
                <span className="font-bold">{payUpiId || "Not configured"}</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={onSavePaymentSettings}
            disabled={isSaving}
            className="w-full h-12 rounded-xl font-bold text-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Payment Settings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
